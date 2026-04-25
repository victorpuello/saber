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
  | "cloze_text"
  | "react_component";

export type CorrectAnswer = "A" | "B" | "C" | "D";

export type QuestionSourceBackend = "AI" | "MANUAL";

export type StructureType = "INDIVIDUAL" | "QUESTION_BLOCK";

export type MediaType =
  | "chart"
  | "table"
  | "diagram"
  | "map"
  | "infographic"
  | "comic"
  | "public_sign"
  | "photograph"
  | "timeline"
  | "state_structure"
  | "geometric_figure"
  | "probability_diagram";

export type MediaSource = "UPLOAD" | "PROGRAMMATIC" | "ASSET_LIBRARY";

export type DisplayMode = "INLINE" | "ABOVE_STEM" | "FULL_WIDTH" | "SIDE_BY_SIDE";

export type RenderEngine =
  | "chart_js"
  | "svg_template"
  | "html_template"
  | "map_renderer"
  | "timeline_renderer";

export type ContextMediaMode = "NONE" | "UPLOAD" | "ASSET_LIBRARY" | "PROGRAMMATIC";

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
  structure_type?: StructureType;
  block_id?: string | null;
  block_item_order?: number | null;
  block_size?: number | null;

  english_section: number | null;
  mcer_level: string | null;
  dce_metadata?: Record<string, unknown> | null;
  component_name?: string | null;
}

export interface QuestionBlockItemPayload {
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
  english_section: number | null;
  mcer_level: string | null;
  dce_metadata?: Record<string, unknown> | null;
  component_name?: string | null;
}

export interface QuestionBlockCreatePayload {
  area_id: string;
  competency_id: string;
  assertion_id: string;
  evidence_id: string | null;
  content_component_id: string | null;
  context: string;
  context_type: ContextType;
  source: QuestionSourceBackend;
  items: QuestionBlockItemPayload[];
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
  structure_type: StructureType;
  block_id: string | null;
  block_item_order: number | null;
  block_size: number | null;
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
  dce_metadata?: Record<string, unknown> | null;
  component_name?: string | null;

  times_used: number;
  created_at: string;
  updated_at: string;
}

export interface QuestionBlockOut {
  block_id: string;
  structure_type: "QUESTION_BLOCK";
  block_size: number;
  context: string;
  context_type: string;
  area_id: string;
  competency_id: string;
  assertion_id: string;
  evidence_id: string | null;
  content_component_id: string | null;
  items: QuestionOut[];
}

export interface QuestionMediaOut {
  id: string;
  question_id: string;
  media_type: MediaType;
  source: MediaSource;
  storage_url: string | null;
  thumbnail_url: string | null;
  visual_data: string | null;
  render_engine: RenderEngine | null;
  alt_text: string;
  alt_text_detailed: string | null;
  is_essential: boolean;
  position: number;
  display_mode: DisplayMode;
  caption: string | null;
  width_px: number | null;
  height_px: number | null;
  created_at: string;
}

export interface UploadQuestionMediaPayload {
  file: File;
  media_type: MediaType;
  alt_text: string;
  is_essential?: boolean;
  position?: number;
  display_mode?: DisplayMode;
  caption?: string | null;
}

export interface LinkAssetToQuestionPayload {
  alt_text: string;
  is_essential?: boolean;
  position?: number;
  display_mode?: DisplayMode;
  caption?: string | null;
}

export interface ProgrammaticQuestionMediaPayload {
  media_type: MediaType;
  visual_data: string | Record<string, unknown>;
  render_engine: RenderEngine;
  alt_text: string;
  alt_text_detailed?: string | null;
  display_mode?: DisplayMode;
  is_essential?: boolean;
  position?: number;
  caption?: string | null;
}

export interface VisualAssetSummary {
  id: string;
  media_type: MediaType;
  title: string;
  thumbnail_url: string | null;
  alt_text: string;
  tags: string | null;
  times_used: number;
}

export interface VisualAssetOut {
  id: string;
  area_id: string | null;
  media_type: MediaType;
  storage_url: string;
  thumbnail_url: string | null;
  original_filename: string;
  content_type: string;
  file_size_bytes: number;
  width_px: number | null;
  height_px: number | null;
  title: string;
  alt_text: string;
  description: string | null;
  tags: string | null;
  license_type: string;
  attribution: string | null;
  times_used: number;
  is_active: boolean;
  uploaded_by_user_id: number | null;
  created_at: string;
}

export interface CreateVisualAssetPayload {
  file: File;
  title: string;
  alt_text: string;
  media_type: MediaType;
  area_id?: string | null;
  description?: string | null;
  tags?: string | null;
  license_type?: string;
  attribution?: string | null;
}

export interface AssetUploadDraft {
  file: File | null;
  title: string;
  description: string;
  tags: string;
  license_type: string;
  attribution: string;
}

export const INITIAL_ASSET_UPLOAD_DRAFT: AssetUploadDraft = {
  file: null,
  title: "",
  description: "",
  tags: "",
  license_type: "OWN",
  attribution: "",
};

export interface ContextMediaDraft {
  mode: ContextMediaMode;
  media_type: MediaType | "";
  alt_text: string;
  alt_text_detailed: string;
  is_essential: boolean;
  display_mode: DisplayMode;
  caption: string;
  upload_file: File | null;
  asset_id: string | null;
  render_engine: RenderEngine | "";
  visual_data: string;
}

export const INITIAL_CONTEXT_MEDIA_DRAFT: ContextMediaDraft = {
  mode: "NONE",
  media_type: "",
  alt_text: "",
  alt_text_detailed: "",
  is_essential: true,
  display_mode: "ABOVE_STEM",
  caption: "",
  upload_file: null,
  asset_id: null,
  render_engine: "",
  visual_data: "",
};

export interface QuestionBlockFormItem {
  stem: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: CorrectAnswer | "";
  explanation_correct: string;
  explanation_a: string;
  explanation_b: string;
  explanation_c: string;
  explanation_d: string;
  cognitive_process: string;
  difficulty_estimated: string;
  english_section: string;
  mcer_level: string;
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
  structure_type: StructureType;

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

export type BlockItemErrors = Partial<Record<keyof QuestionBlockFormItem, string>>;

export const createEmptyBlockItem = (): QuestionBlockFormItem => ({
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
});

export const INITIAL_FORM_DATA: QuestionFormData = {
  area_id: "",
  competency_id: "",
  assertion_id: "",
  evidence_id: "",
  content_component_id: "",
  structure_type: "INDIVIDUAL",

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
