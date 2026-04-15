"""Rutas API del Notification Service."""

from collections.abc import AsyncGenerator

from fastapi import APIRouter, Depends, Query
from saber11_shared.auth import CurrentUser, require_role
from sqlalchemy.ext.asyncio import AsyncSession

from .models import AuditEntry
from .schemas import (
    AuditEntryOut,
    MarkReadRequest,
    NotificationList,
    NotificationOut,
    SyncLogOut,
)
from .services import get_user_notifications, mark_as_read

router = APIRouter(prefix="/api/notifications", tags=["notifications"])


# Dependencia placeholder — se reemplaza en main.py
async def _get_db() -> AsyncGenerator[AsyncSession, None]:
    raise NotImplementedError  # pragma: no cover


# ── Notificaciones del usuario ──────────────────────────────────────


@router.get("", response_model=NotificationList)
async def list_notifications(
    user: CurrentUser = Depends(require_role("student", "teacher", "admin")),
    db: AsyncSession = Depends(_get_db),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    unread_only: bool = Query(False),
):
    """Lista las notificaciones del usuario autenticado."""
    items, total, unread = await get_user_notifications(
        db, user.id, limit=limit, offset=offset, unread_only=unread_only
    )
    return NotificationList(
        items=[NotificationOut.model_validate(n) for n in items],
        total=total,
        unread=unread,
    )


@router.post("/read", response_model=dict)
async def mark_notifications_read(
    body: MarkReadRequest,
    user: CurrentUser = Depends(require_role("student", "teacher", "admin")),
    db: AsyncSession = Depends(_get_db),
):
    """Marca notificaciones como leídas."""
    count = await mark_as_read(db, user.id, body.notification_ids)
    return {"marked": count}


@router.get("/unread-count", response_model=dict)
async def unread_count(
    user: CurrentUser = Depends(require_role("student", "teacher", "admin")),
    db: AsyncSession = Depends(_get_db),
):
    """Retorna solo el conteo de notificaciones no leídas."""
    _, _, unread = await get_user_notifications(db, user.id, limit=0)
    return {"unread": unread}


# ── Auditoría (solo admin) ──────────────────────────────────────────


@router.get("/audit", response_model=list[AuditEntryOut])
async def list_audit(
    user: CurrentUser = Depends(require_role("admin")),
    db: AsyncSession = Depends(_get_db),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    action: str | None = Query(None),
):
    """Lista entradas de auditoría (solo administradores)."""
    from sqlalchemy import select

    q = select(AuditEntry).order_by(AuditEntry.created_at.desc())
    if action:
        q = q.where(AuditEntry.action == action)
    q = q.offset(offset).limit(limit)
    result = await db.execute(q)
    return [AuditEntryOut.model_validate(e) for e in result.scalars().all()]


# ── Sync logs (solo admin) ──────────────────────────────────────────


@router.get("/sync-logs", response_model=list[SyncLogOut])
async def list_sync_logs(
    user: CurrentUser = Depends(require_role("admin")),
    db: AsyncSession = Depends(_get_db),
    limit: int = Query(20, ge=1, le=100),
):
    """Lista registros de sincronización con Kampus."""
    from sqlalchemy import select

    from .models import SyncLog

    q = select(SyncLog).order_by(SyncLog.started_at.desc()).limit(limit)
    result = await db.execute(q)
    return [SyncLogOut.model_validate(e) for e in result.scalars().all()]
