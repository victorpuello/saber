"""Modelos de BD del AI Generator."""

import uuid
from datetime import datetime

from saber11_shared.database import Base
from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    LargeBinary,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship


class AIProviderConfig(Base):
    """Configuración de un proveedor de IA (Anthropic, Gemini, etc.)."""

    __tablename__ = "ai_provider_configs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    provider: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    display_name: Mapped[str] = mapped_column(String(100), nullable=False)
    default_model: Mapped[str] = mapped_column(String(100), nullable=False)
    is_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    max_tokens: Mapped[int] = mapped_column(Integer, default=4096)
    temperature: Mapped[float] = mapped_column(Float, default=0.7)

    # API key cifrada con Fernet (symmetric encryption)
    api_key_encrypted: Mapped[bytes | None] = mapped_column(LargeBinary, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    def __repr__(self) -> str:
        return f"<AIProviderConfig {self.provider} model={self.default_model}>"


class AIGenerationLog(Base):
    """Log de generaciones para estadísticas persistentes."""

    __tablename__ = "ai_generation_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    provider: Mapped[str] = mapped_column(String(50), nullable=False)
    model: Mapped[str] = mapped_column(String(100), nullable=False)
    area_code: Mapped[str] = mapped_column(String(10), nullable=False)
    is_valid: Mapped[bool] = mapped_column(Boolean, nullable=False)
    score: Mapped[float | None] = mapped_column(Float, nullable=True)
    input_tokens: Mapped[int | None] = mapped_column(Integer, nullable=True)
    output_tokens: Mapped[int | None] = mapped_column(Integer, nullable=True)
    error: Mapped[str | None] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )


class GenerationJob(Base):
    """Job de generación IA en segundo plano."""

    __tablename__ = "generation_jobs"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    requested_by_user_id: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    requested_by_role: Mapped[str] = mapped_column(String(20), nullable=False)

    status: Mapped[str] = mapped_column(
        String(20),
        CheckConstraint(
            "status IN ('QUEUED','RUNNING','COMPLETED','FAILED','PARTIAL','CANCELLED')"
        ),
        default="QUEUED",
        nullable=False,
        index=True,
    )
    cancel_requested: Mapped[bool] = mapped_column(Boolean, default=False)

    area_code: Mapped[str] = mapped_column(String(10), nullable=False)
    provider: Mapped[str | None] = mapped_column(String(50))
    model: Mapped[str | None] = mapped_column(String(100))
    competency_code: Mapped[str | None] = mapped_column(String(30))
    cognitive_level: Mapped[int | None] = mapped_column(Integer)
    structure_type: Mapped[str] = mapped_column(String(20), default="INDIVIDUAL", nullable=False)
    include_visual: Mapped[bool] = mapped_column(Boolean, default=False)
    visual_type: Mapped[str | None] = mapped_column(String(50))
    english_section: Mapped[int | None] = mapped_column(Integer)

    total_requested: Mapped[int] = mapped_column(Integer, nullable=False)
    total_processed: Mapped[int] = mapped_column(Integer, default=0)
    total_generated: Mapped[int] = mapped_column(Integer, default=0)
    total_valid: Mapped[int] = mapped_column(Integer, default=0)
    total_failed: Mapped[int] = mapped_column(Integer, default=0)

    error_summary: Mapped[str | None] = mapped_column(Text)
    retry_of_job_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("generation_jobs.id")
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    items: Mapped[list["GenerationJobItem"]] = relationship(
        back_populates="job", cascade="all, delete-orphan", lazy="selectin"
    )


class GenerationJobItem(Base):
    """Ítem individual de un job (una pregunta del lote)."""

    __tablename__ = "generation_job_items"
    __table_args__ = (UniqueConstraint("job_id", "item_index", name="uq_job_item_index"),)

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    job_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("generation_jobs.id"), nullable=False, index=True
    )
    item_index: Mapped[int] = mapped_column(Integer, nullable=False)

    status: Mapped[str] = mapped_column(
        String(20),
        CheckConstraint("status IN ('QUEUED','RUNNING','COMPLETED','FAILED','CANCELLED')"),
        default="QUEUED",
        nullable=False,
        index=True,
    )
    provider: Mapped[str | None] = mapped_column(String(50))
    model: Mapped[str | None] = mapped_column(String(100))
    is_valid: Mapped[bool | None] = mapped_column(Boolean)
    error: Mapped[str | None] = mapped_column(String(500), nullable=True)
    token_input: Mapped[int | None] = mapped_column(Integer, nullable=True)
    token_output: Mapped[int | None] = mapped_column(Integer, nullable=True)

    created_question_area_code: Mapped[str | None] = mapped_column(String(10))
    created_question_competency_code: Mapped[str | None] = mapped_column(String(30))
    created_question_assertion_code: Mapped[str | None] = mapped_column(String(40))
    created_question_evidence_code: Mapped[str | None] = mapped_column(String(50))

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    job: Mapped[GenerationJob] = relationship(back_populates="items")
