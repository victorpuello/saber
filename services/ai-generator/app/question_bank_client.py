"""Cliente HTTP para enviar preguntas generadas al Question Bank."""

from typing import Any

import httpx

from .config import settings
from .schemas import GeneratedQuestion


async def send_generated_question_to_question_bank(question: GeneratedQuestion) -> dict[str, Any]:
    """Envía una pregunta generada al Question Bank como PENDING_REVIEW."""
    internal_headers = {
        "X-User-Id": "0",
        "X-User-Role": "ADMIN",
        "X-Service": "ai-generator",
    }
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.get(
            f"{settings.question_bank_url}/api/taxonomy/areas/by-code/{question.area_code}",
            headers=internal_headers,
        )
        resp.raise_for_status()
        area = resp.json()

        competencies = area.get("competencies", [])
        competency = next(
            (c for c in competencies if c.get("code") == question.competency_code),
            None,
        )
        if not competency:
            msg = f"Competencia no encontrada en QB: {question.competency_code}"
            raise ValueError(msg)

        assertions = competency.get("assertions", [])
        assertion = next(
            (a for a in assertions if a.get("code") == question.assertion_code),
            None,
        )
        if not assertion:
            msg = f"Afirmacion no encontrada en QB: {question.assertion_code}"
            raise ValueError(msg)

        evidence_id = None
        if question.evidence_code:
            evidence = next(
                (
                    e
                    for e in assertion.get("evidences", [])
                    if e.get("code") == question.evidence_code
                ),
                None,
            )
            if not evidence:
                msg = f"Evidencia no encontrada en QB: {question.evidence_code}"
                raise ValueError(msg)
            evidence_id = evidence.get("id")

        content_component_id = None
        if question.content_component_code:
            content_component = next(
                (
                    cc
                    for cc in area.get("content_components", [])
                    if cc.get("code") == question.content_component_code
                ),
                None,
            )
            if not content_component:
                msg = (
                    "Componente de contenido no encontrado en QB: "
                    f"{question.content_component_code}"
                )
                raise ValueError(msg)
            content_component_id = content_component.get("id")

        payload = {
            "area_id": area["id"],
            "competency_id": competency["id"],
            "assertion_id": assertion["id"],
            "evidence_id": evidence_id,
            "content_component_id": content_component_id,
            "context": question.context,
            "context_type": question.context_type,
            "stem": question.stem,
            "option_a": question.option_a,
            "option_b": question.option_b,
            "option_c": question.option_c,
            "option_d": question.option_d,
            "correct_answer": question.correct_answer,
            "explanation_correct": question.explanation_correct,
            "explanation_a": question.explanation_a,
            "explanation_b": question.explanation_b,
            "explanation_c": question.explanation_c,
            "explanation_d": question.explanation_d,
            "cognitive_process": question.cognitive_process,
            "difficulty_estimated": question.difficulty_estimated,
            "source": "AI",
            "english_section": question.english_section,
            "mcer_level": question.mcer_level,
        }

        resp = await client.post(
            f"{settings.question_bank_url}/api/questions",
            headers=internal_headers,
            json=payload,
        )
        resp.raise_for_status()
        question_data = resp.json()

        if question.media:
            media_payload = {
                "media_type": question.media.media_type,
                "source": "PROGRAMMATIC",
                "visual_data": question.media.visual_data,
                "render_engine": question.media.render_engine,
                "alt_text": question.media.alt_text,
                "alt_text_detailed": question.media.alt_text_detailed,
                "display_mode": question.media.display_mode,
                "is_essential": True,
                "position": 0,
            }
            media_resp = await client.post(
                f"{settings.question_bank_url}/api/questions/{question_data['id']}/media/programmatic",
                headers=internal_headers,
                json=media_payload,
            )
            media_resp.raise_for_status()

        return question_data
