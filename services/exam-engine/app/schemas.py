"""Schemas Pydantic para el Exam Engine Service."""

import uuid
from datetime import datetime
from enum import Enum

from pydantic import BaseModel, ConfigDict, Field

# =============================================================================
# Enums
# =============================================================================


class ExamType(str, Enum):
    DIAGNOSTIC = "DIAGNOSTIC"
    FULL_SIMULATION = "FULL_SIMULATION"
    AREA_PRACTICE = "AREA_PRACTICE"
    CUSTOM = "CUSTOM"


class SessionStatus(str, Enum):
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    ABANDONED = "ABANDONED"
    TIMED_OUT = "TIMED_OUT"


# =============================================================================
# Exam
# =============================================================================


class ExamCreate(BaseModel):
    title: str = Field(min_length=3, max_length=200)
    description: str | None = None
    exam_type: ExamType
    area_id: uuid.UUID | None = None
    area_code: str | None = Field(None, max_length=5)
    total_questions: int = Field(ge=1, le=300)
    time_limit_minutes: int | None = Field(None, ge=1)
    is_adaptive: bool = False
    question_ids: list[uuid.UUID] | None = Field(
        None, description="IDs de preguntas para examen CUSTOM"
    )


class ExamOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    title: str
    description: str | None = None
    exam_type: str
    area_id: uuid.UUID | None = None
    area_code: str | None = None
    total_questions: int
    time_limit_minutes: int | None = None
    is_adaptive: bool
    status: str
    created_by_user_id: int | None = None
    created_at: datetime


class ExamSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    title: str
    exam_type: str
    area_code: str | None = None
    total_questions: int
    time_limit_minutes: int | None = None
    status: str


# =============================================================================
# Questions (vista segura — sin respuesta correcta)
# =============================================================================


class ExamQuestionSafe(BaseModel):
    """Pregunta del examen SIN la respuesta correcta (seguridad)."""

    question_id: uuid.UUID
    position: int
    context: str
    context_type: str
    component_name: str | None = None
    structure_type: str | None = None
    block_id: uuid.UUID | None = None
    block_item_order: int | None = None
    block_size: int | None = None
    stem: str
    option_a: str
    option_b: str
    option_c: str
    option_d: str | None = None
    media: list[dict] | None = None


# =============================================================================
# Session
# =============================================================================


class SessionStart(BaseModel):
    exam_id: uuid.UUID


class SessionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    exam_id: uuid.UUID
    student_user_id: int
    started_at: datetime
    finished_at: datetime | None = None
    status: str
    total_correct: int | None = None
    total_answered: int | None = None
    score_global: float | None = None
    time_spent_seconds: int | None = None


class SessionSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    exam_id: uuid.UUID
    started_at: datetime
    finished_at: datetime | None = None
    status: str
    score_global: float | None = None
    total_correct: int | None = None
    total_answered: int | None = None


# =============================================================================
# Answers
# =============================================================================


class AnswerSubmit(BaseModel):
    question_id: uuid.UUID
    selected_answer: str = Field(pattern=r"^[A-D]$")
    time_spent_seconds: int | None = Field(None, ge=0)
    confidence_level: int | None = Field(None, ge=1, le=5)


class AnswerOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    question_id: uuid.UUID
    selected_answer: str | None = None
    is_correct: bool | None = None
    time_spent_seconds: int | None = None
    confidence_level: int | None = None
    answered_at: datetime


# =============================================================================
# Results (post-examen, con explicaciones)
# =============================================================================


class QuestionResult(BaseModel):
    question_id: uuid.UUID
    position: int
    structure_type: str | None = None
    block_id: uuid.UUID | None = None
    block_item_order: int | None = None
    block_size: int | None = None
    stem: str
    selected_answer: str | None = None
    correct_answer: str
    is_correct: bool
    explanation_correct: str
    explanation_selected: str | None = None
    time_spent_seconds: int | None = None


class SessionResults(BaseModel):
    session_id: uuid.UUID
    exam_title: str
    exam_type: str
    status: str
    started_at: datetime
    finished_at: datetime | None = None
    total_questions: int
    total_answered: int
    total_correct: int
    score_global: float
    time_spent_seconds: int | None = None
    questions: list[QuestionResult]
    by_area: dict[str, dict] | None = None


# =============================================================================
# Paginación
# =============================================================================


class PaginatedResponse(BaseModel):
    items: list
    total: int
    page: int
    page_size: int
    pages: int
