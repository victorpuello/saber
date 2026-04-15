"""Rutas API del AI Generator — generación individual, batch, stats."""

import logging

import httpx
from fastapi import APIRouter, Depends, HTTPException
from saber11_shared.auth import CurrentUser, require_role

from .config import settings
from .generator import generate_question, invalidate_taxonomy_cache
from .schemas import (
    BatchResponse,
    GenerateBatchRequest,
    GenerateRequest,
    GenerateResponse,
    GenerationStats,
    QueueStatus,
)
from .validator import validate_question

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/ai", tags=["ai-generator"])

# Contadores en memoria (en producción: Redis o base de datos)
_stats = {
    "generated": 0,
    "valid": 0,
    "invalid": 0,
    "by_area": {},
    "by_model": {},
}


# ── Generar una pregunta ──────────────────────────────────────────────


@router.post("/generate", response_model=GenerateResponse)
async def generate_single(
    req: GenerateRequest,
    _user: CurrentUser = Depends(require_role("ADMIN")),
):
    """Genera una pregunta IA con validación automática y la envía al Question Bank."""
    try:
        question, token_usage = await generate_question(
            area_code=req.area_code,
            competency_code=req.competency_code,
            cognitive_level=req.cognitive_level,
            include_visual=req.include_visual,
            visual_type=req.visual_type.value if req.visual_type else None,
            english_section=req.english_section,
        )
    except ValueError as e:
        raise HTTPException(422, str(e)) from e
    except Exception as e:
        logger.exception("Error generando pregunta")
        raise HTTPException(502, f"Error del servicio de IA: {e!s}") from e

    # Validar calidad
    validation = validate_question(question, req.area_code)

    # Actualizar stats
    _stats["generated"] += 1
    _stats["by_area"][req.area_code] = _stats["by_area"].get(req.area_code, 0) + 1
    _stats["by_model"][settings.anthropic_model] = (
        _stats["by_model"].get(settings.anthropic_model, 0) + 1
    )

    if validation["is_valid"]:
        _stats["valid"] += 1
        # Enviar al Question Bank como PENDING_REVIEW
        try:
            await _send_to_question_bank(question)
        except Exception:
            logger.exception("Error enviando pregunta al Question Bank")
            validation["warnings"].append(
                "Pregunta válida pero no se pudo enviar al Question Bank"
            )
    else:
        _stats["invalid"] += 1

    return GenerateResponse(
        question=question,
        validation=validation,
        ai_model=settings.anthropic_model,
        token_usage=token_usage,
    )


# ── Generación en lote ────────────────────────────────────────────────


@router.post("/generate/batch", response_model=BatchResponse)
async def generate_batch(
    req: GenerateBatchRequest,
    _user: CurrentUser = Depends(require_role("ADMIN")),
):
    """Genera un lote de preguntas IA."""
    questions: list[GenerateResponse] = []
    errors: list[str] = []
    total_valid = 0

    for i in range(req.count):
        try:
            question, token_usage = await generate_question(
                area_code=req.area_code,
                competency_code=req.competency_code,
                cognitive_level=req.cognitive_level,
                include_visual=req.include_visual,
                visual_type=req.visual_type.value if req.visual_type else None,
            )
            validation = validate_question(question, req.area_code)

            _stats["generated"] += 1
            _stats["by_area"][req.area_code] = _stats["by_area"].get(req.area_code, 0) + 1

            if validation["is_valid"]:
                _stats["valid"] += 1
                total_valid += 1
                try:
                    await _send_to_question_bank(question)
                except Exception:
                    logger.exception("Error enviando pregunta %d al QB", i + 1)
            else:
                _stats["invalid"] += 1

            questions.append(
                GenerateResponse(
                    question=question,
                    validation=validation,
                    ai_model=settings.anthropic_model,
                    token_usage=token_usage,
                )
            )
        except Exception as e:
            logger.exception("Error generando pregunta %d/%d", i + 1, req.count)
            errors.append(f"Pregunta {i + 1}: {e!s}")

    return BatchResponse(
        total_requested=req.count,
        total_generated=len(questions),
        total_valid=total_valid,
        questions=questions,
        errors=errors,
    )


# ── Estado de cola ────────────────────────────────────────────────────


@router.get("/queue", response_model=QueueStatus)
async def get_queue_status(
    _user: CurrentUser = Depends(require_role("ADMIN")),
):
    """Estado de la cola de generación (simplificado: contadores en memoria)."""
    return QueueStatus(
        completed_today=_stats["generated"],
        failed_today=_stats["invalid"],
    )


# ── Estadísticas de generación ────────────────────────────────────────


@router.get("/stats", response_model=GenerationStats)
async def get_generation_stats(
    _user: CurrentUser = Depends(require_role("ADMIN")),
):
    """Estadísticas de generación IA con tasa de aprobación/rechazo."""
    total = _stats["generated"]
    valid = _stats["valid"]
    return GenerationStats(
        total_generated=total,
        total_approved=valid,
        total_rejected=_stats["invalid"],
        approval_rate=round(valid / total, 2) if total > 0 else 0.0,
        by_area=_stats["by_area"],
        by_model=_stats["by_model"],
    )


# ── Configuración ────────────────────────────────────────────────────


@router.put("/config")
async def update_config(
    model: str | None = None,
    temperature: float | None = None,
    max_tokens: int | None = None,
    _user: CurrentUser = Depends(require_role("ADMIN")),
):
    """Actualiza parámetros del generador en caliente."""
    updated = {}
    if model is not None:
        settings.anthropic_model = model
        updated["anthropic_model"] = model
    if temperature is not None:
        settings.generation_temperature = temperature
        updated["generation_temperature"] = temperature
    if max_tokens is not None:
        settings.max_tokens = max_tokens
        updated["max_tokens"] = max_tokens
    return {"status": "ok", "updated": updated}


@router.post("/cache/invalidate")
async def invalidate_cache(
    _user: CurrentUser = Depends(require_role("ADMIN")),
):
    """Invalida el cache de taxonomía DCE."""
    invalidate_taxonomy_cache()
    return {"status": "ok", "message": "Cache de taxonomía invalidado"}


# =============================================================================
# Helper: enviar pregunta al Question Bank
# =============================================================================


async def _send_to_question_bank(question) -> None:
    """Envía una pregunta generada al Question Bank como PENDING_REVIEW.

    Resuelve códigos de taxonomía a IDs consultando la API del QB.
    """
    async with httpx.AsyncClient(timeout=30) as client:
        # Resolver area_id por código
        resp = await client.get(
            f"{settings.question_bank_url}/api/taxonomy/areas/by-code/{question.area_code}"
        )
        resp.raise_for_status()
        area = resp.json()

        payload = {
            "area_id": area["id"],
            "competency_code": question.competency_code,
            "assertion_code": question.assertion_code,
            "evidence_code": question.evidence_code,
            "content_component_code": question.content_component_code,
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
            "created_by_ai_model": settings.anthropic_model,
            "english_section": question.english_section,
            "mcer_level": question.mcer_level,
        }

        # Crear la pregunta en el QB (será creada en PENDING_REVIEW)
        resp = await client.post(
            f"{settings.question_bank_url}/api/questions/",
            headers={
                "X-User-Id": "0",
                "X-User-Role": "ADMIN",
                "X-Service": "ai-generator",
            },
            json=payload,
        )
        resp.raise_for_status()

        # Si hay media programática, enviarla
        if question.media:
            q_data = resp.json()
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
            await client.post(
                f"{settings.question_bank_url}/api/questions/{q_data['id']}/media/programmatic",
                headers={
                    "X-User-Id": "0",
                    "X-User-Role": "ADMIN",
                    "X-Service": "ai-generator",
                },
                json=media_payload,
            )
