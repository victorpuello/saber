"""Worker de jobs de generacion IA en Redis Streams."""

import asyncio
import json
import logging
import uuid
from datetime import UTC, datetime

from saber11_shared.events import EventBus
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from .config import settings
from .generator import generate_question, generate_question_block
from .models import AIGenerationLog, GenerationJob, GenerationJobItem
from .question_bank_client import send_generated_block_to_question_bank, send_generated_question_to_question_bank
from .validator import validate_question, validate_question_block

logger = logging.getLogger(__name__)

JOB_EVENT_TYPE = "ai.generation.job.queued"
CONSUMER_GROUP = settings.ai_jobs_consumer_group
CONSUMER_NAME = settings.ai_jobs_consumer_name

JOB_STATUS_QUEUED = "QUEUED"
JOB_STATUS_RUNNING = "RUNNING"
JOB_STATUS_COMPLETED = "COMPLETED"
JOB_STATUS_FAILED = "FAILED"
JOB_STATUS_PARTIAL = "PARTIAL"
JOB_STATUS_CANCELLED = "CANCELLED"

ITEM_STATUS_QUEUED = "QUEUED"
ITEM_STATUS_RUNNING = "RUNNING"
ITEM_STATUS_COMPLETED = "COMPLETED"
ITEM_STATUS_FAILED = "FAILED"
ITEM_STATUS_CANCELLED = "CANCELLED"

_event_bus: EventBus | None = None


def configure_job_event_bus(event_bus: EventBus) -> None:
    """Registra la instancia de EventBus para publicar jobs encolados."""
    global _event_bus  # noqa: PLW0603
    _event_bus = event_bus


async def publish_job_queued(job_id: uuid.UUID) -> str:
    """Publica el evento de job encolado para su procesamiento."""
    if _event_bus is None:
        raise RuntimeError("EventBus de jobs no configurado")
    return await _event_bus.publish(JOB_EVENT_TYPE, {"job_id": str(job_id)})


class GenerationJobWorker:
    """Consumidor de eventos y ejecutor de jobs de generacion."""

    def __init__(
        self,
        event_bus: EventBus,
        session_factory: async_sessionmaker[AsyncSession],
    ) -> None:
        self._bus = event_bus
        self._sf = session_factory
        self._running = False

    async def start(self) -> None:
        """Inicia loop de consumo de eventos de jobs."""
        self._running = True
        logger.info("GenerationJobWorker iniciado")

        await self._requeue_pending_jobs()

        while self._running:
            try:
                events = await self._bus.consume(
                    CONSUMER_GROUP,
                    CONSUMER_NAME,
                    count=10,
                    block_ms=3000,
                )
                for msg_id, data in events:
                    await self._process_event(msg_id, data)
            except Exception:
                logger.exception("Error en loop del GenerationJobWorker")
                await asyncio.sleep(2)

    async def stop(self) -> None:
        self._running = False

    async def _requeue_pending_jobs(self) -> None:
        """Reencola jobs pendientes por reinicios o fallos del worker."""
        async with self._sf() as db:
            result = await db.execute(
                select(GenerationJob.id).where(
                    GenerationJob.status.in_([JOB_STATUS_QUEUED, JOB_STATUS_RUNNING])
                )
            )
            job_ids = [row[0] for row in result.all()]

        for job_id in job_ids:
            try:
                await self._bus.publish(JOB_EVENT_TYPE, {"job_id": str(job_id)})
            except Exception:
                logger.exception("No se pudo reencolar job %s", job_id)

    async def _process_event(self, msg_id: str, data: dict) -> None:
        event_type = data.get("type", "")
        payload = json.loads(data.get("payload", "{}"))

        if event_type != JOB_EVENT_TYPE:
            await self._bus.ack(CONSUMER_GROUP, msg_id)
            return

        raw_job_id = payload.get("job_id")
        if not raw_job_id:
            await self._bus.ack(CONSUMER_GROUP, msg_id)
            return

        try:
            job_id = uuid.UUID(raw_job_id)
        except (TypeError, ValueError):
            await self._bus.ack(CONSUMER_GROUP, msg_id)
            return

        try:
            await run_generation_job(self._sf, job_id)
            await self._bus.ack(CONSUMER_GROUP, msg_id)
        except Exception:
            logger.exception("Error procesando job %s", job_id)


async def run_generation_job(
    session_factory: async_sessionmaker[AsyncSession],
    job_id: uuid.UUID,
) -> None:
    """Procesa un job de generacion completo."""
    logger.info("Iniciando procesamiento de job %s", job_id)
    params = await _mark_job_running(session_factory, job_id)
    if not params:
        logger.info("Job %s omitido (ya terminal o inexistente)", job_id)
        return

    for item_index in range(1, params["total_requested"] + 1):
        should_stop = await _process_job_item(session_factory, job_id, item_index, params)
        if should_stop:
            break

    await _finalize_job(session_factory, job_id)
    logger.info("Finalizado procesamiento de job %s", job_id)


async def _mark_job_running(
    session_factory: async_sessionmaker[AsyncSession],
    job_id: uuid.UUID,
) -> dict | None:
    async with session_factory() as db:
        job = await db.get(GenerationJob, job_id)
        if not job:
            return None

        if job.status in {JOB_STATUS_COMPLETED, JOB_STATUS_FAILED, JOB_STATUS_PARTIAL, JOB_STATUS_CANCELLED}:
            return None

        if job.status == JOB_STATUS_QUEUED:
            job.status = JOB_STATUS_RUNNING
            if not job.started_at:
                job.started_at = datetime.now(UTC)
            await db.commit()

        return {
            "area_code": job.area_code,
            "provider": job.provider,
            "model": job.model,
            "competency_code": job.competency_code,
            "cognitive_level": job.cognitive_level,
            "structure_type": job.structure_type,
            "include_visual": job.include_visual,
            "visual_type": job.visual_type,
            "english_section": job.english_section,
            "total_requested": job.total_requested,
        }


async def _process_job_item(
    session_factory: async_sessionmaker[AsyncSession],
    job_id: uuid.UUID,
    item_index: int,
    params: dict,
) -> bool:
    """Procesa un item del job. Retorna True cuando debe detener el loop."""
    async with session_factory() as db:
        job = await db.get(GenerationJob, job_id)
        if not job:
            return True

        if job.cancel_requested or job.status == JOB_STATUS_CANCELLED:
            await _mark_job_cancelled(db, job)
            return True

        item = await _get_or_create_item(db, job_id, item_index)
        if item.status in {ITEM_STATUS_COMPLETED, ITEM_STATUS_FAILED, ITEM_STATUS_CANCELLED}:
            return False

        item.status = ITEM_STATUS_RUNNING
        item.started_at = datetime.now(UTC)
        await db.commit()

        logger.info("Procesando job %s item %s", job_id, item_index)

        try:
            if params["structure_type"] == "QUESTION_BLOCK":
                block, token_usage, provider_name, model_name = await asyncio.wait_for(
                    generate_question_block(
                        db=db,
                        area_code=params["area_code"],
                        provider=params["provider"],
                        model_override=params["model"],
                        competency_code=params["competency_code"],
                        cognitive_level=params["cognitive_level"],
                        english_section=params["english_section"],
                    ),
                    timeout=settings.ai_jobs_item_timeout_seconds,
                )
                validation = validate_question_block(block, params["area_code"])
                item.created_question_area_code = block.area_code
                item.created_question_competency_code = block.competency_code
                item.created_question_assertion_code = block.assertion_code
                item.created_question_evidence_code = block.evidence_code

                if validation.get("is_valid"):
                    await send_generated_block_to_question_bank(block)
                    item.is_valid = True
                    item.status = ITEM_STATUS_COMPLETED
                    job.total_valid += 1
                else:
                    item.is_valid = False
                    item.status = ITEM_STATUS_FAILED
                    item.error = "Bloque invalido segun validador"
                    job.total_failed += 1
            else:
                question, token_usage, provider_name, model_name = await asyncio.wait_for(
                    generate_question(
                        db=db,
                        area_code=params["area_code"],
                        provider=params["provider"],
                        model_override=params["model"],
                        competency_code=params["competency_code"],
                        cognitive_level=params["cognitive_level"],
                        include_visual=params["include_visual"],
                        visual_type=params["visual_type"],
                        english_section=params["english_section"],
                    ),
                    timeout=settings.ai_jobs_item_timeout_seconds,
                )

                validation = validate_question(question, params["area_code"])
                item.created_question_area_code = question.area_code
                item.created_question_competency_code = question.competency_code
                item.created_question_assertion_code = question.assertion_code
                item.created_question_evidence_code = question.evidence_code

                if validation.get("is_valid"):
                    await send_generated_question_to_question_bank(question)
                    item.is_valid = True
                    item.status = ITEM_STATUS_COMPLETED
                    job.total_valid += 1
                else:
                    item.is_valid = False
                    item.status = ITEM_STATUS_FAILED
                    item.error = "Pregunta invalida segun validador"
                    job.total_failed += 1

            item.provider = provider_name
            item.model = model_name
            item.token_input = _pick_token(token_usage, "input_tokens", "prompt_tokens")
            item.token_output = _pick_token(token_usage, "output_tokens", "completion_tokens")
            job.total_generated += 1

            log = AIGenerationLog(
                provider=provider_name,
                model=model_name,
                area_code=params["area_code"],
                is_valid=bool(validation.get("is_valid")),
                score=validation.get("score"),
                input_tokens=item.token_input,
                output_tokens=item.token_output,
                error=item.error,
            )
            db.add(log)
        except TimeoutError:
            err_msg = (
                f"Timeout de generación ({settings.ai_jobs_item_timeout_seconds}s) "
                f"en item {item_index}"
            )
            item.status = ITEM_STATUS_FAILED
            item.error = err_msg
            job.total_failed += 1
            job.error_summary = _append_error(job.error_summary, f"Item {item_index}: {err_msg}")

            log = AIGenerationLog(
                provider=item.provider or job.provider or "unknown",
                model=item.model or job.model or "unknown",
                area_code=params["area_code"],
                is_valid=False,
                score=None,
                input_tokens=item.token_input,
                output_tokens=item.token_output,
                error=err_msg,
            )
            db.add(log)
        except Exception as exc:
            err_msg = str(exc)[:500]
            item.status = ITEM_STATUS_FAILED
            item.error = err_msg
            job.total_failed += 1
            job.error_summary = _append_error(job.error_summary, f"Item {item_index}: {err_msg}")

            log = AIGenerationLog(
                provider=item.provider or job.provider or "unknown",
                model=item.model or job.model or "unknown",
                area_code=params["area_code"],
                is_valid=False,
                score=None,
                input_tokens=item.token_input,
                output_tokens=item.token_output,
                error=err_msg,
            )
            db.add(log)

        job.total_processed += 1
        item.finished_at = datetime.now(UTC)
        await db.commit()

        logger.info(
            "Job %s item %s finalizado con estado=%s",
            job_id,
            item_index,
            item.status,
        )

    return False


async def _finalize_job(
    session_factory: async_sessionmaker[AsyncSession],
    job_id: uuid.UUID,
) -> None:
    async with session_factory() as db:
        job = await db.get(GenerationJob, job_id)
        if not job:
            return

        if job.cancel_requested or job.status == JOB_STATUS_CANCELLED:
            await _mark_job_cancelled(db, job)
            return

        if job.total_valid == job.total_requested and job.total_failed == 0:
            job.status = JOB_STATUS_COMPLETED
        elif job.total_valid > 0:
            job.status = JOB_STATUS_PARTIAL
        else:
            job.status = JOB_STATUS_FAILED

        job.finished_at = datetime.now(UTC)
        await db.commit()


async def _mark_job_cancelled(db: AsyncSession, job: GenerationJob) -> None:
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


async def _get_or_create_item(
    db: AsyncSession,
    job_id: uuid.UUID,
    item_index: int,
) -> GenerationJobItem:
    result = await db.execute(
        select(GenerationJobItem).where(
            GenerationJobItem.job_id == job_id,
            GenerationJobItem.item_index == item_index,
        )
    )
    item = result.scalar_one_or_none()
    if item:
        return item

    item = GenerationJobItem(
        job_id=job_id,
        item_index=item_index,
        status=ITEM_STATUS_QUEUED,
    )
    db.add(item)
    await db.flush()
    return item


def _pick_token(token_usage: dict | None, *keys: str) -> int | None:
    if not token_usage:
        return None
    for key in keys:
        value = token_usage.get(key)
        if isinstance(value, int):
            return value
    return None


def _append_error(current: str | None, next_error: str) -> str:
    if not current:
        return next_error
    merged = f"{current}\n{next_error}"
    return merged[:2000]
