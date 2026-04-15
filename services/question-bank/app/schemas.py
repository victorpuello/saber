"""Schemas Pydantic para el Question Bank Service."""

import uuid
from datetime import datetime
from enum import Enum

from pydantic import BaseModel, ConfigDict, Field

# =============================================================================
# Enums
# =============================================================================


class QuestionStatus(str, Enum):
    DRAFT = "DRAFT"
    PENDING_REVIEW = "PENDING_REVIEW"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    ARCHIVED = "ARCHIVED"


class QuestionSource(str, Enum):
    AI = "AI"
    MANUAL = "MANUAL"


class ContextType(str, Enum):
    continuous_text = "continuous_text"
    discontinuous_text = "discontinuous_text"
    scientific_scenario = "scientific_scenario"
    math_problem = "math_problem"
    social_dilemma = "social_dilemma"
    philosophical_text = "philosophical_text"
    graphic_notice = "graphic_notice"
    dialogue = "dialogue"
    cloze_text = "cloze_text"


class CorrectAnswer(str, Enum):
    A = "A"
    B = "B"
    C = "C"
    D = "D"


# =============================================================================
# Taxonomía — Respuestas
# =============================================================================


class EvidenceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    code: str
    observable_behavior: str


class AssertionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    code: str
    statement: str
    evidences: list[EvidenceOut] = []


class CompetencyOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    code: str
    name: str
    description: str
    weight_percentage: float | None = None
    cognitive_level: int | None = None
    assertions: list[AssertionOut] = []


class ContentComponentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    code: str
    name: str


class AreaOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    code: str
    name: str
    total_questions: int
    description: str | None = None
    competencies: list[CompetencyOut] = []
    content_components: list[ContentComponentOut] = []


class AreaSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    code: str
    name: str
    total_questions: int


# =============================================================================
# Preguntas — Creación / Actualización
# =============================================================================


class QuestionCreate(BaseModel):
    area_id: uuid.UUID
    competency_id: uuid.UUID
    assertion_id: uuid.UUID
    evidence_id: uuid.UUID | None = None
    content_component_id: uuid.UUID | None = None

    context: str = Field(min_length=10)
    context_type: ContextType
    stem: str = Field(min_length=5)

    option_a: str = Field(min_length=1)
    option_b: str = Field(min_length=1)
    option_c: str = Field(min_length=1)
    option_d: str | None = None
    correct_answer: CorrectAnswer

    explanation_correct: str = Field(min_length=5)
    explanation_a: str | None = None
    explanation_b: str | None = None
    explanation_c: str | None = None
    explanation_d: str | None = None

    cognitive_process: str | None = None
    difficulty_estimated: float | None = Field(None, ge=0, le=1)

    source: QuestionSource = QuestionSource.MANUAL

    # Inglés (opcionales)
    english_section: int | None = Field(None, ge=1, le=7)
    mcer_level: str | None = None


class QuestionUpdate(BaseModel):
    context: str | None = Field(None, min_length=10)
    context_type: ContextType | None = None
    stem: str | None = Field(None, min_length=5)

    option_a: str | None = None
    option_b: str | None = None
    option_c: str | None = None
    option_d: str | None = None
    correct_answer: CorrectAnswer | None = None

    explanation_correct: str | None = None
    explanation_a: str | None = None
    explanation_b: str | None = None
    explanation_c: str | None = None
    explanation_d: str | None = None

    cognitive_process: str | None = None
    difficulty_estimated: float | None = Field(None, ge=0, le=1)

    english_section: int | None = Field(None, ge=1, le=7)
    mcer_level: str | None = None


# =============================================================================
# Preguntas — Respuestas
# =============================================================================


class QuestionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    area_id: uuid.UUID
    competency_id: uuid.UUID
    assertion_id: uuid.UUID
    evidence_id: uuid.UUID | None = None
    content_component_id: uuid.UUID | None = None

    context: str
    context_type: str
    stem: str

    option_a: str
    option_b: str
    option_c: str
    option_d: str | None = None
    correct_answer: str

    explanation_correct: str
    explanation_a: str | None = None
    explanation_b: str | None = None
    explanation_c: str | None = None
    explanation_d: str | None = None

    cognitive_process: str | None = None
    difficulty_estimated: float | None = None
    discrimination_index: float | None = None

    source: str
    created_by_user_id: int | None = None
    status: str
    reviewed_by_user_id: int | None = None
    reviewed_at: datetime | None = None
    review_notes: str | None = None

    english_section: int | None = None
    mcer_level: str | None = None

    times_used: int = 0
    created_at: datetime
    updated_at: datetime


class QuestionSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    area_id: uuid.UUID
    competency_id: uuid.UUID
    context_type: str
    stem: str
    source: str
    status: str
    difficulty_estimated: float | None = None
    created_at: datetime


# =============================================================================
# Revisión de preguntas
# =============================================================================


class ReviewAction(str, Enum):
    APPROVE = "APPROVE"
    REJECT = "REJECT"


class ReviewRequest(BaseModel):
    action: ReviewAction
    notes: str | None = None


# =============================================================================
# Paginación
# =============================================================================


class PaginatedResponse(BaseModel):
    items: list
    total: int
    page: int
    page_size: int
    pages: int
