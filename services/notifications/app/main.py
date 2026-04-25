"""Punto de entrada del Notification Service.

App híbrida: FastAPI (API de notificaciones) + worker en background
que consume eventos del bus de Redis Streams y ejecuta sync periódico.
"""

import asyncio
import logging
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from saber11_shared.database import Base, create_db_engine, create_session_factory
from saber11_shared.events import EventBus
from saber11_shared.health import create_health_router
from sqlalchemy.ext.asyncio import AsyncSession

from .config import settings
from .consumer import NotificationConsumer
from .routes import router as notif_router
from .services.kampus_sync import sync_users

logging.basicConfig(level=settings.log_level)
logger = logging.getLogger(settings.service_name)

engine = create_db_engine(settings.database_url)
SessionLocal = create_session_factory(engine)
event_bus = EventBus(settings.redis_url)
consumer = NotificationConsumer(event_bus, SessionLocal)

_consumer_task: asyncio.Task | None = None
_sync_task: asyncio.Task | None = None


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Genera sesiones de BD para inyección de dependencias."""
    async with SessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


async def _periodic_sync() -> None:
    """Ejecuta sync con Kampus cada N minutos."""
    interval = settings.sync_interval_minutes * 60
    while True:
        try:
            await sync_users(SessionLocal)
        except Exception:
            logger.exception("Error en sync periódico")
        await asyncio.sleep(interval)


async def _wait_for_db(retries: int = 10, delay: float = 2.0) -> None:
    for attempt in range(retries):
        try:
            async with engine.begin() as conn:
                await conn.run_sync(Base.metadata.create_all)
            return
        except Exception as exc:
            if attempt == retries - 1:
                raise
            logger.warning("DB no disponible (intento %d/%d): %s — reintentando...", attempt + 1, retries, exc)
            await asyncio.sleep(delay)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Inicializa DB, EventBus, consumer y sync; cierra al apagar."""
    global _consumer_task, _sync_task  # noqa: PLW0603
    await _wait_for_db()

    _consumer_task = asyncio.create_task(consumer.start())
    _sync_task = asyncio.create_task(_periodic_sync())
    logger.info("Notification Service iniciado (API + worker + sync)")
    yield

    await consumer.stop()
    if _consumer_task:
        _consumer_task.cancel()
    if _sync_task:
        _sync_task.cancel()
    await event_bus.close()
    await engine.dispose()


app = FastAPI(
    title="Saber 11 — Notifications",
    version="0.1.0",
    lifespan=lifespan,
)
app.include_router(create_health_router(settings.service_name))

# Override de la dependencia _get_db en el router
from .routes import _get_db as routes_get_db  # noqa: E402

app.dependency_overrides[routes_get_db] = get_db
app.include_router(notif_router)
