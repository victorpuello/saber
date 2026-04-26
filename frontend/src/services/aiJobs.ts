import type { AuthFetch } from "./dashboard";

export type GenerationJobStatus =
  | "QUEUED"
  | "RUNNING"
  | "COMPLETED"
  | "FAILED"
  | "PARTIAL"
  | "CANCELLED";

export type GenerationJobItemStatus =
  | "QUEUED"
  | "RUNNING"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED";

export type GenerationStructureType = "INDIVIDUAL" | "QUESTION_BLOCK";

export interface CreateGenerationJobPayload {
  area_code: string;
  provider?: "anthropic" | "gemini";
  model?: string;
  count: number;
  structure_type?: GenerationStructureType;
  include_visual?: boolean;
  visual_type?: string;
  competency_code?: string;
  cognitive_level?: number;
  english_section?: number;
  question_type?: string;
  context_category?: string;
  tags?: string[];
  additional_context?: string;
}

export interface GenerationJob {
  id: string;
  status: GenerationJobStatus;
  cancel_requested: boolean;
  requested_by_user_id: number;
  requested_by_role: string;
  area_code: string;
  provider: string | null;
  model: string | null;
  competency_code: string | null;
  cognitive_level: number | null;
  structure_type: GenerationStructureType;
  include_visual: boolean;
  visual_type: string | null;
  english_section: number | null;
  question_type: string | null;
  context_category: string | null;
  tags: string[] | null;
  additional_context: string | null;
  total_requested: number;
  total_processed: number;
  total_generated: number;
  total_valid: number;
  total_failed: number;
  progress_percent: number;
  error_summary: string | null;
  retry_of_job_id: string | null;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
  updated_at: string;
}

export interface GenerationJobItem {
  id: string;
  item_index: number;
  status: GenerationJobItemStatus;
  provider: string | null;
  model: string | null;
  is_valid: boolean | null;
  error: string | null;
  token_input: number | null;
  token_output: number | null;
  created_question_area_code: string | null;
  created_question_competency_code: string | null;
  created_question_assertion_code: string | null;
  created_question_evidence_code: string | null;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
}

export interface GenerationJobDetail extends GenerationJob {
  items: GenerationJobItem[];
}

export async function createGenerationJob(
  authFetch: AuthFetch,
  payload: CreateGenerationJobPayload,
): Promise<GenerationJob> {
  return authFetch<GenerationJob>("/api/ai/jobs", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function fetchGenerationJob(
  authFetch: AuthFetch,
  jobId: string,
): Promise<GenerationJobDetail> {
  return authFetch<GenerationJobDetail>(`/api/ai/jobs/${jobId}`);
}

export async function listGenerationJobs(
  authFetch: AuthFetch,
  params?: { limit?: number; mineOnly?: boolean },
): Promise<GenerationJob[]> {
  const search = new URLSearchParams();
  if (typeof params?.limit === "number") {
    search.set("limit", String(params.limit));
  }
  if (typeof params?.mineOnly === "boolean") {
    search.set("mine_only", String(params.mineOnly));
  }

  const qs = search.toString();
  const path = qs ? `/api/ai/jobs?${qs}` : "/api/ai/jobs";
  return authFetch<GenerationJob[]>(path);
}

export async function cancelGenerationJob(
  authFetch: AuthFetch,
  jobId: string,
): Promise<GenerationJob> {
  return authFetch<GenerationJob>(`/api/ai/jobs/${jobId}/cancel`, {
    method: "POST",
  });
}

export async function retryGenerationJob(
  authFetch: AuthFetch,
  jobId: string,
): Promise<GenerationJob> {
  return authFetch<GenerationJob>(`/api/ai/jobs/${jobId}/retry`, {
    method: "POST",
  });
}

export async function deleteGenerationJob(
  authFetch: AuthFetch,
  jobId: string,
): Promise<void> {
  await authFetch<void>(`/api/ai/jobs/${jobId}`, { method: "DELETE" });
}
