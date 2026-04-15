"""Esquemas Pydantic — Study Planner Service."""

import uuid
from datetime import datetime

from pydantic import BaseModel, Field

# ── Práctica ────────────────────────────────────────────────────


class PracticeItemOut(BaseModel):
    id: uuid.UUID
    question_id: uuid.UUID
    position: int
    completed: bool
    completed_at: datetime | None = None
    selected_answer: str | None = None
    is_correct: bool | None = None

    model_config = {"from_attributes": True}


class PracticeAnswerRequest(BaseModel):
    question_id: uuid.UUID
    selected_answer: str = Field(..., pattern=r"^[ABCD]$")


# ── Unidades ────────────────────────────────────────────────────


class UnitOut(BaseModel):
    id: uuid.UUID
    week_number: int
    position: int
    competency_id: uuid.UUID
    area_code: str
    title: str
    description: str | None = None
    priority: str
    recommended_questions: int
    completed: bool
    completed_at: datetime | None = None
    questions_attempted: int
    questions_correct: int
    practice_items: list[PracticeItemOut] = []

    model_config = {"from_attributes": True}


class UnitSummary(BaseModel):
    id: uuid.UUID
    week_number: int
    competency_id: uuid.UUID
    area_code: str
    title: str
    priority: str
    completed: bool
    questions_attempted: int
    questions_correct: int

    model_config = {"from_attributes": True}


# ── Plan ────────────────────────────────────────────────────────


class PlanGenerateRequest(BaseModel):
    total_weeks: int = Field(default=10, ge=8, le=12)


class PlanOut(BaseModel):
    id: uuid.UUID
    profile_id: uuid.UUID
    student_user_id: int
    status: str
    total_weeks: int
    current_week: int
    generated_at: datetime
    updated_at: datetime
    units: list[UnitOut] = []

    model_config = {"from_attributes": True}


class PlanSummary(BaseModel):
    id: uuid.UUID
    status: str
    total_weeks: int
    current_week: int
    generated_at: datetime
    units_total: int = 0
    units_completed: int = 0
    progress_percent: float = 0.0

    model_config = {"from_attributes": True}


# ── Semana ──────────────────────────────────────────────────────


class WeekOut(BaseModel):
    week_number: int
    units: list[UnitOut] = []


# ── Progreso ────────────────────────────────────────────────────


class ProgressOut(BaseModel):
    plan_id: uuid.UUID
    total_units: int
    completed_units: int
    progress_percent: float
    current_week: int
    total_weeks: int
    by_area: dict[str, dict] = {}
    by_priority: dict[str, dict] = {}
