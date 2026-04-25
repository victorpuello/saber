"""Rutas API — Diagnostic Engine: sesiones adaptativas y perfiles."""

import csv
import io
import uuid
from datetime import UTC, datetime

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from saber11_shared.auth import CurrentUser, get_current_user, require_role
from saber11_shared.events import EventBus
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from . import cat_engine
from .config import settings
from .models import CompetencyScore, DiagnosticAnswer, DiagnosticSession, StudentProfile
from .schemas import (
    AnswerResultOut,
    AnswerSubmitRequest,
    DiagnosticResultsOut,
    DiagnosticSessionOut,
    DiagnosticSessionSummary,
    DiagnosticStartRequest,
    NextQuestionOut,
    StudentProfileOut,
)

router = APIRouter(prefix="/api/diagnostic", tags=["diagnostic"])

_event_bus: EventBus | None = None

INTERNAL_QB_HEADERS = {"X-User-Id": "0", "X-User-Role": "ADMIN"}


def set_event_bus(bus: EventBus):
    """Configura el EventBus (llamado desde main.py)."""
    global _event_bus  # noqa: PLW0603
    _event_bus = bus


async def _get_db():
    """Se reemplaza en main.py al registrar el router."""
    raise NotImplementedError


# ── Helpers ─────────────────────────────────────────────────────


async def _get_or_create_profile(
    db: AsyncSession, user_id: int
) -> StudentProfile:
    """Obtiene o crea el perfil del estudiante."""
    result = await db.execute(
        select(StudentProfile).where(StudentProfile.student_user_id == user_id)
    )
    profile = result.scalar_one_or_none()
    if not profile:
        profile = StudentProfile(student_user_id=user_id)
        db.add(profile)
        await db.flush()
    return profile


async def _fetch_area_info(area_code: str) -> dict:
    """Obtiene info del área desde Question Bank."""
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get(
            f"{settings.question_bank_url}/api/taxonomy/areas/by-code/{area_code}",
            headers=INTERNAL_QB_HEADERS,
        )
        if resp.status_code != 200:
            raise HTTPException(400, f"Área '{area_code}' no encontrada en el banco")
        return resp.json()


async def _fetch_area_questions(area_id: str) -> list[dict]:
    """Obtiene preguntas aprobadas del área desde Question Bank."""
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.get(
            f"{settings.question_bank_url}/api/questions",
            params={"area_id": area_id, "status": "APPROVED", "page_size": 200},
            headers=INTERNAL_QB_HEADERS,
        )
        if resp.status_code != 200:
            raise HTTPException(502, "No se pudieron obtener las preguntas")
        data = resp.json()
        items = data.get("items", data) if isinstance(data, dict) else data

        full_questions = []
        for item in items:
            question_id = item.get("id")
            if not question_id:
                continue
            full_resp = await client.get(
                f"{settings.question_bank_url}/api/questions/{question_id}",
                headers=INTERNAL_QB_HEADERS,
            )
            if full_resp.status_code == 200:
                full_questions.append(full_resp.json())
        return full_questions


def _answer_history(session: DiagnosticSession) -> list[dict]:
    """Normaliza respuestas previas para el motor CAT."""
    return [
        {
            "is_correct": answer.is_correct,
            "difficulty": float(answer.irt_difficulty),
            "discrimination": float(answer.irt_discrimination),
            "guessing": float(answer.irt_guessing),
            "english_section": answer.english_section,
            "mcer_level": answer.mcer_level,
            "theta_after": float(answer.theta_after),
            "question_id": str(answer.question_id),
        }
        for answer in session.answers
    ]


# ── Iniciar diagnóstico ────────────────────────────────────────


@router.post("/start", response_model=DiagnosticSessionOut, status_code=201)
async def start_diagnostic(
    body: DiagnosticStartRequest,
    db: AsyncSession = Depends(_get_db),
    user: CurrentUser = Depends(require_role("STUDENT")),
):
    """Inicia una sesión de diagnóstico adaptativo para un área."""
    # Verificar que no haya una sesión en curso para esta área
    profile = await _get_or_create_profile(db, user.user_id)

    existing = await db.execute(
        select(DiagnosticSession).where(
            DiagnosticSession.profile_id == profile.id,
            DiagnosticSession.area_code == body.area_code,
            DiagnosticSession.status == "IN_PROGRESS",
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            409, f"Ya hay un diagnóstico en curso para {body.area_code}"
        )

    # Obtener info del área
    area_info = await _fetch_area_info(body.area_code)

    session = DiagnosticSession(
        profile_id=profile.id,
        student_user_id=user.user_id,
        area_id=uuid.UUID(area_info["id"]),
        area_code=body.area_code,
        max_questions=(
            cat_engine.ENGLISH_MAX_QUESTIONS
            if body.area_code == "ING"
            else cat_engine.MAX_QUESTIONS
        ),
        se_threshold=cat_engine.SE_THRESHOLD,
    )
    db.add(session)
    await db.flush()
    await db.refresh(session)
    return session


# ── Siguiente pregunta ──────────────────────────────────────────


@router.get(
    "/sessions/{session_id}/next",
    response_model=NextQuestionOut,
)
async def get_next_question(
    session_id: uuid.UUID,
    db: AsyncSession = Depends(_get_db),
    user: CurrentUser = Depends(require_role("STUDENT")),
):
    """Selecciona y retorna la siguiente pregunta óptima (CAT)."""
    session = await db.get(
        DiagnosticSession,
        session_id,
        options=[selectinload(DiagnosticSession.answers)],
    )
    if not session:
        raise HTTPException(404, "Sesión no encontrada")
    if session.student_user_id != user.user_id:
        raise HTTPException(403, "No autorizado")
    if session.status != "IN_PROGRESS":
        raise HTTPException(400, "Esta sesión ya finalizó")

    # Verificar si debemos parar
    if cat_engine.should_stop(
        float(session.current_se),
        session.questions_answered,
        session.max_questions,
    ):
        raise HTTPException(
            400, "Sesión completada — no hay más preguntas. Finalize la sesión."
        )

    # Obtener preguntas disponibles del área
    questions = await _fetch_area_questions(str(session.area_id))
    if not questions:
        raise HTTPException(502, "No hay preguntas disponibles para esta área")

    # IDs ya usados
    used_ids = {str(a.question_id) for a in session.answers}

    # Conteo por competencia para cobertura
    comp_counts: dict[str, int] = {}
    for a in session.answers:
        cid = str(a.competency_id)
        comp_counts[cid] = comp_counts.get(cid, 0) + 1

    # Seleccionar ítem óptimo
    if session.area_code == "ING":
        item = cat_engine.select_english_item(
            theta=float(session.current_theta),
            available_items=questions,
            used_question_ids=used_ids,
            answer_history=_answer_history(session),
        )
    else:
        item = cat_engine.select_optimal_item(
            theta=float(session.current_theta),
            available_items=questions,
            used_question_ids=used_ids,
            competency_counts=comp_counts,
        )
    if not item:
        raise HTTPException(400, "No quedan preguntas disponibles")

    remaining = session.max_questions - session.questions_answered
    return NextQuestionOut(
        question_id=uuid.UUID(str(item["id"])),
        position=session.questions_answered + 1,
        competency_id=uuid.UUID(str(item["competency_id"])),
        stem=item["stem"],
        context=item.get("context"),
        context_type=item.get("context_type"),
        component_name=item.get("component_name"),
        english_section=item.get("english_section"),
        mcer_level=item.get("mcer_level"),
        option_a=item["option_a"],
        option_b=item["option_b"],
        option_c=item["option_c"],
        option_d=item["option_d"],
        media=item.get("media"),
        session_theta=float(session.current_theta),
        session_se=float(session.current_se),
        questions_remaining=remaining,
    )


# ── Responder pregunta ──────────────────────────────────────────


@router.post(
    "/sessions/{session_id}/answer",
    response_model=AnswerResultOut,
)
async def submit_answer(
    session_id: uuid.UUID,
    body: AnswerSubmitRequest,
    db: AsyncSession = Depends(_get_db),
    user: CurrentUser = Depends(require_role("STUDENT")),
):
    """Procesa la respuesta del estudiante y actualiza theta (TRI)."""
    session = await db.get(
        DiagnosticSession,
        session_id,
        options=[selectinload(DiagnosticSession.answers)],
    )
    if not session:
        raise HTTPException(404, "Sesión no encontrada")
    if session.student_user_id != user.user_id:
        raise HTTPException(403, "No autorizado")
    if session.status != "IN_PROGRESS":
        raise HTTPException(400, "Esta sesión ya finalizó")

    # Verificar que la pregunta no se haya respondido ya
    already_answered = {str(a.question_id) for a in session.answers}
    if str(body.question_id) in already_answered:
        raise HTTPException(400, "Esta pregunta ya fue respondida")

    # Obtener datos de la pregunta desde QB
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get(
            f"{settings.question_bank_url}/api/questions/{body.question_id}",
            headers=INTERNAL_QB_HEADERS,
        )
        if resp.status_code != 200:
            raise HTTPException(502, "No se pudo obtener la pregunta")
        question = resp.json()

    # Evaluar respuesta
    correct_answer = question["correct_answer"]
    is_correct = body.selected_answer == correct_answer

    difficulty = float(question.get("irt_difficulty", 0.0))
    discrimination = float(question.get("irt_discrimination", 1.0))
    guessing = float(question.get("irt_guessing", 0.25))

    # Construir historial de respuestas para re-estimar theta
    response_history = [
        {
            "is_correct": a.is_correct,
            "difficulty": float(a.irt_difficulty),
            "discrimination": float(a.irt_discrimination),
            "guessing": float(a.irt_guessing),
        }
        for a in session.answers
    ]
    response_history.append(
        {
            "is_correct": is_correct,
            "difficulty": difficulty,
            "discrimination": discrimination,
            "guessing": guessing,
        }
    )

    # Actualizar theta con Newton-Raphson
    new_theta, new_se = cat_engine.update_theta(
        float(session.current_theta), response_history
    )

    # Persistir respuesta
    answer = DiagnosticAnswer(
        session_id=session.id,
        question_id=body.question_id,
        competency_id=uuid.UUID(str(question["competency_id"])),
        position=session.questions_answered + 1,
        selected_answer=body.selected_answer,
        correct_answer=correct_answer,
        is_correct=is_correct,
        english_section=question.get("english_section"),
        mcer_level=question.get("mcer_level"),
        irt_difficulty=difficulty,
        irt_discrimination=discrimination,
        irt_guessing=guessing,
        theta_after=new_theta,
        se_after=new_se,
    )
    db.add(answer)
    session.answers.append(answer)

    # Actualizar sesión
    session.current_theta = new_theta
    session.current_se = new_se
    session.questions_answered += 1

    # ¿Debe detenerse?
    finished = cat_engine.should_stop(
        new_se, session.questions_answered, session.max_questions
    )
    if finished:
        await _finish_session(db, session)

    await db.flush()

    return AnswerResultOut(
        is_correct=is_correct,
        correct_answer=correct_answer,
        theta_after=new_theta,
        se_after=new_se,
        questions_answered=session.questions_answered,
        session_status=session.status,
        session_finished=finished,
    )


# ── Finalizar sesión ────────────────────────────────────────────


async def _finish_session(
    db: AsyncSession, session: DiagnosticSession
) -> None:
    """Finaliza la sesión: actualiza perfil, scores y emite evento."""
    session.status = "COMPLETED"
    session.finished_at = datetime.now(UTC)

    # Calcular scores por competencia a partir de las respuestas
    comp_responses: dict[str, list[dict]] = {}
    for a in session.answers:
        cid = str(a.competency_id)
        if cid not in comp_responses:
            comp_responses[cid] = []
        comp_responses[cid].append(
            {
                "is_correct": a.is_correct,
                "difficulty": float(a.irt_difficulty),
                "discrimination": float(a.irt_discrimination),
                "guessing": float(a.irt_guessing),
            }
        )

    profile = await db.get(StudentProfile, session.profile_id)
    if not profile:
        return

    english_payload: dict = {}
    if session.area_code == "ING":
        history = _answer_history(session)
        mcer_level, mcer_label = cat_engine.english_mcer_from_theta(
            float(session.current_theta)
        )
        section_errors = cat_engine.summarize_english_sections(history)
        recommendations = cat_engine.build_english_recommendations(history)
        profile.english_mcer_level = mcer_level
        profile.english_mcer_label = mcer_label
        profile.english_standard_error = float(session.current_se)
        profile.english_section_errors = section_errors
        profile.english_recommendations = recommendations
        english_payload = {
            "mcer_level": mcer_level,
            "mcer_label": mcer_label,
            "standard_error": float(session.current_se),
            "section_errors": section_errors,
            "recommendations": recommendations,
        }

    for comp_id_str, responses in comp_responses.items():
        comp_id = uuid.UUID(comp_id_str)
        theta, se = cat_engine.update_theta(0.0, responses)
        level, classification = cat_engine.classify_level(theta)

        correct = sum(1 for r in responses if r["is_correct"])

        # Upsert competency score
        result = await db.execute(
            select(CompetencyScore).where(
                CompetencyScore.profile_id == profile.id,
                CompetencyScore.competency_id == comp_id,
            )
        )
        score = result.scalar_one_or_none()
        if score:
            score.theta_estimate = theta
            score.standard_error = se
            score.performance_level = level
            score.classification = classification
            score.questions_attempted = len(responses)
            score.questions_correct = correct
        else:
            score = CompetencyScore(
                profile_id=profile.id,
                competency_id=comp_id,
                theta_estimate=theta,
                standard_error=se,
                performance_level=level,
                classification=classification,
                questions_attempted=len(responses),
                questions_correct=correct,
            )
            db.add(score)

    # Actualizar perfil global
    all_scores = await db.execute(
        select(CompetencyScore).where(CompetencyScore.profile_id == profile.id)
    )
    scores_list = list(all_scores.scalars().all())
    if scores_list:
        avg_theta = sum(float(s.theta_estimate) for s in scores_list) / len(
            scores_list
        )
        overall_level, _ = cat_engine.classify_level(avg_theta)
        profile.overall_estimated_level = overall_level
        profile.estimated_score_global = cat_engine.theta_to_score(avg_theta)

    profile.last_diagnostic_at = datetime.now(UTC)

    # Emitir evento diagnostic.completed
    if _event_bus:
        await _event_bus.publish(
            "diagnostic.completed",
            {
                "student_user_id": session.student_user_id,
                "profile_id": str(profile.id),
                "session_id": str(session.id),
                "area_code": session.area_code,
                "theta": float(session.current_theta),
                "english": english_payload or None,
                "questions_answered": session.questions_answered,
            },
        )


@router.post("/sessions/{session_id}/finish", response_model=DiagnosticResultsOut)
async def finish_session(
    session_id: uuid.UUID,
    db: AsyncSession = Depends(_get_db),
    user: CurrentUser = Depends(require_role("STUDENT")),
):
    """Finaliza manualmente una sesión de diagnóstico."""
    session = await db.get(
        DiagnosticSession,
        session_id,
        options=[selectinload(DiagnosticSession.answers)],
    )
    if not session:
        raise HTTPException(404, "Sesión no encontrada")
    if session.student_user_id != user.user_id:
        raise HTTPException(403, "No autorizado")
    if session.status != "IN_PROGRESS":
        raise HTTPException(400, "Esta sesión ya finalizó")

    await _finish_session(db, session)
    await db.flush()

    # Cargar scores actualizados
    profile = await db.get(
        StudentProfile,
        session.profile_id,
        options=[selectinload(StudentProfile.competency_scores)],
    )
    area_scores = [
        s for s in (profile.competency_scores if profile else [])
    ]

    return DiagnosticResultsOut(
        session=DiagnosticSessionOut.model_validate(session),
        answers=[a for a in session.answers],
        competency_scores=area_scores,
    )


# ── Perfil del estudiante ──────────────────────────────────────


# ── Export y calibracion IRT ────────────────────────────────────────────────


def _diagnostic_response_rows(
    pairs: list[tuple[DiagnosticAnswer, DiagnosticSession]],
) -> list[dict]:
    rows = []
    for answer, session in pairs:
        rows.append({
            "student_user_id": session.student_user_id,
            "session_id": str(session.id),
            "area_code": session.area_code,
            "question_id": str(answer.question_id),
            "competency_id": str(answer.competency_id),
            "position": answer.position,
            "selected_answer": answer.selected_answer,
            "correct_answer": answer.correct_answer,
            "is_correct": answer.is_correct,
            "english_section": answer.english_section,
            "mcer_level": answer.mcer_level,
            "irt_difficulty": float(answer.irt_difficulty),
            "irt_discrimination": float(answer.irt_discrimination),
            "irt_guessing": float(answer.irt_guessing),
            "theta_after": float(answer.theta_after),
            "se_after": float(answer.se_after),
            "answered_at": answer.answered_at.isoformat(),
        })
    return rows


async def _fetch_response_rows(
    db: AsyncSession,
    area_code: str,
) -> list[dict]:
    result = await db.execute(
        select(DiagnosticAnswer, DiagnosticSession)
        .join(DiagnosticSession, DiagnosticAnswer.session_id == DiagnosticSession.id)
        .where(
            DiagnosticSession.area_code == area_code,
            DiagnosticSession.status == "COMPLETED",
        )
        .order_by(DiagnosticSession.started_at, DiagnosticAnswer.position)
    )
    return _diagnostic_response_rows(list(result.all()))


@router.get("/irt/export.csv")
async def export_irt_response_matrix(
    area_code: str = Query("ING", pattern=r"^(LC|MAT|SC|CN|ING)$"),
    db: AsyncSession = Depends(_get_db),
    user: CurrentUser = Depends(require_role("ADMIN")),
):
    """Exporta matriz de respuestas para calibracion TRI externa."""
    rows = await _fetch_response_rows(db, area_code)
    output = io.StringIO()
    fieldnames = [
        "student_user_id",
        "session_id",
        "area_code",
        "question_id",
        "competency_id",
        "position",
        "selected_answer",
        "correct_answer",
        "is_correct",
        "english_section",
        "mcer_level",
        "irt_difficulty",
        "irt_discrimination",
        "irt_guessing",
        "theta_after",
        "se_after",
        "answered_at",
    ]
    writer = csv.DictWriter(output, fieldnames=fieldnames)
    writer.writeheader()
    writer.writerows(rows)
    output.seek(0)
    filename = f"diagnostic_{area_code.lower()}_responses.csv"
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.post("/irt/calibrate")
async def calibrate_irt_parameters(
    area_code: str = Query("ING", pattern=r"^(LC|MAT|SC|CN|ING)$"),
    min_responses: int = Query(5, ge=2, le=500),
    apply: bool = Query(False),
    db: AsyncSession = Depends(_get_db),
    user: CurrentUser = Depends(require_role("ADMIN")),
):
    """Calcula parametros IRT aproximados y opcionalmente los aplica en QB."""
    rows = await _fetch_response_rows(db, area_code)
    estimates = cat_engine.estimate_item_parameters_from_responses(
        rows,
        min_responses=min_responses,
    )
    applied = []
    failed = []

    if apply:
        async with httpx.AsyncClient(timeout=15) as client:
            for item in estimates:
                if not item["ready"]:
                    continue
                resp = await client.patch(
                    f"{settings.question_bank_url}/api/questions/{item['question_id']}/irt",
                    json={
                        "irt_difficulty": item["irt_difficulty"],
                        "irt_discrimination": item["irt_discrimination"],
                        "irt_guessing": item["irt_guessing"],
                    },
                    headers=INTERNAL_QB_HEADERS,
                )
                if resp.status_code == 200:
                    applied.append(item["question_id"])
                else:
                    failed.append({
                        "question_id": item["question_id"],
                        "status_code": resp.status_code,
                        "detail": resp.text[:300],
                    })

    return {
        "area_code": area_code,
        "responses": len(rows),
        "items": len(estimates),
        "ready_items": sum(1 for item in estimates if item["ready"]),
        "applied": applied,
        "failed": failed,
        "archive_candidates": [
            item for item in estimates if item["archive_candidate"]
        ],
        "estimates": estimates,
    }


@router.get("/profile", response_model=StudentProfileOut)
async def get_my_profile(
    db: AsyncSession = Depends(_get_db),
    user: CurrentUser = Depends(require_role("STUDENT")),
):
    """Retorna el perfil de competencias del estudiante autenticado."""
    result = await db.execute(
        select(StudentProfile)
        .where(StudentProfile.student_user_id == user.user_id)
        .options(selectinload(StudentProfile.competency_scores))
    )
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(404, "Perfil no encontrado. Realice un diagnóstico primero.")
    return profile


@router.get("/profile/{student_id}", response_model=StudentProfileOut)
async def get_student_profile(
    student_id: int,
    db: AsyncSession = Depends(_get_db),
    user: CurrentUser = Depends(require_role("TEACHER", "ADMIN")),
):
    """Retorna el perfil de competencias de un estudiante (docente/admin)."""
    result = await db.execute(
        select(StudentProfile)
        .where(StudentProfile.student_user_id == student_id)
        .options(selectinload(StudentProfile.competency_scores))
    )
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(404, "Perfil no encontrado para este estudiante")
    return profile


# ── Historial de sesiones ───────────────────────────────────────


@router.get("/sessions", response_model=list[DiagnosticSessionSummary])
async def list_my_sessions(
    db: AsyncSession = Depends(_get_db),
    user: CurrentUser = Depends(require_role("STUDENT")),
):
    """Lista las sesiones de diagnóstico del estudiante."""
    result = await db.execute(
        select(DiagnosticSession)
        .where(DiagnosticSession.student_user_id == user.user_id)
        .order_by(DiagnosticSession.started_at.desc())
    )
    return list(result.scalars().all())


@router.get(
    "/sessions/{session_id}/results",
    response_model=DiagnosticResultsOut,
)
async def get_session_results(
    session_id: uuid.UUID,
    db: AsyncSession = Depends(_get_db),
    user: CurrentUser = Depends(get_current_user),
):
    """Retorna resultados detallados de una sesión de diagnóstico."""
    session = await db.get(
        DiagnosticSession,
        session_id,
        options=[selectinload(DiagnosticSession.answers)],
    )
    if not session:
        raise HTTPException(404, "Sesión no encontrada")

    # Estudiante solo puede ver sus propias sesiones
    if user.role == "STUDENT" and session.student_user_id != user.user_id:
        raise HTTPException(403, "No autorizado")

    if session.status != "COMPLETED":
        raise HTTPException(400, "La sesión aún no ha finalizado")

    profile = await db.get(
        StudentProfile,
        session.profile_id,
        options=[selectinload(StudentProfile.competency_scores)],
    )
    area_scores = [
        s for s in (profile.competency_scores if profile else [])
    ]

    return DiagnosticResultsOut(
        session=DiagnosticSessionOut.model_validate(session),
        answers=[a for a in session.answers],
        competency_scores=area_scores,
    )
