"""Rutas API — Study Planner: planes, unidades, práctica y progreso."""

import uuid
from datetime import UTC, datetime

import httpx
from fastapi import APIRouter, Depends, HTTPException
from saber11_shared.auth import CurrentUser, require_role
from saber11_shared.events import EventBus
from sqlalchemy import case, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from . import planner
from .config import settings
from .models import StudyPlan, StudyPlanUnit, UnitPracticeSet
from .schemas import (
    PlanGenerateRequest,
    PlanOut,
    PlanStatsOut,
    PlanSummary,
    PracticeAnswerRequest,
    PracticeItemOut,
    ProgressOut,
    UnitOut,
    WeekOut,
)

router = APIRouter(prefix="/api/plans", tags=["plans"])

_event_bus: EventBus | None = None
INTERNAL_HEADERS = {"X-User-Id": "0", "X-User-Role": "ADMIN"}


def set_event_bus(bus: EventBus):
    global _event_bus  # noqa: PLW0603
    _event_bus = bus


async def _get_db():
    raise NotImplementedError


# ── Helpers ─────────────────────────────────────────────────────


async def _fetch_profile_scores(student_user_id: int) -> dict:
    """Obtiene perfil y scores del Diagnostic Engine."""
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get(
            f"{settings.diagnostic_url}/api/diagnostic/profile/{student_user_id}",
            headers=INTERNAL_HEADERS,
        )
        if resp.status_code != 200:
            raise HTTPException(
                400,
                "No se encontró perfil diagnóstico. Realice un diagnóstico primero.",
            )
        return resp.json()


async def _fetch_taxonomy_competency(competency_id: str) -> dict | None:
    """Obtiene info de competencia desde Question Bank."""
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get(
            f"{settings.question_bank_url}/api/taxonomy/areas",
            headers=INTERNAL_HEADERS,
        )
        if resp.status_code != 200:
            return None
        areas = resp.json()
        # Buscar la competencia en las áreas
        for area in areas:
            area_code = area.get("code", "")
            resp2 = await client.get(
                f"{settings.question_bank_url}/api/taxonomy/areas/{area['id']}/competencies",
                headers=INTERNAL_HEADERS,
            )
            if resp2.status_code == 200:
                for comp in resp2.json():
                    if str(comp.get("id")) == competency_id:
                        return {**comp, "area_code": area_code}
    return None


async def _get_active_plan(
    db: AsyncSession, student_user_id: int
) -> StudyPlan | None:
    """Obtiene el plan activo del estudiante."""
    result = await db.execute(
        select(StudyPlan)
        .where(
            StudyPlan.student_user_id == student_user_id,
            StudyPlan.status == "ACTIVE",
        )
        .options(selectinload(StudyPlan.units).selectinload(StudyPlanUnit.practice_items))
    )
    return result.scalar_one_or_none()


# ── Generar plan ────────────────────────────────────────────────


@router.post("/generate", response_model=PlanOut, status_code=201)
async def generate_plan(
    body: PlanGenerateRequest,
    db: AsyncSession = Depends(_get_db),
    user: CurrentUser = Depends(require_role("STUDENT")),
):
    """Genera un plan de estudio basado en el perfil diagnóstico."""
    # Verificar que no haya un plan activo
    existing = await _get_active_plan(db, user.user_id)
    if existing:
        raise HTTPException(
            409,
            "Ya existe un plan activo. Finalícelo o reemplácelo primero.",
        )

    # Obtener perfil diagnóstico
    profile_data = await _fetch_profile_scores(user.user_id)
    profile_id = profile_data["id"]
    scores_raw = profile_data.get("competency_scores", [])

    if not scores_raw:
        raise HTTPException(
            400,
            "No hay scores de competencia. Complete al menos un diagnóstico.",
        )

    # Enriquecer scores con info de taxonomía
    enriched_scores = []
    for s in scores_raw:
        comp_info = await _fetch_taxonomy_competency(str(s["competency_id"]))
        enriched_scores.append({
            "competency_id": str(s["competency_id"]),
            "classification": s.get("classification", "ADEQUATE"),
            "theta_estimate": s.get("theta_estimate", 0.0),
            "area_code": comp_info["area_code"] if comp_info else "???",
            "competency_name": comp_info.get("name", "") if comp_info else "",
        })

    # Generar estructura del plan
    plan_data = planner.generate_plan_from_scores(
        profile_id=uuid.UUID(profile_id),
        student_user_id=user.user_id,
        competency_scores=enriched_scores,
        total_weeks=body.total_weeks,
    )
    plan_data = planner.apply_english_section_recommendations(plan_data, profile_data)
    plan_data = planner.apply_math_micro_capsules(plan_data, enriched_scores)

    # Persistir plan
    plan = StudyPlan(
        profile_id=uuid.UUID(profile_id),
        student_user_id=user.user_id,
        total_weeks=plan_data["total_weeks"],
    )
    db.add(plan)
    await db.flush()

    # Crear unidades
    for unit_data in plan_data["units"]:
        unit = StudyPlanUnit(
            plan_id=plan.id,
            week_number=unit_data["week_number"],
            position=unit_data["position"],
            competency_id=uuid.UUID(unit_data["competency_id"]),
            area_code=unit_data["area_code"],
            title=unit_data["title"],
            description=unit_data.get("description"),
            priority=unit_data["priority"],
            recommended_questions=unit_data["recommended_questions"],
        )
        db.add(unit)
        await db.flush()

        # Asignar preguntas de práctica
        if unit_data["recommended_questions"] <= 0:
            continue
        questions = await planner.fetch_practice_questions(
            settings.question_bank_url,
            unit_data["competency_id"],
            count=unit_data["recommended_questions"],
        )
        for pos, q in enumerate(questions):
            practice = UnitPracticeSet(
                unit_id=unit.id,
                question_id=uuid.UUID(str(q["id"])),
                position=pos + 1,
            )
            db.add(practice)

    await db.flush()

    # Recargar con relaciones
    plan_loaded = await db.get(
        StudyPlan, plan.id,
        options=[selectinload(StudyPlan.units).selectinload(StudyPlanUnit.practice_items)],
    )
    return plan_loaded


# ── Consultar plan activo ───────────────────────────────────────


@router.get("/micro-capsules/MAT")
async def list_mat_micro_capsules(
    user: CurrentUser = Depends(require_role("STUDENT", "TEACHER", "ADMIN")),
):
    """Retorna el catalogo de micro-capsulas MAT usado por el planner."""
    return planner.MAT_MICRO_CAPSULES


@router.get("/stats", response_model=PlanStatsOut)
async def get_plan_stats(
    db: AsyncSession = Depends(_get_db),
    _user: CurrentUser = Depends(require_role("TEACHER", "ADMIN")),
):
    """Resumen operativo de planes de estudio para dashboards institucionales."""
    status_rows = await db.execute(
        select(StudyPlan.status, func.count(StudyPlan.id)).group_by(StudyPlan.status)
    )
    by_status = {status: count for status, count in status_rows.all()}

    unit_totals = await db.execute(
        select(
            func.count(StudyPlanUnit.id),
            func.sum(case((StudyPlanUnit.completed.is_(True), 1), else_=0)),
        )
    )
    total_units, completed_units = unit_totals.one()

    return PlanStatsOut(
        total=sum(by_status.values()),
        active=by_status.get("ACTIVE", 0),
        paused=by_status.get("PAUSED", 0),
        completed=by_status.get("COMPLETED", 0),
        replaced=by_status.get("REPLACED", 0),
        total_units=total_units or 0,
        completed_units=completed_units or 0,
    )


@router.get("/active", response_model=PlanOut)
async def get_active_plan(
    db: AsyncSession = Depends(_get_db),
    user: CurrentUser = Depends(require_role("STUDENT")),
):
    """Retorna el plan de estudio activo del estudiante."""
    plan = await _get_active_plan(db, user.user_id)
    if not plan:
        raise HTTPException(404, "No tiene un plan de estudio activo")
    return plan


@router.get("/active/student/{student_id}", response_model=PlanOut)
async def get_student_plan(
    student_id: int,
    db: AsyncSession = Depends(_get_db),
    user: CurrentUser = Depends(require_role("TEACHER", "ADMIN")),
):
    """Retorna el plan activo de un estudiante (docente/admin)."""
    plan = await _get_active_plan(db, student_id)
    if not plan:
        raise HTTPException(404, "No se encontró plan activo para este estudiante")
    return plan


@router.get("/history", response_model=list[PlanSummary])
async def list_my_plans(
    db: AsyncSession = Depends(_get_db),
    user: CurrentUser = Depends(require_role("STUDENT")),
):
    """Lista todos los planes del estudiante."""
    result = await db.execute(
        select(StudyPlan)
        .where(StudyPlan.student_user_id == user.user_id)
        .options(selectinload(StudyPlan.units))
        .order_by(StudyPlan.generated_at.desc())
    )
    plans = list(result.scalars().all())

    summaries = []
    for p in plans:
        total = len(p.units)
        completed = sum(1 for u in p.units if u.completed)
        summaries.append(PlanSummary(
            id=p.id,
            status=p.status,
            total_weeks=p.total_weeks,
            current_week=p.current_week,
            generated_at=p.generated_at,
            units_total=total,
            units_completed=completed,
            progress_percent=round(completed / total * 100, 1) if total else 0.0,
        ))
    return summaries


# ── Semana actual ───────────────────────────────────────────────


@router.get("/active/week/{week_number}", response_model=WeekOut)
async def get_week(
    week_number: int,
    db: AsyncSession = Depends(_get_db),
    user: CurrentUser = Depends(require_role("STUDENT")),
):
    """Retorna las unidades de una semana específica del plan activo."""
    plan = await _get_active_plan(db, user.user_id)
    if not plan:
        raise HTTPException(404, "No tiene un plan activo")

    week_units = [u for u in plan.units if u.week_number == week_number]
    if not week_units:
        raise HTTPException(404, f"No hay unidades para la semana {week_number}")

    return WeekOut(week_number=week_number, units=week_units)


# ── Detalle de unidad ───────────────────────────────────────────


@router.get("/units/{unit_id}", response_model=UnitOut)
async def get_unit(
    unit_id: uuid.UUID,
    db: AsyncSession = Depends(_get_db),
    user: CurrentUser = Depends(require_role("STUDENT")),
):
    """Retorna detalle de una unidad con sus preguntas de práctica."""
    unit = await db.get(
        StudyPlanUnit, unit_id,
        options=[
            selectinload(StudyPlanUnit.practice_items),
            selectinload(StudyPlanUnit.plan),
        ],
    )
    if not unit:
        raise HTTPException(404, "Unidad no encontrada")
    if unit.plan.student_user_id != user.user_id:
        raise HTTPException(403, "No autorizado")
    return unit


# ── Responder práctica ──────────────────────────────────────────


@router.post(
    "/units/{unit_id}/answer",
    response_model=PracticeItemOut,
)
async def answer_practice(
    unit_id: uuid.UUID,
    body: PracticeAnswerRequest,
    db: AsyncSession = Depends(_get_db),
    user: CurrentUser = Depends(require_role("STUDENT")),
):
    """Registra la respuesta a una pregunta de práctica de una unidad."""
    unit = await db.get(
        StudyPlanUnit, unit_id,
        options=[
            selectinload(StudyPlanUnit.practice_items),
            selectinload(StudyPlanUnit.plan),
        ],
    )
    if not unit:
        raise HTTPException(404, "Unidad no encontrada")
    if unit.plan.student_user_id != user.user_id:
        raise HTTPException(403, "No autorizado")
    if unit.completed:
        raise HTTPException(400, "Esta unidad ya fue completada")

    # Buscar el practice item
    practice = next(
        (p for p in unit.practice_items if p.question_id == body.question_id),
        None,
    )
    if not practice:
        raise HTTPException(404, "Pregunta no encontrada en esta unidad")
    if practice.completed:
        raise HTTPException(400, "Esta pregunta ya fue respondida")

    # Obtener respuesta correcta desde QB
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get(
            f"{settings.question_bank_url}/api/questions/{body.question_id}",
            headers=INTERNAL_HEADERS,
        )
        if resp.status_code != 200:
            raise HTTPException(502, "No se pudo verificar la respuesta")
        question = resp.json()

    correct = question["correct_answer"]
    is_correct = body.selected_answer == correct

    practice.selected_answer = body.selected_answer
    practice.is_correct = is_correct
    practice.completed = True
    practice.completed_at = datetime.now(UTC)

    # Actualizar métricas de la unidad
    unit.questions_attempted += 1
    if is_correct:
        unit.questions_correct += 1

    # Verificar si la unidad se completó (todas las prácticas respondidas)
    all_done = all(p.completed for p in unit.practice_items)
    if all_done:
        unit.completed = True
        unit.completed_at = datetime.now(UTC)
        await _check_plan_progress(db, unit.plan)

    await db.flush()
    return practice


# ── Completar unidad manualmente ─────────────────────────────


@router.post("/units/{unit_id}/complete", response_model=UnitOut)
async def complete_unit(
    unit_id: uuid.UUID,
    db: AsyncSession = Depends(_get_db),
    user: CurrentUser = Depends(require_role("STUDENT")),
):
    """Marca una unidad como completada manualmente."""
    unit = await db.get(
        StudyPlanUnit, unit_id,
        options=[
            selectinload(StudyPlanUnit.practice_items),
            selectinload(StudyPlanUnit.plan),
        ],
    )
    if not unit:
        raise HTTPException(404, "Unidad no encontrada")
    if unit.plan.student_user_id != user.user_id:
        raise HTTPException(403, "No autorizado")
    if unit.completed:
        raise HTTPException(400, "Esta unidad ya fue completada")

    unit.completed = True
    unit.completed_at = datetime.now(UTC)
    await _check_plan_progress(db, unit.plan)
    await db.flush()
    return unit


# ── Reajustar plan ──────────────────────────────────────────────


@router.post("/active/readjust", response_model=PlanOut)
async def readjust_plan(
    db: AsyncSession = Depends(_get_db),
    user: CurrentUser = Depends(require_role("STUDENT")),
):
    """Recalcula prioridades del plan según perfil diagnóstico actualizado."""
    plan = await _get_active_plan(db, user.user_id)
    if not plan:
        raise HTTPException(404, "No tiene un plan activo")

    # Obtener scores actualizados
    profile_data = await _fetch_profile_scores(user.user_id)
    scores_raw = profile_data.get("competency_scores", [])

    score_map = {
        str(s["competency_id"]): s.get("classification", "ADEQUATE")
        for s in scores_raw
    }

    # Recalcular prioridades de unidades no completadas
    priority_map = {
        "CRITICAL": "HIGH",
        "WEAKNESS": "HIGH",
        "ADEQUATE": "MEDIUM",
        "STRENGTH": "LOW",
    }

    for unit in plan.units:
        if not unit.completed:
            classification = score_map.get(str(unit.competency_id), "ADEQUATE")
            unit.priority = priority_map.get(classification, "MEDIUM")

    plan.updated_at = datetime.now(UTC)
    await db.flush()

    # Emitir evento
    if _event_bus:
        await _event_bus.publish(
            "plan.updated",
            {
                "student_user_id": user.user_id,
                "plan_id": str(plan.id),
                "action": "readjusted",
            },
        )

    # Recargar
    plan_loaded = await db.get(
        StudyPlan, plan.id,
        options=[selectinload(StudyPlan.units).selectinload(StudyPlanUnit.practice_items)],
    )
    return plan_loaded


# ── Reemplazar plan ─────────────────────────────────────────────


@router.post("/active/replace", response_model=PlanOut, status_code=201)
async def replace_plan(
    body: PlanGenerateRequest,
    db: AsyncSession = Depends(_get_db),
    user: CurrentUser = Depends(require_role("STUDENT")),
):
    """Reemplaza el plan activo por uno nuevo regenerado."""
    existing = await _get_active_plan(db, user.user_id)
    if existing:
        existing.status = "REPLACED"

    # Generar nuevo plan (reutiliza lógica de generate)
    profile_data = await _fetch_profile_scores(user.user_id)
    profile_id = profile_data["id"]
    scores_raw = profile_data.get("competency_scores", [])

    if not scores_raw:
        raise HTTPException(400, "No hay scores de competencia disponibles.")

    enriched_scores = []
    for s in scores_raw:
        comp_info = await _fetch_taxonomy_competency(str(s["competency_id"]))
        enriched_scores.append({
            "competency_id": str(s["competency_id"]),
            "classification": s.get("classification", "ADEQUATE"),
            "theta_estimate": s.get("theta_estimate", 0.0),
            "area_code": comp_info["area_code"] if comp_info else "???",
            "competency_name": comp_info.get("name", "") if comp_info else "",
        })

    plan_data = planner.generate_plan_from_scores(
        profile_id=uuid.UUID(profile_id),
        student_user_id=user.user_id,
        competency_scores=enriched_scores,
        total_weeks=body.total_weeks,
    )
    plan_data = planner.apply_english_section_recommendations(plan_data, profile_data)
    plan_data = planner.apply_math_micro_capsules(plan_data, enriched_scores)

    plan = StudyPlan(
        profile_id=uuid.UUID(profile_id),
        student_user_id=user.user_id,
        total_weeks=plan_data["total_weeks"],
    )
    db.add(plan)
    await db.flush()

    for unit_data in plan_data["units"]:
        unit = StudyPlanUnit(
            plan_id=plan.id,
            week_number=unit_data["week_number"],
            position=unit_data["position"],
            competency_id=uuid.UUID(unit_data["competency_id"]),
            area_code=unit_data["area_code"],
            title=unit_data["title"],
            description=unit_data.get("description"),
            priority=unit_data["priority"],
            recommended_questions=unit_data["recommended_questions"],
        )
        db.add(unit)
        await db.flush()

        if unit_data["recommended_questions"] <= 0:
            continue
        questions = await planner.fetch_practice_questions(
            settings.question_bank_url,
            unit_data["competency_id"],
            count=unit_data["recommended_questions"],
        )
        for pos, q in enumerate(questions):
            db.add(UnitPracticeSet(
                unit_id=unit.id,
                question_id=uuid.UUID(str(q["id"])),
                position=pos + 1,
            ))

    await db.flush()

    if _event_bus:
        await _event_bus.publish(
            "plan.updated",
            {
                "student_user_id": user.user_id,
                "plan_id": str(plan.id),
                "action": "replaced",
            },
        )

    plan_loaded = await db.get(
        StudyPlan, plan.id,
        options=[selectinload(StudyPlan.units).selectinload(StudyPlanUnit.practice_items)],
    )
    return plan_loaded


# ── Progreso ────────────────────────────────────────────────────


@router.get("/active/progress", response_model=ProgressOut)
async def get_progress(
    db: AsyncSession = Depends(_get_db),
    user: CurrentUser = Depends(require_role("STUDENT")),
):
    """Retorna el progreso del plan activo con desglose por área y prioridad."""
    plan = await _get_active_plan(db, user.user_id)
    if not plan:
        raise HTTPException(404, "No tiene un plan activo")

    total = len(plan.units)
    completed = sum(1 for u in plan.units if u.completed)

    # Desglose por área
    by_area: dict[str, dict] = {}
    for u in plan.units:
        area = u.area_code
        if area not in by_area:
            by_area[area] = {"total": 0, "completed": 0, "correct": 0, "attempted": 0}
        by_area[area]["total"] += 1
        if u.completed:
            by_area[area]["completed"] += 1
        by_area[area]["correct"] += u.questions_correct
        by_area[area]["attempted"] += u.questions_attempted

    # Desglose por prioridad
    by_priority: dict[str, dict] = {}
    for u in plan.units:
        pri = u.priority
        if pri not in by_priority:
            by_priority[pri] = {"total": 0, "completed": 0}
        by_priority[pri]["total"] += 1
        if u.completed:
            by_priority[pri]["completed"] += 1

    return ProgressOut(
        plan_id=plan.id,
        total_units=total,
        completed_units=completed,
        progress_percent=round(completed / total * 100, 1) if total else 0.0,
        current_week=plan.current_week,
        total_weeks=plan.total_weeks,
        by_area=by_area,
        by_priority=by_priority,
    )


# ── Helpers internos ────────────────────────────────────────────


async def _check_plan_progress(db: AsyncSession, plan: StudyPlan) -> None:
    """Verifica progreso del plan y avanza semana si corresponde."""
    current_week_units = [
        u for u in plan.units if u.week_number == plan.current_week
    ]

    if current_week_units and all(u.completed for u in current_week_units):
        # Avanzar a la siguiente semana
        if plan.current_week < plan.total_weeks:
            plan.current_week += 1

            if _event_bus:
                await _event_bus.publish(
                    "milestone.reached",
                    {
                        "student_user_id": plan.student_user_id,
                        "plan_id": str(plan.id),
                        "milestone": f"week_{plan.current_week - 1}_completed",
                        "current_week": plan.current_week,
                    },
                )
        else:
            # Plan completado
            plan.status = "COMPLETED"
            if _event_bus:
                await _event_bus.publish(
                    "plan.updated",
                    {
                        "student_user_id": plan.student_user_id,
                        "plan_id": str(plan.id),
                        "action": "completed",
                    },
                )
