"""Punto de entrada del Students Service."""

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
from .routes import router as students_router
from .services.kampus_sync import sync_students
from .services.revocation import RevocationManager

logger = logging.getLogger(__name__)

engine = create_db_engine(settings.database_url)
SessionLocal = create_session_factory(engine)
event_bus = EventBus(settings.redis_url)
revocation_mgr = RevocationManager(settings.redis_url)

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


async def _run_sync(sync_type: str = "SCHEDULED"):
    """Ejecuta la sincronización con Kampus."""
    return await sync_students(
        session_factory=SessionLocal,
        kampus_api_url=settings.kampus_api_url,
        kampus_api_token=settings.kampus_api_token,
        revocation_mgr=revocation_mgr,
        sync_type=sync_type,
        kampus_api_username=settings.kampus_api_username,
        kampus_api_password=settings.kampus_api_password,
        kampus_auth_endpoint=settings.kampus_auth_endpoint,
    )


async def _periodic_sync():
    """Tarea que ejecuta sync cada N minutos."""
    interval = settings.sync_interval_minutes * 60
    while True:
        try:
            await asyncio.sleep(interval)
            logger.info("Iniciando sync periódico de estudiantes")
            await _run_sync(sync_type="SCHEDULED")
        except asyncio.CancelledError:
            break
        except Exception:
            logger.exception("Error en sync periódico de estudiantes")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Inicializa DB, RevocationManager, sync periódico y cierra al apagar."""
    global _sync_task  # noqa: PLW0603
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Iniciar sync periódico
    if settings.sync_interval_minutes > 0:
        _sync_task = asyncio.create_task(_periodic_sync())

    yield

    if _sync_task:
        _sync_task.cancel()
    await revocation_mgr.close()
    await event_bus.close()
    await engine.dispose()


app = FastAPI(title="Saber 11 — Students", version="0.1.0", lifespan=lifespan)
app.include_router(create_health_router(settings.service_name))

# Override de la dependencia _get_db en el router
from .routes import _get_db as routes_get_db  # noqa: E402

app.dependency_overrides[routes_get_db] = get_db
app.include_router(students_router)
