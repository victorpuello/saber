"""Punto de entrada del AI Generator Service."""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from saber11_shared.database import Base
from saber11_shared.health import create_health_router

from .config import settings
from .database import SessionLocal, engine
from .key_store import seed_default_providers
from .models import AIGenerationLog, AIProviderConfig  # noqa: F401 — registrar tablas
from .routes import router as ai_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Inicializa DB y seed de proveedores al arrancar."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    async with SessionLocal() as session:
        await seed_default_providers(session)
        await session.commit()
    yield
    await engine.dispose()


app = FastAPI(
    title="Saber 11 — AI Generator",
    version="0.2.0",
    lifespan=lifespan,
)
app.include_router(create_health_router(settings.service_name))
app.include_router(ai_router)
