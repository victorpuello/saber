"""Consumidor de eventos para materializar analítica.

Escucha eventos del bus Redis Streams y los persiste
en las tablas desnormalizadas de analítica.
"""

import asyncio
import json
import logging
import uuid
from datetime import UTC, datetime

from saber11_shared.events import EventBus
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from .models import (
    DailyAggregate,
    DiagnosticResult,
    ExamResult,
    QuestionStat,
)

logger = logging.getLogger(__name__)

CONSUMER_GROUP = "analytics-service"
CONSUMER_NAME = "analytics-worker-1"


class EventConsumer:
    """Consumidor asíncrono de eventos del bus."""

    def __init__(
        self,
        event_bus: EventBus,
        session_factory: async_sessionmaker[AsyncSession],
    ) -> None:
        self._bus = event_bus
        self._sf = session_factory
        self._running = False

    async def start(self) -> None:
        """Inicia el loop de consumo de eventos."""
        self._running = True
        logger.info("EventConsumer iniciado — grupo=%s", CONSUMER_GROUP)

        while self._running:
            try:
                events = await self._bus.consume(
                    CONSUMER_GROUP, CONSUMER_NAME, count=20, block_ms=3000
                )
                for msg_id, data in events:
                    await self._process_event(msg_id, data)
            except Exception:
                logger.exception("Error en loop de consumo")
                await asyncio.sleep(2)

    async def stop(self) -> None:
        self._running = False

    async def _process_event(self, msg_id: str, data: dict) -> None:
        event_type = data.get("type", "")
        payload = json.loads(data.get("payload", "{}"))

        handlers = {
            "exam.completed": self._handle_exam_completed,
            "diagnostic.completed": self._handle_diagnostic_completed,
            "question.created": self._handle_question_created,
        }

        handler = handlers.get(event_type)
        if handler:
            try:
                async with self._sf() as session:
                    await handler(session, payload)
                    await session.commit()
                await self._bus.ack(CONSUMER_GROUP, msg_id)
                logger.info("Evento procesado: %s [%s]", event_type, msg_id)
            except Exception:
                logger.exception("Error procesando %s [%s]", event_type, msg_id)
        else:
            # Evento no relevante: ack y omitir
            await self._bus.ack(CONSUMER_GROUP, msg_id)

    # ── Handlers ────────────────────────────────────────────────

    async def _handle_exam_completed(
        self, db: AsyncSession, payload: dict
    ) -> None:
        """Materializa resultado de examen en analítica."""
        session_id = payload.get("session_id", "")

        # Verificar duplicado
        existing = await db.execute(
            select(ExamResult).where(
                ExamResult.session_id == uuid.UUID(session_id)
            )
        )
        if existing.scalar_one_or_none():
            return

        total = int(payload.get("total_questions", 0))
        correct = int(payload.get("correct_answers", 0))
        accuracy = round(correct / total * 100, 2) if total > 0 else None

        result = ExamResult(
            student_user_id=int(payload["student_user_id"]),
            exam_id=uuid.UUID(payload["exam_id"]),
            session_id=uuid.UUID(session_id),
            exam_type=payload.get("exam_type", "FULL_SIMULATION"),
            area_code=payload.get("area_code"),
            grade=payload.get("grade"),
            institution_id=payload.get("institution_id"),
            score_global=payload.get("score_global"),
            total_questions=total,
            correct_answers=correct,
            accuracy=accuracy,
            time_spent_minutes=payload.get("time_spent_minutes"),
            completed_at=datetime.fromisoformat(payload["completed_at"])
            if "completed_at" in payload
            else datetime.now(UTC),
        )
        db.add(result)

        # Actualizar agregado diario
        await self._update_daily_aggregate(
            db,
            institution_id=payload.get("institution_id", "unknown"),
            grade=payload.get("grade"),
            area_code=payload.get("area_code"),
            score=payload.get("score_global"),
            accuracy=accuracy,
            event_type="exam",
        )

    async def _handle_diagnostic_completed(
        self, db: AsyncSession, payload: dict
    ) -> None:
        """Materializa resultado de diagnóstico en analítica."""
        session_id = payload.get("session_id", "")

        existing = await db.execute(
            select(DiagnosticResult).where(
                DiagnosticResult.session_id == uuid.UUID(session_id)
            )
        )
        if existing.scalar_one_or_none():
            return

        result = DiagnosticResult(
            student_user_id=int(payload["student_user_id"]),
            session_id=uuid.UUID(session_id),
            profile_id=uuid.UUID(payload["profile_id"]),
            area_code=payload.get("area_code", ""),
            grade=payload.get("grade"),
            institution_id=payload.get("institution_id"),
            theta=float(payload.get("theta", 0.0)),
            questions_answered=int(payload.get("questions_answered", 0)),
        )
        db.add(result)

        # Actualizar agregado diario
        await self._update_daily_aggregate(
            db,
            institution_id=payload.get("institution_id", "unknown"),
            grade=payload.get("grade"),
            area_code=payload.get("area_code"),
            score=None,
            accuracy=None,
            event_type="diagnostic",
        )

    async def _handle_question_created(
        self, db: AsyncSession, payload: dict
    ) -> None:
        """Inicializa estadísticas para nueva pregunta."""
        q_id = payload.get("question_id", "")
        if not q_id:
            return

        existing = await db.execute(
            select(QuestionStat).where(
                QuestionStat.question_id == uuid.UUID(q_id)
            )
        )
        if existing.scalar_one_or_none():
            return

        stat = QuestionStat(
            question_id=uuid.UUID(q_id),
            area_code=payload.get("area_code"),
            competency_id=uuid.UUID(payload["competency_id"])
            if payload.get("competency_id")
            else None,
        )
        db.add(stat)

    async def _update_daily_aggregate(
        self,
        db: AsyncSession,
        institution_id: str,
        grade: str | None,
        area_code: str | None,
        score: float | None,
        accuracy: float | None,
        event_type: str,
    ) -> None:
        """Actualiza o crea el agregado diario."""
        today = datetime.now(UTC).strftime("%Y-%m-%d")

        result = await db.execute(
            select(DailyAggregate).where(
                DailyAggregate.date == today,
                DailyAggregate.institution_id == institution_id,
                DailyAggregate.grade == grade,
                DailyAggregate.area_code == area_code,
            )
        )
        agg = result.scalar_one_or_none()

        if not agg:
            agg = DailyAggregate(
                date=today,
                institution_id=institution_id,
                grade=grade,
                area_code=area_code,
            )
            db.add(agg)
            await db.flush()

        if event_type == "exam":
            agg.exams_completed += 1
            if score is not None and agg.avg_score is not None:
                total = agg.exams_completed
                agg.avg_score = round(
                    (float(agg.avg_score) * (total - 1) + score) / total, 2
                )
            elif score is not None:
                agg.avg_score = score
            if accuracy is not None and agg.avg_accuracy is not None:
                total = agg.exams_completed
                agg.avg_accuracy = round(
                    (float(agg.avg_accuracy) * (total - 1) + accuracy) / total, 2
                )
            elif accuracy is not None:
                agg.avg_accuracy = accuracy
        elif event_type == "diagnostic":
            agg.diagnostics_completed += 1
