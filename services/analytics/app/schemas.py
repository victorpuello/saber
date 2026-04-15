"""Esquemas Pydantic — Analytics Service."""

import uuid
from datetime import datetime

from pydantic import BaseModel

# ── Progreso individual ─────────────────────────────────────────


class ExamResultOut(BaseModel):
    id: uuid.UUID
    exam_id: uuid.UUID
    session_id: uuid.UUID
    exam_type: str
    area_code: str | None = None
    score_global: float | None = None
    total_questions: int
    correct_answers: int
    accuracy: float | None = None
    completed_at: datetime

    model_config = {"from_attributes": True}


class CompetencySnapshotOut(BaseModel):
    competency_id: uuid.UUID
    area_code: str
    theta_estimate: float
    performance_level: int | None = None
    classification: str | None = None
    questions_attempted: int
    questions_correct: int
    last_updated_at: datetime

    model_config = {"from_attributes": True}


class StudentProgressOut(BaseModel):
    student_user_id: int
    exam_count: int
    avg_score: float | None = None
    avg_accuracy: float | None = None
    recent_exams: list[ExamResultOut] = []
    competencies: list[CompetencySnapshotOut] = []


# ── Analítica por grado ─────────────────────────────────────────


class GradeStudentSummary(BaseModel):
    student_user_id: int
    exam_count: int
    avg_score: float | None = None
    avg_accuracy: float | None = None


class ClassroomAnalyticsOut(BaseModel):
    grade: str
    institution_id: str
    total_students: int
    exams_completed: int
    avg_score: float | None = None
    avg_accuracy: float | None = None
    students: list[GradeStudentSummary] = []
    by_area: dict[str, dict] = {}


# ── Reportes institucionales ────────────────────────────────────


class AreaPerformance(BaseModel):
    area_code: str
    avg_score: float | None = None
    avg_accuracy: float | None = None
    exams_count: int = 0
    students_count: int = 0


class InstitutionReportOut(BaseModel):
    institution_id: str
    total_students: int
    total_exams: int
    total_diagnostics: int
    avg_score_global: float | None = None
    avg_accuracy_global: float | None = None
    areas: list[AreaPerformance] = []
    daily_trend: list[dict] = []


# ── Rendimiento del banco de preguntas ──────────────────────────


class QuestionStatOut(BaseModel):
    question_id: uuid.UUID
    area_code: str | None = None
    times_presented: int
    times_correct: int
    accuracy_rate: float | None = None
    count_a: int
    count_b: int
    count_c: int
    count_d: int

    model_config = {"from_attributes": True}


class QuestionBankMetricsOut(BaseModel):
    total_questions_tracked: int
    avg_accuracy_rate: float | None = None
    hardest_questions: list[QuestionStatOut] = []
    easiest_questions: list[QuestionStatOut] = []
    most_presented: list[QuestionStatOut] = []
