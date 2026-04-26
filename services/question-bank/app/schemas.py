"""Schemas Pydantic para el Question Bank Service."""

import uuid
from datetime import datetime
from enum import Enum

from pydantic import BaseModel, ConfigDict, Field

# =============================================================================
# Enums
# =============================================================================


class QuestionStatus(str, Enum):
    DRAFT = "DRAFT"
    PENDING_REVIEW = "PENDING_REVIEW"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    ARCHIVED = "ARCHIVED"


class QuestionSource(str, Enum):
    AI = "AI"
    MANUAL = "MANUAL"


class StructureType(str, Enum):
    INDIVIDUAL = "INDIVIDUAL"
    QUESTION_BLOCK = "QUESTION_BLOCK"


class ContextType(str, Enum):
    continuous_text = "continuous_text"
    discontinuous_text = "discontinuous_text"
    scientific_scenario = "scientific_scenario"
    math_problem = "math_problem"
    social_dilemma = "social_dilemma"
    philosophical_text = "philosophical_text"
    graphic_notice = "graphic_notice"
    dialogue = "dialogue"
    cloze_text = "cloze_text"
    react_component = "react_component"


class ContextCategory(str, Enum):
    """Categorías de contexto ICFES (transversales a todas las áreas)."""
    familiar_personal = "familiar_personal"
    laboral_ocupacional = "laboral_ocupacional"
    comunitario_social = "comunitario_social"
    matematico_cientifico = "matematico_cientifico"


class CorrectAnswer(str, Enum):
    A = "A"
    B = "B"
    C = "C"
    D = "D"


# =============================================================================
# Taxonomía — Respuestas
# =============================================================================


class EvidenceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    code: str
    observable_behavior: str


class AssertionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    code: str
    statement: str
    evidences: list[EvidenceOut] = []


class CompetencyOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    code: str
    name: str
    description: str
    weight_percentage: float | None = None
    cognitive_level: int | None = None
    assertions: list[AssertionOut] = []


class ContentComponentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    code: str
    name: str


class AreaOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    code: str
    name: str
    total_questions: int
    description: str | None = None
    competencies: list[CompetencyOut] = []
    content_components: list[ContentComponentOut] = []


class AreaSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    code: str
    name: str
    total_questions: int


# =============================================================================
# Metadatos DCE enriquecidos para inglés
# =============================================================================


class DceMetadata(BaseModel):
    """Metadatos del Diseño Centrado en Evidencias para ítems de inglés."""

    competence: str | None = None
    """Competencia evaluada: pragmatica | linguistica | sociolinguistica | comprension_lectora"""
    assertion: str | None = None
    """Texto de la afirmación DCE asociada al ítem."""
    cognitive_level: str | None = None
    """Nivel cognitivo: reconocimiento | comprension_aplicacion | analisis_sintesis"""
    grammar_tags: list[str] = []
    """Etiquetas lingüísticas específicas (ej. apologies, present_perfect, false_cognates)."""
    part_description: str | None = None
    """Descripción de la parte/sección del examen de inglés."""
    l1_distractor_note: str | None = None
    """Nota sobre el distractor basado en interferencia de lengua materna."""


class EnglishAuditInvalidItem(BaseModel):
    question_id: uuid.UUID
    status: str
    english_section: int | None = None
    mcer_level: str | None = None
    component_name: str | None = None
    defects: list[str]


class EnglishAuditResponse(BaseModel):
    area_id: uuid.UUID | None = None
    total: int
    valid: int
    invalid: int
    by_status: dict[str, int]
    by_section: dict[str, int]
    by_mcer_level: dict[str, int]
    defects_by_code: dict[str, int]
    invalid_items: list[EnglishAuditInvalidItem]


# =============================================================================
# Preguntas — Creación / Actualización
# =============================================================================


class QuestionCreate(BaseModel):
    area_id: uuid.UUID
    competency_id: uuid.UUID
    assertion_id: uuid.UUID
    evidence_id: uuid.UUID | None = None
    content_component_id: uuid.UUID | None = None

    context: str = Field(min_length=10)
    context_type: ContextType
    context_category: ContextCategory | None = None
    stem: str = Field(min_length=5)

    option_a: str = Field(min_length=1)
    option_b: str = Field(min_length=1)
    option_c: str = Field(min_length=1)
    option_d: str | None = None
    correct_answer: CorrectAnswer

    explanation_correct: str = Field(min_length=5)
    explanation_a: str | None = None
    explanation_b: str | None = None
    explanation_c: str | None = None
    explanation_d: str | None = None

    cognitive_process: str | None = None
    difficulty_estimated: float | None = Field(None, ge=0, le=1)
    tags: list[str] | None = None

    source: QuestionSource = QuestionSource.MANUAL
    structure_type: StructureType = StructureType.INDIVIDUAL
    block_id: uuid.UUID | None = None
    block_item_order: int | None = Field(None, ge=1, le=3)
    block_size: int | None = Field(None, ge=2, le=3)

    # Inglés (opcionales)
    english_section: int | None = Field(None, ge=1, le=7)
    mcer_level: str | None = None
    dce_metadata: DceMetadata | None = None
    component_name: str | None = None


class QuestionUpdate(BaseModel):
    context: str | None = Field(None, min_length=10)
    context_type: ContextType | None = None
    context_category: ContextCategory | None = None
    tags: list[str] | None = None
    structure_type: StructureType | None = None
    block_id: uuid.UUID | None = None
    block_item_order: int | None = Field(None, ge=1, le=3)
    block_size: int | None = Field(None, ge=2, le=3)
    stem: str | None = Field(None, min_length=5)

    option_a: str | None = None
    option_b: str | None = None
    option_c: str | None = None
    option_d: str | None = None
    correct_answer: CorrectAnswer | None = None

    explanation_correct: str | None = None
    explanation_a: str | None = None
    explanation_b: str | None = None
    explanation_c: str | None = None
    explanation_d: str | None = None

    cognitive_process: str | None = None
    difficulty_estimated: float | None = Field(None, ge=0, le=1)

    english_section: int | None = Field(None, ge=1, le=7)
    mcer_level: str | None = None
    dce_metadata: DceMetadata | None = None
    component_name: str | None = None


class QuestionIrtUpdate(BaseModel):
    irt_difficulty: float = Field(ge=-4, le=4)
    irt_discrimination: float = Field(ge=0.1, le=3)
    irt_guessing: float = Field(ge=0, le=0.5)


class QuestionBlockItemCreate(BaseModel):
    stem: str = Field(min_length=5)

    option_a: str = Field(min_length=1)
    option_b: str = Field(min_length=1)
    option_c: str = Field(min_length=1)
    option_d: str | None = None
    correct_answer: CorrectAnswer

    explanation_correct: str = Field(min_length=5)
    explanation_a: str | None = None
    explanation_b: str | None = None
    explanation_c: str | None = None
    explanation_d: str | None = None

    cognitive_process: str | None = None
    difficulty_estimated: float | None = Field(None, ge=0, le=1)
    english_section: int | None = Field(None, ge=1, le=7)
    mcer_level: str | None = None
    dce_metadata: DceMetadata | None = None
    component_name: str | None = None


class QuestionBlockCreate(BaseModel):
    area_id: uuid.UUID
    competency_id: uuid.UUID
    assertion_id: uuid.UUID
    evidence_id: uuid.UUID | None = None
    content_component_id: uuid.UUID | None = None

    context: str = Field(min_length=10)
    context_type: ContextType
    context_category: ContextCategory | None = None
    source: QuestionSource = QuestionSource.MANUAL

    items: list[QuestionBlockItemCreate] = Field(min_length=2, max_length=3)


class QuestionBlockUpdate(BaseModel):
    area_id: uuid.UUID | None = None
    competency_id: uuid.UUID | None = None
    assertion_id: uuid.UUID | None = None
    evidence_id: uuid.UUID | None = None
    content_component_id: uuid.UUID | None = None

    context: str | None = Field(None, min_length=10)
    context_type: ContextType | None = None

    items: list[QuestionBlockItemCreate] = Field(min_length=2, max_length=3)


# =============================================================================
# Preguntas — Respuestas
# =============================================================================


class QuestionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    area_id: uuid.UUID
    competency_id: uuid.UUID
    assertion_id: uuid.UUID
    evidence_id: uuid.UUID | None = None
    content_component_id: uuid.UUID | None = None

    context: str
    context_type: str
    context_category: str | None = None
    structure_type: str
    block_id: uuid.UUID | None = None
    block_item_order: int | None = None
    block_size: int | None = None
    stem: str

    option_a: str
    option_b: str
    option_c: str
    option_d: str | None = None
    correct_answer: str

    explanation_correct: str
    explanation_a: str | None = None
    explanation_b: str | None = None
    explanation_c: str | None = None
    explanation_d: str | None = None

    cognitive_process: str | None = None
    difficulty_estimated: float | None = None
    discrimination_index: float | None = None
    tags: list[str] | None = None

    source: str
    created_by_user_id: int | None = None
    status: str
    reviewed_by_user_id: int | None = None
    reviewed_at: datetime | None = None
    review_notes: str | None = None

    english_section: int | None = None
    mcer_level: str | None = None
    dce_metadata: DceMetadata | None = None
    component_name: str | None = None

    irt_difficulty: float | None = None
    irt_discrimination: float | None = None
    irt_guessing: float | None = None

    times_used: int = 0
    created_at: datetime
    updated_at: datetime


class QuestionSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    area_id: uuid.UUID
    competency_id: uuid.UUID
    context_type: str
    structure_type: str
    block_id: uuid.UUID | None = None
    block_item_order: int | None = None
    block_size: int | None = None
    stem: str
    source: str
    status: str
    cognitive_process: str | None = None
    difficulty_estimated: float | None = None
    discrimination_index: float | None = None
    tags: list[str] | None = None
    created_at: datetime


# =============================================================================
# Revisión de preguntas
# =============================================================================


class ReviewAction(str, Enum):
    APPROVE = "APPROVE"
    REJECT = "REJECT"


class ReviewRequest(BaseModel):
    action: ReviewAction
    notes: str | None = None


class QuestionBlockOut(BaseModel):
    block_id: uuid.UUID
    structure_type: str = StructureType.QUESTION_BLOCK.value
    block_size: int
    context: str
    context_type: str
    context_category: str | None = None
    area_id: uuid.UUID
    competency_id: uuid.UUID
    assertion_id: uuid.UUID
    evidence_id: uuid.UUID | None = None
    content_component_id: uuid.UUID | None = None
    items: list[QuestionOut]


# =============================================================================
# Paginación
# =============================================================================


class PaginatedResponse(BaseModel):
    items: list
    total: int
    page: int
    page_size: int
    pages: int


# =============================================================================
# Question Media
# =============================================================================


class MediaType(str, Enum):
    chart = "chart"
    table = "table"
    diagram = "diagram"
    map = "map"
    infographic = "infographic"
    comic = "comic"
    public_sign = "public_sign"
    photograph = "photograph"
    timeline = "timeline"
    state_structure = "state_structure"
    geometric_figure = "geometric_figure"
    probability_diagram = "probability_diagram"


class MediaSource(str, Enum):
    UPLOAD = "UPLOAD"
    PROGRAMMATIC = "PROGRAMMATIC"
    ASSET_LIBRARY = "ASSET_LIBRARY"


class DisplayMode(str, Enum):
    INLINE = "INLINE"
    ABOVE_STEM = "ABOVE_STEM"
    FULL_WIDTH = "FULL_WIDTH"
    SIDE_BY_SIDE = "SIDE_BY_SIDE"


class QuestionMediaCreate(BaseModel):
    media_type: MediaType
    source: MediaSource
    alt_text: str = Field(min_length=5)
    alt_text_detailed: str | None = None
    is_essential: bool = True
    position: int = 0
    display_mode: DisplayMode = DisplayMode.INLINE
    caption: str | None = None
    visual_data: str | None = None
    render_engine: str | None = None
    asset_id: uuid.UUID | None = None  # Si viene de asset library


class QuestionMediaOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    question_id: uuid.UUID
    media_type: str
    source: str
    storage_url: str | None = None
    thumbnail_url: str | None = None
    visual_data: str | None = None
    render_engine: str | None = None
    alt_text: str
    alt_text_detailed: str | None = None
    is_essential: bool
    position: int
    display_mode: str
    caption: str | None = None
    width_px: int | None = None
    height_px: int | None = None
    created_at: datetime


# =============================================================================
# Visual Assets (banco curado reutilizable)
# =============================================================================


class LicenseType(str, Enum):
    OWN = "OWN"
    CC0 = "CC0"
    CC_BY = "CC_BY"
    CC_BY_SA = "CC_BY_SA"
    CC_BY_NC = "CC_BY_NC"
    PUBLIC_DOMAIN = "PUBLIC_DOMAIN"
    EDUCATIONAL_USE = "EDUCATIONAL_USE"


class VisualAssetCreate(BaseModel):
    area_id: uuid.UUID | None = None
    media_type: MediaType
    title: str = Field(min_length=3, max_length=200)
    alt_text: str = Field(min_length=5)
    description: str | None = None
    tags: str | None = None
    license_type: LicenseType = LicenseType.OWN
    attribution: str | None = None


class VisualAssetOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    area_id: uuid.UUID | None = None
    media_type: str
    storage_url: str
    thumbnail_url: str | None = None
    original_filename: str
    content_type: str
    file_size_bytes: int
    width_px: int | None = None
    height_px: int | None = None
    title: str
    alt_text: str
    description: str | None = None
    tags: str | None = None
    license_type: str
    attribution: str | None = None
    times_used: int = 0
    is_active: bool = True
    uploaded_by_user_id: int | None = None
    created_at: datetime


class VisualAssetSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    media_type: str
    title: str
    thumbnail_url: str | None = None
    alt_text: str
    tags: str | None = None
    times_used: int = 0
