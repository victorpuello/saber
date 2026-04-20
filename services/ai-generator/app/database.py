"""Base de datos local del AI Generator Service."""

from collections.abc import AsyncGenerator

from saber11_shared.database import create_db_engine, create_session_factory
from sqlalchemy.ext.asyncio import AsyncSession

from .config import settings

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
