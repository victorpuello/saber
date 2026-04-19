/* Tipos para el formulario de creación manual de preguntas.
   Alineados con QuestionCreate / QuestionOut del servicio question-bank. */

// --- Enums alineados con backend schemas.py ---

export type ContextType =
  | "continuous_text"
  | "discontinuous_text"
  | "scientific_scenario"
  | "math_problem"
  | "social_dilemma"
  | "philosophical_text"
  | "graphic_notice"
  | "dialogue"
  | "cloze_text";

export type CorrectAnswer = "A" | "B" | "C" | "D";

export type QuestionSourceBackend = "AI" | "MANUAL";

export type QuestionStatusBackend =
  | "DRAFT"
  | "PENDING_REVIEW"
  | "APPROVED"
  | "REJECTED"
  | "ARCHIVED";

// --- Taxonomía (respuestas de GET /api/taxonomy) ---

export interface EvidenceItem {
  id: string;
  code: string;
  observable_behavior: string;
}

export interface AssertionItem {
  id: string;
  code: string;
  statement: string;
  evidences: EvidenceItem[];
}

export interface CompetencyItem {
  id: string;
  code: string;
  name: string;
  description: string;
  weight_percentage: number | null;
  cognitive_level: number | null;
  assertions: AssertionItem[];
}

export interface ContentComponentItem {
  id: string;
  code: string;
  name: string;
}

export interface AreaDetail {
  id: string;
  code: string;
  name: string;
  total_questions: number;
  description: string | null;
  competencies: CompetencyItem[];
  content_components: ContentComponentItem[];
}

export interface AreaSummary {
  id: string;
  code: string;
  name: string;
  total_questions: number;
}

// --- Payload de creación (POST /api/questions) ---

export interface QuestionCreatePayload {
  area_id: string;
  competency_id: string;
  assertion_id: string;
  evidence_id: string | null;
  content_component_id: string | null;

  context: string;
  context_type: ContextType;
  stem: string;

  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string | null;
  correct_answer: CorrectAnswer;

  explanation_correct: string;
  explanation_a: string | null;
  explanation_b: string | null;
  explanation_c: string | null;
  explanation_d: string | null;

  cognitive_process: string | null;
  difficulty_estimated: number | null;

  source: QuestionSourceBackend;

  english_section: number | null;
  mcer_level: string | null;
}

// --- Respuesta de creación ---

export interface QuestionOut {
  id: string;
  area_id: string;
  competency_id: string;
  assertion_id: string;
  evidence_id: string | null;
  content_component_id: string | null;

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

  cognitive_process: string | null;
  difficulty_estimated: number | null;
  discrimination_index: number | null;

  source: string;
  created_by_user_id: number | null;
  status: QuestionStatusBackend;
  reviewed_by_user_id: number | null;
  reviewed_at: string | null;
  review_notes: string | null;

  english_section: number | null;
  mcer_level: string | null;

  times_used: number;
  created_at: string;
  updated_at: string;
}

// --- Estado interno del formulario ---

export type FormTab = "taxonomy" | "content" | "explanations" | "review";

export interface QuestionFormData {
  // Taxonomía
  area_id: string;
  competency_id: string;
  assertion_id: string;
  evidence_id: string;
  content_component_id: string;

  // Contenido
  context: string;
  context_type: ContextType | "";
  stem: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: CorrectAnswer | "";

  // Explicaciones
  explanation_correct: string;
  explanation_a: string;
  explanation_b: string;
  explanation_c: string;
  explanation_d: string;

  // Metadatos
  cognitive_process: string;
  difficulty_estimated: string; // string para input, se convierte a float

  // Inglés
  english_section: string;
  mcer_level: string;
}

export type FormErrors = Partial<Record<keyof QuestionFormData | "form", string>>;

export const INITIAL_FORM_DATA: QuestionFormData = {
  area_id: "",
  competency_id: "",
  assertion_id: "",
  evidence_id: "",
  content_component_id: "",

  context: "",
  context_type: "",
  stem: "",
  option_a: "",
  option_b: "",
  option_c: "",
  option_d: "",
  correct_answer: "",

  explanation_correct: "",
  explanation_a: "",
  explanation_b: "",
  explanation_c: "",
  explanation_d: "",

  cognitive_process: "",
  difficulty_estimated: "",

  english_section: "",
  mcer_level: "",
};

export const CONTEXT_TYPE_OPTIONS: { value: ContextType; label: string }[] = [
  { value: "continuous_text", label: "Texto continuo" },
  { value: "discontinuous_text", label: "Texto discontinuo" },
  { value: "scientific_scenario", label: "Escenario científico" },
  { value: "math_problem", label: "Problema matemático" },
  { value: "social_dilemma", label: "Dilema social" },
  { value: "philosophical_text", label: "Texto filosófico" },
  { value: "graphic_notice", label: "Aviso gráfico" },
  { value: "dialogue", label: "Diálogo" },
  { value: "cloze_text", label: "Texto cloze" },
];

export const CORRECT_ANSWER_OPTIONS: CorrectAnswer[] = ["A", "B", "C", "D"];

export const COGNITIVE_PROCESS_OPTIONS = [
  "remembering",
  "understanding",
  "applying",
  "analyzing",
  "evaluating",
  "creating",
];

export const MCER_LEVEL_OPTIONS = ["A1", "A2", "B1", "B+"];
