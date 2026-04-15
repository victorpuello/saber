"""Punto de entrada del Diagnostic Engine."""

from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from saber11_shared.database import Base, create_db_engine, create_session_factory
from saber11_shared.events import EventBus
from saber11_shared.health import create_health_router
from sqlalchemy.ext.asyncio import AsyncSession

from .config import settings
from .routes import router as diagnostic_router
from .routes import set_event_bus

engine = create_db_engine(settings.database_url)
SessionLocal = create_session_factory(engine)
event_bus = EventBus(settings.redis_url)


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
    """Inicializa DB, EventBus y cierra al apagar."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    set_event_bus(event_bus)
    yield
    await event_bus.close()
    await engine.dispose()


app = FastAPI(title="Saber 11 — Diagnostic Engine", version="0.1.0", lifespan=lifespan)
app.include_router(create_health_router(settings.service_name))

# Override de la dependencia _get_db en el router
from .routes import _get_db as routes_get_db  # noqa: E402

app.dependency_overrides[routes_get_db] = get_db
app.include_router(diagnostic_router)
