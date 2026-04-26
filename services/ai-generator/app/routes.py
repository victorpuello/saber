"""Rutas API del AI Generator: sync, batch y jobs asincronos."""

import logging
import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from saber11_shared.auth import CurrentUser, require_role
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from .config import settings
from .database import get_db
from .generator import generate_question, invalidate_taxonomy_cache
from .job_worker import publish_job_queued
from .key_store import (
    encrypt_api_key,
    get_all_providers,
    get_provider_config,
    upsert_provider,
)
from .models import AIGenerationLog, GenerationJob, GenerationJobItem
from .question_bank_client import send_generated_question_to_question_bank
from .schemas import (
    AIProvider,
    BatchResponse,
    CreateGenerationJobRequest,
    GenerateBatchRequest,
    GenerateRequest,
    GenerateResponse,
    GenerationJobDetailResponse,
    GenerationJobResponse,
    GenerationStats,
    ProviderInfo,
    ProviderSetupRequest,
    ProviderUpdateRequest,
    QueueStatus,
)
from .validator import validate_question

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/ai", tags=["ai-generator"])

JOB_STATUS_QUEUED = "QUEUED"
JOB_STATUS_RUNNING = "RUNNING"
JOB_STATUS_COMPLETED = "COMPLETED"
JOB_STATUS_FAILED = "FAILED"
JOB_STATUS_PARTIAL = "PARTIAL"
JOB_STATUS_CANCELLED = "CANCELLED"

ITEM_STATUS_QUEUED = "QUEUED"
ITEM_STATUS_RUNNING = "RUNNING"
ITEM_STATUS_CANCELLED = "CANCELLED"


# ── Proveedores ───────────────────────────────────────────────────────


def _provider_to_info(provider) -> ProviderInfo:
    return ProviderInfo(
        provider=provider.provider,
        display_name=provider.display_name,
        default_model=provider.default_model,
        is_enabled=provider.is_enabled,
        max_tokens=provider.max_tokens,
        temperature=provider.temperature,
        has_api_key=provider.api_key_encrypted is not None,
    )


@router.get("/providers", response_model=list[ProviderInfo])
async def list_providers(
    db: AsyncSession = Depends(get_db),
    _user: CurrentUser = Depends(require_role("ADMIN")),
):
    """Lista todos los proveedores configurados (sin exponer API keys)."""
    providers = await get_all_providers(db)
    return [_provider_to_info(p) for p in providers]


@router.post("/providers", response_model=ProviderInfo)
async def setup_provider(
    req: ProviderSetupRequest,
    db: AsyncSession = Depends(get_db),
    _user: CurrentUser = Depends(require_role("ADMIN")),
):
    """Configura un proveedor IA con su API key (se cifra en BD)."""
    defaults = {
        "anthropic": ("Anthropic (Claude)", "claude-sonnet-4-20250514"),
        "gemini": ("Google Gemini", "gemini-2.5-flash"),
    }
    display, model = defaults.get(req.provider.value, (req.provider.value, ""))
    config = await upsert_provider(
        db,
        provider=req.provider.value,
        display_name=req.display_name or display,
        default_model=req.default_model or model,
        api_key=req.api_key,
        is_enabled=req.is_enabled,
        max_tokens=req.max_tokens,
        temperature=req.temperature,
    )
    await db.commit()
    return _provider_to_info(config)


@router.patch("/providers/{provider}", response_model=ProviderInfo)
async def update_provider(
    provider: AIProvider,
    req: ProviderUpdateRequest,
    db: AsyncSession = Depends(get_db),
    _user: CurrentUser = Depends(require_role("ADMIN")),
):
    """Actualiza configuracion de un proveedor existente."""
    config = await get_provider_config(db, provider.value)
    if not config:
        raise HTTPException(404, f"Proveedor no encontrado: {provider.value}")

    if req.display_name is not None:
        config.display_name = req.display_name
    if req.default_model is not None:
        config.default_model = req.default_model
    if req.is_enabled is not None:
        config.is_enabled = req.is_enabled
    if req.max_tokens is not None:
        config.max_tokens = req.max_tokens
    if req.temperature is not None:
        config.temperature = req.temperature
    if req.api_key is not None:
        config.api_key_encrypted = encrypt_api_key(req.api_key)

    await db.commit()
    return _provider_to_info(config)


@router.post("/providers/{provider}/test")
async def test_provider(
    provider: AIProvider,
    db: AsyncSession = Depends(get_db),
    _user: CurrentUser = Depends(require_role("ADMIN")),
):
    """Prueba la conexion con un proveedor enviando una solicitud minima."""
    import anthropic as anthropic_sdk
    import google.generativeai as genai_sdk

    from .key_store import decrypt_api_key

    config = await get_provider_config(db, provider.value)
    if not config or not config.api_key_encrypted:
        raise HTTPException(400, "Proveedor sin API key configurada.")

    try:
        api_key = decrypt_api_key(config.api_key_encrypted)
    except Exception as err:
        raise HTTPException(500, "Error descifrando la API key almacenada.") from err

    try:
        if provider.value == "anthropic":
            client = anthropic_sdk.AsyncAnthropic(api_key=api_key)
            resp = await client.messages.create(
                model=config.default_model,
                max_tokens=10,
                messages=[{"role": "user", "content": "Di solo 'ok'."}],
            )
            model_used = resp.model
        elif provider.value == "gemini":
            genai_sdk.configure(api_key=api_key)
            model = genai_sdk.GenerativeModel(model_name=config.default_model)
            await model.generate_content_async("Di solo 'ok'.")
            model_used = config.default_model
        else:
            raise HTTPException(400, f"Proveedor no soportado: {provider.value}")
    except HTTPException:
        raise
    except Exception as exc:
        logger.warning("Test de proveedor %s fallo: %s", provider.value, exc)
        return {"status": "error", "message": str(exc)[:200]}

    return {"status": "ok", "model": model_used}


# ── Generacion sincrona ───────────────────────────────────────────────


@router.post("/generate", response_model=GenerateResponse)
async def generate_single(
    req: GenerateRequest,
    db: AsyncSession = Depends(get_db),
    _user: CurrentUser = Depends(require_role("ADMIN")),
):
    """Genera una pregunta IA, valida y la envia al Question Bank."""
    try:
        question, token_usage, provider_name, model_name = await generate_question(
            db=db,
            area_code=req.area_code,
            provider=req.provider.value if req.provider else None,
            model_override=req.model,
            competency_code=req.competency_code,
            cognitive_level=req.cognitive_level,
            include_visual=req.include_visual,
            visual_type=req.visual_type.value if req.visual_type else None,
            english_section=req.english_section,
        )
    except ValueError as err:
        raise HTTPException(422, str(err)) from err
    except Exception as err:
        logger.exception("Error generando pregunta")
        raise HTTPException(502, f"Error del servicio de IA: {err!s}") from err

    validation = validate_question(question, req.area_code)
    full_model = f"{provider_name}/{model_name}"
    log_error: str | None = None

    if validation.get("is_valid"):
        try:
            await send_generated_question_to_question_bank(question)
        except Exception as err:
            logger.exception("Error enviando pregunta al Question Bank")
            warning = "Pregunta valida pero no se pudo enviar al Question Bank"
            validation.setdefault("warnings", []).append(warning)
            log_error = str(err)[:500]
    else:
        log_error = "Pregunta invalida segun validador"

    db.add(
        AIGenerationLog(
            provider=provider_name,
            model=model_name,
            area_code=req.area_code,
            is_valid=bool(validation.get("is_valid")),
            score=validation.get("quality_score"),
            input_tokens=_token_value(token_usage, "input_tokens", "prompt_tokens"),
            output_tokens=_token_value(token_usage, "output_tokens", "completion_tokens"),
            error=log_error,
        )
    )

    return GenerateResponse(
        question=question,
        validation=validation,
        ai_model=full_model,
        token_usage=token_usage,
    )


@router.post("/generate/batch", response_model=BatchResponse)
async def generate_batch(
    req: GenerateBatchRequest,
    db: AsyncSession = Depends(get_db),
    _user: CurrentUser = Depends(require_role("ADMIN")),
):
    """Genera un lote de preguntas IA en modo sincrono."""
    questions: list[GenerateResponse] = []
    errors: list[str] = []
    total_valid = 0

    for i in range(req.count):
        try:
            question, token_usage, provider_name, model_name = await generate_question(
                db=db,
                area_code=req.area_code,
                provider=req.provider.value if req.provider else None,
                model_override=req.model,
                competency_code=req.competency_code,
                cognitive_level=req.cognitive_level,
                include_visual=req.include_visual,
                visual_type=req.visual_type.value if req.visual_type else None,
                english_section=req.english_section,
            )
            validation = validate_question(question, req.area_code)
            full_model = f"{provider_name}/{model_name}"
            log_error: str | None = None

            if validation.get("is_valid"):
                total_valid += 1
                try:
                    await send_generated_question_to_question_bank(question)
                except Exception as err:
                    logger.exception("Error enviando pregunta %d al QB", i + 1)
                    log_error = str(err)[:500]
            else:
                log_error = "Pregunta invalida segun validador"

            db.add(
                AIGenerationLog(
                    provider=provider_name,
                    model=model_name,
                    area_code=req.area_code,
                    is_valid=bool(validation.get("is_valid")),
                    score=validation.get("quality_score"),
                    input_tokens=_token_value(token_usage, "input_tokens", "prompt_tokens"),
                    output_tokens=_token_value(
                        token_usage,
                        "output_tokens",
                        "completion_tokens",
                    ),
                    error=log_error,
                )
            )

            questions.append(
                GenerateResponse(
                    question=question,
                    validation=validation,
                    ai_model=full_model,
                    token_usage=token_usage,
                )
            )
        except Exception as err:
            logger.exception("Error generando pregunta %d/%d", i + 1, req.count)
            errors.append(f"Pregunta {i + 1}: {err!s}")

    return BatchResponse(
        total_requested=req.count,
        total_generated=len(questions),
        total_valid=total_valid,
        questions=questions,
        errors=errors,
    )


# ── Jobs asincronos ───────────────────────────────────────────────────


@router.post("/jobs", response_model=GenerationJobResponse, status_code=status.HTTP_202_ACCEPTED)
async def create_generation_job(
    req: CreateGenerationJobRequest,
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(require_role("ADMIN")),
):
    """Encola un job de generacion en background."""
    active_jobs_stmt = select(func.count()).where(
        GenerationJob.requested_by_user_id == user.user_id,
        GenerationJob.status.in_([JOB_STATUS_QUEUED, JOB_STATUS_RUNNING]),
    )
    active_jobs = (await db.execute(active_jobs_stmt)).scalar_one()
    if active_jobs >= settings.ai_jobs_max_active_per_user:
        raise HTTPException(
            status_code=429,
            detail=(
                "Tienes demasiados jobs activos. Espera a que termine uno para encolar otro."
            ),
        )

    job = await _create_generation_job(
        db=db,
        requested_by_user_id=user.user_id,
        requested_by_role=user.role,
        area_code=req.area_code,
        provider=req.provider.value if req.provider else None,
        model=req.model,
        count=req.count,
        structure_type=req.structure_type.value,
        include_visual=req.include_visual,
        visual_type=req.visual_type.value if req.visual_type else None,
        competency_code=req.competency_code,
        cognitive_level=req.cognitive_level,
        english_section=req.english_section,
    )
    await db.commit()

    try:
        await publish_job_queued(job.id)
    except Exception as err:
        logger.exception("No se pudo publicar job %s", job.id)
        job.status = JOB_STATUS_FAILED
        job.error_summary = f"No se pudo encolar en Redis: {err!s}"[:500]
        job.finished_at = datetime.now(UTC)
        await db.commit()
        raise HTTPException(503, "No se pudo encolar el job en Redis") from err

    await db.refresh(job)
    return _job_to_response(job)


@router.get("/jobs", response_model=list[GenerationJobResponse])
async def list_generation_jobs(
    limit: int = Query(20, ge=1, le=100),
    mine_only: bool = Query(True),
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(require_role("ADMIN")),
):
    """Lista jobs de generacion recientes."""
    stmt = select(GenerationJob).order_by(GenerationJob.created_at.desc()).limit(limit)
    if mine_only:
        stmt = stmt.where(GenerationJob.requested_by_user_id == user.user_id)

    result = await db.execute(stmt)
    jobs = result.scalars().unique().all()
    return [_job_to_response(job) for job in jobs]


@router.get("/jobs/{job_id}", response_model=GenerationJobDetailResponse)
async def get_generation_job(
    job_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(require_role("ADMIN")),
):
    """Obtiene detalle completo de un job."""
    result = await db.execute(
        select(GenerationJob)
        .options(selectinload(GenerationJob.items))
        .where(GenerationJob.id == job_id)
    )
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(404, "Job no encontrado")

    if job.requested_by_user_id != user.user_id:
        raise HTTPException(403, "No tienes acceso a este job")

    return _job_to_detail_response(job)


@router.post("/jobs/{job_id}/cancel", response_model=GenerationJobResponse)
async def cancel_generation_job(
    job_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(require_role("ADMIN")),
):
    """Cancela un job encolado o marca cancelacion para uno en ejecucion."""
    job = await db.get(GenerationJob, job_id)
    if not job:
        raise HTTPException(404, "Job no encontrado")

    if job.requested_by_user_id != user.user_id:
        raise HTTPException(403, "No tienes acceso a este job")

    if job.status in {JOB_STATUS_COMPLETED, JOB_STATUS_FAILED, JOB_STATUS_PARTIAL, JOB_STATUS_CANCELLED}:
        return _job_to_response(job)

    job.cancel_requested = True
    if job.status == JOB_STATUS_QUEUED:
        job.status = JOB_STATUS_CANCELLED
        job.finished_at = datetime.now(UTC)

        result = await db.execute(
            select(GenerationJobItem).where(
                GenerationJobItem.job_id == job.id,
                GenerationJobItem.status.in_([ITEM_STATUS_QUEUED, ITEM_STATUS_RUNNING]),
            )
        )
        for item in result.scalars().all():
            item.status = ITEM_STATUS_CANCELLED
            item.finished_at = datetime.now(UTC)

    await db.commit()
    await db.refresh(job)
    return _job_to_response(job)


@router.delete("/jobs/{job_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_generation_job(
    job_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(require_role("ADMIN")),
):
    """Elimina un job terminado (completed/partial/failed/cancelled) del historial."""
    job = await db.get(GenerationJob, job_id)
    if not job:
        raise HTTPException(404, "Job no encontrado")

    if job.requested_by_user_id != user.user_id:
        raise HTTPException(403, "No tienes acceso a este job")

    if job.status not in {JOB_STATUS_COMPLETED, JOB_STATUS_PARTIAL, JOB_STATUS_FAILED, JOB_STATUS_CANCELLED}:
        raise HTTPException(409, "Solo se pueden eliminar jobs terminados")

    await db.delete(job)
    await db.commit()


@router.post("/jobs/{job_id}/retry", response_model=GenerationJobResponse)
async def retry_generation_job(
    job_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(require_role("ADMIN")),
):
    """Reencola un job terminado (failed/partial/cancelled)."""
    source_job = await db.get(GenerationJob, job_id)
    if not source_job:
        raise HTTPException(404, "Job no encontrado")

    if source_job.requested_by_user_id != user.user_id:
        raise HTTPException(403, "No tienes acceso a este job")

    if source_job.status in {JOB_STATUS_QUEUED, JOB_STATUS_RUNNING}:
        raise HTTPException(409, "El job aun esta en progreso")

    active_jobs_stmt = select(func.count()).where(
        GenerationJob.requested_by_user_id == user.user_id,
        GenerationJob.status.in_([JOB_STATUS_QUEUED, JOB_STATUS_RUNNING]),
    )
    active_jobs = (await db.execute(active_jobs_stmt)).scalar_one()
    if active_jobs >= settings.ai_jobs_max_active_per_user:
        raise HTTPException(
            status_code=429,
            detail=(
                "Tienes demasiados jobs activos. Espera a que termine uno para encolar otro."
            ),
        )

    retry_job = await _create_generation_job(
        db=db,
        requested_by_user_id=user.user_id,
        requested_by_role=user.role,
        area_code=source_job.area_code,
        provider=source_job.provider,
        model=source_job.model,
        count=source_job.total_requested,
        structure_type=source_job.structure_type,
        include_visual=source_job.include_visual,
        visual_type=source_job.visual_type,
        competency_code=source_job.competency_code,
        cognitive_level=source_job.cognitive_level,
        english_section=source_job.english_section,
        retry_of_job_id=source_job.id,
    )
    await db.commit()

    try:
        await publish_job_queued(retry_job.id)
    except Exception as err:
        logger.exception("No se pudo publicar retry job %s", retry_job.id)
        retry_job.status = JOB_STATUS_FAILED
        retry_job.error_summary = f"No se pudo encolar en Redis: {err!s}"[:500]
        retry_job.finished_at = datetime.now(UTC)
        await db.commit()
        raise HTTPException(503, "No se pudo encolar el retry job") from err

    await db.refresh(retry_job)
    return _job_to_response(retry_job)


# ── Estado y metricas ────────────────────────────────────────────────


@router.get("/queue", response_model=QueueStatus)
async def get_queue_status(
    db: AsyncSession = Depends(get_db),
    _user: CurrentUser = Depends(require_role("ADMIN")),
):
    """Estado agregado de la cola de jobs."""
    today = datetime.now(UTC).date()

    pending_stmt = select(func.count()).where(GenerationJob.status == JOB_STATUS_QUEUED)
    processing_stmt = select(func.count()).where(GenerationJob.status == JOB_STATUS_RUNNING)
    completed_today_stmt = select(func.count()).where(
        GenerationJob.status.in_([JOB_STATUS_COMPLETED, JOB_STATUS_PARTIAL]),
        func.date(GenerationJob.finished_at) == today,
    )
    failed_today_stmt = select(func.count()).where(
        GenerationJob.status == JOB_STATUS_FAILED,
        func.date(GenerationJob.finished_at) == today,
    )

    pending = (await db.execute(pending_stmt)).scalar_one()
    processing = (await db.execute(processing_stmt)).scalar_one()
    completed_today = (await db.execute(completed_today_stmt)).scalar_one()
    failed_today = (await db.execute(failed_today_stmt)).scalar_one()

    return QueueStatus(
        pending=pending,
        processing=processing,
        completed_today=completed_today,
        failed_today=failed_today,
    )


@router.get("/stats", response_model=GenerationStats)
async def get_generation_stats(
    db: AsyncSession = Depends(get_db),
    _user: CurrentUser = Depends(require_role("ADMIN")),
):
    """Estadisticas de generacion IA basadas en logs persistentes."""
    total_stmt = select(func.count()).select_from(AIGenerationLog)
    approved_stmt = select(func.count()).where(AIGenerationLog.is_valid.is_(True))

    total_generated = (await db.execute(total_stmt)).scalar_one()
    total_approved = (await db.execute(approved_stmt)).scalar_one()
    total_rejected = total_generated - total_approved

    by_area_result = await db.execute(
        select(AIGenerationLog.area_code, func.count()).group_by(AIGenerationLog.area_code)
    )
    by_area = {area: count for area, count in by_area_result.all()}

    by_model_result = await db.execute(
        select(AIGenerationLog.provider, AIGenerationLog.model, func.count()).group_by(
            AIGenerationLog.provider,
            AIGenerationLog.model,
        )
    )
    by_model = {f"{provider}/{model}": count for provider, model, count in by_model_result.all()}

    approval_rate = round(total_approved / total_generated, 2) if total_generated else 0.0

    return GenerationStats(
        total_generated=total_generated,
        total_approved=total_approved,
        total_rejected=total_rejected,
        approval_rate=approval_rate,
        by_area=by_area,
        by_model=by_model,
    )


# ── Cache ─────────────────────────────────────────────────────────────


@router.post("/cache/invalidate")
async def invalidate_cache(
    _user: CurrentUser = Depends(require_role("ADMIN")),
):
    """Invalida el cache de taxonomia DCE."""
    invalidate_taxonomy_cache()
    return {"status": "ok", "message": "Cache de taxonomia invalidado"}


# ── Helpers ───────────────────────────────────────────────────────────


def _token_value(token_usage: dict | None, *keys: str) -> int | None:
    if not token_usage:
        return None
    for key in keys:
        value = token_usage.get(key)
        if isinstance(value, int):
            return value
    return None


def _job_progress_percent(job: GenerationJob) -> float:
    if not job.total_requested:
        return 0.0
    return round((job.total_processed / job.total_requested) * 100, 2)


def _job_to_response(job: GenerationJob) -> GenerationJobResponse:
    return GenerationJobResponse(
        id=job.id,
        status=job.status,
        cancel_requested=job.cancel_requested,
        requested_by_user_id=job.requested_by_user_id,
        requested_by_role=job.requested_by_role,
        area_code=job.area_code,
        provider=job.provider,
        model=job.model,
        competency_code=job.competency_code,
        cognitive_level=job.cognitive_level,
        structure_type=job.structure_type,
        include_visual=job.include_visual,
        visual_type=job.visual_type,
        english_section=job.english_section,
        total_requested=job.total_requested,
        total_processed=job.total_processed,
        total_generated=job.total_generated,
        total_valid=job.total_valid,
        total_failed=job.total_failed,
        progress_percent=_job_progress_percent(job),
        error_summary=job.error_summary,
        retry_of_job_id=job.retry_of_job_id,
        created_at=job.created_at,
        started_at=job.started_at,
        finished_at=job.finished_at,
        updated_at=job.updated_at,
    )


def _job_to_detail_response(job: GenerationJob) -> GenerationJobDetailResponse:
    base = _job_to_response(job).model_dump()
    items = sorted(job.items, key=lambda item: item.item_index)
    base["items"] = [
        {
            "id": item.id,
            "item_index": item.item_index,
            "status": item.status,
            "provider": item.provider,
            "model": item.model,
            "is_valid": item.is_valid,
            "error": item.error,
            "token_input": item.token_input,
            "token_output": item.token_output,
            "created_question_area_code": item.created_question_area_code,
            "created_question_competency_code": item.created_question_competency_code,
            "created_question_assertion_code": item.created_question_assertion_code,
            "created_question_evidence_code": item.created_question_evidence_code,
            "created_at": item.created_at,
            "started_at": item.started_at,
            "finished_at": item.finished_at,
        }
        for item in items
    ]
    return GenerationJobDetailResponse.model_validate(base)


async def _create_generation_job(
    db: AsyncSession,
    requested_by_user_id: int,
    requested_by_role: str,
    area_code: str,
    provider: str | None,
    model: str | None,
    count: int,
    structure_type: str,
    include_visual: bool,
    visual_type: str | None,
    competency_code: str | None,
    cognitive_level: int | None,
    english_section: int | None,
    retry_of_job_id: uuid.UUID | None = None,
) -> GenerationJob:
    job = GenerationJob(
        requested_by_user_id=requested_by_user_id,
        requested_by_role=requested_by_role,
        status=JOB_STATUS_QUEUED,
        cancel_requested=False,
        area_code=area_code,
        provider=provider,
        model=model,
        competency_code=competency_code,
        cognitive_level=cognitive_level,
        structure_type=structure_type,
        include_visual=include_visual,
        visual_type=visual_type,
        english_section=english_section,
        total_requested=count,
        total_processed=0,
        total_generated=0,
        total_valid=0,
        total_failed=0,
        error_summary=None,
        retry_of_job_id=retry_of_job_id,
    )
    db.add(job)
    await db.flush()

    db.add_all(
        [
            GenerationJobItem(
                job_id=job.id,
                item_index=index,
                status=ITEM_STATUS_QUEUED,
            )
            for index in range(1, count + 1)
        ]
    )
    await db.flush()
    return job
