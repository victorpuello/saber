"""Esquemas Pydantic — Notificaciones, sync y auditoría."""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict

# ── Notificaciones ──────────────────────────────────────────────────

class NotificationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: int
    notification_type: str
    title: str
    body: str
    link: str | None = None
    read: bool
    read_at: datetime | None = None
    source_event: str | None = None
    created_at: datetime


class NotificationList(BaseModel):
    items: list[NotificationOut]
    total: int
    unread: int


class MarkReadRequest(BaseModel):
    notification_ids: list[uuid.UUID]


# ── Sync ────────────────────────────────────────────────────────────

class SyncLogOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    sync_type: str
    status: str
    records_fetched: int
    records_created: int
    records_updated: int
    errors: int
    error_detail: str | None = None
    started_at: datetime
    finished_at: datetime | None = None


# ── Auditoría ───────────────────────────────────────────────────────

class AuditEntryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: int | None
    user_role: str | None
    action: str
    resource_type: str
    resource_id: str | None
    detail: str | None
    ip_address: str | None
    created_at: datetime
