"""Modelos SQLAlchemy — Estudiantes sincronizados desde Kampus."""

import uuid
from datetime import UTC, datetime

from saber11_shared.database import Base
from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    Integer,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column


def _utcnow() -> datetime:
    return datetime.now(UTC)


class Student(Base):
    """Estudiante sincronizado desde el sistema Kampus."""

    __tablename__ = "students"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    kampus_user_id: Mapped[int] = mapped_column(
        Integer, unique=True, nullable=False, index=True
    )

    first_name: Mapped[str] = mapped_column(String(150), nullable=False)
    last_name: Mapped[str] = mapped_column(String(150), nullable=False)
    email: Mapped[str | None] = mapped_column(String(254))
    document_id: Mapped[str | None] = mapped_column(String(30))

    grade: Mapped[str] = mapped_column(
        String(5),
        CheckConstraint("grade IN ('9','10','11')"),
        nullable=False,
        index=True,
    )
    section: Mapped[str | None] = mapped_column(String(10))

    enrollment_status: Mapped[str] = mapped_column(
        String(20),
        CheckConstraint(
            "enrollment_status IN ('ACTIVE','WITHDRAWN','INACTIVE')"
        ),
        default="ACTIVE",
        index=True,
    )

    credentials_revoked: Mapped[bool] = mapped_column(
        Boolean, default=False, index=True
    )
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    revocation_reason: Mapped[str | None] = mapped_column(String(200))

    last_login_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    last_synced_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow, onupdate=_utcnow
    )


class SyncLog(Base):
    """Registro de ejecuciones de sincronización de estudiantes con Kampus."""

    __tablename__ = "student_sync_logs"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    sync_type: Mapped[str] = mapped_column(
        String(30),
        CheckConstraint("sync_type IN ('STUDENTS','MANUAL','SCHEDULED')"),
        nullable=False,
    )
    status: Mapped[str] = mapped_column(
        String(20),
        CheckConstraint("status IN ('RUNNING','SUCCESS','FAILED')"),
        default="RUNNING",
    )

    records_fetched: Mapped[int] = mapped_column(Integer, default=0)
    records_created: Mapped[int] = mapped_column(Integer, default=0)
    records_updated: Mapped[int] = mapped_column(Integer, default=0)
    records_revoked: Mapped[int] = mapped_column(Integer, default=0)
    errors: Mapped[int] = mapped_column(Integer, default=0)
    error_detail: Mapped[str | None] = mapped_column(Text)

    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow
    )
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
