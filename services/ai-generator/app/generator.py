"""Cliente de generación IA multi-proveedor — Anthropic + Gemini + taxonomía DCE."""

import json
import logging
import random
import re

import anthropic
import google.generativeai as genai
from sqlalchemy.ext.asyncio import AsyncSession

from .config import settings
from .key_store import get_decrypted_api_key, get_enabled_providers, get_provider_config
from .prompts import (
    BLOCK_SYSTEM_PROMPT,
    ING_COMPONENT_MAP,
    ING_SECTION_COMPETENCE,
    ING_SECTION_DESCRIPTIONS,
    MAT_SYSTEM_PROMPT,
    SYSTEM_PROMPT,
    build_user_prompt,
)
from .schemas import GeneratedMedia, GeneratedQuestion, GeneratedQuestionBlock, GeneratedQuestionBlockItem

logger = logging.getLogger(__name__)

# Visual types that warrant a real generated image instead of programmatic rendering
_IMAGE_NATIVE_TYPES = {"map", "diagram", "infographic", "comic", "photograph", "public_sign"}

_VALID_MEDIA_TYPES = {
    "chart", "table", "diagram", "map", "infographic", "comic",
    "public_sign", "photograph", "timeline", "state_structure",
    "geometric_figure", "probability_diagram",
}
_VALID_RENDER_ENGINES = {"chart_js", "svg_template", "html_template", "map_renderer", "timeline_renderer"}

_JSON_RETRY_SUFFIX = """

IMPORTANTE DE FORMATO:
- Devuelve SOLO un objeto JSON valido (sin markdown ni texto adicional).
- No uses saltos de linea literales dentro de strings; usa una sola linea por campo.
- Escapa comillas dobles internas con \\\" cuando sea necesario.
- Manten explanation_correct y explanation_a/b/c/d en maximo 2 frases cada una.
"""

_BLOCK_STRUCTURE_RETRY_SUFFIX = """

IMPORTANTE DE ESTRUCTURA PARA BLOQUES:
- El array `items` debe contener entre 2 y 3 subpreguntas completas.
- Si entregas una sola subpregunta, la respuesta es invalida.
- Cada item debe incluir stem, opciones, respuesta correcta y explicaciones.
"""


# =============================================================================
# Taxonomía en memoria (cargada desde Question Bank API)
# =============================================================================

_taxonomy_cache: dict | None = None
_INTERNAL_HEADERS = {
    "X-User-Id": "0",
    "X-User-Role": "ADMIN",
    "X-Service": "ai-generator",
}


async def _fetch_taxonomy(http_client: anthropic.AsyncAnthropic | None = None) -> dict:
    """Obtiene taxonomía completa del Question Bank Service."""
    global _taxonomy_cache  # noqa: PLW0603
    if _taxonomy_cache:
        return _taxonomy_cache

    import httpx

    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.get(
            f"{settings.question_bank_url}/api/taxonomy/areas",
            headers=_INTERNAL_HEADERS,
        )
        resp.raise_for_status()
        areas = resp.json()

    taxonomy: dict = {}
    async with httpx.AsyncClient(timeout=30) as client:
        for area in areas:
            area_code = area["code"]
            resp = await client.get(
                f"{settings.question_bank_url}/api/taxonomy/areas/{area['id']}/competencies",
                headers=_INTERNAL_HEADERS,
            )
            resp.raise_for_status()
            competencies = resp.json()
            taxonomy[area_code] = {
                "area": area,
                "competencies": competencies,
            }

    _taxonomy_cache = taxonomy
    return taxonomy


def _resolve_taxonomy_ids(
    taxonomy: dict,
    area_code: str,
    competency_code: str | None = None,
    cognitive_level: int | None = None,
) -> dict:
    """Resuelve IDs de la taxonomía para una solicitud de generación.

    Retorna dict con area, competency, assertion, evidence y metadata para el prompt.
    """
    area_data = taxonomy.get(area_code)
    if not area_data:
        msg = f"Área no encontrada en taxonomía: {area_code}"
        raise ValueError(msg)

    competencies = area_data["competencies"]

    # Seleccionar competencia
    if competency_code:
        comp = next(
            (c for c in competencies if c.get("code") == competency_code),
            None,
        )
        if not comp:
            msg = f"Competencia no encontrada: {competency_code}"
            raise ValueError(msg)
    elif cognitive_level:
        matching = [
            c for c in competencies
            if c.get("cognitive_level") == cognitive_level
        ]
        comp = random.choice(matching) if matching else random.choice(competencies)  # noqa: S311
    else:
        comp = random.choice(competencies)  # noqa: S311

    # Seleccionar assertion y evidence
    assertions = comp.get("assertions", [])
    if not assertions:
        msg = f"No hay assertions para {comp.get('code')}"
        raise ValueError(msg)
    assertion = random.choice(assertions)  # noqa: S311

    evidences = assertion.get("evidences", [])
    evidence = random.choice(evidences) if evidences else None  # noqa: S311

    # Content component (si existe)
    content_components = comp.get("content_components", [])
    content_component = random.choice(content_components) if content_components else None  # noqa: S311

    return {
        "area": area_data["area"],
        "competency": comp,
        "assertion": assertion,
        "evidence": evidence,
        "content_component": content_component,
    }


def _strip_markdown_fences(raw_text: str) -> str:
    """Elimina fences markdown si el modelo devuelve bloque ```json."""
    text = raw_text.strip()
    if not text.startswith("```"):
        return text

    lines = text.splitlines()
    if lines:
        lines = lines[1:]
    if lines and lines[-1].strip().startswith("```"):
        lines = lines[:-1]
    return "\n".join(lines).strip()


def _extract_json_object(raw_text: str) -> str:
    """Recorta prefijos/sufijos fuera del objeto JSON principal."""
    start = raw_text.find("{")
    end = raw_text.rfind("}")
    if start == -1 or end == -1 or end <= start:
        return raw_text.strip()
    return raw_text[start : end + 1].strip()


def _escape_control_chars_in_strings(raw_text: str) -> str:
    """Escapa saltos de linea/tab en strings JSON para tolerar outputs multilinea."""
    out: list[str] = []
    in_string = False
    escaped = False

    for char in raw_text:
        if in_string:
            if escaped:
                out.append(char)
                escaped = False
                continue

            if char == "\\":
                out.append(char)
                escaped = True
                continue

            if char == '"':
                out.append(char)
                in_string = False
                continue

            if char == "\n":
                out.append("\\n")
                continue
            if char == "\r":
                out.append("\\r")
                continue
            if char == "\t":
                out.append("\\t")
                continue

            out.append(char)
            continue

        out.append(char)
        if char == '"':
            in_string = True

    return "".join(out)


def _remove_trailing_commas(raw_text: str) -> str:
    """Elimina comas finales antes de '}' o ']' en JSON."""
    return re.sub(r",(\s*[}\]])", r"\1", raw_text)


def _parse_provider_json(raw_text: str) -> dict:
    """Parsea JSON del proveedor con estrategias de recuperacion leves."""
    base_text = _extract_json_object(_strip_markdown_fences(raw_text))

    candidates = [
        base_text,
        _escape_control_chars_in_strings(base_text),
        _remove_trailing_commas(base_text),
        _remove_trailing_commas(_escape_control_chars_in_strings(base_text)),
    ]

    seen: set[str] = set()
    parse_errors: list[str] = []
    for candidate in candidates:
        if candidate in seen:
            continue
        seen.add(candidate)

        try:
            parsed = json.loads(candidate)
        except json.JSONDecodeError as exc:
            parse_errors.append(str(exc))
            continue

        if not isinstance(parsed, dict):
            parse_errors.append("La respuesta JSON no es un objeto")
            continue

        return parsed

    detail = parse_errors[-1] if parse_errors else "respuesta vacia o no parseable"
    raise ValueError(f"JSON invalido del proveedor: {detail}")


def _build_retry_prompt(user_prompt: str) -> str:
    return f"{user_prompt}{_JSON_RETRY_SUFFIX}"


def _extract_valid_block_items(data: dict) -> list[dict]:
    raw_items = data.get("items")
    if not isinstance(raw_items, list):
        raise ValueError("El bloque generado no contiene items validos")

    if not 2 <= len(raw_items) <= 3:
        raise ValueError(
            f"El bloque generado debe contener entre 2 y 3 items y se recibieron {len(raw_items)}",
        )

    for index, item in enumerate(raw_items, start=1):
        if not isinstance(item, dict):
            raise ValueError(f"El item {index} del bloque generado no es un objeto valido")

    return raw_items


def _english_mcer_level(english_section: int | None) -> str | None:
    if not english_section:
        return None
    if english_section == 1:
        return "A-"
    if english_section <= 3:
        return "A1"
    if english_section <= 5:
        return "A2"
    if english_section == 6:
        return "B1"
    return "B+"


def _english_metadata(
    *,
    area_code: str,
    english_section: int | None,
    assertion_statement: str,
) -> tuple[str | None, str | None, dict | None]:
    if area_code != "ING" or not english_section:
        return None, None, None

    mcer_level = _english_mcer_level(english_section)
    component_name = ING_COMPONENT_MAP.get(english_section)
    dce_metadata = {
        "competence": ING_SECTION_COMPETENCE.get(english_section, "linguistica"),
        "assertion": assertion_statement,
        "cognitive_level": (
            "analisis_sintesis" if english_section in (6, 7)
            else "comprension_aplicacion" if english_section in (3, 4, 5)
            else "reconocimiento"
        ),
        "grammar_tags": [],
        "part_description": ING_SECTION_DESCRIPTIONS.get(english_section, ""),
    }
    return mcer_level, component_name, dce_metadata


# =============================================================================
# Generación multi-proveedor
# =============================================================================


async def _call_anthropic(
    api_key: str,
    model: str,
    user_prompt: str,
    max_tokens: int,
    temperature: float,
    system_prompt: str = SYSTEM_PROMPT,
) -> tuple[str, dict]:
    """Llama a Anthropic Claude y retorna (texto_respuesta, token_usage)."""
    client = anthropic.AsyncAnthropic(api_key=api_key)
    response = await client.messages.create(
        model=model,
        max_tokens=max_tokens,
        temperature=temperature,
        system=system_prompt,
        messages=[{"role": "user", "content": user_prompt}],
    )
    token_usage = {
        "input_tokens": response.usage.input_tokens,
        "output_tokens": response.usage.output_tokens,
    }
    return response.content[0].text.strip(), token_usage


async def _call_gemini(
    api_key: str,
    model: str,
    user_prompt: str,
    max_tokens: int,
    temperature: float,
    system_prompt: str = SYSTEM_PROMPT,
) -> tuple[str, dict]:
    """Llama a Google Gemini y retorna (texto_respuesta, token_usage)."""
    genai.configure(api_key=api_key)
    gemini_model = genai.GenerativeModel(
        model_name=model,
        system_instruction=system_prompt,
        generation_config=genai.GenerationConfig(
            max_output_tokens=max_tokens,
            temperature=temperature,
            response_mime_type="application/json",
        ),
    )
    response = await gemini_model.generate_content_async(user_prompt)
    token_usage = {}
    if hasattr(response, "usage_metadata") and response.usage_metadata:
        token_usage = {
            "input_tokens": getattr(response.usage_metadata, "prompt_token_count", 0),
            "output_tokens": getattr(response.usage_metadata, "candidates_token_count", 0),
        }
    return response.text.strip(), token_usage


async def _call_gemini_image(
    api_key: str, model: str, prompt: str
) -> tuple[bytes, str] | None:
    """Llama a Gemini image model. Retorna (bytes, mime_type) o None si falla."""
    import base64

    try:
        genai.configure(api_key=api_key)
        image_model = genai.GenerativeModel(model_name=model)
        response = await image_model.generate_content_async(
            prompt,
            generation_config=genai.GenerationConfig(
                response_mime_type="image/png",
            ),
        )
        for candidate in response.candidates:
            for part in candidate.content.parts:
                inline = getattr(part, "inline_data", None)
                if inline:
                    data = inline.data
                    if isinstance(data, str):
                        data = base64.b64decode(data)
                    return bytes(data), inline.mime_type or "image/png"
    except Exception as exc:
        logger.warning("Gemini image generation falló (%s): %s", model, exc)
    return None


def _build_image_prompt(visual_type: str, alt_text: str, visual_data_str: str) -> str:
    """Construye el prompt de imagen a partir de los metadatos del visual generado."""
    base = (
        f"Genera una imagen educativa de tipo '{visual_type}' para un examen colombiano Saber 11. "
        "Estilo limpio, académico, colores claros, fondo blanco, alta legibilidad, sin texto decorativo."
    )
    if alt_text:
        base += f" La imagen debe mostrar: {alt_text}."
    try:
        data = json.loads(visual_data_str)
        if visual_type == "map":
            region = data.get("region", "")
            highlights = data.get("highlights", [])
            info = data.get("data", {})
            if region:
                base += f" Mapa educativo de {region}."
            if highlights:
                base += f" Resalta claramente: {', '.join(highlights)}."
            if info:
                items = [f"{k}: {v}" for k, v in info.items()]
                base += f" Leyenda de colores: {'; '.join(items)}."
    except Exception:
        pass
    return base


async def generate_question(
    *,
    db: AsyncSession,
    area_code: str,
    provider: str | None = None,
    model_override: str | None = None,
    competency_code: str | None = None,
    cognitive_level: int | None = None,
    include_visual: bool = False,
    visual_type: str | None = None,
    english_section: int | None = None,
) -> tuple[GeneratedQuestion, dict, str, str]:
    """Genera una pregunta usando el proveedor seleccionado.

    Returns:
        (GeneratedQuestion, token_usage_dict, provider_name, model_name)
    """
    # Resolver proveedor.
    # Si no se especifica, intenta el default y luego cae al primer proveedor habilitado
    # que tenga API key configurada.
    provider_name = provider or settings.default_provider
    provider_config = await get_provider_config(db, provider_name)

    api_key: str | None = None
    if provider is not None:
        if not provider_config or not provider_config.is_enabled:
            msg = f"Proveedor '{provider_name}' no disponible o deshabilitado"
            raise ValueError(msg)
        api_key = await get_decrypted_api_key(db, provider_name)
    else:
        if provider_config and provider_config.is_enabled:
            try:
                api_key = await get_decrypted_api_key(db, provider_name)
            except ValueError:
                logger.warning(
                    "Proveedor default '%s' sin API key válida; se buscará fallback",
                    provider_name,
                )

        if api_key is None:
            enabled_providers = await get_enabled_providers(db)
            fallback_found = False
            for candidate in enabled_providers:
                try:
                    candidate_key = await get_decrypted_api_key(db, candidate.provider)
                except ValueError:
                    continue

                provider_name = candidate.provider
                provider_config = candidate
                api_key = candidate_key
                fallback_found = True
                logger.info("Usando proveedor fallback para generación: %s", provider_name)
                break

            if not fallback_found or provider_config is None or api_key is None:
                msg = "No hay proveedores habilitados con API key configurada"
                raise ValueError(msg)

    if model_override:
        model_name = model_override
    elif provider_name == "gemini":
        model_name = settings.gemini_image_model if include_visual else settings.gemini_text_model
    else:
        model_name = provider_config.default_model
    max_tokens = provider_config.max_tokens
    temperature = provider_config.temperature

    # Resolver taxonomía
    taxonomy = await _fetch_taxonomy()
    resolved = _resolve_taxonomy_ids(
        taxonomy, area_code, competency_code, cognitive_level
    )

    comp = resolved["competency"]
    assertion = resolved["assertion"]
    evidence = resolved["evidence"]
    content_comp = resolved["content_component"]

    # MCER level y metadatos específicos de inglés
    mcer_level, component_name, dce_metadata = _english_metadata(
        area_code=area_code,
        english_section=english_section,
        assertion_statement=assertion.get("statement", ""),
    )

    user_prompt = build_user_prompt(
        area_code=area_code,
        competency_name=comp.get("name", ""),
        assertion_statement=assertion.get("statement", ""),
        evidence_behavior=evidence.get("observable_behavior", "") if evidence else "",
        content_component=content_comp.get("name") if content_comp else None,
        english_section=english_section,
        mcer_level=mcer_level,
        include_visual=include_visual,
        visual_type=visual_type,
        structure_type="INDIVIDUAL",
    )

    retry_prompt = _build_retry_prompt(user_prompt)
    data: dict | None = None
    token_usage: dict = {}
    last_parse_error: ValueError | None = None
    active_system_prompt = MAT_SYSTEM_PROMPT if area_code == "MAT" else SYSTEM_PROMPT

    for attempt in (1, 2):
        attempt_prompt = user_prompt if attempt == 1 else retry_prompt
        attempt_temperature = temperature if attempt == 1 else min(temperature, 0.2)

        if provider_name == "anthropic":
            raw_text, token_usage = await _call_anthropic(
                api_key,
                model_name,
                attempt_prompt,
                max_tokens,
                attempt_temperature,
                active_system_prompt,
            )
        elif provider_name == "gemini":
            raw_text, token_usage = await _call_gemini(
                api_key,
                model_name,
                attempt_prompt,
                max_tokens,
                attempt_temperature,
                active_system_prompt,
            )
        else:
            msg = f"Proveedor no implementado: {provider_name}"
            raise ValueError(msg)

        try:
            data = _parse_provider_json(raw_text)
            break
        except ValueError as err:
            last_parse_error = err
            logger.warning(
                "Respuesta no parseable de %s/%s en intento %s: %s",
                provider_name,
                model_name,
                attempt,
                err,
            )

    if data is None:
        if last_parse_error is not None:
            raise last_parse_error
        raise ValueError("No se pudo parsear la respuesta del proveedor")

    # Construir media programática
    media = None
    if include_visual and "visual_data" in data:
        visual_data_raw = data["visual_data"]
        if isinstance(visual_data_raw, dict):
            visual_data_raw = json.dumps(visual_data_raw)

        raw_media_type = data.get("visual_type", visual_type or "chart")
        safe_media_type = raw_media_type if raw_media_type in _VALID_MEDIA_TYPES else (visual_type or "chart")

        raw_render_engine = data.get("visual_render_engine", "chart_js")
        safe_render_engine = raw_render_engine if raw_render_engine in _VALID_RENDER_ENGINES else "chart_js"

        alt_text = data.get("visual_alt_text", "") or ""
        if len(alt_text.strip()) < 5:
            alt_text = f"Recurso visual de tipo {safe_media_type} para la pregunta"

        media = GeneratedMedia(
            media_type=safe_media_type,
            render_engine=safe_render_engine,
            visual_data=visual_data_raw,
            alt_text=alt_text,
            alt_text_detailed=data.get("visual_alt_text_detailed"),
            display_mode="ABOVE_STEM",
        )

    # Para tipos nativos de imagen, generar imagen con Gemini sin importar el
    # proveedor que generó el texto (Anthropic no tiene generación de imágenes).
    if media is not None and (visual_type or media.media_type or "").lower() in _IMAGE_NATIVE_TYPES:
        try:
            gemini_key = (
                api_key
                if provider_name == "gemini"
                else await get_decrypted_api_key(db, "gemini")
            )
            image_prompt = _build_image_prompt(
                visual_type or media.media_type,
                media.alt_text,
                media.visual_data,
            )
            image_result = await _call_gemini_image(gemini_key, settings.gemini_image_model, image_prompt)
            if image_result:
                img_bytes, img_mime = image_result
                media = GeneratedMedia(
                    media_type=media.media_type,
                    render_engine=media.render_engine,
                    visual_data=media.visual_data,
                    alt_text=media.alt_text,
                    alt_text_detailed=media.alt_text_detailed,
                    display_mode=media.display_mode,
                    image_bytes=img_bytes,
                    image_mime_type=img_mime,
                )
                logger.info("Imagen real generada con %s (%d bytes)", settings.gemini_image_model, len(img_bytes))
        except Exception as img_exc:
            logger.warning(
                "No se pudo generar imagen para tipo '%s' (provider=%s): %s",
                media.media_type, provider_name, img_exc,
            )

    # Enriquecer dce_metadata con grammar_tags devueltos por la IA (solo ING)
    if dce_metadata is not None:
        ai_grammar_tags = data.get("grammar_tags", [])
        if isinstance(ai_grammar_tags, list):
            dce_metadata["grammar_tags"] = ai_grammar_tags
        ai_l1_note = data.get("l1_distractor_note", "")
        if ai_l1_note:
            dce_metadata["l1_distractor_note"] = ai_l1_note

    # component_name puede venir en el JSON de la IA (sección 5 con EmailWrapper)
    if area_code == "ING" and component_name is None:
        ai_component = data.get("component_name")
        if ai_component in ("EmailWrapper", "ChatUI", "NoticeSign"):
            component_name = ai_component

    question = GeneratedQuestion(
        area_code=area_code,
        competency_code=comp.get("code", ""),
        assertion_code=assertion.get("code", ""),
        evidence_code=evidence.get("code", "") if evidence else "",
        content_component_code=content_comp.get("code") if content_comp else None,
        context=data["context"],
        context_type=data["context_type"],
        context_category=data.get("context_category"),
        tags=data.get("tags") if isinstance(data.get("tags"), list) else None,
        stem=data["stem"],
        option_a=data["option_a"],
        option_b=data["option_b"],
        option_c=data["option_c"],
        option_d=data.get("option_d"),
        correct_answer=data["correct_answer"],
        explanation_correct=data["explanation_correct"],
        explanation_a=data.get("explanation_a", ""),
        explanation_b=data.get("explanation_b", ""),
        explanation_c=data.get("explanation_c", ""),
        explanation_d=data.get("explanation_d"),
        cognitive_process=data.get("cognitive_process"),
        difficulty_estimated=data.get("difficulty_estimated"),
        english_section=english_section,
        mcer_level=mcer_level,
        component_name=component_name,
        dce_metadata=dce_metadata,
        media=media,
    )

    return question, token_usage, provider_name, model_name


async def generate_question_block(
    *,
    db: AsyncSession,
    area_code: str,
    provider: str | None = None,
    model_override: str | None = None,
    competency_code: str | None = None,
    cognitive_level: int | None = None,
    english_section: int | None = None,
) -> tuple[GeneratedQuestionBlock, dict, str, str]:
    provider_name = provider or settings.default_provider
    provider_config = await get_provider_config(db, provider_name)

    api_key: str | None = None
    if provider is not None:
        if not provider_config or not provider_config.is_enabled:
            msg = f"Proveedor '{provider_name}' no disponible o deshabilitado"
            raise ValueError(msg)
        api_key = await get_decrypted_api_key(db, provider_name)
    else:
        if provider_config and provider_config.is_enabled:
            try:
                api_key = await get_decrypted_api_key(db, provider_name)
            except ValueError:
                logger.warning(
                    "Proveedor default '%s' sin API key válida; se buscará fallback",
                    provider_name,
                )

        if api_key is None:
            enabled_providers = await get_enabled_providers(db)
            fallback_found = False
            for candidate in enabled_providers:
                try:
                    candidate_key = await get_decrypted_api_key(db, candidate.provider)
                except ValueError:
                    continue

                provider_name = candidate.provider
                provider_config = candidate
                api_key = candidate_key
                fallback_found = True
                logger.info("Usando proveedor fallback para bloque: %s", provider_name)
                break

            if not fallback_found or provider_config is None or api_key is None:
                raise ValueError("No hay proveedores habilitados con API key configurada")

    if model_override:
        model_name = model_override
    else:
        model_name = provider_config.default_model
    max_tokens = provider_config.max_tokens
    temperature = provider_config.temperature

    taxonomy = await _fetch_taxonomy()
    resolved = _resolve_taxonomy_ids(taxonomy, area_code, competency_code, cognitive_level)

    comp = resolved["competency"]
    assertion = resolved["assertion"]
    evidence = resolved["evidence"]
    content_comp = resolved["content_component"]

    mcer_level, component_name, dce_metadata = _english_metadata(
        area_code=area_code,
        english_section=english_section,
        assertion_statement=assertion.get("statement", ""),
    )

    user_prompt = build_user_prompt(
        area_code=area_code,
        competency_name=comp.get("name", ""),
        assertion_statement=assertion.get("statement", ""),
        evidence_behavior=evidence.get("observable_behavior", "") if evidence else "",
        content_component=content_comp.get("name") if content_comp else None,
        english_section=english_section,
        mcer_level=mcer_level,
        structure_type="QUESTION_BLOCK",
    )
    retry_prompt = _build_retry_prompt(user_prompt) + _BLOCK_STRUCTURE_RETRY_SUFFIX

    data: dict | None = None
    token_usage: dict = {}
    last_parse_error: ValueError | None = None

    for attempt in (1, 2):
        attempt_prompt = user_prompt if attempt == 1 else retry_prompt
        attempt_temperature = temperature if attempt == 1 else min(temperature, 0.2)

        if provider_name == "anthropic":
            raw_text, token_usage = await _call_anthropic(
                api_key,
                model_name,
                attempt_prompt,
                max_tokens,
                attempt_temperature,
                BLOCK_SYSTEM_PROMPT,
            )
        elif provider_name == "gemini":
            raw_text, token_usage = await _call_gemini(
                api_key,
                model_name,
                attempt_prompt,
                max_tokens,
                attempt_temperature,
                BLOCK_SYSTEM_PROMPT,
            )
        else:
            raise ValueError(f"Proveedor no implementado: {provider_name}")

        try:
            data = _parse_provider_json(raw_text)
            break
        except ValueError as err:
            last_parse_error = err

    if data is None:
        if last_parse_error is not None:
            raise last_parse_error
        raise ValueError("No se pudo parsear la respuesta del proveedor")

    raw_items = _extract_valid_block_items(data)

    if dce_metadata is not None:
        ai_grammar_tags = data.get("grammar_tags", [])
        if isinstance(ai_grammar_tags, list):
            dce_metadata["grammar_tags"] = ai_grammar_tags

    items = [
        GeneratedQuestionBlockItem(
            stem=item["stem"],
            option_a=item["option_a"],
            option_b=item["option_b"],
            option_c=item["option_c"],
            option_d=item.get("option_d"),
            correct_answer=item["correct_answer"],
            explanation_correct=item["explanation_correct"],
            explanation_a=item.get("explanation_a", ""),
            explanation_b=item.get("explanation_b", ""),
            explanation_c=item.get("explanation_c", ""),
            explanation_d=item.get("explanation_d"),
            cognitive_process=item.get("cognitive_process"),
            difficulty_estimated=item.get("difficulty_estimated"),
            english_section=english_section,
            mcer_level=mcer_level,
            component_name=component_name,
            dce_metadata=dce_metadata.copy() if dce_metadata else None,
        )
        for item in raw_items
    ]

    block = GeneratedQuestionBlock(
        area_code=area_code,
        competency_code=comp.get("code", ""),
        assertion_code=assertion.get("code", ""),
        evidence_code=evidence.get("code", "") if evidence else "",
        content_component_code=content_comp.get("code") if content_comp else None,
        context=data["context"],
        context_type=data["context_type"],
        context_category=data.get("context_category"),
        items=items,
    )

    return block, token_usage, provider_name, model_name


def invalidate_taxonomy_cache():
    """Invalida el cache de taxonomía (tras cambios en el Question Bank)."""
    global _taxonomy_cache  # noqa: PLW0603
    _taxonomy_cache = None
