"""Rutas API CRUD de preguntas + flujo de revisión."""

import json
import uuid
from datetime import UTC, datetime
from math import ceil

from fastapi import APIRouter, Depends, HTTPException, Query
from saber11_shared.auth import CurrentUser, get_current_user, require_role
from sqlalchemy import cast, func, select
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.ext.asyncio import AsyncSession

from .models import Area, Question
from .schemas import (
    EnglishAuditInvalidItem,
    EnglishAuditResponse,
    PaginatedResponse,
    QuestionBlockCreate,
    QuestionBlockOut,
    QuestionBlockUpdate,
    QuestionCreate,
    QuestionIrtUpdate,
    QuestionOut,
    QuestionStatus,
    QuestionSummary,
    QuestionUpdate,
    ReviewRequest,
    StructureType,
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
    tag: str | None = None,
    group_units: bool = Query(False),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(_get_db),
    user: CurrentUser = Depends(get_current_user),
):
    """Lista preguntas con filtros. Estudiantes solo ven APPROVED."""
    query = select(Question)
    count_query = select(func.count(Question.id))

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
    if tag:
        tag_filter = Question.tags.op("@>")(cast(json.dumps([tag]), JSONB))
        query = query.where(tag_filter)
        count_query = count_query.where(tag_filter)

    offset = (page - 1) * page_size

    if group_units:
        grouped_query = query.order_by(
            Question.created_at.desc(),
            Question.block_item_order.asc().nullslast(),
        )
        rows = (await db.execute(grouped_query)).scalars().all()

        representatives: list[Question] = []
        seen: set[str] = set()
        for row in rows:
            key = (
                f"block:{row.block_id}"
                if row.structure_type == StructureType.QUESTION_BLOCK.value and row.block_id
                else f"question:{row.id}"
            )
            if key in seen:
                continue
            seen.add(key)
            representatives.append(row)

        total = len(representatives)
        items = [
            QuestionSummary.model_validate(item)
            for item in representatives[offset: offset + page_size]
        ]
    else:
        total = (await db.execute(count_query)).scalar() or 0
        paged_query = query.order_by(Question.created_at.desc()).offset(offset).limit(page_size)
        items = [
            QuestionSummary.model_validate(item)
            for item in (await db.execute(paged_query)).scalars().all()
        ]

    return PaginatedResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        pages=ceil(total / page_size) if total > 0 else 0,
    )


# =============================================================================
# AuditorÃ­a de inglÃ©s
# =============================================================================


@router.get("/english/audit", response_model=EnglishAuditResponse)
async def english_audit(
    invalid_sample_size: int = Query(25, ge=0, le=200),
    db: AsyncSession = Depends(_get_db),
    _user: CurrentUser = Depends(require_role("TEACHER", "ADMIN")),
):
    """Audita la calidad estructural de los Ã­tems de inglÃ©s."""
    ing_area = await _get_english_area(db)
    if not ing_area:
        return EnglishAuditResponse(
            area_id=None,
            total=0,
            valid=0,
            invalid=0,
            by_status={},
            by_section={},
            by_mcer_level={},
            defects_by_code={"missing_ing_area": 1},
            invalid_items=[],
        )

    result = await db.execute(
        select(Question)
        .where(Question.area_id == ing_area.id)
        .order_by(Question.created_at.desc())
    )
    questions = result.scalars().all()

    by_status: dict[str, int] = {}
    by_section: dict[str, int] = {}
    by_mcer_level: dict[str, int] = {}
    defects_by_code: dict[str, int] = {}
    invalid_items: list[EnglishAuditInvalidItem] = []
    valid_count = 0

    for question in questions:
        by_status[question.status] = by_status.get(question.status, 0) + 1
        section_key = str(question.english_section) if question.english_section is not None else "missing"
        by_section[section_key] = by_section.get(section_key, 0) + 1
        mcer_key = question.mcer_level or "missing"
        by_mcer_level[mcer_key] = by_mcer_level.get(mcer_key, 0) + 1

        defects = _english_quality_defects(question)
        if not defects:
            valid_count += 1
            continue

        for defect in defects:
            defects_by_code[defect] = defects_by_code.get(defect, 0) + 1
        if len(invalid_items) < invalid_sample_size:
            invalid_items.append(
                EnglishAuditInvalidItem(
                    question_id=question.id,
                    status=question.status,
                    english_section=question.english_section,
                    mcer_level=question.mcer_level,
                    component_name=question.component_name,
                    defects=defects,
                )
            )

    return EnglishAuditResponse(
        area_id=ing_area.id,
        total=len(questions),
        valid=valid_count,
        invalid=len(questions) - valid_count,
        by_status=by_status,
        by_section=by_section,
        by_mcer_level=by_mcer_level,
        defects_by_code=defects_by_code,
        invalid_items=invalid_items,
    )


# =============================================================================
# Bloques de preguntas
# =============================================================================


@router.get("/blocks/{block_id}", response_model=QuestionBlockOut)
async def get_question_block(
    block_id: uuid.UUID,
    db: AsyncSession = Depends(_get_db),
    user: CurrentUser = Depends(get_current_user),
):
    """Obtiene un bloque completo por block_id."""
    block_questions = await _fetch_block_questions(db, block_id)
    if not block_questions:
        raise HTTPException(status_code=404, detail="Bloque no encontrado")

    if user.role == "STUDENT" and any(item.status != "APPROVED" for item in block_questions):
        raise HTTPException(status_code=404, detail="Bloque no encontrado")

    return _serialize_block(block_questions)


@router.post("/blocks", response_model=QuestionBlockOut, status_code=201)
async def create_question_block(
    data: QuestionBlockCreate,
    db: AsyncSession = Depends(_get_db),
    user: CurrentUser = Depends(require_role("TEACHER", "ADMIN")),
):
    """Crea un bloque de 2 a 3 preguntas con contexto compartido."""
    _validate_block_items(data.items)

    block_id = uuid.uuid4()
    block_size = len(data.items)
    created_items: list[Question] = []

    for idx, item in enumerate(data.items, start=1):
        question = Question(
            area_id=data.area_id,
            competency_id=data.competency_id,
            assertion_id=data.assertion_id,
            evidence_id=data.evidence_id,
            content_component_id=data.content_component_id,
            context=data.context,
            context_type=data.context_type,
            context_category=data.context_category,
            structure_type=StructureType.QUESTION_BLOCK.value,
            block_id=block_id,
            block_item_order=idx,
            block_size=block_size,
            stem=item.stem,
            option_a=item.option_a,
            option_b=item.option_b,
            option_c=item.option_c,
            option_d=item.option_d,
            correct_answer=item.correct_answer,
            explanation_correct=item.explanation_correct,
            explanation_a=item.explanation_a,
            explanation_b=item.explanation_b,
            explanation_c=item.explanation_c,
            explanation_d=item.explanation_d,
            cognitive_process=item.cognitive_process,
            difficulty_estimated=item.difficulty_estimated,
            source=data.source,
            created_by_user_id=user.user_id,
            status="DRAFT",
            english_section=item.english_section,
            mcer_level=item.mcer_level,
            dce_metadata=item.dce_metadata.model_dump() if item.dce_metadata else None,
            component_name=item.component_name,
        )
        _validate_options(question)
        db.add(question)
        created_items.append(question)

    await db.flush()
    for item in created_items:
        await db.refresh(item)
    return _serialize_block(created_items)


@router.patch("/blocks/{block_id}", response_model=QuestionBlockOut)
async def update_question_block(
    block_id: uuid.UUID,
    data: QuestionBlockUpdate,
    db: AsyncSession = Depends(_get_db),
    user: CurrentUser = Depends(require_role("TEACHER", "ADMIN")),
):
    """Reemplaza el contenido de un bloque DRAFT conservando su block_id."""
    block_questions = await _fetch_block_questions(db, block_id)
    if not block_questions:
        raise HTTPException(status_code=404, detail="Bloque no encontrado")

    _ensure_block_editable(block_questions, user)
    _validate_block_items(data.items)

    sorted_existing = sorted(block_questions, key=lambda item: item.block_item_order or 0)
    shared = sorted_existing[0]
    block_size = len(data.items)

    for idx, item in enumerate(data.items, start=1):
        if idx <= len(sorted_existing):
            question = sorted_existing[idx - 1]
        else:
            question = Question(
                area_id=shared.area_id,
                competency_id=shared.competency_id,
                assertion_id=shared.assertion_id,
                evidence_id=shared.evidence_id,
                content_component_id=shared.content_component_id,
                context=shared.context,
                context_type=shared.context_type,
                source=shared.source,
                created_by_user_id=shared.created_by_user_id,
                status="DRAFT",
                structure_type=StructureType.QUESTION_BLOCK.value,
                block_id=block_id,
            )
            db.add(question)

        question.area_id = data.area_id or shared.area_id
        question.competency_id = data.competency_id or shared.competency_id
        question.assertion_id = data.assertion_id or shared.assertion_id
        question.evidence_id = data.evidence_id if data.evidence_id is not None else shared.evidence_id
        question.content_component_id = (
            data.content_component_id
            if data.content_component_id is not None
            else shared.content_component_id
        )
        question.context = data.context or shared.context
        question.context_type = data.context_type or shared.context_type
        question.context_category = data.context_category if data.context_category is not None else shared.context_category
        question.structure_type = StructureType.QUESTION_BLOCK.value
        question.block_id = block_id
        question.block_item_order = idx
        question.block_size = block_size
        question.stem = item.stem
        question.option_a = item.option_a
        question.option_b = item.option_b
        question.option_c = item.option_c
        question.option_d = item.option_d
        question.correct_answer = item.correct_answer
        question.explanation_correct = item.explanation_correct
        question.explanation_a = item.explanation_a
        question.explanation_b = item.explanation_b
        question.explanation_c = item.explanation_c
        question.explanation_d = item.explanation_d
        question.cognitive_process = item.cognitive_process
        question.difficulty_estimated = item.difficulty_estimated
        question.english_section = item.english_section
        question.mcer_level = item.mcer_level
        question.dce_metadata = item.dce_metadata.model_dump() if item.dce_metadata else None
        question.component_name = item.component_name
        _validate_options(question)

    for extra in sorted_existing[block_size:]:
        await db.delete(extra)

    await db.flush()
    return _serialize_block(await _fetch_block_questions(db, block_id))


@router.post("/blocks/{block_id}/submit", response_model=QuestionBlockOut)
async def submit_block_for_review(
    block_id: uuid.UUID,
    db: AsyncSession = Depends(_get_db),
    user: CurrentUser = Depends(require_role("TEACHER", "ADMIN")),
):
    """Envía un bloque DRAFT completo a revisión."""
    block_questions = await _fetch_block_questions(db, block_id)
    if not block_questions:
        raise HTTPException(status_code=404, detail="Bloque no encontrado")

    _ensure_block_editable(block_questions, user)
    ing_area = await _get_english_area(db)
    if ing_area:
        for item in block_questions:
            if item.area_id == ing_area.id:
                _ensure_english_ready(item)

    for item in block_questions:
        item.status = "PENDING_REVIEW"

    await db.flush()
    return _serialize_block(block_questions)


@router.post("/blocks/{block_id}/review", response_model=QuestionBlockOut)
async def review_question_block(
    block_id: uuid.UUID,
    review: ReviewRequest,
    db: AsyncSession = Depends(_get_db),
    user: CurrentUser = Depends(require_role("ADMIN")),
):
    """Aprueba o rechaza un bloque completo en PENDING_REVIEW."""
    block_questions = await _fetch_block_questions(db, block_id)
    if not block_questions:
        raise HTTPException(status_code=404, detail="Bloque no encontrado")

    if any(item.status != "PENDING_REVIEW" for item in block_questions):
        raise HTTPException(
            status_code=409,
            detail="Solo bloques completos en PENDING_REVIEW pueden revisarse",
        )

    next_status = "APPROVED" if review.action.value == "APPROVE" else "REJECTED"
    if next_status == "APPROVED":
        ing_area = await _get_english_area(db)
        if ing_area:
            for item in block_questions:
                if item.area_id == ing_area.id:
                    _ensure_english_ready(item)

    for item in block_questions:
        item.status = next_status
        item.reviewed_by_user_id = user.user_id
        item.reviewed_at = datetime.now(UTC)
        item.review_notes = review.notes

    await db.flush()
    return _serialize_block(block_questions)


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
    if data.structure_type != StructureType.INDIVIDUAL:
        raise HTTPException(
            status_code=422,
            detail="Usa /api/questions/blocks para crear bloques de preguntas",
        )

    _validate_options(data)

    question = Question(
        **data.model_dump(),
        created_by_user_id=user.user_id,
        status="DRAFT",
    )
    db.add(question)
    await db.flush()
    # Commit explícito antes de retornar para garantizar que el registro esté
    # visible a peticiones inmediatas de otros servicios (ej: ai-generator añadiendo media).
    # FastAPI ejecuta el commit del dependency get_db DESPUÉS de enviar la respuesta.
    await db.commit()
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

    if q.structure_type == StructureType.QUESTION_BLOCK.value:
        raise HTTPException(
            status_code=409,
            detail="Usa /api/questions/blocks/{block_id} para editar bloques",
        )

    if q.status != "DRAFT":
        raise HTTPException(
            status_code=409,
            detail=f"Solo se puede editar en DRAFT (actual: {q.status})",
        )

    if user.role != "ADMIN" and q.created_by_user_id != user.user_id:
        raise HTTPException(status_code=403, detail="Solo el autor o ADMIN puede editar")

    update_data = data.model_dump(exclude_unset=True)
    if update_data.get("structure_type") == StructureType.QUESTION_BLOCK:
        raise HTTPException(
            status_code=422,
            detail="No se puede convertir una pregunta individual en bloque desde este endpoint",
        )

    for field, value in update_data.items():
        setattr(q, field, value)

    _validate_options(q)
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

    ing_area = await _get_english_area(db)
    if ing_area and q.area_id == ing_area.id:
        _ensure_english_ready(q)

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

    next_status = "APPROVED" if review.action.value == "APPROVE" else "REJECTED"
    if next_status == "APPROVED":
        ing_area = await _get_english_area(db)
        if ing_area and q.area_id == ing_area.id:
            _ensure_english_ready(q)

    q.status = next_status
    q.reviewed_by_user_id = user.user_id
    q.reviewed_at = datetime.now(UTC)
    q.review_notes = review.notes
    await db.flush()
    await db.refresh(q)
    return q


# =============================================================================
# Actualizar parametros IRT (ADMIN)
# =============================================================================


@router.patch("/{question_id}/irt", response_model=QuestionOut)
async def update_question_irt(
    question_id: uuid.UUID,
    data: QuestionIrtUpdate,
    db: AsyncSession = Depends(_get_db),
    user: CurrentUser = Depends(require_role("ADMIN")),
):
    """Actualiza parametros TRI calibrados sin cambiar el estado editorial."""
    q = await db.get(Question, question_id)
    if not q:
        raise HTTPException(status_code=404, detail="Pregunta no encontrada")

    q.irt_difficulty = data.irt_difficulty
    q.irt_discrimination = data.irt_discrimination
    q.irt_guessing = data.irt_guessing
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
# Eliminar pregunta (ADMIN — solo DRAFT, para limpieza de generaciones fallidas)
# =============================================================================


@router.delete("/{question_id}", status_code=204)
async def delete_question(
    question_id: uuid.UUID,
    db: AsyncSession = Depends(_get_db),
    user: CurrentUser = Depends(require_role("ADMIN")),
):
    """Elimina una pregunta DRAFT. Uso principal: limpiar preguntas sin media del AI generator."""
    q = await db.get(Question, question_id)
    if not q:
        raise HTTPException(status_code=404, detail="Pregunta no encontrada")
    if q.status != "DRAFT":
        raise HTTPException(status_code=409, detail=f"Solo se pueden eliminar preguntas en DRAFT (actual: {q.status})")
    await db.delete(q)
    await db.commit()


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

REQUIRED_COMPONENT_BY_ENGLISH_SECTION = {
    1: "NoticeSign",
    3: "ChatUI",
}
VALID_MCER_LEVELS = {"A-", "A1", "A2", "B1", "B+"}
VALID_COMPONENT_NAMES = {"NoticeSign", "ChatUI", "EmailWrapper"}


async def _get_english_area(db: AsyncSession) -> Area | None:
    result = await db.execute(select(Area).where(Area.code == "ING"))
    return result.scalar_one_or_none()


def _present(value: str | None) -> bool:
    return value is not None and value.strip() != ""


def _correct_answer_has_option(question: Question) -> bool:
    options = {
        "A": question.option_a,
        "B": question.option_b,
        "C": question.option_c,
        "D": question.option_d,
    }
    return _present(options.get(question.correct_answer))


def _english_quality_defects(question: Question) -> list[str]:
    defects: list[str] = []

    if question.english_section is None:
        defects.append("missing_english_section")
    elif question.english_section < 1 or question.english_section > 7:
        defects.append("invalid_english_section")

    if not _present(question.mcer_level):
        defects.append("missing_mcer_level")
    elif question.mcer_level not in VALID_MCER_LEVELS:
        defects.append("invalid_mcer_level")

    if not question.dce_metadata:
        defects.append("missing_dce_metadata")
    else:
        grammar_tags = question.dce_metadata.get("grammar_tags")
        if not isinstance(grammar_tags, list) or len(grammar_tags) == 0:
            defects.append("missing_grammar_tags")

    if not all(_present(option) for option in (question.option_a, question.option_b, question.option_c, question.option_d)):
        defects.append("missing_four_options")

    if question.correct_answer not in {"A", "B", "C", "D"} or not _correct_answer_has_option(question):
        defects.append("invalid_correct_answer")

    expected_component = REQUIRED_COMPONENT_BY_ENGLISH_SECTION.get(question.english_section or 0)
    if expected_component:
        if question.context_type != "react_component":
            defects.append("invalid_react_context_type")
        if question.component_name != expected_component:
            defects.append("invalid_component_name")
    elif question.component_name and question.component_name not in VALID_COMPONENT_NAMES:
        defects.append("invalid_component_name")

    if question.english_section in {4, 7}:
        if question.context_type != "cloze_text":
            defects.append("invalid_cloze_context_type")
        if "[BLANK]" not in question.context:
            defects.append("missing_cloze_blank")

    return defects


def _ensure_english_ready(question: Question):
    defects = _english_quality_defects(question)
    if defects:
        raise HTTPException(
            status_code=422,
            detail={
                "error": "EnglishQualityValidationError",
                "message": "El ítem de inglés no cumple los mínimos para revisión/aprobación.",
                "defects": defects,
            },
        )


def _validate_options(data):
    """Valida coherencia de opciones (3 vs 4) y respuesta correcta."""
    has_d = data.option_d is not None and data.option_d.strip() != ""
    correct_answer = data.correct_answer.value if hasattr(data.correct_answer, "value") else data.correct_answer

    if not has_d and correct_answer == "D":
        raise HTTPException(
            status_code=422,
            detail="La respuesta correcta no puede ser D si no hay opción D",
        )

    if has_d and data.explanation_d is None:
        raise HTTPException(
            status_code=422,
            detail="Si hay opción D, debe incluir explicación para D",
        )


def _validate_block_items(items):
    if len(items) < 2 or len(items) > 3:
        raise HTTPException(
            status_code=422,
            detail="Un bloque debe contener entre 2 y 3 subpreguntas",
        )
    for item in items:
        _validate_options(item)


async def _fetch_block_questions(db: AsyncSession, block_id: uuid.UUID) -> list[Question]:
    result = await db.execute(
        select(Question)
        .where(Question.block_id == block_id)
        .order_by(Question.block_item_order.asc())
    )
    return result.scalars().all()


def _serialize_block(items: list[Question]) -> QuestionBlockOut:
    first = items[0]
    ordered_items = sorted(items, key=lambda item: item.block_item_order or 0)
    return QuestionBlockOut(
        block_id=first.block_id,
        block_size=first.block_size or len(ordered_items),
        context=first.context,
        context_type=first.context_type,
        context_category=first.context_category,
        area_id=first.area_id,
        competency_id=first.competency_id,
        assertion_id=first.assertion_id,
        evidence_id=first.evidence_id,
        content_component_id=first.content_component_id,
        items=[QuestionOut.model_validate(item) for item in ordered_items],
    )


def _ensure_block_editable(items: list[Question], user: CurrentUser):
    if any(item.status != "DRAFT" for item in items):
        raise HTTPException(
            status_code=409,
            detail="Solo se pueden editar o enviar bloques completos en DRAFT",
        )
    if user.role != "ADMIN" and any(item.created_by_user_id != user.user_id for item in items):
        raise HTTPException(status_code=403, detail="Solo el autor o ADMIN puede editar el bloque")
