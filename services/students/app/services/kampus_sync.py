"""Sincronización de estudiantes desde la API de Kampus."""

import logging
from datetime import UTC, datetime

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from ..models import Student, SyncLog
from .revocation import RevocationManager

logger = logging.getLogger(__name__)

# Grados válidos para el simulador Saber 11
VALID_GRADES = {"9", "10", "11"}


async def _obtain_kampus_token(
    client: httpx.AsyncClient,
    auth_endpoint: str,
    username: str,
    password: str,
) -> str | None:
    """Autentica con Kampus SimpleJWT y devuelve el access token."""
    try:
        resp = await client.post(
            auth_endpoint,
            json={"username": username, "password": password},
        )
        if resp.status_code == 200:
            return resp.json().get("access")
        logger.warning(
            "Kampus %s respondió %d al obtener token", auth_endpoint, resp.status_code
        )
    except Exception:
        logger.exception("Error obteniendo token de Kampus")
    return None


async def sync_students(
    session_factory: async_sessionmaker[AsyncSession],
    kampus_api_url: str,
    kampus_api_token: str,
    revocation_mgr: RevocationManager,
    sync_type: str = "SCHEDULED",
    kampus_api_username: str = "",
    kampus_api_password: str = "",
    kampus_auth_endpoint: str = "/api/token/",
) -> SyncLog:
    """Sincroniza el roster de estudiantes de grados 9-11 desde Kampus."""
    async with session_factory() as session:
        log = SyncLog(sync_type=sync_type, status="RUNNING")
        session.add(log)
        await session.commit()
        await session.refresh(log)

        try:
            fetched, created, updated, revoked, errors = await _fetch_and_upsert(
                session, kampus_api_url, kampus_api_token, revocation_mgr,
                kampus_api_username, kampus_api_password, kampus_auth_endpoint,
            )
            log.records_fetched = fetched
            log.records_created = created
            log.records_updated = updated
            log.records_revoked = revoked
            log.errors = errors
            log.status = "SUCCESS" if errors == 0 else "FAILED"
        except Exception as exc:
            log.status = "FAILED"
            log.error_detail = str(exc)[:500]
            logger.exception("Error en sync de estudiantes con Kampus")
        finally:
            log.finished_at = datetime.now(UTC)
            await session.commit()

        logger.info(
            "Sync estudiantes: status=%s fetched=%d created=%d updated=%d revoked=%d errors=%d",
            log.status,
            log.records_fetched,
            log.records_created,
            log.records_updated,
            log.records_revoked,
            log.errors,
        )
        return log


async def _fetch_and_upsert(
    session: AsyncSession,
    kampus_api_url: str,
    kampus_api_token: str,
    revocation_mgr: RevocationManager,
    kampus_api_username: str = "",
    kampus_api_password: str = "",
    kampus_auth_endpoint: str = "/api/token/",
) -> tuple[int, int, int, int, int]:
    """Consulta Kampus, upsert en BD local, revoca retirados."""
    fetched = created = updated = revoked = errors = 0
    seen_kampus_ids: set[int] = set()

    async with httpx.AsyncClient(
        base_url=kampus_api_url,
        timeout=30.0,
    ) as client:
        # Obtener token fresco si hay credenciales configuradas
        token = kampus_api_token
        if kampus_api_username and kampus_api_password:
            token = await _obtain_kampus_token(
                client, kampus_auth_endpoint, kampus_api_username, kampus_api_password
            )
            if not token:
                logger.error("No se pudo obtener token de Kampus con credenciales")
                return 0, 0, 0, 0, 1

        headers = {}
        if token:
            headers["Authorization"] = f"Bearer {token}"
        # Kampus monta StudentViewSet en /api/students/ (DRF DefaultRouter)
        page_url: str | None = "/api/students/"
        while page_url:
            resp = await client.get(page_url, headers=headers)
            if resp.status_code != 200:
                logger.warning("Kampus %s respondió %d", page_url, resp.status_code)
                errors += 1
                break

            data = resp.json()
            results = data.get("results", data) if isinstance(data, dict) else data
            if not isinstance(results, list):
                results = []

            for record in results:
                try:
                    # Kampus StudentSerializer: user.id = Django User pk (usado en JWT)
                    user_obj = record.get("user") or {}
                    kampus_id = int(
                        user_obj.get("id", 0)
                        or record.get("id", 0)
                    )
                    if not kampus_id:
                        errors += 1
                        continue

                    # current_grade_ordinal → int (9, 10, 11)
                    grade_raw = record.get("current_grade_ordinal")
                    grade = str(grade_raw) if grade_raw is not None else ""
                    if grade not in VALID_GRADES:
                        continue  # Ignorar grados fuera de 9-11

                    # Solo importar estudiantes activos en el año actual
                    enrollment_status_kampus = (
                        record.get("current_enrollment_status") or ""
                    )
                    if enrollment_status_kampus.upper() != "ACTIVE":
                        continue

                    seen_kampus_ids.add(kampus_id)
                    fetched += 1

                    # Buscar existente
                    q = await session.execute(
                        select(Student).where(
                            Student.kampus_user_id == kampus_id
                        )
                    )
                    student = q.scalar_one_or_none()

                    # Campos anidados en user
                    first_name = user_obj.get("first_name", "")
                    last_name = user_obj.get("last_name", "")
                    email = user_obj.get("email", "")
                    # Campos directos del Student de Kampus
                    section = record.get("section") or record.get("seccion")
                    document_id = record.get("document_number") or ""

                    now = datetime.now(UTC)

                    if student:
                        student.first_name = first_name
                        student.last_name = last_name
                        student.email = email
                        student.grade = grade
                        student.section = section
                        student.document_id = document_id
                        student.last_synced_at = now

                        # Reactivar si estaba retirado pero reaparece activo
                        if student.enrollment_status != "ACTIVE":
                            student.enrollment_status = "ACTIVE"
                            if student.credentials_revoked:
                                student.credentials_revoked = False
                                student.revoked_at = None
                                student.revocation_reason = None
                                await revocation_mgr.restore(kampus_id)
                        updated += 1
                    else:
                        student = Student(
                            kampus_user_id=kampus_id,
                            first_name=first_name,
                            last_name=last_name,
                            email=email,
                            document_id=document_id,
                            grade=grade,
                            section=section,
                            enrollment_status="ACTIVE",
                            last_synced_at=now,
                        )
                        session.add(student)
                        created += 1

                except Exception:
                    logger.exception("Error procesando registro de Kampus")
                    errors += 1

            page_url = data.get("next") if isinstance(data, dict) else None

    # Detectar retirados: estudiantes activos en BD que NO aparecen en Kampus
    active_q = await session.execute(
        select(Student).where(
            Student.enrollment_status == "ACTIVE",
        )
    )
    for student in active_q.scalars().all():
        if student.kampus_user_id not in seen_kampus_ids:
            student.enrollment_status = "WITHDRAWN"
            student.credentials_revoked = True
            student.revoked_at = datetime.now(UTC)
            student.revocation_reason = "No encontrado en sincronización con Kampus"
            await revocation_mgr.revoke(student.kampus_user_id)
            revoked += 1

    await session.commit()
    return fetched, created, updated, revoked, errors
