"""Modelos de BD del AI Generator — API keys cifradas y configuración de proveedores."""

from datetime import datetime

from saber11_shared.database import Base
from sqlalchemy import Boolean, DateTime, Float, Integer, LargeBinary, String, func
from sqlalchemy.orm import Mapped, mapped_column


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
