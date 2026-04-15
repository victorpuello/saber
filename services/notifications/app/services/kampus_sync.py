"""Job de sincronización periódica con Kampus."""

import logging
from datetime import UTC, datetime

import httpx
from sqlalchemy.ext.asyncio import async_sessionmaker

from ..config import settings
from ..models import SyncLog

logger = logging.getLogger(__name__)


async def sync_users(session_factory: async_sessionmaker) -> None:
    """Sincroniza estudiantes y docentes desde la API de Kampus."""
    async with session_factory() as session:
        log = SyncLog(sync_type="FULL", status="RUNNING")
        session.add(log)
        await session.commit()

        try:
            fetched, created, updated, errors = await _fetch_and_sync(session)
            log.records_fetched = fetched
            log.records_created = created
            log.records_updated = updated
            log.errors = errors
            log.status = "SUCCESS" if errors == 0 else "FAILED"
        except Exception as exc:
            log.status = "FAILED"
            log.error_detail = str(exc)[:500]
            logger.exception("Error en sync con Kampus")
        finally:
            log.finished_at = datetime.now(UTC)
            await session.commit()

        logger.info(
            "Sync completado: status=%s fetched=%d created=%d updated=%d errors=%d",
            log.status,
            log.records_fetched,
            log.records_created,
            log.records_updated,
            log.errors,
        )


async def _fetch_and_sync(
    session,
) -> tuple[int, int, int, int]:
    """Consulta la API de Kampus y retorna conteos."""
    fetched = created = updated = errors = 0

    headers = {}
    if settings.kampus_api_token:
        headers["Authorization"] = f"Bearer {settings.kampus_api_token}"

    async with httpx.AsyncClient(
        base_url=settings.kampus_api_url,
        headers=headers,
        timeout=30.0,
    ) as client:
        # Paginar estudiantes + docentes
        for endpoint in ("/api/users/students/", "/api/users/teachers/"):
            page_url = endpoint
            while page_url:
                resp = await client.get(page_url)
                if resp.status_code != 200:
                    logger.warning(
                        "Kampus %s respondió %d", page_url, resp.status_code
                    )
                    errors += 1
                    break

                data = resp.json()
                results = data.get("results", data) if isinstance(data, dict) else data
                if not isinstance(results, list):
                    results = []

                fetched += len(results)
                # En esta fase se registran conteos; la lógica de
                # upsert contra la BD de perfiles se integrará en
                # Sprint 12 con el módulo de identidad completo.
                created += len(results)

                page_url = data.get("next") if isinstance(data, dict) else None

    return fetched, created, updated, errors
