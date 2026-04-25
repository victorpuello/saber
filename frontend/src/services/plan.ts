import type { AuthFetch } from "./dashboard";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PlanPracticeItem {
  id: string;
  question_id: string;
  position: number;
  completed: boolean;
  completed_at: string | null;
  selected_answer: string | null;
  is_correct: boolean | null;
}

export interface PlanUnit {
  id: string;
  week_number: number;
  position: number;
  competency_id: string;
  area_code: string;
  title: string;
  description: string | null;
  priority: string;
  recommended_questions: number;
  completed: boolean;
  completed_at: string | null;
  questions_attempted: number;
  questions_correct: number;
  practice_items: PlanPracticeItem[];
}

export interface PlanWeek {
  week_number: number;
  units: PlanUnit[];
}

export interface PlanProgress {
  plan_id: string;
  total_units: number;
  completed_units: number;
  progress_percent: number;
  current_week: number;
  total_weeks: number;
  by_area: Record<string, { total: number; completed: number; correct: number; attempted: number }>;
  by_priority: Record<string, { total: number; completed: number }>;
}

export interface ActivePlan {
  id: string;
  status: string;
  total_weeks: number;
  current_week: number;
  generated_at: string;
  units: PlanUnit[];
}

export interface PracticeQuestion {
  id: string;
  context: string;
  context_type: string;
  stem: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string | null;
  correct_answer: string;
  explanation_correct: string;
  explanation_a: string | null;
  explanation_b: string | null;
  explanation_c: string | null;
  explanation_d: string | null;
  area_id: string;
}

// ── API calls ─────────────────────────────────────────────────────────────────

export async function fetchActivePlan(authFetch: AuthFetch): Promise<ActivePlan | null> {
  try {
    return await authFetch<ActivePlan>("/api/plans/active");
  } catch {
    return null;
  }
}

export async function fetchPlanProgress(authFetch: AuthFetch): Promise<PlanProgress | null> {
  try {
    return await authFetch<PlanProgress>("/api/plans/active/progress");
  } catch {
    return null;
  }
}

export async function fetchPlanWeek(authFetch: AuthFetch, weekNumber: number): Promise<PlanWeek | null> {
  try {
    return await authFetch<PlanWeek>(`/api/plans/active/week/${weekNumber}`);
  } catch {
    return null;
  }
}

export async function fetchAllWeeks(authFetch: AuthFetch, totalWeeks: number): Promise<PlanWeek[]> {
  const promises = Array.from({ length: totalWeeks }, (_, i) => fetchPlanWeek(authFetch, i + 1));
  const results = await Promise.all(promises);
  return results.filter((w): w is PlanWeek => w !== null);
}

export async function fetchUnitDetail(authFetch: AuthFetch, unitId: string): Promise<PlanUnit | null> {
  try {
    return await authFetch<PlanUnit>(`/api/plans/units/${unitId}`);
  } catch {
    return null;
  }
}

export async function fetchPracticeQuestion(authFetch: AuthFetch, questionId: string): Promise<PracticeQuestion | null> {
  try {
    return await authFetch<PracticeQuestion>(`/api/questions/${questionId}`);
  } catch {
    return null;
  }
}

export async function submitPracticeAnswer(
  authFetch: AuthFetch,
  unitId: string,
  questionId: string,
  selectedAnswer: string,
): Promise<PlanPracticeItem | null> {
  try {
    return await authFetch<PlanPracticeItem>(`/api/plans/units/${unitId}/answer`, {
      method: "POST",
      body: JSON.stringify({ question_id: questionId, selected_answer: selectedAnswer }),
    });
  } catch {
    return null;
  }
}

export async function generatePlan(authFetch: AuthFetch, totalWeeks = 10): Promise<ActivePlan | null> {
  try {
    return await authFetch<ActivePlan>("/api/plans/generate", {
      method: "POST",
      body: JSON.stringify({ total_weeks: totalWeeks }),
    });
  } catch {
    return null;
  }
}

export async function readjustPlan(authFetch: AuthFetch): Promise<ActivePlan | null> {
  try {
    return await authFetch<ActivePlan>("/api/plans/active/readjust", { method: "POST" });
  } catch {
    return null;
  }
}
