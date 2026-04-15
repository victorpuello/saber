import type { AuthFetch } from "./dashboard";

// ── Types ────────────────────────────────────────────────────────────

export interface ExamQuestionSafe {
  question_id: string;
  position: number;
  context: string;
  context_type: string;
  stem: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string | null;
  media: Array<{ url: string; type: string }> | null;
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
