"""Punto de entrada del Study Planner Service."""

from contextlib import asynccontextmanager

from fastapi import FastAPI

from saber11_shared.database import Base, create_db_engine
from saber11_shared.health import create_health_router

from .config import settings

engine = create_db_engine(settings.database_url)


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    await engine.dispose()


app = FastAPI(title="Saber 11 — Study Planner", version="0.1.0", lifespan=lifespan)
app.include_router(create_health_router(settings.service_name))
