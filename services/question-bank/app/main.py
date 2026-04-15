"""Punto de entrada del Question Bank Service."""

from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from saber11_shared.database import Base, create_db_engine, create_session_factory
from saber11_shared.health import create_health_router
from sqlalchemy.ext.asyncio import AsyncSession

from .config import settings
from .routes_assets import router as assets_router
from .routes_media import router as media_router
from .routes_questions import router as questions_router
from .routes_taxonomy import router as taxonomy_router

engine = create_db_engine(settings.database_url)
SessionLocal = create_session_factory(engine)


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

# Inyectar la dependencia de DB en los routers
taxonomy_router.dependencies = []
questions_router.dependencies = []

# Override de la dependencia _get_db en ambos routers
from .routes_assets import _get_db as assets_get_db  # noqa: E402
from .routes_media import _get_db as media_get_db  # noqa: E402
from .routes_questions import _get_db as questions_get_db  # noqa: E402
from .routes_taxonomy import _get_db as taxonomy_get_db  # noqa: E402

app.dependency_overrides[taxonomy_get_db] = get_db
app.dependency_overrides[questions_get_db] = get_db
app.dependency_overrides[media_get_db] = get_db
app.dependency_overrides[assets_get_db] = get_db

app.include_router(taxonomy_router)
app.include_router(questions_router)
app.include_router(media_router)
app.include_router(assets_router)
