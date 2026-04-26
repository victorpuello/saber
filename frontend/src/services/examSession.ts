import type { AuthFetch } from "./dashboard";

// ── Types ────────────────────────────────────────────────────────────

export interface ExamQuestionMedia {
  id: string;
  question_id: string;
  media_type: string;
  source: string;
  storage_url: string | null;
  thumbnail_url: string | null;
  visual_data: string | null;
  render_engine: string | null;
  alt_text: string;
  alt_text_detailed: string | null;
  is_essential: boolean;
  position: number;
  display_mode: string;
  caption: string | null;
  width_px: number | null;
  height_px: number | null;
  created_at: string;
}

export interface ExamQuestionSafe {
  question_id: string;
  position: number;
  context: string;
  context_type: string;
  component_name: string | null;
  structure_type: "INDIVIDUAL" | "QUESTION_BLOCK" | null;
  block_id: string | null;
  block_item_order: number | null;
  block_size: number | null;
  stem: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string | null;
  media: ExamQuestionMedia[] | null;
}

export interface ExamSummary {
  id: string;
  title: string;
  exam_type: string;
  area_code: string | null;
  total_questions: number;
  time_limit_minutes: number | null;
  status: string;
}

export interface SessionOut {
  id: string;
  exam_id: string;
  student_user_id: number;
  started_at: string;
  finished_at: string | null;
  status: string;
  total_correct: number | null;
  total_answered: number | null;
  score_global: number | null;
  time_spent_seconds: number | null;
}

export interface AnswerOut {
  id: string;
  question_id: string;
  selected_answer: string | null;
  is_correct: boolean | null;
  time_spent_seconds: number | null;
  confidence_level: number | null;
  answered_at: string;
}

// ── API calls ────────────────────────────────────────────────────────

export async function fetchDiagnosticExams(
  authFetch: AuthFetch,
): Promise<ExamSummary[]> {
  const result = await authFetch<{ items: ExamSummary[]; total: number }>(
    "/api/exams/?exam_type=DIAGNOSTIC&status=ACTIVE&page_size=10",
  );
  return result.items ?? [];
}

export async function startExamSession(
  authFetch: AuthFetch,
  examId: string,
): Promise<SessionOut> {
  return authFetch<SessionOut>("/api/sessions/start", {
    method: "POST",
    body: JSON.stringify({ exam_id: examId }),
  });
}

export async function fetchSessionQuestions(
  authFetch: AuthFetch,
  sessionId: string,
): Promise<ExamQuestionSafe[]> {
  return authFetch<ExamQuestionSafe[]>(`/api/sessions/${sessionId}/questions`);
}

export async function submitAnswer(
  authFetch: AuthFetch,
  sessionId: string,
  questionId: string,
  selectedAnswer: string,
  timeSpentSeconds: number,
): Promise<AnswerOut> {
  return authFetch<AnswerOut>(`/api/sessions/${sessionId}/answers`, {
    method: "POST",
    body: JSON.stringify({
      question_id: questionId,
      selected_answer: selectedAnswer,
      time_spent_seconds: timeSpentSeconds,
    }),
  });
}

export async function finishExamSession(
  authFetch: AuthFetch,
  sessionId: string,
): Promise<SessionOut> {
  return authFetch<SessionOut>(`/api/sessions/${sessionId}/finish`, {
    method: "POST",
  });
}

// ── New types ────────────────────────────────────────────────────────

export interface ExamOut {
  id: string;
  title: string;
  description: string | null;
  exam_type: "DIAGNOSTIC" | "FULL_SIMULATION" | "AREA_PRACTICE" | "CUSTOM";
  area_code: string | null;
  total_questions: number;
  time_limit_minutes: number | null;
  status: "ACTIVE" | "ARCHIVED";
  is_adaptive: boolean;
  created_at: string;
}

export interface PaginatedExams {
  items: ExamOut[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
}

export interface CreateExamPayload {
  title: string;
  description?: string;
  exam_type: string;
  area_code?: string;
  total_questions: number;
  time_limit_minutes?: number;
  is_adaptive?: boolean;
  question_ids?: string[];
}

export interface QuestionResultDetail {
  question_id: string;
  position: number;
  competency_id: string | null;
  content_component_id: string | null;
  cognitive_process: string | null;
  component_name: string | null;
  context: string | null;
  context_type: string | null;
  media: ExamQuestionMedia[] | null;
  structure_type: "INDIVIDUAL" | "QUESTION_BLOCK" | null;
  block_id: string | null;
  block_item_order: number | null;
  block_size: number | null;
  stem: string;
  correct_answer: string;
  selected_answer: string | null;
  is_correct: boolean;
  explanation_correct: string;
  explanation_selected: string | null;
  time_spent_seconds: number | null;
}

export interface SessionResults {
  session_id: string;
  exam_title: string;
  exam_type: string;
  status: string;
  started_at: string;
  finished_at: string | null;
  total_questions: number;
  total_answered: number;
  total_correct: number;
  score_global: number;
  time_spent_seconds: number | null;
  questions: QuestionResultDetail[];
}

// ── New API calls ────────────────────────────────────────────────────

export async function listExams(
  authFetch: AuthFetch,
  params: {
    exam_type?: string;
    area_code?: string;
    status?: string;
    page?: number;
    page_size?: number;
  } = {},
): Promise<PaginatedExams> {
  const qs = new URLSearchParams();
  if (params.exam_type) qs.set("exam_type", params.exam_type);
  if (params.area_code) qs.set("area_code", params.area_code);
  if (params.status)    qs.set("status",    params.status);
  qs.set("page",      String(params.page      ?? 1));
  qs.set("page_size", String(params.page_size ?? 20));
  return authFetch<PaginatedExams>(`/api/exams/?${qs.toString()}`);
}

export async function createExam(
  authFetch: AuthFetch,
  data: CreateExamPayload,
): Promise<ExamOut> {
  return authFetch<ExamOut>("/api/exams/", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function archiveExam(
  authFetch: AuthFetch,
  examId: string,
): Promise<void> {
  await authFetch<unknown>(`/api/exams/${examId}/archive`, { method: "PATCH" });
}

export async function getExamQuestionIds(
  authFetch: AuthFetch,
  examId: string,
): Promise<Array<{ question_id: string; position: number }>> {
  return authFetch<Array<{ question_id: string; position: number }>>(
    `/api/exams/${examId}/questions`,
  );
}

export async function fetchSessionResults(
  authFetch: AuthFetch,
  sessionId: string,
): Promise<SessionResults> {
  return authFetch<SessionResults>(`/api/sessions/${sessionId}/results`);
}
