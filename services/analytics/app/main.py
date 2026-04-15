"""Punto de entrada del Analytics Service."""

import asyncio
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from saber11_shared.database import Base, create_db_engine, create_session_factory
from saber11_shared.events import EventBus
from saber11_shared.health import create_health_router
from sqlalchemy.ext.asyncio import AsyncSession

from .config import settings
from .consumer import EventConsumer
from .routes import router as analytics_router

engine = create_db_engine(settings.database_url)
SessionLocal = create_session_factory(engine)
event_bus = EventBus(settings.redis_url)
consumer = EventConsumer(event_bus, SessionLocal)

_consumer_task: asyncio.Task | None = None


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Genera sesiones de BD para inyección de dependencias."""
    async with SessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Inicializa DB, EventBus, consumidor de eventos y cierra al apagar."""
    global _consumer_task  # noqa: PLW0603
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    _consumer_task = asyncio.create_task(consumer.start())
    yield
    await consumer.stop()
    if _consumer_task:
        _consumer_task.cancel()
    await event_bus.close()
    await engine.dispose()


app = FastAPI(title="Saber 11 — Analytics", version="0.1.0", lifespan=lifespan)
app.include_router(create_health_router(settings.service_name))

# Override de la dependencia _get_db en el router
from .routes import _get_db as routes_get_db  # noqa: E402

app.dependency_overrides[routes_get_db] = get_db
app.include_router(analytics_router)
