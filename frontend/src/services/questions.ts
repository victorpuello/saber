/* Servicio API del Banco de Preguntas — taxonomía + CRUD preguntas. */

import type {
  AreaSummary,
  AreaDetail,
  QuestionCreatePayload,
  QuestionOut,
  QuestionStatusBackend,
} from "../pages/admin/questionBank/questionFormTypes";

type AuthFetch = <T = unknown>(path: string, init?: RequestInit) => Promise<T>;

// --- Tipos de respuesta paginada ---

export interface QuestionSummary {
  id: string;
  area_id: string;
  competency_id: string;
  context_type: string;
  stem: string;
  source: string;
  status: QuestionStatusBackend;
  difficulty_estimated: number | null;
  created_at: string;
}

export interface PaginatedQuestions {
  items: QuestionSummary[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
}

export interface QuestionStats {
  total: number;
  by_status: Record<string, number>;
  by_area: Record<string, number>;
  by_source: Record<string, number>;
}

export interface ListQuestionsParams {
  area_id?: string;
  competency_id?: string;
  status?: QuestionStatusBackend;
  source?: string;
  page?: number;
  page_size?: number;
}

// --- Taxonomía ---

export async function fetchAreas(authFetch: AuthFetch): Promise<AreaSummary[]> {
  return authFetch<AreaSummary[]>("/api/taxonomy/areas");
}

export async function fetchAreaDetail(authFetch: AuthFetch, areaId: string): Promise<AreaDetail> {
  return authFetch<AreaDetail>(`/api/taxonomy/areas/${areaId}`);
}

// --- Preguntas ---

export async function listQuestions(
  authFetch: AuthFetch,
  params: ListQuestionsParams = {},
): Promise<PaginatedQuestions> {
  const qs = new URLSearchParams();
  if (params.area_id) qs.set("area_id", params.area_id);
  if (params.competency_id) qs.set("competency_id", params.competency_id);
  if (params.status) qs.set("status", params.status);
  if (params.source) qs.set("source", params.source);
  if (params.page) qs.set("page", String(params.page));
  if (params.page_size) qs.set("page_size", String(params.page_size));
  const query = qs.toString();
  return authFetch<PaginatedQuestions>(`/api/questions${query ? `?${query}` : ""}`);
}

export async function getQuestion(
  authFetch: AuthFetch,
  questionId: string,
): Promise<QuestionOut> {
  return authFetch<QuestionOut>(`/api/questions/${questionId}`);
}

export async function createQuestion(
  authFetch: AuthFetch,
  data: QuestionCreatePayload,
): Promise<QuestionOut> {
  return authFetch<QuestionOut>("/api/questions", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateQuestion(
  authFetch: AuthFetch,
  questionId: string,
  data: Partial<QuestionCreatePayload>,
): Promise<QuestionOut> {
  return authFetch<QuestionOut>(`/api/questions/${questionId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function submitForReview(
  authFetch: AuthFetch,
  questionId: string,
): Promise<QuestionOut> {
  return authFetch<QuestionOut>(`/api/questions/${questionId}/submit`, {
    method: "POST",
  });
}

export async function reviewQuestion(
  authFetch: AuthFetch,
  questionId: string,
  action: "APPROVE" | "REJECT",
  notes?: string,
): Promise<QuestionOut> {
  return authFetch<QuestionOut>(`/api/questions/${questionId}/review`, {
    method: "POST",
    body: JSON.stringify({ action, notes: notes ?? null }),
  });
}

export async function fetchQuestionStats(
  authFetch: AuthFetch,
): Promise<QuestionStats> {
  return authFetch<QuestionStats>("/api/questions/stats/summary");
}
