"""Modelos SQLAlchemy — Planes de estudio, unidades y práctica."""

import uuid
from datetime import UTC, datetime

from saber11_shared.database import Base
from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship


def _utcnow() -> datetime:
    return datetime.now(UTC)


class StudyPlan(Base):
    """Plan de estudio personalizado generado a partir del perfil diagnóstico."""

    __tablename__ = "study_plans"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    profile_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        nullable=False,
        index=True,
        comment="Referencia lógica a student_profiles.id (BD separada)",
    )
    student_user_id: Mapped[int] = mapped_column(Integer, nullable=False)

    status: Mapped[str] = mapped_column(
        String(20),
        CheckConstraint("status IN ('ACTIVE','PAUSED','COMPLETED','REPLACED')"),
        default="ACTIVE",
    )
    total_weeks: Mapped[int] = mapped_column(Integer, nullable=False)
    current_week: Mapped[int] = mapped_column(Integer, default=1)

    generated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow, onupdate=_utcnow
    )

    # Relaciones
    units: Mapped[list["StudyPlanUnit"]] = relationship(
        back_populates="plan", cascade="all, delete-orphan",
        order_by="StudyPlanUnit.week_number, StudyPlanUnit.position",
    )


class StudyPlanUnit(Base):
    """Unidad semanal del plan: enfocada en una competencia específica."""

    __tablename__ = "study_plan_units"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    plan_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("study_plans.id", ondelete="CASCADE"),
        nullable=False,
    )

    week_number: Mapped[int] = mapped_column(Integer, nullable=False)
    position: Mapped[int] = mapped_column(Integer, default=0)

    competency_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), nullable=False
    )
    area_code: Mapped[str] = mapped_column(String(5), nullable=False)

    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)

    priority: Mapped[str] = mapped_column(
        String(10),
        CheckConstraint("priority IN ('HIGH','MEDIUM','LOW')"),
        default="MEDIUM",
    )
    recommended_questions: Mapped[int] = mapped_column(Integer, default=10)

    completed: Mapped[bool] = mapped_column(Boolean, default=False)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    # Métricas de práctica
    questions_attempted: Mapped[int] = mapped_column(Integer, default=0)
    questions_correct: Mapped[int] = mapped_column(Integer, default=0)

    # Relaciones
    plan: Mapped["StudyPlan"] = relationship(back_populates="units")
    practice_items: Mapped[list["UnitPracticeSet"]] = relationship(
        back_populates="unit", cascade="all, delete-orphan",
        order_by="UnitPracticeSet.position",
    )


class UnitPracticeSet(Base):
    """Pregunta asignada dentro de una unidad de práctica."""

    __tablename__ = "unit_practice_sets"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    unit_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("study_plan_units.id", ondelete="CASCADE"),
        nullable=False,
    )

    question_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    position: Mapped[int] = mapped_column(Integer, default=0)
    completed: Mapped[bool] = mapped_column(Boolean, default=False)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    # Resultado si se completó
    selected_answer: Mapped[str | None] = mapped_column(String(1))
    is_correct: Mapped[bool | None] = mapped_column(Boolean)

    # Relaciones
    unit: Mapped["StudyPlanUnit"] = relationship(back_populates="practice_items")
