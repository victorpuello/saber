"""Modelos SQLAlchemy — Perfiles, diagnósticos y respuestas adaptativas."""

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
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship


def _utcnow() -> datetime:
    return datetime.now(UTC)


class StudentProfile(Base):
    """Perfil global del estudiante con su nivel estimado."""

    __tablename__ = "student_profiles"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    student_user_id: Mapped[int] = mapped_column(Integer, unique=True, nullable=False)

    last_diagnostic_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    overall_estimated_level: Mapped[int | None] = mapped_column(
        Integer,
        CheckConstraint("overall_estimated_level BETWEEN 1 AND 4"),
    )
    estimated_score_global: Mapped[float | None] = mapped_column(Numeric(5, 2))
    english_mcer_level: Mapped[str | None] = mapped_column(String(5))
    english_mcer_label: Mapped[str | None] = mapped_column(String(20))
    english_standard_error: Mapped[float | None] = mapped_column(Numeric(5, 3))
    english_section_errors: Mapped[list | None] = mapped_column(JSONB)
    english_recommendations: Mapped[list | None] = mapped_column(JSONB)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow, onupdate=_utcnow
    )

    # Relaciones
    competency_scores: Mapped[list["CompetencyScore"]] = relationship(
        back_populates="profile", cascade="all, delete-orphan"
    )
    sessions: Mapped[list["DiagnosticSession"]] = relationship(
        back_populates="profile"
    )


class CompetencyScore(Base):
    """Nivel estimado por competencia (resultado del diagnóstico TRI)."""

    __tablename__ = "competency_scores"
    __table_args__ = (
        UniqueConstraint("profile_id", "competency_id", name="uq_profile_competency"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    profile_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("student_profiles.id", ondelete="CASCADE"),
        nullable=False,
    )
    competency_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), nullable=False
    )

    theta_estimate: Mapped[float] = mapped_column(Numeric(5, 3), default=0.0)
    standard_error: Mapped[float] = mapped_column(Numeric(5, 3), default=1.0)
    performance_level: Mapped[int | None] = mapped_column(
        Integer,
        CheckConstraint("performance_level BETWEEN 1 AND 4"),
    )
    classification: Mapped[str | None] = mapped_column(
        String(20),
        CheckConstraint(
            "classification IN ('STRENGTH','ADEQUATE','WEAKNESS','CRITICAL')"
        ),
    )

    questions_attempted: Mapped[int] = mapped_column(Integer, default=0)
    questions_correct: Mapped[int] = mapped_column(Integer, default=0)

    last_updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow, onupdate=_utcnow
    )

    # Relaciones
    profile: Mapped["StudentProfile"] = relationship(
        back_populates="competency_scores"
    )


class DiagnosticSession(Base):
    """Sesión de diagnóstico adaptativo por área."""

    __tablename__ = "diagnostic_sessions"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    profile_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("student_profiles.id", ondelete="CASCADE"),
        nullable=False,
    )
    student_user_id: Mapped[int] = mapped_column(Integer, nullable=False)

    area_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    area_code: Mapped[str] = mapped_column(String(5), nullable=False)

    status: Mapped[str] = mapped_column(
        String(20),
        CheckConstraint(
            "status IN ('IN_PROGRESS','COMPLETED','ABANDONED')"
        ),
        default="IN_PROGRESS",
    )

    # Estado CAT
    current_theta: Mapped[float] = mapped_column(Numeric(5, 3), default=0.0)
    current_se: Mapped[float] = mapped_column(Numeric(5, 3), default=1.0)
    questions_answered: Mapped[int] = mapped_column(Integer, default=0)

    # Configuración
    max_questions: Mapped[int] = mapped_column(Integer, default=15)
    se_threshold: Mapped[float] = mapped_column(Numeric(5, 3), default=0.3)

    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow
    )
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    # Relaciones
    profile: Mapped["StudentProfile"] = relationship(back_populates="sessions")
    answers: Mapped[list["DiagnosticAnswer"]] = relationship(
        back_populates="session", cascade="all, delete-orphan"
    )


class DiagnosticAnswer(Base):
    """Respuesta individual dentro de una sesión de diagnóstico."""

    __tablename__ = "diagnostic_answers"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    session_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("diagnostic_sessions.id", ondelete="CASCADE"),
        nullable=False,
    )

    question_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    competency_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), nullable=False
    )

    position: Mapped[int] = mapped_column(Integer, nullable=False)
    selected_answer: Mapped[str] = mapped_column(String(1), nullable=False)
    correct_answer: Mapped[str] = mapped_column(String(1), nullable=False)
    is_correct: Mapped[bool] = mapped_column(Boolean, nullable=False)
    english_section: Mapped[int | None] = mapped_column(Integer)
    mcer_level: Mapped[str | None] = mapped_column(String(5))

    # TRI params de la pregunta al momento de responder
    irt_difficulty: Mapped[float] = mapped_column(Numeric(5, 3), nullable=False)
    irt_discrimination: Mapped[float] = mapped_column(Numeric(5, 3), default=1.0)
    irt_guessing: Mapped[float] = mapped_column(Numeric(5, 3), default=0.25)

    # Theta posterior a esta respuesta
    theta_after: Mapped[float] = mapped_column(Numeric(5, 3), nullable=False)
    se_after: Mapped[float] = mapped_column(Numeric(5, 3), nullable=False)

    answered_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow
    )

    # Relaciones
    session: Mapped["DiagnosticSession"] = relationship(back_populates="answers")
