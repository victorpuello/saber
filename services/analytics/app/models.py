"""Modelos SQLAlchemy — Analítica desnormalizada para reportes rápidos."""

import uuid
from datetime import UTC, datetime

from saber11_shared.database import Base
from sqlalchemy import (
    DateTime,
    Integer,
    Numeric,
    String,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column


def _utcnow() -> datetime:
    return datetime.now(UTC)


class ExamResult(Base):
    """Resultado de examen/simulacro materializado desde evento exam.completed."""

    __tablename__ = "exam_results"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    student_user_id: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    exam_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    session_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), unique=True, nullable=False
    )

    exam_type: Mapped[str] = mapped_column(String(20), nullable=False)
    area_code: Mapped[str | None] = mapped_column(String(5))
    grade: Mapped[str | None] = mapped_column(String(10), index=True)
    institution_id: Mapped[str | None] = mapped_column(String(50), index=True)

    score_global: Mapped[float | None] = mapped_column(Numeric(5, 2))
    total_questions: Mapped[int] = mapped_column(Integer, default=0)
    correct_answers: Mapped[int] = mapped_column(Integer, default=0)
    accuracy: Mapped[float | None] = mapped_column(Numeric(5, 2))
    time_spent_minutes: Mapped[int | None] = mapped_column(Integer)

    completed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow
    )
    recorded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow
    )


class DiagnosticResult(Base):
    """Resultado de diagnóstico materializado desde diagnostic.completed."""

    __tablename__ = "diagnostic_results"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    student_user_id: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    session_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), unique=True, nullable=False
    )
    profile_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)

    area_code: Mapped[str] = mapped_column(String(5), nullable=False)
    grade: Mapped[str | None] = mapped_column(String(10), index=True)
    institution_id: Mapped[str | None] = mapped_column(String(50), index=True)

    theta: Mapped[float] = mapped_column(Numeric(5, 3), default=0.0)
    questions_answered: Mapped[int] = mapped_column(Integer, default=0)

    completed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow
    )
    recorded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow
    )


class CompetencySnapshot(Base):
    """Snapshot de rendimiento por competencia (actualizado tras cada evento)."""

    __tablename__ = "competency_snapshots"
    __table_args__ = (
        UniqueConstraint(
            "student_user_id", "competency_id", name="uq_student_competency"
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    student_user_id: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    competency_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), nullable=False, index=True
    )
    area_code: Mapped[str] = mapped_column(String(5), nullable=False, index=True)
    grade: Mapped[str | None] = mapped_column(String(10), index=True)
    institution_id: Mapped[str | None] = mapped_column(String(50), index=True)

    theta_estimate: Mapped[float] = mapped_column(Numeric(5, 3), default=0.0)
    performance_level: Mapped[int | None] = mapped_column(Integer)
    classification: Mapped[str | None] = mapped_column(String(20))

    questions_attempted: Mapped[int] = mapped_column(Integer, default=0)
    questions_correct: Mapped[int] = mapped_column(Integer, default=0)

    last_updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow, onupdate=_utcnow
    )


class QuestionStat(Base):
    """Estadísticas de rendimiento de una pregunta del banco."""

    __tablename__ = "question_stats"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    question_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), unique=True, nullable=False
    )
    area_code: Mapped[str | None] = mapped_column(String(5), index=True)
    competency_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True))

    times_presented: Mapped[int] = mapped_column(Integer, default=0)
    times_correct: Mapped[int] = mapped_column(Integer, default=0)
    accuracy_rate: Mapped[float | None] = mapped_column(Numeric(5, 2))

    # Distribución de respuestas
    count_a: Mapped[int] = mapped_column(Integer, default=0)
    count_b: Mapped[int] = mapped_column(Integer, default=0)
    count_c: Mapped[int] = mapped_column(Integer, default=0)
    count_d: Mapped[int] = mapped_column(Integer, default=0)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow
    )
    last_updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow, onupdate=_utcnow
    )


class DailyAggregate(Base):
    """Agregado diario por institución/grado para reportes rápidos."""

    __tablename__ = "daily_aggregates"
    __table_args__ = (
        UniqueConstraint(
            "date", "institution_id", "grade", "area_code",
            name="uq_daily_aggregate",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    date: Mapped[str] = mapped_column(String(10), nullable=False, index=True)
    institution_id: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    grade: Mapped[str | None] = mapped_column(String(10), index=True)
    area_code: Mapped[str | None] = mapped_column(String(5))

    exams_completed: Mapped[int] = mapped_column(Integer, default=0)
    diagnostics_completed: Mapped[int] = mapped_column(Integer, default=0)
    avg_score: Mapped[float | None] = mapped_column(Numeric(5, 2))
    avg_accuracy: Mapped[float | None] = mapped_column(Numeric(5, 2))
    active_students: Mapped[int] = mapped_column(Integer, default=0)

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow, onupdate=_utcnow
    )
