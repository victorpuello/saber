/* Servicio API del Banco de Preguntas — taxonomía + CRUD preguntas. */

import type {
  AreaSummary,
  AreaDetail,
  CreateVisualAssetPayload,
  DisplayMode,
  LinkAssetToQuestionPayload,
  ProgrammaticQuestionMediaPayload,
  QuestionBlockCreatePayload,
  QuestionBlockOut,
  QuestionCreatePayload,
  QuestionMediaOut,
  QuestionOut,
  QuestionStatusBackend,
  UploadQuestionMediaPayload,
  VisualAssetOut,
  VisualAssetSummary,
} from "../pages/admin/questionBank/questionFormTypes";

export type { AreaSummary };

type AuthFetch = <T = unknown>(path: string, init?: RequestInit) => Promise<T>;

// --- Tipos de respuesta paginada ---

export interface QuestionSummary {
  id: string;
  area_id: string;
  competency_id: string;
  context_type: string;
  structure_type: "INDIVIDUAL" | "QUESTION_BLOCK";
  block_id: string | null;
  block_item_order: number | null;
  block_size: number | null;
  stem: string;
  source: string;
  status: QuestionStatusBackend;
  cognitive_process: string | null;
  difficulty_estimated: number | null;
  discrimination_index: number | null;
  tags: string[] | null;
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

export interface EnglishAuditInvalidItem {
  question_id: string;
  status: string;
  english_section: number | null;
  mcer_level: string | null;
  component_name: string | null;
  defects: string[];
}

export interface EnglishAudit {
  area_id: string | null;
  total: number;
  valid: number;
  invalid: number;
  by_status: Record<string, number>;
  by_section: Record<string, number>;
  by_mcer_level: Record<string, number>;
  defects_by_code: Record<string, number>;
  invalid_items: EnglishAuditInvalidItem[];
}

export interface PaginatedAssets {
  items: VisualAssetSummary[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
}

export interface ListQuestionsParams {
  area_id?: string;
  competency_id?: string;
  status?: QuestionStatusBackend;
  source?: string;
  tag?: string;
  group_units?: boolean;
  page?: number;
  page_size?: number;
}

export interface ListAssetsParams {
  area_id?: string;
  media_type?: string;
  tag?: string;
  q?: string;
  is_active?: boolean;
  page?: number;
  page_size?: number;
}

function appendIfPresent(formData: FormData, key: string, value: string | number | boolean | null | undefined) {
  if (value === undefined || value === null || value === "") {
    return;
  }
  formData.append(key, String(value));
}

function serializeVisualData(payload: ProgrammaticQuestionMediaPayload["visual_data"]): string {
  return typeof payload === "string" ? payload : JSON.stringify(payload);
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
  if (params.tag) qs.set("tag", params.tag);
  if (params.group_units) qs.set("group_units", "true");
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

export async function getQuestionBlock(
  authFetch: AuthFetch,
  blockId: string,
): Promise<QuestionBlockOut> {
  return authFetch<QuestionBlockOut>(`/api/questions/blocks/${blockId}`);
}

export async function createQuestionBlock(
  authFetch: AuthFetch,
  data: QuestionBlockCreatePayload,
): Promise<QuestionBlockOut> {
  return authFetch<QuestionBlockOut>("/api/questions/blocks", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateQuestionBlock(
  authFetch: AuthFetch,
  blockId: string,
  data: QuestionBlockCreatePayload,
): Promise<QuestionBlockOut> {
  return authFetch<QuestionBlockOut>(`/api/questions/blocks/${blockId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function submitBlockForReview(
  authFetch: AuthFetch,
  blockId: string,
): Promise<QuestionBlockOut> {
  return authFetch<QuestionBlockOut>(`/api/questions/blocks/${blockId}/submit`, {
    method: "POST",
  });
}

export async function reviewQuestionBlock(
  authFetch: AuthFetch,
  blockId: string,
  action: "APPROVE" | "REJECT",
  notes?: string,
): Promise<QuestionBlockOut> {
  return authFetch<QuestionBlockOut>(`/api/questions/blocks/${blockId}/review`, {
    method: "POST",
    body: JSON.stringify({ action, notes: notes ?? null }),
  });
}

export async function listQuestionMedia(
  authFetch: AuthFetch,
  questionId: string,
): Promise<QuestionMediaOut[]> {
  return authFetch<QuestionMediaOut[]>(`/api/questions/${questionId}/media`);
}

export async function uploadQuestionMedia(
  authFetch: AuthFetch,
  questionId: string,
  payload: UploadQuestionMediaPayload,
): Promise<QuestionMediaOut> {
  const formData = new FormData();
  formData.append("file", payload.file);
  formData.append("media_type", payload.media_type);
  formData.append("alt_text", payload.alt_text);
  appendIfPresent(formData, "is_essential", payload.is_essential ?? true);
  appendIfPresent(formData, "position", payload.position ?? 0);
  appendIfPresent(formData, "display_mode", payload.display_mode ?? "INLINE");
  appendIfPresent(formData, "caption", payload.caption ?? null);

  return authFetch<QuestionMediaOut>(`/api/questions/${questionId}/media/upload`, {
    method: "POST",
    body: formData,
  });
}

export async function linkAssetToQuestion(
  authFetch: AuthFetch,
  questionId: string,
  assetId: string,
  payload: LinkAssetToQuestionPayload,
): Promise<QuestionMediaOut> {
  const qs = new URLSearchParams();
  qs.set("alt_text", payload.alt_text);
  qs.set("is_essential", String(payload.is_essential ?? true));
  qs.set("position", String(payload.position ?? 0));
  qs.set("display_mode", (payload.display_mode ?? "INLINE") satisfies DisplayMode);
  if (payload.caption) {
    qs.set("caption", payload.caption);
  }

  return authFetch<QuestionMediaOut>(`/api/questions/${questionId}/media/from-asset/${assetId}?${qs.toString()}`, {
    method: "POST",
  });
}

export async function createProgrammaticQuestionMedia(
  authFetch: AuthFetch,
  questionId: string,
  payload: ProgrammaticQuestionMediaPayload,
): Promise<QuestionMediaOut> {
  return authFetch<QuestionMediaOut>(`/api/questions/${questionId}/media/programmatic`, {
    method: "POST",
    body: JSON.stringify({
      media_type: payload.media_type,
      source: "PROGRAMMATIC",
      visual_data: serializeVisualData(payload.visual_data),
      render_engine: payload.render_engine,
      alt_text: payload.alt_text,
      alt_text_detailed: payload.alt_text_detailed ?? null,
      display_mode: payload.display_mode ?? "ABOVE_STEM",
      is_essential: payload.is_essential ?? true,
      position: payload.position ?? 0,
      caption: payload.caption ?? null,
    }),
  });
}

export async function deleteQuestionMedia(
  authFetch: AuthFetch,
  questionId: string,
  mediaId: string,
): Promise<void> {
  await authFetch<void>(`/api/questions/${questionId}/media/${mediaId}`, {
    method: "DELETE",
  });
}

export async function listVisualAssets(
  authFetch: AuthFetch,
  params: ListAssetsParams = {},
): Promise<PaginatedAssets> {
  const qs = new URLSearchParams();
  if (params.area_id) qs.set("area_id", params.area_id);
  if (params.media_type) qs.set("media_type", params.media_type);
  if (params.tag) qs.set("tag", params.tag);
  if (params.q) qs.set("q", params.q);
  if (params.is_active !== undefined) qs.set("is_active", String(params.is_active));
  if (params.page) qs.set("page", String(params.page));
  if (params.page_size) qs.set("page_size", String(params.page_size));
  const query = qs.toString();
  return authFetch<PaginatedAssets>(`/api/assets${query ? `?${query}` : ""}`);
}

export async function getVisualAsset(
  authFetch: AuthFetch,
  assetId: string,
): Promise<VisualAssetOut> {
  return authFetch<VisualAssetOut>(`/api/assets/${assetId}`);
}

export async function uploadVisualAsset(
  authFetch: AuthFetch,
  payload: CreateVisualAssetPayload,
): Promise<VisualAssetOut> {
  const formData = new FormData();
  formData.append("file", payload.file);
  formData.append("title", payload.title);
  formData.append("alt_text", payload.alt_text);
  formData.append("media_type", payload.media_type);
  appendIfPresent(formData, "area_id", payload.area_id ?? null);
  appendIfPresent(formData, "description", payload.description ?? null);
  appendIfPresent(formData, "tags", payload.tags ?? null);
  appendIfPresent(formData, "license_type", payload.license_type ?? "OWN");
  appendIfPresent(formData, "attribution", payload.attribution ?? null);

  return authFetch<VisualAssetOut>("/api/assets", {
    method: "POST",
    body: formData,
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

export async function deleteQuestion(
  authFetch: AuthFetch,
  questionId: string,
): Promise<void> {
  await authFetch<void>(`/api/questions/${questionId}`, { method: "DELETE" });
}

export async function fetchQuestionStats(
  authFetch: AuthFetch,
): Promise<QuestionStats> {
  return authFetch<QuestionStats>("/api/questions/stats/summary");
}

export async function fetchEnglishAudit(
  authFetch: AuthFetch,
): Promise<EnglishAudit> {
  return authFetch<EnglishAudit>("/api/questions/english/audit");
}
