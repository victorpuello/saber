"""Punto de entrada del Question Bank Service."""

from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
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
UPLOADS_ROOT = settings.upload_root
UPLOADS_ROOT.mkdir(parents=True, exist_ok=True)


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
    UPLOADS_ROOT.mkdir(parents=True, exist_ok=True)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        if conn.dialect.name == "postgresql":
            await conn.exec_driver_sql(
                "ALTER TABLE IF EXISTS questions "
                "ALTER COLUMN cognitive_process TYPE TEXT"
            )
            await conn.exec_driver_sql(
                "ALTER TABLE IF EXISTS questions "
                "ADD COLUMN IF NOT EXISTS structure_type VARCHAR(20) NOT NULL DEFAULT 'INDIVIDUAL'"
            )
            await conn.exec_driver_sql(
                "ALTER TABLE IF EXISTS questions "
                "ADD COLUMN IF NOT EXISTS block_id UUID"
            )
            await conn.exec_driver_sql(
                "ALTER TABLE IF EXISTS questions "
                "ADD COLUMN IF NOT EXISTS block_item_order INTEGER"
            )
            await conn.exec_driver_sql(
                "ALTER TABLE IF EXISTS questions "
                "ADD COLUMN IF NOT EXISTS block_size INTEGER"
            )
            # Sprint 1 — Inglés: campos dce_metadata y component_name
            await conn.exec_driver_sql(
                "ALTER TABLE IF EXISTS questions "
                "ADD COLUMN IF NOT EXISTS dce_metadata JSONB"
            )
            await conn.exec_driver_sql(
                "ALTER TABLE IF EXISTS questions "
                "ADD COLUMN IF NOT EXISTS component_name VARCHAR(50)"
            )
            await conn.exec_driver_sql(
                "ALTER TABLE IF EXISTS questions "
                "ADD COLUMN IF NOT EXISTS context_category VARCHAR(30)"
            )
            # Sprint M4 - Matematicas: etiquetas tematicas para filtros y calibracion.
            await conn.exec_driver_sql(
                "ALTER TABLE IF EXISTS questions "
                "ADD COLUMN IF NOT EXISTS tags JSONB"
            )
            await conn.exec_driver_sql(
                "ALTER TABLE IF EXISTS questions "
                "ADD COLUMN IF NOT EXISTS irt_difficulty NUMERIC(5, 3) DEFAULT 0.0"
            )
            await conn.exec_driver_sql(
                "ALTER TABLE IF EXISTS questions "
                "ADD COLUMN IF NOT EXISTS irt_discrimination NUMERIC(5, 3) DEFAULT 1.0"
            )
            await conn.exec_driver_sql(
                "ALTER TABLE IF EXISTS questions "
                "ADD COLUMN IF NOT EXISTS irt_guessing NUMERIC(5, 3) DEFAULT 0.25"
            )
            await conn.exec_driver_sql(
                "ALTER TABLE IF EXISTS questions "
                "ALTER COLUMN irt_difficulty SET DEFAULT 0.0"
            )
            await conn.exec_driver_sql(
                "ALTER TABLE IF EXISTS questions "
                "ALTER COLUMN irt_discrimination SET DEFAULT 1.0"
            )
            await conn.exec_driver_sql(
                "ALTER TABLE IF EXISTS questions "
                "ALTER COLUMN irt_guessing SET DEFAULT 0.25"
            )
            # Sprint 1 — Inglés: ampliar context_type para incluir react_component.
            # Busca y elimina el constraint previo por nombre, luego recrea con el
            # valor nuevo. El bloque DO ignora si no existe el constraint anterior.
            await conn.exec_driver_sql(
                """
                DO $$
                DECLARE
                    v_con text;
                BEGIN
                    SELECT conname INTO v_con
                    FROM pg_constraint
                    WHERE conrelid = 'questions'::regclass
                      AND contype = 'c'
                      AND conname LIKE '%context_type%'
                    LIMIT 1;

                    IF v_con IS NOT NULL THEN
                        EXECUTE 'ALTER TABLE questions DROP CONSTRAINT ' || quote_ident(v_con);
                    END IF;

                    ALTER TABLE questions
                        ADD CONSTRAINT questions_context_type_check CHECK (
                            context_type IN (
                                'continuous_text','discontinuous_text','scientific_scenario',
                                'math_problem','social_dilemma','philosophical_text',
                                'graphic_notice','dialogue','cloze_text','react_component'
                            )
                        );
                EXCEPTION WHEN duplicate_object THEN NULL;
                END $$;
                """
            )
    yield
    await engine.dispose()


app = FastAPI(
    title="Saber 11 — Question Bank",
    version="0.1.0",
    lifespan=lifespan,
)

app.mount("/uploads", StaticFiles(directory=UPLOADS_ROOT), name="uploads")

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
