"""Consumidor de eventos — procesa eventos del bus y genera notificaciones."""

import json
import logging

from saber11_shared.events import EventBus
from sqlalchemy.ext.asyncio import async_sessionmaker

from .services import create_notification

logger = logging.getLogger(__name__)

CONSUMER_GROUP = "notifications"
CONSUMER_NAME = "notifications-worker-1"

# Eventos que generan notificaciones
HANDLED_EVENTS = {
    "plan.updated",
    "milestone.reached",
    "exam.completed",
    "diagnostic.completed",
}


class NotificationConsumer:
    """Worker que consume eventos y crea notificaciones en DB."""

    def __init__(
        self,
        bus: EventBus,
        session_factory: async_sessionmaker,
    ) -> None:
        self._bus = bus
        self._session_factory = session_factory
        self._running = False

    async def start(self) -> None:
        """Loop principal de consumo."""
        self._running = True
        logger.info("NotificationConsumer iniciado, escuchando eventos...")

        while self._running:
            try:
                events = await self._bus.consume(
                    CONSUMER_GROUP, CONSUMER_NAME, count=20, block_ms=5000
                )
                for msg_id, data in events:
                    await self._process(data)
                    await self._bus.ack(CONSUMER_GROUP, msg_id)
            except Exception:
                logger.exception("Error consumiendo eventos")

    async def stop(self) -> None:
        self._running = False

    async def _process(self, data: dict) -> None:
        """Procesa un mensaje del stream."""
        event_type = data.get("type", "")
        if event_type not in HANDLED_EVENTS:
            return

        raw_payload = data.get("payload", "{}")
        try:
            payload = json.loads(raw_payload) if isinstance(raw_payload, str) else raw_payload
        except (json.JSONDecodeError, TypeError):
            logger.warning("Payload inválido para %s: %s", event_type, raw_payload)
            return

        user_id = payload.get("user_id") or payload.get("student_id")
        if not user_id:
            logger.warning("Evento %s sin user_id: %s", event_type, payload)
            return

        async with self._session_factory() as session:
            try:
                await create_notification(
                    session,
                    user_id=int(user_id),
                    event_type=event_type,
                    payload=payload,
                )
                await session.commit()
            except Exception:
                await session.rollback()
                logger.exception("Error creando notificación para %s", event_type)
