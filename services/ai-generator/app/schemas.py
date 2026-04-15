"""Schemas Pydantic para el AI Generator Service."""

from enum import Enum

from pydantic import BaseModel, Field

# =============================================================================
# Enums
# =============================================================================


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


# =============================================================================
# Request / Response
# =============================================================================


class GenerateRequest(BaseModel):
    """Solicitud de generación de pregunta IA."""

    area_code: str = Field(description="Código del área: LC, MAT, SC, CN, ING")
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
    count: int = Field(ge=1, le=20, description="Cantidad de preguntas a generar")
    include_visual: bool = False
    visual_type: MediaType | None = None
    competency_code: str | None = None
    cognitive_level: int | None = Field(None, ge=1, le=3)


class GeneratedMedia(BaseModel):
    """Media programática generada por IA."""

    media_type: str
    render_engine: str
    visual_data: str  # JSON serializado
    alt_text: str
    alt_text_detailed: str | None = None
    display_mode: str = "ABOVE_STEM"


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
    errors: list[str] = []


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
    by_area: dict[str, int] = {}
    by_model: dict[str, int] = {}
