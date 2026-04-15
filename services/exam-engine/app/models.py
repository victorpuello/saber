"""Modelos SQLAlchemy — Exámenes, sesiones y respuestas."""

import uuid
from datetime import UTC, datetime

from saber11_shared.database import Base
from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship


def _utcnow() -> datetime:
    return datetime.now(UTC)


class Exam(Base):
    """Simulacro configurado (template de examen)."""

    __tablename__ = "exams"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)

    exam_type: Mapped[str] = mapped_column(
        String(20),
        CheckConstraint(
            "exam_type IN ('DIAGNOSTIC','FULL_SIMULATION',"
            "'AREA_PRACTICE','CUSTOM')"
        ),
        nullable=False,
    )

    # NULL si es simulacro completo (todas las áreas)
    area_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True))
    area_code: Mapped[str | None] = mapped_column(String(5))

    total_questions: Mapped[int] = mapped_column(Integer, nullable=False)
    time_limit_minutes: Mapped[int | None] = mapped_column(Integer)
    is_adaptive: Mapped[bool] = mapped_column(Boolean, default=False)

    created_by_user_id: Mapped[int | None] = mapped_column(Integer)
    status: Mapped[str] = mapped_column(
        String(20),
        CheckConstraint("status IN ('ACTIVE','ARCHIVED','DRAFT')"),
        default="ACTIVE",
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow
    )

    # Relaciones
    questions: Mapped[list["ExamQuestion"]] = relationship(
        back_populates="exam", cascade="all, delete-orphan"
    )
    sessions: Mapped[list["ExamSession"]] = relationship(back_populates="exam")


class ExamQuestion(Base):
    """Pregunta ensamblada en un examen (posición fija)."""

    __tablename__ = "exam_questions"

    exam_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("exams.id", ondelete="CASCADE"),
        primary_key=True,
    )
    question_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True
    )
    position: Mapped[int] = mapped_column(Integer, nullable=False)

    exam: Mapped[Exam] = relationship(back_populates="questions")


class ExamSession(Base):
    """Sesión de un estudiante presentando un examen."""

    __tablename__ = "exam_sessions"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    exam_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("exams.id"), nullable=False
    )
    student_user_id: Mapped[int] = mapped_column(Integer, nullable=False)

    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow
    )
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    status: Mapped[str] = mapped_column(
        String(20),
        CheckConstraint(
            "status IN ('IN_PROGRESS','COMPLETED','ABANDONED','TIMED_OUT')"
        ),
        default="IN_PROGRESS",
    )

    total_correct: Mapped[int | None] = mapped_column(Integer)
    total_answered: Mapped[int | None] = mapped_column(Integer)
    score_global: Mapped[float | None] = mapped_column(Numeric(5, 2))
    time_spent_seconds: Mapped[int | None] = mapped_column(Integer)

    # Relaciones
    exam: Mapped[Exam] = relationship(back_populates="sessions")
    answers: Mapped[list["StudentAnswer"]] = relationship(
        back_populates="session", cascade="all, delete-orphan"
    )


class StudentAnswer(Base):
    """Respuesta individual del estudiante a una pregunta del examen."""

    __tablename__ = "student_answers"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    session_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("exam_sessions.id", ondelete="CASCADE"),
        nullable=False,
    )
    question_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), nullable=False
    )

    selected_answer: Mapped[str | None] = mapped_column(
        String(1), CheckConstraint("selected_answer IN ('A','B','C','D')")
    )
    is_correct: Mapped[bool | None] = mapped_column(Boolean)
    time_spent_seconds: Mapped[int | None] = mapped_column(Integer)
    confidence_level: Mapped[int | None] = mapped_column(
        Integer, CheckConstraint("confidence_level BETWEEN 1 AND 5")
    )

    answered_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow
    )

    session: Mapped[ExamSession] = relationship(back_populates="answers")
