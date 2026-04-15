"""Punto de entrada del Question Bank Service."""

from contextlib import asynccontextmanager

from fastapi import FastAPI

from saber11_shared.database import Base, create_db_engine, create_session_factory
from saber11_shared.health import create_health_router

from .config import settings

engine = create_db_engine(settings.database_url)
SessionLocal = create_session_factory(engine)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Inicializa DB engine y cierra al apagar."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    await engine.dispose()


app = FastAPI(
    title="Saber 11 — Question Bank",
    version="0.1.0",
    lifespan=lifespan,
)

app.include_router(create_health_router(settings.service_name))


@app.get("/api/questions/stats")
async def question_stats():
    """Placeholder — estadísticas del banco de preguntas."""
    return {"total": 0, "by_status": {}, "by_area": {}}
