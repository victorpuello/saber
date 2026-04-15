"""Rutas API CRUD de preguntas + flujo de revisión."""

import uuid
from datetime import UTC, datetime
from math import ceil

from fastapi import APIRouter, Depends, HTTPException, Query
from saber11_shared.auth import CurrentUser, get_current_user, require_role
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from .models import Question
from .schemas import (
    PaginatedResponse,
    QuestionCreate,
    QuestionOut,
    QuestionStatus,
    QuestionSummary,
    QuestionUpdate,
    ReviewRequest,
)

router = APIRouter(prefix="/api/questions", tags=["questions"])


async def _get_db():
    """Inyectada en main.py al registrar el router."""
    raise NotImplementedError


# =============================================================================
# Listar preguntas con filtros y paginación
# =============================================================================


@router.get("", response_model=PaginatedResponse)
async def list_questions(
    area_id: uuid.UUID | None = None,
    competency_id: uuid.UUID | None = None,
    status: QuestionStatus | None = None,
    source: str | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(_get_db),
    user: CurrentUser = Depends(get_current_user),
):
    """Lista preguntas con filtros. Estudiantes solo ven APPROVED."""
    query = select(Question)
    count_query = select(func.count(Question.id))

    # Estudiantes solo ven preguntas aprobadas
    if user.role == "STUDENT":
        query = query.where(Question.status == "APPROVED")
        count_query = count_query.where(Question.status == "APPROVED")

    if area_id:
        query = query.where(Question.area_id == area_id)
        count_query = count_query.where(Question.area_id == area_id)
    if competency_id:
        query = query.where(Question.competency_id == competency_id)
        count_query = count_query.where(Question.competency_id == competency_id)
    if status and user.role != "STUDENT":
        query = query.where(Question.status == status.value)
        count_query = count_query.where(Question.status == status.value)
    if source:
        query = query.where(Question.source == source.upper())
        count_query = count_query.where(Question.source == source.upper())

    total = (await db.execute(count_query)).scalar() or 0
    offset = (page - 1) * page_size
    query = query.order_by(Question.created_at.desc()).offset(offset).limit(page_size)

    result = await db.execute(query)
    items = [QuestionSummary.model_validate(q) for q in result.scalars().all()]

    return PaginatedResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        pages=ceil(total / page_size) if total > 0 else 0,
    )


# =============================================================================
# Obtener una pregunta
# =============================================================================


@router.get("/{question_id}", response_model=QuestionOut)
async def get_question(
    question_id: uuid.UUID,
    db: AsyncSession = Depends(_get_db),
    user: CurrentUser = Depends(get_current_user),
):
    """Obtiene una pregunta por ID."""
    q = await db.get(Question, question_id)
    if not q:
        raise HTTPException(status_code=404, detail="Pregunta no encontrada")

    # Estudiantes no ven preguntas no aprobadas
    if user.role == "STUDENT" and q.status != "APPROVED":
        raise HTTPException(status_code=404, detail="Pregunta no encontrada")

    return q


# =============================================================================
# Crear pregunta (TEACHER, ADMIN)
# =============================================================================


@router.post("", response_model=QuestionOut, status_code=201)
async def create_question(
    data: QuestionCreate,
    db: AsyncSession = Depends(_get_db),
    user: CurrentUser = Depends(require_role("TEACHER", "ADMIN")),
):
    """Crea una nueva pregunta manual."""
    # Validar coherencia 3 vs 4 opciones
    _validate_options(data)

    question = Question(
        **data.model_dump(),
        created_by_user_id=user.user_id,
        status="DRAFT",
    )
    db.add(question)
    await db.flush()
    await db.refresh(question)
    return question


# =============================================================================
# Actualizar pregunta (solo DRAFT, solo autor o ADMIN)
# =============================================================================


@router.patch("/{question_id}", response_model=QuestionOut)
async def update_question(
    question_id: uuid.UUID,
    data: QuestionUpdate,
    db: AsyncSession = Depends(_get_db),
    user: CurrentUser = Depends(require_role("TEACHER", "ADMIN")),
):
    """Actualiza una pregunta en estado DRAFT."""
    q = await db.get(Question, question_id)
    if not q:
        raise HTTPException(status_code=404, detail="Pregunta no encontrada")

    if q.status != "DRAFT":
        raise HTTPException(
            status_code=409,
            detail=f"Solo se puede editar en DRAFT (actual: {q.status})",
        )

    # Solo el autor o un ADMIN puede editar
    if user.role != "ADMIN" and q.created_by_user_id != user.user_id:
        raise HTTPException(status_code=403, detail="Solo el autor o ADMIN puede editar")

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(q, field, value)

    await db.flush()
    await db.refresh(q)
    return q


# =============================================================================
# Enviar a revisión (TEACHER, ADMIN — solo DRAFT)
# =============================================================================


@router.post("/{question_id}/submit", response_model=QuestionOut)
async def submit_for_review(
    question_id: uuid.UUID,
    db: AsyncSession = Depends(_get_db),
    user: CurrentUser = Depends(require_role("TEACHER", "ADMIN")),
):
    """Envía una pregunta DRAFT a revisión (PENDING_REVIEW)."""
    q = await db.get(Question, question_id)
    if not q:
        raise HTTPException(status_code=404, detail="Pregunta no encontrada")

    if q.status != "DRAFT":
        raise HTTPException(
            status_code=409,
            detail=f"Solo preguntas en DRAFT pueden enviarse a revisión (actual: {q.status})",
        )

    q.status = "PENDING_REVIEW"
    await db.flush()
    await db.refresh(q)
    return q


# =============================================================================
# Revisar pregunta (ADMIN — solo PENDING_REVIEW)
# =============================================================================


@router.post("/{question_id}/review", response_model=QuestionOut)
async def review_question(
    question_id: uuid.UUID,
    review: ReviewRequest,
    db: AsyncSession = Depends(_get_db),
    user: CurrentUser = Depends(require_role("ADMIN")),
):
    """Aprueba o rechaza una pregunta en PENDING_REVIEW."""
    q = await db.get(Question, question_id)
    if not q:
        raise HTTPException(status_code=404, detail="Pregunta no encontrada")

    if q.status != "PENDING_REVIEW":
        raise HTTPException(
            status_code=409,
            detail=f"Solo preguntas en PENDING_REVIEW pueden ser revisadas (actual: {q.status})",
        )

    q.status = "APPROVED" if review.action.value == "APPROVE" else "REJECTED"
    q.reviewed_by_user_id = user.user_id
    q.reviewed_at = datetime.now(UTC)
    q.review_notes = review.notes
    await db.flush()
    await db.refresh(q)
    return q


# =============================================================================
# Archivar pregunta (ADMIN)
# =============================================================================


@router.post("/{question_id}/archive", response_model=QuestionOut)
async def archive_question(
    question_id: uuid.UUID,
    db: AsyncSession = Depends(_get_db),
    user: CurrentUser = Depends(require_role("ADMIN")),
):
    """Archiva una pregunta (cualquier estado excepto ARCHIVED)."""
    q = await db.get(Question, question_id)
    if not q:
        raise HTTPException(status_code=404, detail="Pregunta no encontrada")

    if q.status == "ARCHIVED":
        raise HTTPException(status_code=409, detail="La pregunta ya está archivada")

    q.status = "ARCHIVED"
    await db.flush()
    await db.refresh(q)
    return q


# =============================================================================
# Estadísticas
# =============================================================================


@router.get("/stats/summary")
async def question_stats(
    db: AsyncSession = Depends(_get_db),
    _user: CurrentUser = Depends(require_role("TEACHER", "ADMIN")),
):
    """Estadísticas del banco de preguntas."""
    total_q = select(func.count(Question.id))
    total = (await db.execute(total_q)).scalar() or 0

    by_status_q = select(Question.status, func.count(Question.id)).group_by(Question.status)
    by_status_rows = (await db.execute(by_status_q)).all()
    by_status = {row[0]: row[1] for row in by_status_rows}

    by_area_q = select(Question.area_id, func.count(Question.id)).group_by(Question.area_id)
    by_area_rows = (await db.execute(by_area_q)).all()
    by_area = {str(row[0]): row[1] for row in by_area_rows}

    by_source_q = select(Question.source, func.count(Question.id)).group_by(Question.source)
    by_source_rows = (await db.execute(by_source_q)).all()
    by_source = {row[0]: row[1] for row in by_source_rows}

    return {
        "total": total,
        "by_status": by_status,
        "by_area": by_area,
        "by_source": by_source,
    }


# =============================================================================
# Validaciones de negocio
# =============================================================================


def _validate_options(data: QuestionCreate):
    """Valida coherencia de opciones (3 vs 4) y respuesta correcta."""
    has_d = data.option_d is not None and data.option_d.strip() != ""

    if not has_d and data.correct_answer.value == "D":
        raise HTTPException(
            status_code=422,
            detail="La respuesta correcta no puede ser D si no hay opción D",
        )

    if has_d and data.explanation_d is None:
        raise HTTPException(
            status_code=422,
            detail="Si hay opción D, debe incluir explicación para D",
        )
