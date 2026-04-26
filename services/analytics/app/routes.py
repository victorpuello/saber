"""Rutas API — Analytics: progreso, grado, institución, banco de preguntas."""


import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from saber11_shared.auth import CurrentUser, require_role
from sqlalchemy import distinct, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from .models import (
    CompetencySnapshot,
    DailyAggregate,
    DiagnosticResult,
    ExamResult,
    QuestionStat,
)
from .schemas import (
    AreaPerformance,
    ClassroomAnalyticsOut,
    GradeStudentSummary,
    InstitutionReportOut,
    QuestionBankMetricsOut,
    StudentProgressOut,
)

router = APIRouter(prefix="/api/analytics", tags=["analytics"])


async def _get_db():
    raise NotImplementedError


def _round_or_none(value, digits: int = 2) -> float | None:
    return round(float(value), digits) if value is not None else None


# ── Progreso individual ─────────────────────────────────────────


@router.get("/student/{student_id}/progress", response_model=StudentProgressOut)
async def get_student_progress(
    student_id: int,
    db: AsyncSession = Depends(_get_db),
    user: CurrentUser = Depends(require_role("STUDENT", "TEACHER", "ADMIN")),
):
    """Progreso individual del estudiante: exámenes y competencias."""
    # Estudiante solo puede ver su propio progreso
    if user.role == "STUDENT" and user.user_id != student_id:
        raise HTTPException(403, "No autorizado")

    # Resultados de exámenes
    exams_q = await db.execute(
        select(ExamResult)
        .where(ExamResult.student_user_id == student_id)
        .order_by(ExamResult.completed_at.desc())
        .limit(20)
    )
    exams = list(exams_q.scalars().all())

    # Agregados
    agg_q = await db.execute(
        select(
            func.count(ExamResult.id),
            func.avg(ExamResult.score_global),
            func.avg(ExamResult.accuracy),
        ).where(ExamResult.student_user_id == student_id)
    )
    row = agg_q.one()
    exam_count = row[0] or 0
    avg_score = round(float(row[1]), 2) if row[1] else None
    avg_accuracy = round(float(row[2]), 2) if row[2] else None

    # Competencias
    comp_q = await db.execute(
        select(CompetencySnapshot)
        .where(CompetencySnapshot.student_user_id == student_id)
        .order_by(CompetencySnapshot.area_code, CompetencySnapshot.competency_id)
    )
    competencies = list(comp_q.scalars().all())

    return StudentProgressOut(
        student_user_id=student_id,
        exam_count=exam_count,
        avg_score=avg_score,
        avg_accuracy=avg_accuracy,
        recent_exams=exams,
        competencies=competencies,
    )


# ── Analítica por grado ─────────────────────────────────────────


@router.get("/classroom/{grade}", response_model=ClassroomAnalyticsOut)
async def get_classroom_analytics(
    grade: str,
    db: AsyncSession = Depends(_get_db),
    user: CurrentUser = Depends(require_role("TEACHER", "ADMIN")),
):
    """Analítica de un grado: resumen de estudiantes y desglose por área."""
    institution_id = user.institution_id

    # Estudiantes del grado con exámenes
    students_q = await db.execute(
        select(
            ExamResult.student_user_id,
            func.count(ExamResult.id).label("exam_count"),
            func.avg(ExamResult.score_global).label("avg_score"),
            func.avg(ExamResult.accuracy).label("avg_accuracy"),
        )
        .where(
            ExamResult.grade == grade,
            ExamResult.institution_id == institution_id,
        )
        .group_by(ExamResult.student_user_id)
    )
    students = [
        GradeStudentSummary(
            student_user_id=r.student_user_id,
            exam_count=r.exam_count,
            avg_score=round(float(r.avg_score), 2) if r.avg_score else None,
            avg_accuracy=round(float(r.avg_accuracy), 2) if r.avg_accuracy else None,
        )
        for r in students_q.all()
    ]

    # Totales
    totals_q = await db.execute(
        select(
            func.count(ExamResult.id),
            func.avg(ExamResult.score_global),
            func.avg(ExamResult.accuracy),
        ).where(
            ExamResult.grade == grade,
            ExamResult.institution_id == institution_id,
        )
    )
    t = totals_q.one()

    # Desglose por área
    area_q = await db.execute(
        select(
            ExamResult.area_code,
            func.count(ExamResult.id).label("count"),
            func.avg(ExamResult.score_global).label("avg_score"),
            func.avg(ExamResult.accuracy).label("avg_accuracy"),
        )
        .where(
            ExamResult.grade == grade,
            ExamResult.institution_id == institution_id,
            ExamResult.area_code.isnot(None),
        )
        .group_by(ExamResult.area_code)
    )
    by_area = {
        r.area_code: {
            "count": r.count,
            "avg_score": round(float(r.avg_score), 2) if r.avg_score else None,
            "avg_accuracy": round(float(r.avg_accuracy), 2) if r.avg_accuracy else None,
        }
        for r in area_q.all()
    }

    total_students = len(students)
    return ClassroomAnalyticsOut(
        grade=grade,
        institution_id=institution_id,
        total_students=total_students,
        exams_completed=t[0] or 0,
        avg_score=round(float(t[1]), 2) if t[1] else None,
        avg_accuracy=round(float(t[2]), 2) if t[2] else None,
        students=students,
        by_area=by_area,
    )


# ── Reportes institucionales ────────────────────────────────────


@router.get("/institution", response_model=InstitutionReportOut)
async def get_institution_report(
    db: AsyncSession = Depends(_get_db),
    user: CurrentUser = Depends(require_role("ADMIN")),
    days: int = Query(30, ge=1, le=365),
):
    """Reporte institucional: totales, por área y tendencia diaria."""
    institution_id = user.institution_id

    # Totales de exámenes
    exam_totals = await db.execute(
        select(
            func.count(ExamResult.id),
            func.avg(ExamResult.score_global),
            func.avg(ExamResult.accuracy),
            func.count(distinct(ExamResult.student_user_id)),
        ).where(ExamResult.institution_id == institution_id)
    )
    et = exam_totals.one()

    # Totales de diagnósticos
    diag_totals = await db.execute(
        select(func.count(DiagnosticResult.id)).where(
            DiagnosticResult.institution_id == institution_id
        )
    )
    total_diagnostics = diag_totals.scalar() or 0

    # Por área
    area_q = await db.execute(
        select(
            ExamResult.area_code,
            func.count(ExamResult.id).label("count"),
            func.avg(ExamResult.score_global).label("avg_score"),
            func.avg(ExamResult.accuracy).label("avg_accuracy"),
            func.count(distinct(ExamResult.student_user_id)).label("students"),
        )
        .where(
            ExamResult.institution_id == institution_id,
            ExamResult.area_code.isnot(None),
        )
        .group_by(ExamResult.area_code)
    )
    areas = [
        AreaPerformance(
            area_code=r.area_code,
            avg_score=round(float(r.avg_score), 2) if r.avg_score else None,
            avg_accuracy=round(float(r.avg_accuracy), 2) if r.avg_accuracy else None,
            exams_count=r.count,
            students_count=r.students,
        )
        for r in area_q.all()
    ]

    # Tendencia diaria
    daily_q = await db.execute(
        select(DailyAggregate)
        .where(DailyAggregate.institution_id == institution_id)
        .order_by(DailyAggregate.date.desc())
        .limit(days)
    )
    daily_trend = [
        {
            "date": d.date,
            "exams": d.exams_completed,
            "diagnostics": d.diagnostics_completed,
            "avg_score": float(d.avg_score) if d.avg_score else None,
            "active_students": d.active_students,
        }
        for d in daily_q.scalars().all()
    ]

    return InstitutionReportOut(
        institution_id=institution_id,
        total_students=et[3] or 0,
        total_exams=et[0] or 0,
        total_diagnostics=total_diagnostics,
        avg_score_global=round(float(et[1]), 2) if et[1] else None,
        avg_accuracy_global=round(float(et[2]), 2) if et[2] else None,
        areas=areas,
        daily_trend=daily_trend,
    )


# ── Rendimiento del banco de preguntas ──────────────────────────


# =============================================================================
# Analitica especializada MAT
# =============================================================================


@router.get("/areas/MAT/competency-breakdown")
async def get_mat_competency_breakdown(
    group_id: str | None = Query(None),
    db: AsyncSession = Depends(_get_db),
    user: CurrentUser = Depends(require_role("TEACHER", "ADMIN")),
):
    """Desglose de Matematicas por competencia para un grado/grupo."""
    query = (
        select(
            CompetencySnapshot.competency_id,
            func.count(distinct(CompetencySnapshot.student_user_id)).label("students"),
            func.avg(CompetencySnapshot.theta_estimate).label("avg_theta"),
            func.sum(CompetencySnapshot.questions_attempted).label("attempted"),
            func.sum(CompetencySnapshot.questions_correct).label("correct"),
        )
        .where(CompetencySnapshot.area_code == "MAT")
        .group_by(CompetencySnapshot.competency_id)
    )
    if group_id:
        query = query.where(CompetencySnapshot.grade == group_id)
    if user.institution_id:
        query = query.where(CompetencySnapshot.institution_id == user.institution_id)

    rows = (await db.execute(query)).all()
    items = []
    for row in rows:
        attempted = int(row.attempted or 0)
        correct = int(row.correct or 0)
        avg_accuracy = round(correct / attempted * 100, 2) if attempted else None
        items.append(
            {
                "competency_id": str(row.competency_id),
                "students": int(row.students or 0),
                "avg_theta": _round_or_none(row.avg_theta, 3),
                "questions_attempted": attempted,
                "questions_correct": correct,
                "avg_accuracy": avg_accuracy,
            }
        )

    return {"area_code": "MAT", "group_id": group_id, "items": items}


@router.get("/areas/MAT/distractor-analysis")
async def get_mat_distractor_analysis(
    question_id: str = Query(...),
    db: AsyncSession = Depends(_get_db),
    user: CurrentUser = Depends(require_role("TEACHER", "ADMIN")),
):
    """Distribucion de respuestas A/B/C/D para una pregunta MAT."""
    try:
        q_uuid = uuid.UUID(question_id)
    except ValueError as exc:
        raise HTTPException(422, "question_id debe ser un UUID valido") from exc

    result = await db.execute(
        select(QuestionStat).where(
            QuestionStat.question_id == q_uuid,
            QuestionStat.area_code == "MAT",
        )
    )
    stat = result.scalar_one_or_none()
    if not stat:
        raise HTTPException(404, "No hay estadisticas MAT para esta pregunta")

    counts = {
        "A": stat.count_a,
        "B": stat.count_b,
        "C": stat.count_c,
        "D": stat.count_d,
    }
    most_selected = max(counts, key=counts.get) if counts else None
    return {
        "area_code": "MAT",
        "question_id": str(stat.question_id),
        "total": stat.times_presented,
        "times_correct": stat.times_correct,
        "accuracy_rate": _round_or_none(stat.accuracy_rate),
        "counts": counts,
        "most_selected": most_selected,
        "most_selected_count": counts.get(most_selected, 0) if most_selected else 0,
    }


@router.get("/areas/MAT/struggling-components")
async def get_mat_struggling_components(
    group_id: str | None = Query(None),
    db: AsyncSession = Depends(_get_db),
    user: CurrentUser = Depends(require_role("TEACHER", "ADMIN")),
):
    """Lista senales MAT con tasa de fallo mayor al 60%."""
    query = (
        select(
            CompetencySnapshot.competency_id,
            func.count(distinct(CompetencySnapshot.student_user_id)).label("students"),
            func.sum(CompetencySnapshot.questions_attempted).label("attempted"),
            func.sum(CompetencySnapshot.questions_correct).label("correct"),
        )
        .where(CompetencySnapshot.area_code == "MAT")
        .group_by(CompetencySnapshot.competency_id)
    )
    if group_id:
        query = query.where(CompetencySnapshot.grade == group_id)
    if user.institution_id:
        query = query.where(CompetencySnapshot.institution_id == user.institution_id)
    rows = (await db.execute(query)).all()

    items = []
    for row in rows:
        attempted = int(row.attempted or 0)
        correct = int(row.correct or 0)
        if attempted <= 0:
            continue
        accuracy = correct / attempted * 100
        failure_rate = round(100 - accuracy, 2)
        if failure_rate <= 60:
            continue
        items.append(
            {
                "component_id": str(row.competency_id),
                "label": "MAT competency proxy",
                "failure_rate": failure_rate,
                "avg_accuracy": round(accuracy, 2),
                "students": int(row.students or 0),
                "questions_attempted": attempted,
                "source": "competency_snapshots_by_group",
            }
        )

    items.sort(key=lambda item: item["failure_rate"], reverse=True)
    return {"area_code": "MAT", "group_id": group_id, "items": items}


@router.get("/questions/performance", response_model=QuestionBankMetricsOut)
async def get_question_performance(
    db: AsyncSession = Depends(_get_db),
    user: CurrentUser = Depends(require_role("ADMIN")),
    limit: int = Query(10, ge=1, le=50),
):
    """Métricas de rendimiento del banco de preguntas."""
    # Totales
    totals = await db.execute(
        select(
            func.count(QuestionStat.id),
            func.avg(QuestionStat.accuracy_rate),
        )
    )
    t = totals.one()

    # Más difíciles (menor accuracy)
    hardest_q = await db.execute(
        select(QuestionStat)
        .where(QuestionStat.times_presented > 0)
        .order_by(QuestionStat.accuracy_rate.asc())
        .limit(limit)
    )

    # Más fáciles (mayor accuracy)
    easiest_q = await db.execute(
        select(QuestionStat)
        .where(QuestionStat.times_presented > 0)
        .order_by(QuestionStat.accuracy_rate.desc())
        .limit(limit)
    )

    # Más presentadas
    most_q = await db.execute(
        select(QuestionStat)
        .order_by(QuestionStat.times_presented.desc())
        .limit(limit)
    )

    return QuestionBankMetricsOut(
        total_questions_tracked=t[0] or 0,
        avg_accuracy_rate=round(float(t[1]), 2) if t[1] else None,
        hardest_questions=list(hardest_q.scalars().all()),
        easiest_questions=list(easiest_q.scalars().all()),
        most_presented=list(most_q.scalars().all()),
    )
