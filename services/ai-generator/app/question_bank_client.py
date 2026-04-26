"""Cliente HTTP para enviar preguntas generadas al Question Bank."""

import asyncio
import logging
from typing import Any

import httpx

from .config import settings
from .schemas import GeneratedQuestion, GeneratedQuestionBlock

logger = logging.getLogger(__name__)


async def _post_with_404_retry(
    send_request,
    *,
    max_attempts: int = 4,
    initial_delay_seconds: float = 0.08,
) -> httpx.Response:
    """Ejecuta un POST con reintentos cuando hay 404 transitorio.

    En entornos con versiones antiguas de Question Bank, la pregunta puede
    no ser visible inmediatamente tras el POST de creación. Reintentamos con
    backoff corto para evitar falsos negativos.
    """
    response: httpx.Response | None = None
    delay = initial_delay_seconds

    for attempt in range(1, max_attempts + 1):
        response = await send_request()
        if response.status_code != 404:
            return response

        if attempt < max_attempts:
            await asyncio.sleep(delay)
            delay *= 2

    return response if response is not None else await send_request()


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
            "context_category": question.context_category,
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
            "tags": question.tags,
            "source": "AI",
            "english_section": question.english_section,
            "mcer_level": question.mcer_level,
            "component_name": question.component_name,
            "dce_metadata": question.dce_metadata,
        }

        resp = await client.post(
            f"{settings.question_bank_url}/api/questions",
            headers=internal_headers,
            json=payload,
        )
        resp.raise_for_status()
        question_data = resp.json()

        if question.media:
            try:
                if question.media.image_bytes:
                    import io
                    ext = ".png" if "png" in question.media.image_mime_type else ".jpg"
                    mime = question.media.image_mime_type
                    form_data = {
                        "media_type": question.media.media_type,
                        "alt_text": question.media.alt_text,
                        "is_essential": "true",
                        "display_mode": question.media.display_mode,
                        "position": "0",
                    }
                    if question.media.alt_text_detailed:
                        form_data["alt_text_detailed"] = question.media.alt_text_detailed

                    async def _send_ai_image():
                        return await client.post(
                            f"{settings.question_bank_url}/api/questions/{question_data['id']}/media/ai-image",
                            headers=internal_headers,
                            files={
                                "file": (
                                    f"generated{ext}",
                                    io.BytesIO(question.media.image_bytes),
                                    mime,
                                )
                            },
                            data=form_data,
                        )

                    media_resp = await _post_with_404_retry(_send_ai_image)
                else:
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

                    async def _send_programmatic_media():
                        return await client.post(
                            f"{settings.question_bank_url}/api/questions/{question_data['id']}/media/programmatic",
                            headers=internal_headers,
                            json=media_payload,
                        )

                    media_resp = await _post_with_404_retry(_send_programmatic_media)
                media_resp.raise_for_status()
            except Exception as media_err:
                logger.warning(
                    "Fallo al crear media para pregunta %s, eliminando para evitar preguntas incompletas: %s",
                    question_data["id"],
                    media_err,
                )
                try:
                    delete_resp = await client.delete(
                        f"{settings.question_bank_url}/api/questions/{question_data['id']}",
                        headers=internal_headers,
                    )
                    # Compatibilidad hacia atrás: versiones antiguas de QB no
                    # exponen DELETE /api/questions/{id}; usar archive.
                    if delete_resp.status_code == 405:
                        archive_resp = await client.post(
                            f"{settings.question_bank_url}/api/questions/{question_data['id']}/archive",
                            headers=internal_headers,
                        )
                        if archive_resp.status_code not in {200, 404}:
                            archive_resp.raise_for_status()
                    elif delete_resp.status_code not in {204, 404}:
                        delete_resp.raise_for_status()
                except Exception as cleanup_err:
                    logger.warning(
                        "Fallo al revertir pregunta incompleta %s: %s",
                        question_data["id"],
                        cleanup_err,
                    )
                raise

        return question_data


async def send_generated_block_to_question_bank(block: GeneratedQuestionBlock) -> dict[str, Any]:
    """Envía un bloque generado al Question Bank."""
    internal_headers = {
        "X-User-Id": "0",
        "X-User-Role": "ADMIN",
        "X-Service": "ai-generator",
    }
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.get(
            f"{settings.question_bank_url}/api/taxonomy/areas/by-code/{block.area_code}",
            headers=internal_headers,
        )
        resp.raise_for_status()
        area = resp.json()

        competencies = area.get("competencies", [])
        competency = next(
            (c for c in competencies if c.get("code") == block.competency_code),
            None,
        )
        if not competency:
            raise ValueError(f"Competencia no encontrada en QB: {block.competency_code}")

        assertions = competency.get("assertions", [])
        assertion = next(
            (a for a in assertions if a.get("code") == block.assertion_code),
            None,
        )
        if not assertion:
            raise ValueError(f"Afirmacion no encontrada en QB: {block.assertion_code}")

        evidence_id = None
        if block.evidence_code:
            evidence = next(
                (
                    e
                    for e in assertion.get("evidences", [])
                    if e.get("code") == block.evidence_code
                ),
                None,
            )
            if not evidence:
                raise ValueError(f"Evidencia no encontrada en QB: {block.evidence_code}")
            evidence_id = evidence.get("id")

        content_component_id = None
        if block.content_component_code:
            content_component = next(
                (
                    cc
                    for cc in area.get("content_components", [])
                    if cc.get("code") == block.content_component_code
                ),
                None,
            )
            if not content_component:
                raise ValueError(
                    f"Componente de contenido no encontrado en QB: {block.content_component_code}"
                )
            content_component_id = content_component.get("id")

        payload = {
            "area_id": area["id"],
            "competency_id": competency["id"],
            "assertion_id": assertion["id"],
            "evidence_id": evidence_id,
            "content_component_id": content_component_id,
            "context": block.context,
            "context_type": block.context_type,
            "context_category": block.context_category,
            "source": "AI",
            "items": [item.model_dump() for item in block.items],
        }

        resp = await client.post(
            f"{settings.question_bank_url}/api/questions/blocks",
            headers=internal_headers,
            json=payload,
        )
        resp.raise_for_status()
        return resp.json()
