"""Rutas API — Students: listado, detalle, sync, revocación."""

import math
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from saber11_shared.auth import CurrentUser, require_role
from sqlalchemy import case, func, literal, select, or_
from sqlalchemy.ext.asyncio import AsyncSession

from .models import Student, SyncLog
from .schemas import (
    PaginatedStudents,
    RevocationRequest,
    StudentDetail,
    StudentListItem,
    StudentStatsOverview,
    GradeStats,
    SyncLogOut,
)

router = APIRouter(prefix="/api/students", tags=["students"])

# Tablas externas (BD compartida — si están disponibles)
# Se usan raw SQL text() para maximizar resiliencia si tablas no existen.
from sqlalchemy import text


async def _get_db():
    raise NotImplementedError


# ── Helpers ──────────────────────────────────────────────────────────────


async def _enrich_with_stats(
    session: AsyncSession, students: list[Student]
) -> list[StudentListItem]:
    """Enriquece la lista de estudiantes con estadísticas cross-table."""
    if not students:
        return []

    kampus_ids = [s.kampus_user_id for s in students]
    stats_map: dict[int, dict] = {kid: {} for kid in kampus_ids}

    # Intentar cargar stats de exam_results (analytics DB)
    try:
        result = await session.execute(
            text(
                "SELECT student_user_id, COUNT(*) as cnt, "
                "AVG(score_global) as avg_s, AVG(accuracy) as avg_a "
                "FROM exam_results WHERE student_user_id = ANY(:ids) "
                "GROUP BY student_user_id"
            ),
            {"ids": kampus_ids},
        )
        for row in result.mappings():
            kid = row["student_user_id"]
            if kid in stats_map:
                stats_map[kid]["exam_count"] = row["cnt"]
                stats_map[kid]["avg_score"] = (
                    round(float(row["avg_s"]), 2) if row["avg_s"] else None
                )
                stats_map[kid]["avg_accuracy"] = (
                    round(float(row["avg_a"]), 2) if row["avg_a"] else None
                )
    except Exception:
        pass  # Tabla no existe o DB separada

    # Intentar cargar diagnostic level (profiles DB)
    try:
        result = await session.execute(
            text(
                "SELECT student_user_id, overall_estimated_level "
                "FROM student_profiles WHERE student_user_id = ANY(:ids)"
            ),
            {"ids": kampus_ids},
        )
        for row in result.mappings():
            kid = row["student_user_id"]
            if kid in stats_map:
                stats_map[kid]["diagnostic_level"] = row["overall_estimated_level"]
    except Exception:
        pass

    # Intentar cargar study plan status (profiles DB)
    try:
        result = await session.execute(
            text(
                "SELECT student_user_id, status, current_week, total_weeks "
                "FROM study_plans WHERE student_user_id = ANY(:ids) "
                "AND status = 'ACTIVE'"
            ),
            {"ids": kampus_ids},
        )
        for row in result.mappings():
            kid = row["student_user_id"]
            if kid in stats_map:
                stats_map[kid]["active_plan_status"] = row["status"]
                stats_map[kid]["plan_current_week"] = row["current_week"]
                stats_map[kid]["plan_total_weeks"] = row["total_weeks"]
    except Exception:
        pass

    items = []
    for s in students:
        st = stats_map.get(s.kampus_user_id, {})
        items.append(
            StudentListItem(
                id=s.id,
                kampus_user_id=s.kampus_user_id,
                first_name=s.first_name,
                last_name=s.last_name,
                email=s.email,
                grade=s.grade,
                section=s.section,
                enrollment_status=s.enrollment_status,
                credentials_revoked=s.credentials_revoked,
                last_login_at=s.last_login_at,
                exam_count=st.get("exam_count", 0),
                avg_score=st.get("avg_score"),
                avg_accuracy=st.get("avg_accuracy"),
                diagnostic_level=st.get("diagnostic_level"),
                active_plan_status=st.get("active_plan_status"),
                plan_current_week=st.get("plan_current_week"),
                plan_total_weeks=st.get("plan_total_weeks"),
            )
        )
    return items


# ── Endpoints ────────────────────────────────────────────────────────────


@router.get("", response_model=PaginatedStudents)
async def list_students(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    grade: str | None = Query(None),
    status: str | None = Query(None),
    search: str | None = Query(None),
    sort_by: str = Query("last_name"),
    sort_order: str = Query("asc"),
    db: AsyncSession = Depends(_get_db),
    user: CurrentUser = Depends(require_role("ADMIN", "TEACHER")),
):
    """Lista paginada de estudiantes con filtros y stats enriquecidas."""
    query = select(Student)

    # Filtros
    if grade:
        query = query.where(Student.grade == grade)
    if status:
        query = query.where(Student.enrollment_status == status.upper())
    if search:
        pattern = f"%{search}%"
        query = query.where(
            or_(
                Student.first_name.ilike(pattern),
                Student.last_name.ilike(pattern),
                Student.email.ilike(pattern),
            )
        )

    # Conteo total
    count_q = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_q)).scalar() or 0

    # Ordenamiento
    allowed_sorts = {
        "last_name": Student.last_name,
        "first_name": Student.first_name,
        "grade": Student.grade,
        "enrollment_status": Student.enrollment_status,
        "last_login_at": Student.last_login_at,
    }
    sort_col = allowed_sorts.get(sort_by, Student.last_name)
    if sort_order == "desc":
        sort_col = sort_col.desc()

    query = query.order_by(sort_col)

    # Paginación
    offset = (page - 1) * page_size
    query = query.offset(offset).limit(page_size)

    result = await db.execute(query)
    students = list(result.scalars().all())

    items = await _enrich_with_stats(db, students)

    return PaginatedStudents(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=math.ceil(total / page_size) if total else 0,
    )


@router.get("/stats", response_model=StudentStatsOverview)
async def get_student_stats(
    db: AsyncSession = Depends(_get_db),
    user: CurrentUser = Depends(require_role("ADMIN", "TEACHER")),
):
    """Resumen general de estados y distribución por grado."""
    # Conteo por estado
    status_q = await db.execute(
        select(Student.enrollment_status, func.count(Student.id)).group_by(
            Student.enrollment_status
        )
    )
    status_counts = {r[0]: r[1] for r in status_q.all()}

    # Conteo por grado (solo activos)
    grade_q = await db.execute(
        select(Student.grade, func.count(Student.id))
        .where(Student.enrollment_status == "ACTIVE")
        .group_by(Student.grade)
        .order_by(Student.grade)
    )
    by_grade = [GradeStats(grade=r[0], count=r[1]) for r in grade_q.all()]

    # Último sync
    last_sync_q = await db.execute(
        select(SyncLog).order_by(SyncLog.started_at.desc()).limit(1)
    )
    last_sync = last_sync_q.scalar_one_or_none()

    return StudentStatsOverview(
        total_active=status_counts.get("ACTIVE", 0),
        total_withdrawn=status_counts.get("WITHDRAWN", 0),
        total_inactive=status_counts.get("INACTIVE", 0),
        by_grade=by_grade,
        last_sync_at=last_sync.started_at if last_sync else None,
        last_sync_status=last_sync.status if last_sync else None,
    )


@router.get("/sync/status", response_model=SyncLogOut | None)
async def get_sync_status(
    db: AsyncSession = Depends(_get_db),
    user: CurrentUser = Depends(require_role("ADMIN")),
):
    """Retorna el último registro de sincronización."""
    result = await db.execute(
        select(SyncLog).order_by(SyncLog.started_at.desc()).limit(1)
    )
    log = result.scalar_one_or_none()
    if not log:
        return None
    return SyncLogOut.model_validate(log)


@router.post("/sync", response_model=SyncLogOut)
async def trigger_sync(
    db: AsyncSession = Depends(_get_db),
    user: CurrentUser = Depends(require_role("ADMIN")),
):
    """Dispara una sincronización manual con Kampus."""
    # Import dinámico para evitar circular en main.py
    from .main import _run_sync

    log = await _run_sync(sync_type="MANUAL")
    return SyncLogOut.model_validate(log)


@router.get("/{student_id}", response_model=StudentDetail)
async def get_student_detail(
    student_id: str,
    db: AsyncSession = Depends(_get_db),
    user: CurrentUser = Depends(require_role("ADMIN", "TEACHER")),
):
    """Detalle completo de un estudiante."""
    result = await db.execute(
        select(Student).where(Student.id == student_id)
    )
    student = result.scalar_one_or_none()
    if not student:
        raise HTTPException(404, "Estudiante no encontrado")

    # Enriquecer con stats
    items = await _enrich_with_stats(db, [student])
    item = items[0] if items else None
    if not item:
        raise HTTPException(500, "Error enriqueciendo datos")

    return StudentDetail(
        **item.model_dump(),
        document_id=student.document_id,
        revoked_at=student.revoked_at,
        revocation_reason=student.revocation_reason,
        last_synced_at=student.last_synced_at,
        created_at=student.created_at,
        updated_at=student.updated_at,
    )


@router.post("/{student_id}/revoke", response_model=StudentDetail)
async def revoke_student(
    student_id: str,
    body: RevocationRequest | None = None,
    db: AsyncSession = Depends(_get_db),
    user: CurrentUser = Depends(require_role("ADMIN")),
):
    """Revoca credenciales de un estudiante manualmente."""
    from .main import revocation_mgr

    result = await db.execute(
        select(Student).where(Student.id == student_id)
    )
    student = result.scalar_one_or_none()
    if not student:
        raise HTTPException(404, "Estudiante no encontrado")

    if student.credentials_revoked:
        raise HTTPException(400, "Credenciales ya están revocadas")

    student.credentials_revoked = True
    student.revoked_at = datetime.now(UTC)
    student.revocation_reason = (
        body.reason if body else "Revocación manual por administrador"
    )
    await revocation_mgr.revoke(student.kampus_user_id)
    await db.commit()

    return await get_student_detail(student_id, db, user)


@router.post("/{student_id}/restore", response_model=StudentDetail)
async def restore_student(
    student_id: str,
    db: AsyncSession = Depends(_get_db),
    user: CurrentUser = Depends(require_role("ADMIN")),
):
    """Restaura credenciales de un estudiante."""
    from .main import revocation_mgr

    result = await db.execute(
        select(Student).where(Student.id == student_id)
    )
    student = result.scalar_one_or_none()
    if not student:
        raise HTTPException(404, "Estudiante no encontrado")

    if not student.credentials_revoked:
        raise HTTPException(400, "Credenciales no están revocadas")

    student.credentials_revoked = False
    student.revoked_at = None
    student.revocation_reason = None
    student.enrollment_status = "ACTIVE"
    await revocation_mgr.restore(student.kampus_user_id)
    await db.commit()

    return await get_student_detail(student_id, db, user)
