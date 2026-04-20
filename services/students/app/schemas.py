"""Pydantic schemas — Students Service."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


# ── Request schemas ──────────────────────────────────────────────────────


class StudentListParams(BaseModel):
    page: int = 1
    page_size: int = 20
    grade: str | None = None
    status: str | None = None
    search: str | None = None
    sort_by: str = "last_name"
    sort_order: str = "asc"


class RevocationRequest(BaseModel):
    reason: str = "Retirado del sistema Kampus"


# ── Response schemas ─────────────────────────────────────────────────────


class StudentListItem(BaseModel):
    id: UUID
    kampus_user_id: int
    first_name: str
    last_name: str
    email: str | None
    grade: str
    section: str | None
    enrollment_status: str
    credentials_revoked: bool
    last_login_at: datetime | None

    # Stats enriquecidas (cross-table)
    exam_count: int = 0
    avg_score: float | None = None
    avg_accuracy: float | None = None
    diagnostic_level: int | None = None
    active_plan_status: str | None = None
    plan_current_week: int | None = None
    plan_total_weeks: int | None = None

    model_config = {"from_attributes": True}


class StudentDetail(StudentListItem):
    document_id: str | None
    revoked_at: datetime | None
    revocation_reason: str | None
    last_synced_at: datetime
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class PaginatedStudents(BaseModel):
    items: list[StudentListItem]
    total: int
    page: int
    page_size: int
    total_pages: int


class GradeStats(BaseModel):
    grade: str
    count: int


class StudentStatsOverview(BaseModel):
    total_active: int
    total_withdrawn: int
    total_inactive: int
    by_grade: list[GradeStats]
    last_sync_at: datetime | None
    last_sync_status: str | None


class SyncLogOut(BaseModel):
    id: UUID
    sync_type: str
    status: str
    records_fetched: int
    records_created: int
    records_updated: int
    records_revoked: int
    errors: int
    error_detail: str | None
    started_at: datetime
    finished_at: datetime | None

    model_config = {"from_attributes": True}
