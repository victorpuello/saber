"""Cliente de generación IA — Anthropic + resolución de taxonomía DCE."""

import json
import logging
import random

import anthropic

from .config import settings
from .prompts import SYSTEM_PROMPT, build_user_prompt
from .schemas import GeneratedMedia, GeneratedQuestion

logger = logging.getLogger(__name__)


# =============================================================================
# Taxonomía en memoria (cargada desde Question Bank API)
# =============================================================================

_taxonomy_cache: dict | None = None


async def _fetch_taxonomy(http_client: anthropic.AsyncAnthropic | None = None) -> dict:
    """Obtiene taxonomía completa del Question Bank Service."""
    global _taxonomy_cache  # noqa: PLW0603
    if _taxonomy_cache:
        return _taxonomy_cache

    import httpx

    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.get(f"{settings.question_bank_url}/api/taxonomy/areas")
        resp.raise_for_status()
        areas = resp.json()

    taxonomy: dict = {}
    async with httpx.AsyncClient(timeout=30) as client:
        for area in areas:
            area_code = area["code"]
            resp = await client.get(
                f"{settings.question_bank_url}/api/taxonomy/areas/{area['id']}/competencies"
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


# =============================================================================
# Generación con Anthropic
# =============================================================================


async def generate_question(
    *,
    area_code: str,
    competency_code: str | None = None,
    cognitive_level: int | None = None,
    include_visual: bool = False,
    visual_type: str | None = None,
    english_section: int | None = None,
) -> tuple[GeneratedQuestion, dict]:
    """Genera una pregunta usando Anthropic Claude.

    Returns:
        (GeneratedQuestion, token_usage_dict)
    """
    taxonomy = await _fetch_taxonomy()
    resolved = _resolve_taxonomy_ids(
        taxonomy, area_code, competency_code, cognitive_level
    )

    # Datos para prompt
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

    # Llamar a Anthropic
    client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)
    response = await client.messages.create(
        model=settings.anthropic_model,
        max_tokens=settings.max_tokens,
        temperature=settings.generation_temperature,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": user_prompt}],
    )

    token_usage = {
        "input_tokens": response.usage.input_tokens,
        "output_tokens": response.usage.output_tokens,
    }

    # Parsear respuesta JSON
    raw_text = response.content[0].text.strip()
    # Limpiar posibles bloques markdown
    if raw_text.startswith("```"):
        raw_text = raw_text.split("\n", 1)[1]
        if raw_text.endswith("```"):
            raw_text = raw_text[:-3]
    raw_text = raw_text.strip()

    data = json.loads(raw_text)

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

    return question, token_usage


def invalidate_taxonomy_cache():
    """Invalida el cache de taxonomía (tras cambios en el Question Bank)."""
    global _taxonomy_cache  # noqa: PLW0603
    _taxonomy_cache = None
