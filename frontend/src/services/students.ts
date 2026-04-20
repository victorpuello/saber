/**
 * Students API service — calls to /api/students endpoints.
 */

// ── Types ──────────────────────────────────────────────────────────────

export interface StudentListItem {
  id: string;
  kampus_user_id: number;
  first_name: string;
  last_name: string;
  email: string | null;
  grade: string;
  section: string | null;
  enrollment_status: "ACTIVE" | "WITHDRAWN" | "INACTIVE";
  credentials_revoked: boolean;
  last_login_at: string | null;
  exam_count: number;
  avg_score: number | null;
  avg_accuracy: number | null;
  diagnostic_level: number | null;
  active_plan_status: string | null;
  plan_current_week: number | null;
  plan_total_weeks: number | null;
}

export interface StudentDetail extends StudentListItem {
  document_id: string | null;
  revoked_at: string | null;
  revocation_reason: string | null;
  last_synced_at: string;
  created_at: string;
  updated_at: string;
}

export interface PaginatedStudents {
  items: StudentListItem[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface GradeStats {
  grade: string;
  count: number;
}

export interface StudentStatsOverview {
  total_active: number;
  total_withdrawn: number;
  total_inactive: number;
  by_grade: GradeStats[];
  last_sync_at: string | null;
  last_sync_status: string | null;
}

export interface SyncLog {
  id: string;
  sync_type: string;
  status: string;
  records_fetched: number;
  records_created: number;
  records_updated: number;
  records_revoked: number;
  errors: number;
  error_detail: string | null;
  started_at: string;
  finished_at: string | null;
}

export interface StudentListParams {
  page?: number;
  page_size?: number;
  grade?: string;
  status?: string;
  search?: string;
  sort_by?: string;
  sort_order?: string;
}

// ── AuthFetch type (from AuthContext) ──────────────────────────────────

type AuthFetch = <T>(path: string, init?: RequestInit) => Promise<T>;

// ── API functions ─────────────────────────────────────────────────────

function buildQuery(params: StudentListParams): string {
  const q = new URLSearchParams();
  if (params.page) q.set("page", String(params.page));
  if (params.page_size) q.set("page_size", String(params.page_size));
  if (params.grade) q.set("grade", params.grade);
  if (params.status) q.set("status", params.status);
  if (params.search) q.set("search", params.search);
  if (params.sort_by) q.set("sort_by", params.sort_by);
  if (params.sort_order) q.set("sort_order", params.sort_order);
  return q.toString();
}

export async function fetchStudents(
  authFetch: AuthFetch,
  params: StudentListParams = {},
): Promise<PaginatedStudents> {
  const qs = buildQuery(params);
  return authFetch<PaginatedStudents>(`/api/students?${qs}`);
}

export async function fetchStudentDetail(
  authFetch: AuthFetch,
  id: string,
): Promise<StudentDetail> {
  return authFetch<StudentDetail>(`/api/students/${id}`);
}

export async function fetchStudentStats(
  authFetch: AuthFetch,
): Promise<StudentStatsOverview> {
  return authFetch<StudentStatsOverview>("/api/students/stats");
}

export async function triggerSync(
  authFetch: AuthFetch,
): Promise<SyncLog> {
  return authFetch<SyncLog>("/api/students/sync", { method: "POST" });
}

export async function fetchSyncStatus(
  authFetch: AuthFetch,
): Promise<SyncLog | null> {
  return authFetch<SyncLog | null>("/api/students/sync/status");
}

export async function revokeStudent(
  authFetch: AuthFetch,
  id: string,
  reason?: string,
): Promise<StudentDetail> {
  return authFetch<StudentDetail>(`/api/students/${id}/revoke`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reason: reason || "Revocación manual por administrador" }),
  });
}

export async function restoreStudent(
  authFetch: AuthFetch,
  id: string,
): Promise<StudentDetail> {
  return authFetch<StudentDetail>(`/api/students/${id}/restore`, {
    method: "POST",
  });
}
