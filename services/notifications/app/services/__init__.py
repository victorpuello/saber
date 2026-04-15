"""Servicio de notificaciones — crea y persiste notificaciones."""

import logging
from datetime import UTC, datetime

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..models import Notification

logger = logging.getLogger(__name__)


# ── Plantillas de notificación ──────────────────────────────────────

TEMPLATES: dict[str, dict] = {
    "plan.updated": {
        "type": "PLAN_UPDATE",
        "title": "Tu plan de estudio fue actualizado",
        "body": "Se ajustó tu plan de estudio para la competencia «{competency}».",
        "link": "/plans/{plan_id}",
    },
    "milestone.reached": {
        "type": "MILESTONE",
        "title": "¡Felicitaciones! Alcanzaste un hito 🎯",
        "body": "Superaste el nivel {level} en «{competency}».",
        "link": "/diagnostic/profile",
    },
    "exam.completed": {
        "type": "EXAM_RESULT",
        "title": "Resultados de tu simulacro disponibles",
        "body": "Tu simulacro obtuvo un puntaje global de {score}.",
        "link": "/exams/{exam_id}/results",
    },
    "diagnostic.completed": {
        "type": "DIAGNOSTIC_READY",
        "title": "Diagnóstico completado",
        "body": "Tu diagnóstico inicial está listo. Revisa tu perfil de competencias.",
        "link": "/diagnostic/profile",
    },
}


async def create_notification(
    session: AsyncSession,
    *,
    user_id: int,
    event_type: str,
    payload: dict,
) -> Notification | None:
    """Crea una notificación basándose en la plantilla del evento."""
    template = TEMPLATES.get(event_type)
    if not template:
        logger.warning("Sin plantilla para evento: %s", event_type)
        return None

    try:
        body = template["body"].format_map(payload)
        link = template["link"].format_map(payload) if template.get("link") else None
    except KeyError:
        body = template["body"]
        link = template.get("link")

    notification = Notification(
        user_id=user_id,
        notification_type=template["type"],
        title=template["title"],
        body=body,
        link=link,
        source_event=event_type,
        source_id=payload.get("id") or payload.get("exam_id") or payload.get("plan_id"),
    )
    session.add(notification)
    await session.flush()
    logger.info(
        "Notificación creada: user=%s type=%s", user_id, template["type"]
    )
    return notification


async def get_user_notifications(
    session: AsyncSession,
    user_id: int,
    *,
    limit: int = 50,
    offset: int = 0,
    unread_only: bool = False,
) -> tuple[list[Notification], int, int]:
    """Retorna (items, total, unread) para un usuario."""
    base = select(Notification).where(Notification.user_id == user_id)
    if unread_only:
        base = base.where(Notification.read.is_(False))

    total = (
        await session.scalar(
            select(func.count()).select_from(
                base.subquery()
            )
        )
    ) or 0

    unread = (
        await session.scalar(
            select(func.count()).where(
                Notification.user_id == user_id,
                Notification.read.is_(False),
            )
        )
    ) or 0

    items_q = base.order_by(Notification.created_at.desc()).offset(offset).limit(limit)
    result = await session.execute(items_q)
    items = list(result.scalars().all())

    return items, total, unread


async def mark_as_read(
    session: AsyncSession,
    user_id: int,
    notification_ids: list,
) -> int:
    """Marca notificaciones como leídas. Retorna cantidad actualizada."""
    now = datetime.now(UTC)
    result = await session.execute(
        select(Notification).where(
            Notification.user_id == user_id,
            Notification.id.in_(notification_ids),
            Notification.read.is_(False),
        )
    )
    notifications = list(result.scalars().all())
    for n in notifications:
        n.read = True
        n.read_at = now
    return len(notifications)
