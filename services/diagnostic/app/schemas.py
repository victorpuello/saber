"""Esquemas Pydantic — Diagnostic Engine."""

import uuid
from datetime import datetime

from pydantic import BaseModel, Field

# ── Perfil del estudiante ──────────────────────────────────────


class CompetencyScoreOut(BaseModel):
    id: uuid.UUID
    competency_id: uuid.UUID
    theta_estimate: float
    standard_error: float
    performance_level: int | None
    classification: str | None
    questions_attempted: int
    questions_correct: int
    last_updated_at: datetime

    model_config = {"from_attributes": True}


class StudentProfileOut(BaseModel):
    id: uuid.UUID
    student_user_id: int
    last_diagnostic_at: datetime | None
    overall_estimated_level: int | None
    estimated_score_global: float | None
    english_mcer_level: str | None = None
    english_mcer_label: str | None = None
    english_standard_error: float | None = None
    english_section_errors: list[dict] | None = None
    english_recommendations: list[dict] | None = None
    competency_scores: list[CompetencyScoreOut] = []
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ── Sesión de diagnóstico ──────────────────────────────────────


class DiagnosticStartRequest(BaseModel):
    area_code: str = Field(..., pattern=r"^(LC|MAT|SC|CN|ING)$")


class DiagnosticSessionOut(BaseModel):
    id: uuid.UUID
    profile_id: uuid.UUID
    area_id: uuid.UUID
    area_code: str
    status: str
    current_theta: float
    current_se: float
    questions_answered: int
    max_questions: int
    se_threshold: float
    started_at: datetime
    finished_at: datetime | None

    model_config = {"from_attributes": True}


class NextQuestionOut(BaseModel):
    """Pregunta presentada al estudiante (sin respuesta correcta)."""

    question_id: uuid.UUID
    position: int
    competency_id: uuid.UUID
    stem: str
    context: str | None = None
    context_type: str | None = None
    component_name: str | None = None
    english_section: int | None = None
    mcer_level: str | None = None
    option_a: str
    option_b: str
    option_c: str
    option_d: str
    media: list[dict] | None = None
    # Estado CAT actual
    session_theta: float
    session_se: float
    questions_remaining: int


class AnswerSubmitRequest(BaseModel):
    question_id: uuid.UUID
    selected_answer: str = Field(..., pattern=r"^[ABCD]$")


class AnswerResultOut(BaseModel):
    is_correct: bool
    correct_answer: str
    theta_after: float
    se_after: float
    questions_answered: int
    session_status: str
    # Si la sesión finalizó, incluir siguiente pregunta o null
    session_finished: bool


class DiagnosticAnswerOut(BaseModel):
    id: uuid.UUID
    question_id: uuid.UUID
    competency_id: uuid.UUID
    position: int
    selected_answer: str
    correct_answer: str
    is_correct: bool
    english_section: int | None = None
    mcer_level: str | None = None
    irt_difficulty: float
    theta_after: float
    se_after: float
    answered_at: datetime

    model_config = {"from_attributes": True}


class DiagnosticResultsOut(BaseModel):
    session: DiagnosticSessionOut
    answers: list[DiagnosticAnswerOut] = []
    competency_scores: list[CompetencyScoreOut] = []


class DiagnosticSessionSummary(BaseModel):
    id: uuid.UUID
    area_code: str
    status: str
    current_theta: float
    questions_answered: int
    started_at: datetime
    finished_at: datetime | None

    model_config = {"from_attributes": True}
