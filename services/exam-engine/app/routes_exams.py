"""Rutas API para gestión de exámenes (CRUD + ensamblaje)."""

import uuid

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query
from saber11_shared.auth import CurrentUser, get_current_user, require_role
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from .config import settings
from .models import Exam, ExamQuestion
from .schemas import (
    ExamCreate,
    ExamOut,
    ExamSummary,
    ExamType,
    PaginatedResponse,
)

router = APIRouter(prefix="/api/exams", tags=["exams"])


async def _get_db():
    """Inyectada en main.py al registrar el router."""
    raise NotImplementedError


# ── Crear examen ──────────────────────────────────────────────────────


@router.post("/", response_model=ExamOut, status_code=201)
async def create_exam(
    body: ExamCreate,
    db: AsyncSession = Depends(_get_db),
    user: CurrentUser = Depends(require_role("TEACHER", "ADMIN")),
):
    """Crea un examen y ensambla sus preguntas."""
    exam = Exam(
        title=body.title,
        description=body.description,
        exam_type=body.exam_type.value,
        area_id=body.area_id,
        area_code=body.area_code,
        total_questions=body.total_questions,
        time_limit_minutes=body.time_limit_minutes,
        is_adaptive=body.is_adaptive,
        created_by_user_id=user.user_id,
        status="ACTIVE",
    )
    db.add(exam)
    await db.flush()

    # Ensamblar preguntas
    if body.exam_type == ExamType.CUSTOM and body.question_ids:
        # CUSTOM: usa las preguntas proporcionadas
        if len(body.question_ids) != body.total_questions:
            raise HTTPException(
                422,
                f"question_ids ({len(body.question_ids)}) no coincide "
                f"con total_questions ({body.total_questions})",
            )
        for pos, q_id in enumerate(body.question_ids):
            db.add(ExamQuestion(
                exam_id=exam.id, question_id=q_id, position=pos
            ))
    else:
        # AUTO: solicitar preguntas aleatorias al Question Bank
        question_ids = await _fetch_random_questions(
            area_code=body.area_code,
            count=body.total_questions,
        )
        for pos, q_id in enumerate(question_ids):
            db.add(ExamQuestion(
                exam_id=exam.id,
                question_id=uuid.UUID(q_id),
                position=pos,
            ))

    await db.flush()
    await db.refresh(exam)
    return exam


# ── Listar exámenes ──────────────────────────────────────────────────


@router.get("/", response_model=PaginatedResponse)
async def list_exams(
    exam_type: ExamType | None = None,
    area_code: str | None = None,
    status: str = "ACTIVE",
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(_get_db),
    _user: CurrentUser = Depends(get_current_user),
):
    """Lista exámenes disponibles con filtros."""
    query = select(Exam).where(Exam.status == status)

    if exam_type:
        query = query.where(Exam.exam_type == exam_type.value)
    if area_code:
        query = query.where(Exam.area_code == area_code)

    count_q = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_q)).scalar_one()

    offset = (page - 1) * page_size
    items_q = (
        query.order_by(Exam.created_at.desc()).offset(offset).limit(page_size)
    )
    result = await db.execute(items_q)
    items = [ExamSummary.model_validate(e) for e in result.scalars().all()]

    pages = (total + page_size - 1) // page_size
    return PaginatedResponse(
        items=items, total=total, page=page, page_size=page_size, pages=pages
    )


# ── Obtener examen por ID ────────────────────────────────────────────


@router.get("/{exam_id}", response_model=ExamOut)
async def get_exam(
    exam_id: uuid.UUID,
    db: AsyncSession = Depends(_get_db),
    _user: CurrentUser = Depends(get_current_user),
):
    """Obtiene un examen por ID."""
    exam = await db.get(Exam, exam_id)
    if not exam:
        raise HTTPException(404, "Examen no encontrado")
    return exam


# ── Archivar examen ───────────────────────────────────────────────────


@router.patch("/{exam_id}/archive")
async def archive_exam(
    exam_id: uuid.UUID,
    db: AsyncSession = Depends(_get_db),
    _user: CurrentUser = Depends(require_role("ADMIN")),
):
    """Archiva un examen (no se puede presentar más)."""
    exam = await db.get(Exam, exam_id)
    if not exam:
        raise HTTPException(404, "Examen no encontrado")
    exam.status = "ARCHIVED"
    await db.flush()
    return {"status": "ok", "exam_id": str(exam_id)}


# ── Obtener preguntas del examen (con IDs) ────────────────────────────


@router.get("/{exam_id}/questions")
async def get_exam_question_ids(
    exam_id: uuid.UUID,
    db: AsyncSession = Depends(_get_db),
    _user: CurrentUser = Depends(require_role("TEACHER", "ADMIN")),
):
    """Obtiene los IDs de las preguntas del examen (solo docente/admin)."""
    exam = await db.get(
        Exam, exam_id, options=[selectinload(Exam.questions)]
    )
    if not exam:
        raise HTTPException(404, "Examen no encontrado")

    return [
        {"question_id": str(eq.question_id), "position": eq.position}
        for eq in sorted(exam.questions, key=lambda x: x.position)
    ]


# =============================================================================
# Helpers
# =============================================================================


async def _fetch_random_questions(
    area_code: str | None,
    count: int,
) -> list[str]:
    """Solicita preguntas aprobadas aleatorias al Question Bank."""
    params: dict = {"page_size": count, "status": "APPROVED"}
    if area_code:
        params["area_code"] = area_code

    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.get(
            f"{settings.question_bank_url}/api/questions/",
            params=params,
            headers={"X-User-Id": "0", "X-User-Role": "ADMIN"},
        )
        resp.raise_for_status()
        data = resp.json()

    items = data.get("items", [])
    if len(items) < count:
        raise HTTPException(
            422,
            f"No hay suficientes preguntas aprobadas ({len(items)}/{count})",
        )

    return [q["id"] for q in items[:count]]
