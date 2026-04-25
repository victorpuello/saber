"""Punto de entrada del AI Generator Service."""

import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from saber11_shared.database import Base
from saber11_shared.events import EventBus
from saber11_shared.health import create_health_router

from .config import settings
from .database import SessionLocal, engine
from .job_worker import GenerationJobWorker, configure_job_event_bus
from .key_store import seed_default_providers
from .models import (  # noqa: F401 — registrar tablas
    AIGenerationLog,
    AIProviderConfig,
    GenerationJob,
    GenerationJobItem,
)
from .routes import router as ai_router

logger = logging.getLogger(__name__)

event_bus = EventBus(settings.redis_url)
job_worker = GenerationJobWorker(event_bus, SessionLocal)
_worker_task: asyncio.Task | None = None


async def _wait_for_db(retries: int = 10, delay: float = 2.0) -> None:
    """Reintenta la conexión a la DB en caso de race condition al arrancar."""
    for attempt in range(1, retries + 1):
        try:
            async with engine.begin() as conn:
                await conn.run_sync(Base.metadata.create_all)
            return
        except Exception as exc:
            if attempt == retries:
                raise
            logger.warning("DB no disponible (intento %d/%d): %s", attempt, retries, exc)
            await asyncio.sleep(delay)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Inicializa DB y seed de proveedores al arrancar."""
    global _worker_task  # noqa: PLW0603
    await _wait_for_db()
    async with SessionLocal() as session:
        await seed_default_providers(session)
        await session.commit()

    configure_job_event_bus(event_bus)
    _worker_task = asyncio.create_task(job_worker.start())

    yield

    await job_worker.stop()
    if _worker_task:
        _worker_task.cancel()
    await event_bus.close()
    await engine.dispose()


app = FastAPI(
    title="Saber 11 — AI Generator",
    version="0.2.0",
    lifespan=lifespan,
)
app.include_router(create_health_router(settings.service_name))
app.include_router(ai_router)
