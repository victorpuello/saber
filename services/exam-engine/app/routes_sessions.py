"""Rutas API para sesiones de examen, respuestas, cierre y resultados."""

import asyncio
import logging
import uuid
from datetime import UTC, datetime

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query
from saber11_shared.auth import CurrentUser, get_current_user, require_role
from saber11_shared.events import EventBus
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from .config import settings
from .models import Exam, ExamQuestion, ExamSession, StudentAnswer
from .schemas import (
    AnswerOut,
    AnswerSubmit,
    ExamQuestionSafe,
    PaginatedResponse,
    QuestionResult,
    SessionOut,
    SessionResults,
    SessionStart,
    SessionStatsOut,
    SessionSummary,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/sessions", tags=["sessions"])

_event_bus: EventBus | None = None


def set_event_bus(bus: EventBus):
    """Configura el EventBus (llamado desde main.py)."""
    global _event_bus  # noqa: PLW0603
    _event_bus = bus


async def _get_db():
    """Inyectada en main.py al registrar el router."""
    raise NotImplementedError


# ── Iniciar sesión de examen ──────────────────────────────────────────


@router.post("/start", response_model=SessionOut)
async def start_session(
    body: SessionStart,
    db: AsyncSession = Depends(_get_db),
    user: CurrentUser = Depends(require_role("STUDENT")),
):
    """Inicia una nueva sesión de examen para el estudiante."""
    exam = await db.get(
        Exam, body.exam_id, options=[selectinload(Exam.questions)]
    )
    if not exam:
        raise HTTPException(404, "Examen no encontrado")
    if exam.status != "ACTIVE":
        raise HTTPException(400, "Este examen no está activo")

    # Si ya hay una sesión en progreso, reanudarla en lugar de crear una nueva
    existing_result = await db.execute(
        select(ExamSession).where(
            ExamSession.exam_id == body.exam_id,
            ExamSession.student_user_id == user.user_id,
            ExamSession.status == "IN_PROGRESS",
        )
    )
    existing_session = existing_result.scalar_one_or_none()
    if existing_session:
        return existing_session

    session = ExamSession(
        exam_id=body.exam_id,
        student_user_id=user.user_id,
    )
    db.add(session)
    await db.flush()
    await db.refresh(session)
    return session


# ── Obtener preguntas de la sesión (SIN respuesta correcta) ──────────


@router.get(
    "/{session_id}/questions",
    response_model=list[ExamQuestionSafe],
)
async def get_session_questions(
    session_id: uuid.UUID,
    db: AsyncSession = Depends(_get_db),
    user: CurrentUser = Depends(require_role("STUDENT")),
):
    """Retorna las preguntas del examen SIN la respuesta correcta."""
    session = await db.get(ExamSession, session_id)
    if not session:
        raise HTTPException(404, "Sesión no encontrada")
    if session.student_user_id != user.user_id:
        raise HTTPException(403, "Esta sesión no te pertenece")
    if session.status != "IN_PROGRESS":
        raise HTTPException(400, "La sesión ya no está en progreso")

    # Obtener question_ids ordenados
    result = await db.execute(
        select(ExamQuestion)
        .where(ExamQuestion.exam_id == session.exam_id)
        .order_by(ExamQuestion.position)
    )
    exam_questions = result.scalars().all()

    # Obtener datos de preguntas del Question Bank (sin correct_answer)
    question_ids = [str(eq.question_id) for eq in exam_questions]
    questions_data = await _fetch_questions_safe(question_ids)

    # Mapear por ID
    q_map = {q["id"]: q for q in questions_data}

    safe_questions = []
    for eq in exam_questions:
        q = q_map.get(str(eq.question_id))
        if q:
            safe_questions.append(ExamQuestionSafe(
                question_id=eq.question_id,
                position=eq.position,
                context=q["context"],
                context_type=q["context_type"],
                component_name=q.get("component_name"),
                structure_type=q.get("structure_type"),
                block_id=q.get("block_id"),
                block_item_order=q.get("block_item_order"),
                block_size=q.get("block_size"),
                stem=q["stem"],
                option_a=q["option_a"],
                option_b=q["option_b"],
                option_c=q["option_c"],
                option_d=q.get("option_d"),
                media=q.get("media"),
            ))

    return safe_questions


@router.get("/stats", response_model=SessionStatsOut)
async def get_session_stats(
    db: AsyncSession = Depends(_get_db),
    _user: CurrentUser = Depends(require_role("TEACHER", "ADMIN")),
):
    """Resumen agregado de sesiones para dashboards administrativos."""
    status_rows = await db.execute(
        select(ExamSession.status, func.count(ExamSession.id)).group_by(ExamSession.status)
    )
    by_status = {status: count for status, count in status_rows.all()}

    averages = await db.execute(
        select(
            func.avg(ExamSession.score_global),
            func.avg(ExamSession.time_spent_seconds),
        ).where(ExamSession.status == "COMPLETED")
    )
    avg_score, avg_time = averages.one()

    return SessionStatsOut(
        total=sum(by_status.values()),
        in_progress=by_status.get("IN_PROGRESS", 0),
        completed=by_status.get("COMPLETED", 0),
        abandoned=by_status.get("ABANDONED", 0),
        timed_out=by_status.get("TIMED_OUT", 0),
        avg_score_global=round(float(avg_score), 2) if avg_score is not None else None,
        avg_time_spent_seconds=round(float(avg_time)) if avg_time is not None else None,
    )


# ── Enviar respuesta ──────────────────────────────────────────────────


@router.post(
    "/{session_id}/answers",
    response_model=AnswerOut,
    status_code=201,
)
async def submit_answer(
    session_id: uuid.UUID,
    body: AnswerSubmit,
    db: AsyncSession = Depends(_get_db),
    user: CurrentUser = Depends(require_role("STUDENT")),
):
    """Guarda la respuesta del estudiante a una pregunta."""
    session = await db.get(ExamSession, session_id)
    if not session:
        raise HTTPException(404, "Sesión no encontrada")
    if session.student_user_id != user.user_id:
        raise HTTPException(403, "Esta sesión no te pertenece")
    if session.status != "IN_PROGRESS":
        raise HTTPException(400, "La sesión ya no está en progreso")

    # Verificar time limit
    exam = await db.get(Exam, session.exam_id)
    if exam and exam.time_limit_minutes:
        elapsed = (datetime.now(UTC) - session.started_at).total_seconds()
        if elapsed > exam.time_limit_minutes * 60:
            session.status = "TIMED_OUT"
            session.finished_at = datetime.now(UTC)
            session.time_spent_seconds = int(elapsed)
            await _score_session(session, db, exam)
            await db.flush()
            # Commit before raising so the TIMED_OUT status is persisted.
            # Without this, the get_db exception handler rolls back the
            # transaction and the session stays IN_PROGRESS in the DB,
            # causing finish_session to return 400 "no answers submitted".
            await db.commit()
            raise HTTPException(
                410, "Tiempo agotado. La sesión ha sido finalizada."
            )

    # Verificar que la pregunta pertenece al examen
    eq = await db.execute(
        select(ExamQuestion).where(
            ExamQuestion.exam_id == session.exam_id,
            ExamQuestion.question_id == body.question_id,
        )
    )
    if not eq.scalar_one_or_none():
        raise HTTPException(422, "Esta pregunta no pertenece al examen")

    # Verificar respuesta duplicada
    existing_answer = await db.execute(
        select(StudentAnswer).where(
            StudentAnswer.session_id == session_id,
            StudentAnswer.question_id == body.question_id,
        )
    )
    if existing_answer.scalar_one_or_none():
        raise HTTPException(409, "Ya respondiste esta pregunta")

    # NO verificamos si es correcta ahora (seguridad: no enviar al frontend)
    answer = StudentAnswer(
        session_id=session_id,
        question_id=body.question_id,
        selected_answer=body.selected_answer,
        time_spent_seconds=body.time_spent_seconds,
        confidence_level=body.confidence_level,
    )
    db.add(answer)
    await db.flush()
    await db.refresh(answer)
    return answer


# ── Finalizar sesión y calcular puntajes ──────────────────────────────


@router.post("/{session_id}/finish", response_model=SessionOut)
async def finish_session(
    session_id: uuid.UUID,
    db: AsyncSession = Depends(_get_db),
    user: CurrentUser = Depends(require_role("STUDENT")),
):
    """Finaliza la sesión y calcula puntajes server-side."""
    session = await db.get(
        ExamSession, session_id,
        options=[selectinload(ExamSession.answers)],
    )
    if not session:
        raise HTTPException(404, "Sesión no encontrada")
    if session.student_user_id != user.user_id:
        raise HTTPException(403, "Esta sesión no te pertenece")
    if session.status == "TIMED_OUT":
        # Already scored when timeout occurred — just return it
        return session
    if session.status != "IN_PROGRESS":
        raise HTTPException(400, "La sesión ya fue finalizada")

    # Obtener respuestas correctas del Question Bank
    question_ids = [str(a.question_id) for a in session.answers]

    if not question_ids:
        logger.warning("finish_session: session %s has no submitted answers", session_id)
        raise HTTPException(
            400,
            "No se han enviado respuestas para esta sesión. "
            "Asegúrate de responder todas las preguntas antes de finalizar.",
        )

    correct_map = await _fetch_correct_answers(question_ids)

    if not correct_map:
        logger.error(
            "finish_session: QB returned no answers for session %s (question_ids=%s)",
            session_id, question_ids,
        )
        raise HTTPException(
            503,
            "No se pudo obtener las respuestas correctas del banco de preguntas. "
            "Intenta finalizar el examen nuevamente en unos segundos.",
        )

    # Calificar cada respuesta
    total_correct = 0
    total_answered = len(session.answers)
    for answer in session.answers:
        correct = correct_map.get(str(answer.question_id))
        if correct:
            answer.is_correct = answer.selected_answer == correct
            if answer.is_correct:
                total_correct += 1

    # Calcular puntaje global (escala 0-100)
    exam = await db.get(Exam, session.exam_id)
    total_questions = exam.total_questions if exam else total_answered
    score = round((total_correct / total_questions) * 100, 2) if total_questions > 0 else 0.0

    # Tiempo total
    now = datetime.now(UTC)
    time_spent = int((now - session.started_at).total_seconds())

    session.status = "COMPLETED"
    session.finished_at = now
    session.total_correct = total_correct
    session.total_answered = total_answered
    session.score_global = score
    session.time_spent_seconds = time_spent

    await db.flush()
    await db.refresh(session)

    # Emitir evento exam.completed
    if _event_bus:
        await _event_bus.publish("exam.completed", {
            "session_id": str(session.id),
            "exam_id": str(session.exam_id),
            "student_user_id": session.student_user_id,
            "score_global": float(score),
            "total_correct": total_correct,
            "total_answered": total_answered,
            "total_questions": total_questions,
            "exam_type": exam.exam_type if exam else None,
            "area_code": exam.area_code if exam else None,
        })

    return session


# ── Obtener resultados detallados (post-examen) ──────────────────────


@router.get("/{session_id}/results", response_model=SessionResults)
async def get_session_results(
    session_id: uuid.UUID,
    db: AsyncSession = Depends(_get_db),
    user: CurrentUser = Depends(get_current_user),
):
    """Retorna resultados detallados con explicaciones (solo post-examen)."""
    session = await db.get(
        ExamSession, session_id,
        options=[selectinload(ExamSession.answers)],
    )
    if not session:
        raise HTTPException(404, "Sesión no encontrada")

    # Estudiante solo ve sus propios resultados; docente/admin pueden ver todos
    if user.role == "STUDENT" and session.student_user_id != user.user_id:
        raise HTTPException(403, "No puedes ver esta sesión")
    if session.status not in ("COMPLETED", "TIMED_OUT"):
        raise HTTPException(400, "La sesión aún no ha sido finalizada")

    exam = await db.get(Exam, session.exam_id)

    # Obtener preguntas completas (con explicaciones) del QB
    question_ids = [str(a.question_id) for a in session.answers]
    questions_full = await _fetch_questions_full(question_ids)
    q_map = {q["id"]: q for q in questions_full}

    # Obtener posiciones del examen
    eq_result = await db.execute(
        select(ExamQuestion)
        .where(ExamQuestion.exam_id == session.exam_id)
    )
    position_map = {
        str(eq.question_id): eq.position
        for eq in eq_result.scalars().all()
    }

    answer_map = {str(a.question_id): a for a in session.answers}

    question_results = []
    for q_id, q_data in q_map.items():
        answer = answer_map.get(q_id)
        correct_answer = q_data.get("correct_answer", "")
        selected = answer.selected_answer if answer else None

        # Explicación de la opción seleccionada
        explanation_selected = None
        if selected:
            explanation_selected = q_data.get(
                f"explanation_{selected.lower()}"
            )

        question_results.append(QuestionResult(
            question_id=uuid.UUID(q_id),
            position=position_map.get(q_id, 0),
            competency_id=uuid.UUID(q_data["competency_id"]) if q_data.get("competency_id") else None,
            content_component_id=uuid.UUID(q_data["content_component_id"]) if q_data.get("content_component_id") else None,
            cognitive_process=q_data.get("cognitive_process"),
            component_name=q_data.get("component_name"),
            context=q_data.get("context"),
            context_type=q_data.get("context_type"),
            media=q_data.get("media") or [],
            structure_type=q_data.get("structure_type"),
            block_id=q_data.get("block_id"),
            block_item_order=q_data.get("block_item_order"),
            block_size=q_data.get("block_size"),
            stem=q_data.get("stem", ""),
            selected_answer=selected,
            correct_answer=correct_answer,
            is_correct=selected == correct_answer if selected else False,
            explanation_correct=q_data.get("explanation_correct", ""),
            explanation_selected=explanation_selected,
            time_spent_seconds=answer.time_spent_seconds if answer else None,
        ))

    question_results.sort(key=lambda x: x.position)

    return SessionResults(
        session_id=session.id,
        exam_title=exam.title if exam else "Examen",
        exam_type=exam.exam_type if exam else "",
        status=session.status,
        started_at=session.started_at,
        finished_at=session.finished_at,
        total_questions=exam.total_questions if exam else 0,
        total_answered=session.total_answered or 0,
        total_correct=session.total_correct or 0,
        score_global=float(session.score_global or 0),
        time_spent_seconds=session.time_spent_seconds,
        questions=question_results,
    )


# ── Historial de sesiones del estudiante ──────────────────────────────


@router.get("/history", response_model=PaginatedResponse)
async def get_student_history(
    exam_type: str | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(_get_db),
    user: CurrentUser = Depends(get_current_user),
):
    """Historial de sesiones de examen del estudiante autenticado."""
    query = select(ExamSession).where(
        ExamSession.student_user_id == user.user_id,
        ExamSession.status.in_(["COMPLETED", "TIMED_OUT", "ABANDONED"]),
    )

    if exam_type:
        query = query.join(Exam).where(Exam.exam_type == exam_type)

    count_q = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_q)).scalar_one()

    offset = (page - 1) * page_size
    items_q = (
        query.order_by(ExamSession.started_at.desc())
        .offset(offset)
        .limit(page_size)
    )
    result = await db.execute(items_q)
    items = [
        SessionSummary.model_validate(s) for s in result.scalars().all()
    ]

    pages = (total + page_size - 1) // page_size
    return PaginatedResponse(
        items=items, total=total, page=page,
        page_size=page_size, pages=pages,
    )


# ── Historial por estudiante (para docente/admin) ────────────────────


@router.get(
    "/history/{student_user_id}",
    response_model=PaginatedResponse,
)
async def get_student_history_by_id(
    student_user_id: int,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(_get_db),
    _user: CurrentUser = Depends(require_role("TEACHER", "ADMIN")),
):
    """Historial de sesiones de un estudiante específico (docente/admin)."""
    query = select(ExamSession).where(
        ExamSession.student_user_id == student_user_id,
    )

    count_q = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_q)).scalar_one()

    offset = (page - 1) * page_size
    items_q = (
        query.order_by(ExamSession.started_at.desc())
        .offset(offset)
        .limit(page_size)
    )
    result = await db.execute(items_q)
    items = [
        SessionSummary.model_validate(s) for s in result.scalars().all()
    ]

    pages = (total + page_size - 1) // page_size
    return PaginatedResponse(
        items=items, total=total, page=page,
        page_size=page_size, pages=pages,
    )


# =============================================================================
# Helpers internos
# =============================================================================


async def _score_session(session: ExamSession, db: AsyncSession, exam: Exam) -> None:
    """Califica las respuestas ya enviadas y actualiza totales en session."""
    from sqlalchemy import select as _select
    answers_result = await db.execute(
        _select(StudentAnswer).where(StudentAnswer.session_id == session.id)
    )
    answers = answers_result.scalars().all()
    if not answers:
        session.total_correct = 0
        session.total_answered = 0
        session.score_global = 0.0
        return

    question_ids = [str(a.question_id) for a in answers]
    correct_map = await _fetch_correct_answers(question_ids)

    total_correct = 0
    for answer in answers:
        correct = correct_map.get(str(answer.question_id))
        if correct:
            answer.is_correct = answer.selected_answer == correct
            if answer.is_correct:
                total_correct += 1

    total_answered = len(answers)
    total_questions = exam.total_questions if exam else total_answered
    score = round((total_correct / total_questions) * 100, 2) if total_questions > 0 else 0.0

    session.total_correct = total_correct
    session.total_answered = total_answered
    session.score_global = score


# =============================================================================
# Helpers: comunicación con Question Bank
# =============================================================================


async def _fetch_questions_safe(question_ids: list[str]) -> list[dict]:
    """Obtiene preguntas del QB SIN la respuesta correcta (requests concurrentes)."""
    if not question_ids:
        return []
    async with httpx.AsyncClient(timeout=10) as client:
        results = await asyncio.gather(
            *[_fetch_one_question_safe(client, q_id) for q_id in question_ids]
        )
    questions = []
    for data in results:
        if data:
            # SEGURIDAD: eliminar respuesta correcta y explicaciones
            data.pop("correct_answer", None)
            data.pop("explanation_correct", None)
            data.pop("explanation_a", None)
            data.pop("explanation_b", None)
            data.pop("explanation_c", None)
            data.pop("explanation_d", None)
            questions.append(data)
    return questions


async def _fetch_one_question_safe(client: httpx.AsyncClient, q_id: str) -> dict | None:
        """Fetches a single safe question plus its context media from QB."""
        data, media = await asyncio.gather(
                _fetch_one_question(client, q_id),
                _fetch_question_media(client, q_id),
        )
        if data is None:
            return None
        data["media"] = media
        return data


async def _fetch_one_question(client: httpx.AsyncClient, q_id: str) -> dict | None:
    """Fetches a single question from QB. Returns None on any failure."""
    try:
        resp = await client.get(
            f"{settings.question_bank_url}/api/questions/{q_id}",
            headers={"X-User-Id": "0", "X-User-Role": "ADMIN"},
        )
        if resp.status_code == 200:
            return resp.json()
        logger.warning("QB returned %s for question %s", resp.status_code, q_id)
        return None
    except Exception as exc:
        logger.error("QB request failed for question %s: %s", q_id, exc)
        return None


async def _fetch_question_media(client: httpx.AsyncClient, q_id: str) -> list[dict]:
    """Fetches context media for a question from QB. Returns [] on failure."""
    try:
        resp = await client.get(
            f"{settings.question_bank_url}/api/questions/{q_id}/media",
            headers={"X-User-Id": "0", "X-User-Role": "ADMIN"},
        )
        if resp.status_code == 200:
            payload = resp.json()
            return payload if isinstance(payload, list) else []
        logger.warning("QB media returned %s for question %s", resp.status_code, q_id)
        return []
    except Exception as exc:
        logger.error("QB media request failed for question %s: %s", q_id, exc)
        return []


async def _fetch_correct_answers(question_ids: list[str]) -> dict[str, str]:
    """Obtiene el mapa {question_id: correct_answer} del QB (requests concurrentes)."""
    if not question_ids:
        return {}
    async with httpx.AsyncClient(timeout=10) as client:
        results = await asyncio.gather(
            *[_fetch_one_question(client, q_id) for q_id in question_ids]
        )
    correct_map: dict[str, str] = {}
    for data in results:
        if data and "id" in data and "correct_answer" in data:
            correct_map[data["id"]] = data["correct_answer"]
    return correct_map


async def _fetch_questions_full(question_ids: list[str]) -> list[dict]:
    """Obtiene preguntas completas del QB con explicaciones (requests concurrentes)."""
    if not question_ids:
        return []
    async with httpx.AsyncClient(timeout=10) as client:
        results = await asyncio.gather(
            *[_fetch_one_question_full(client, q_id) for q_id in question_ids]
        )
    return [d for d in results if d is not None]


async def _fetch_one_question_full(client: httpx.AsyncClient, q_id: str) -> dict | None:
    """Obtiene una pregunta completa con media para la revisión post-examen."""
    data, media = await asyncio.gather(
        _fetch_one_question(client, q_id),
        _fetch_question_media(client, q_id),
    )
    if data is None:
        return None
    data["media"] = media
    return data
