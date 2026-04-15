"""Bus de eventos con Redis Streams.

Patrón productor/consumidor para comunicación asíncrona entre microservicios.
Eventos principales:
  - exam.completed
  - diagnostic.completed
  - question.created
  - question.ai.generated
  - plan.updated
  - milestone.reached
"""

import json
import logging
from datetime import datetime, timezone

import redis.asyncio as redis

logger = logging.getLogger(__name__)


class EventBus:
    """Productor y consumidor de eventos sobre Redis Streams."""

    STREAM_KEY = "saber11:events"
    GROUP_PREFIX = "saber11"

    def __init__(self, redis_url: str) -> None:
        self._redis = redis.from_url(redis_url, decode_responses=True)

    async def publish(self, event_type: str, payload: dict) -> str:
        """Publica un evento en el stream y devuelve su ID."""
        message = {
            "type": event_type,
            "payload": json.dumps(payload),
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        event_id = await self._redis.xadd(self.STREAM_KEY, message)
        logger.info("Evento publicado: %s [%s]", event_type, event_id)
        return event_id

    async def ensure_group(self, consumer_group: str) -> None:
        """Crea el consumer group si no existe."""
        try:
            await self._redis.xgroup_create(
                self.STREAM_KEY, consumer_group, id="0", mkstream=True
            )
        except redis.ResponseError as exc:
            if "BUSYGROUP" not in str(exc):
                raise

    async def consume(
        self,
        consumer_group: str,
        consumer_name: str,
        count: int = 10,
        block_ms: int = 5000,
    ) -> list[tuple[str, dict]]:
        """Lee mensajes pendientes del grupo. Retorna lista de (id, data)."""
        await self.ensure_group(consumer_group)

        results = await self._redis.xreadgroup(
            groupname=consumer_group,
            consumername=consumer_name,
            streams={self.STREAM_KEY: ">"},
            count=count,
            block=block_ms,
        )

        events = []
        for _stream, messages in results:
            for msg_id, data in messages:
                events.append((msg_id, data))

        return events

    async def ack(self, consumer_group: str, *msg_ids: str) -> None:
        """Confirma procesamiento de mensajes."""
        if msg_ids:
            await self._redis.xack(self.STREAM_KEY, consumer_group, *msg_ids)

    async def close(self) -> None:
        """Cierra la conexión a Redis."""
        await self._redis.aclose()
