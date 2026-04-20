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
from .prompts import SYSTEM_PROMPT, build_user_prompt
from .schemas import GeneratedMedia, GeneratedQuestion

logger = logging.getLogger(__name__)

_JSON_RETRY_SUFFIX = """

IMPORTANTE DE FORMATO:
- Devuelve SOLO un objeto JSON valido (sin markdown ni texto adicional).
- No uses saltos de linea literales dentro de strings; usa una sola linea por campo.
- Escapa comillas dobles internas con \\\" cuando sea necesario.
- Manten explanation_correct y explanation_a/b/c/d en maximo 2 frases cada una.
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


# =============================================================================
# Generación multi-proveedor
# =============================================================================


async def _call_anthropic(
    api_key: str, model: str, user_prompt: str, max_tokens: int, temperature: float
) -> tuple[str, dict]:
    """Llama a Anthropic Claude y retorna (texto_respuesta, token_usage)."""
    client = anthropic.AsyncAnthropic(api_key=api_key)
    response = await client.messages.create(
        model=model,
        max_tokens=max_tokens,
        temperature=temperature,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": user_prompt}],
    )
    token_usage = {
        "input_tokens": response.usage.input_tokens,
        "output_tokens": response.usage.output_tokens,
    }
    return response.content[0].text.strip(), token_usage


async def _call_gemini(
    api_key: str, model: str, user_prompt: str, max_tokens: int, temperature: float
) -> tuple[str, dict]:
    """Llama a Google Gemini y retorna (texto_respuesta, token_usage)."""
    genai.configure(api_key=api_key)
    gemini_model = genai.GenerativeModel(
        model_name=model,
        system_instruction=SYSTEM_PROMPT,
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

    model_name = model_override or provider_config.default_model
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

    # MCER level para inglés
    mcer_level = None
    if area_code == "ING" and english_section:
        if english_section <= 3:
            mcer_level = "A-" if english_section == 1 else "A1"
        elif english_section <= 5:
            mcer_level = "A2"
        elif english_section == 6:
            mcer_level = "B1"
        else:
            mcer_level = "B+"

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
    )

    retry_prompt = _build_retry_prompt(user_prompt)
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
            )
        elif provider_name == "gemini":
            raw_text, token_usage = await _call_gemini(
                api_key,
                model_name,
                attempt_prompt,
                max_tokens,
                attempt_temperature,
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
        media = GeneratedMedia(
            media_type=data.get("visual_type", visual_type or "chart"),
            render_engine=data.get("visual_render_engine", "chart_js"),
            visual_data=visual_data_raw,
            alt_text=data.get("visual_alt_text", ""),
            alt_text_detailed=data.get("visual_alt_text_detailed"),
            display_mode="ABOVE_STEM",
        )

    question = GeneratedQuestion(
        area_code=area_code,
        competency_code=comp.get("code", ""),
        assertion_code=assertion.get("code", ""),
        evidence_code=evidence.get("code", "") if evidence else "",
        content_component_code=content_comp.get("code") if content_comp else None,
        context=data["context"],
        context_type=data["context_type"],
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
        media=media,
    )

    return question, token_usage, provider_name, model_name


def invalidate_taxonomy_cache():
    """Invalida el cache de taxonomía (tras cambios en el Question Bank)."""
    global _taxonomy_cache  # noqa: PLW0603
    _taxonomy_cache = None
