export type ExamType = "FULL_SIMULATION" | "AREA_PRACTICE" | "CUSTOM" | "DIAGNOSTIC";
export type ExamStatus = "ACTIVE" | "ARCHIVED";

export interface ExamMetric {
  id: string;
  label: string;
  value: string;
  icon: string;
  variant: "default" | "warning" | "success" | "ai";
}

export interface ExamRow {
  id: string;
  title: string;
  exam_type: ExamType;
  area_code: string | null;
  total_questions: number;
  time_limit_minutes: number | null;
  status: ExamStatus;
  is_adaptive: boolean;
  created_at: string;
}

export interface ExamsFiltersState {
  exam_type: string;
  area_code: string;
  status: string;
  search: string;
}
