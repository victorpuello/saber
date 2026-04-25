"""Schemas Pydantic para el AI Generator Service."""

import uuid
from datetime import datetime
from enum import Enum

from pydantic import BaseModel, Field

# =============================================================================
# Enums
# =============================================================================


class AIProvider(str, Enum):
    anthropic = "anthropic"
    gemini = "gemini"


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


class RenderEngine(str, Enum):
    chart_js = "chart_js"
    svg_template = "svg_template"
    html_template = "html_template"
    map_renderer = "map_renderer"
    timeline_renderer = "timeline_renderer"


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


class GenerationJobStatus(str, Enum):
    queued = "QUEUED"
    running = "RUNNING"
    completed = "COMPLETED"
    failed = "FAILED"
    partial = "PARTIAL"
    cancelled = "CANCELLED"


class GenerationJobItemStatus(str, Enum):
    queued = "QUEUED"
    running = "RUNNING"
    completed = "COMPLETED"
    failed = "FAILED"
    cancelled = "CANCELLED"


# =============================================================================
# Request / Response
# =============================================================================


class GenerateRequest(BaseModel):
    """Solicitud de generación de pregunta IA."""

    area_code: str = Field(description="Código del área: LC, MAT, SC, CN, ING")
    provider: AIProvider | None = Field(
        None, description="Proveedor IA a usar (anthropic o gemini). Si None, usa el default."
    )
    model: str | None = Field(
        None,
        description=(
            "Modelo específico (ej: claude-sonnet-4-20250514, gemini-2.5-flash). "
            "Si None, usa el default del proveedor."
        ),
    )
    competency_code: str | None = Field(
        None, description="Código de competencia específica (opcional)"
    )
    context_type: ContextType | None = Field(
        None, description="Tipo de contexto a generar (opcional, se infiere del área)"
    )
    include_visual: bool = Field(
        False, description="Si True, genera también visual_data programático"
    )
    visual_type: MediaType | None = Field(
        None, description="Tipo de visual a generar (si include_visual=True)"
    )
    cognitive_level: int | None = Field(
        None, ge=1, le=3, description="Nivel cognitivo deseado (1=bajo, 3=alto)"
    )
    english_section: int | None = Field(
        None, ge=1, le=7, description="Sección de inglés (solo para ING)"
    )


class GenerateBatchRequest(BaseModel):
    """Solicitud de generación en lote."""

    area_code: str
    provider: AIProvider | None = None
    model: str | None = None
    count: int = Field(ge=1, le=20, description="Cantidad de preguntas a generar")
    include_visual: bool = False
    visual_type: MediaType | None = None
    competency_code: str | None = None
    cognitive_level: int | None = Field(None, ge=1, le=3)
    english_section: int | None = Field(None, ge=1, le=7)


class CreateGenerationJobRequest(BaseModel):
    """Solicitud para encolar un job asíncrono de generación."""

    area_code: str
    provider: AIProvider | None = None
    model: str | None = None
    count: int = Field(ge=1, le=20, description="Cantidad de preguntas a generar")
    include_visual: bool = False
    visual_type: MediaType | None = None
    competency_code: str | None = None
    cognitive_level: int | None = Field(None, ge=1, le=3)
    english_section: int | None = Field(None, ge=1, le=7)


class GeneratedMedia(BaseModel):
    """Media generada por IA — programática o imagen real."""

    media_type: str
    render_engine: str
    visual_data: str  # JSON serializado (metadatos / fallback)
    alt_text: str
    alt_text_detailed: str | None = None
    display_mode: str = "ABOVE_STEM"
    # Si se generó imagen real (bytes), se sube al question-bank como archivo
    image_bytes: bytes | None = None
    image_mime_type: str = "image/png"


class GeneratedQuestion(BaseModel):
    """Pregunta generada por IA lista para enviar al Question Bank."""

    # Taxonomía (IDs resueltos por el servicio)
    area_code: str
    competency_code: str
    assertion_code: str
    evidence_code: str
    content_component_code: str | None = None

    # Estructura tripartita
    context: str
    context_type: str
    stem: str

    # Opciones
    option_a: str
    option_b: str
    option_c: str
    option_d: str | None = None
    correct_answer: str = Field(pattern=r"^[A-D]$")

    # Explicaciones pedagógicas
    explanation_correct: str
    explanation_a: str
    explanation_b: str
    explanation_c: str
    explanation_d: str | None = None

    # Metadatos
    cognitive_process: str | None = None
    difficulty_estimated: float | None = Field(None, ge=0, le=1)

    # Inglés
    english_section: int | None = None
    mcer_level: str | None = None
    component_name: str | None = None
    dce_metadata: dict | None = None

    # Visual programático (opcional)
    media: GeneratedMedia | None = None


class GenerateResponse(BaseModel):
    """Respuesta de generación individual."""

    question: GeneratedQuestion
    validation: dict  # Resultado del validador automático
    ai_model: str
    token_usage: dict | None = None


class BatchResponse(BaseModel):
    """Respuesta de generación en lote."""

    total_requested: int
    total_generated: int
    total_valid: int
    questions: list[GenerateResponse]
    errors: list[str] = Field(default_factory=list)


class GenerationJobItemResponse(BaseModel):
    """Estado de un ítem individual dentro del job."""

    id: uuid.UUID
    item_index: int
    status: GenerationJobItemStatus
    provider: str | None = None
    model: str | None = None
    is_valid: bool | None = None
    error: str | None = None
    token_input: int | None = None
    token_output: int | None = None
    created_question_area_code: str | None = None
    created_question_competency_code: str | None = None
    created_question_assertion_code: str | None = None
    created_question_evidence_code: str | None = None
    created_at: datetime
    started_at: datetime | None = None
    finished_at: datetime | None = None


class GenerationJobResponse(BaseModel):
    """Resumen de estado y progreso de un job asíncrono."""

    id: uuid.UUID
    status: GenerationJobStatus
    cancel_requested: bool
    requested_by_user_id: int
    requested_by_role: str

    area_code: str
    provider: str | None = None
    model: str | None = None
    competency_code: str | None = None
    cognitive_level: int | None = None
    include_visual: bool
    visual_type: str | None = None
    english_section: int | None = None

    total_requested: int
    total_processed: int
    total_generated: int
    total_valid: int
    total_failed: int
    progress_percent: float

    error_summary: str | None = None
    retry_of_job_id: uuid.UUID | None = None
    created_at: datetime
    started_at: datetime | None = None
    finished_at: datetime | None = None
    updated_at: datetime


class GenerationJobDetailResponse(GenerationJobResponse):
    """Detalle completo de un job asíncrono."""

    items: list[GenerationJobItemResponse] = Field(default_factory=list)


class QueueStatus(BaseModel):
    """Estado de la cola de generación."""

    pending: int = 0
    processing: int = 0
    completed_today: int = 0
    failed_today: int = 0


class GenerationStats(BaseModel):
    """Estadísticas de generación IA."""

    total_generated: int = 0
    total_approved: int = 0
    total_rejected: int = 0
    approval_rate: float = 0.0
    by_area: dict[str, int] = Field(default_factory=dict)
    by_model: dict[str, int] = Field(default_factory=dict)


# =============================================================================
# Provider management
# =============================================================================


class ProviderInfo(BaseModel):
    """Información pública de un proveedor (sin API key)."""

    provider: str
    display_name: str
    default_model: str
    is_enabled: bool
    max_tokens: int
    temperature: float
    has_api_key: bool


class ProviderSetupRequest(BaseModel):
    """Solicitud para configurar un proveedor."""

    provider: AIProvider
    display_name: str | None = None
    default_model: str | None = None
    api_key: str = Field(description="API key del proveedor (se cifra en BD)")
    is_enabled: bool = True
    max_tokens: int = 4096
    temperature: float = Field(0.7, ge=0.0, le=2.0)


class ProviderUpdateRequest(BaseModel):
    """Actualización parcial de un proveedor."""

    display_name: str | None = None
    default_model: str | None = None
    api_key: str | None = Field(None, description="Nueva API key (se re-cifra)")
    is_enabled: bool | None = None
    max_tokens: int | None = None
    temperature: float | None = Field(None, ge=0.0, le=2.0)
