"""Punto de entrada del Notification Service.

Este servicio opera como worker: consume eventos del bus de Redis Streams
y dispara notificaciones (push, email, etc.).
"""

import asyncio
import logging

from saber11_shared.events import EventBus

from .config import settings

logging.basicConfig(level=settings.log_level)
logger = logging.getLogger(settings.service_name)

CONSUMER_GROUP = "notifications"
CONSUMER_NAME = "notifications-worker-1"

# Eventos que este servicio procesa
HANDLED_EVENTS = {"plan.updated", "milestone.reached"}


async def handle_event(event_type: str, payload: dict) -> None:
    """Procesa un evento del bus. Placeholder para lógica real."""
    logger.info("Procesando evento %s: %s", event_type, payload)


async def main() -> None:
    """Loop principal del worker de notificaciones."""
    bus = EventBus(settings.redis_url)
    logger.info("Notification worker iniciado, escuchando eventos...")

    try:
        while True:
            events = await bus.consume(CONSUMER_GROUP, CONSUMER_NAME)
            for msg_id, data in events:
                event_type = data.get("type", "")
                if event_type in HANDLED_EVENTS:
                    await handle_event(event_type, data)
                await bus.ack(CONSUMER_GROUP, msg_id)
    finally:
        await bus.close()


if __name__ == "__main__":
    asyncio.run(main())
