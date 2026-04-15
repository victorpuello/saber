"""Punto de entrada del Exam Engine Service."""

from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from saber11_shared.database import Base, create_db_engine, create_session_factory
from saber11_shared.events import EventBus
from saber11_shared.health import create_health_router
from sqlalchemy.ext.asyncio import AsyncSession

from .config import settings
from .routes_exams import router as exams_router
from .routes_sessions import router as sessions_router
from .routes_sessions import set_event_bus

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


app = FastAPI(
    title="Saber 11 — Exam Engine",
    version="0.1.0",
    lifespan=lifespan,
)

app.include_router(create_health_router(settings.service_name))

# Override de la dependencia _get_db en los routers
from .routes_exams import _get_db as exams_get_db  # noqa: E402
from .routes_sessions import _get_db as sessions_get_db  # noqa: E402

app.dependency_overrides[exams_get_db] = get_db
app.dependency_overrides[sessions_get_db] = get_db

app.include_router(exams_router)
app.include_router(sessions_router)
