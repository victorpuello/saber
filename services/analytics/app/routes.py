"""Rutas API — Analytics: progreso, grado, institución, banco de preguntas."""


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
