"""Modelos SQLAlchemy — Taxonomía DCE del Saber 11."""

import uuid
from datetime import UTC, datetime

from saber11_shared.database import Base
from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship


def _utcnow() -> datetime:
    return datetime.now(UTC)


class Area(Base):
    """Áreas de evaluación del Saber 11 (LC, MAT, SC, CN, ING)."""

    __tablename__ = "areas"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(50), nullable=False)
    code: Mapped[str] = mapped_column(String(10), unique=True, nullable=False)
    total_questions: Mapped[int] = mapped_column(Integer, nullable=False)
    description: Mapped[str | None] = mapped_column(Text)

    competencies: Mapped[list["Competency"]] = relationship(back_populates="area", lazy="selectin")
    content_components: Mapped[list["ContentComponent"]] = relationship(back_populates="area")


class Competency(Base):
    """Competencias por área — nivel 1 del DCE."""

    __tablename__ = "competencies"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    area_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("areas.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    code: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    weight_percentage: Mapped[float | None] = mapped_column(Numeric(5, 2))
    cognitive_level: Mapped[int | None] = mapped_column(
        Integer, CheckConstraint("cognitive_level BETWEEN 1 AND 3")
    )

    area: Mapped[Area] = relationship(back_populates="competencies")
    assertions: Mapped[list["Assertion"]] = relationship(
        back_populates="competency", lazy="selectin"
    )


class Assertion(Base):
    """Afirmaciones por competencia — nivel 2 del DCE."""

    __tablename__ = "assertions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    competency_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("competencies.id"), nullable=False)
    code: Mapped[str] = mapped_column(String(30), unique=True, nullable=False)
    statement: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[str | None] = mapped_column(Text)

    competency: Mapped[Competency] = relationship(back_populates="assertions")
    evidences: Mapped[list["Evidence"]] = relationship(back_populates="assertion", lazy="selectin")


class Evidence(Base):
    """Evidencias por afirmación — nivel 3 del DCE."""

    __tablename__ = "evidences"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    assertion_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("assertions.id"), nullable=False)
    code: Mapped[str] = mapped_column(String(40), unique=True, nullable=False)
    observable_behavior: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[str | None] = mapped_column(Text)

    assertion: Mapped[Assertion] = relationship(back_populates="evidences")


class ContentComponent(Base):
    """Contenidos temáticos transversales por área."""

    __tablename__ = "content_components"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    area_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("areas.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    code: Mapped[str] = mapped_column(String(20), nullable=False)

    area: Mapped[Area] = relationship(back_populates="content_components")


class Question(Base):
    """Pregunta del banco — manual o generada por IA."""

    __tablename__ = "questions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Taxonomía DCE
    area_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("areas.id"), nullable=False)
    competency_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("competencies.id"), nullable=False)
    assertion_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("assertions.id"), nullable=False)
    evidence_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("evidences.id"))
    content_component_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("content_components.id")
    )

    # Estructura tripartita ICFES
    context: Mapped[str] = mapped_column(Text, nullable=False)
    context_type: Mapped[str] = mapped_column(
        String(25),
        CheckConstraint(
            "context_type IN ('continuous_text','discontinuous_text','scientific_scenario',"
            "'math_problem','social_dilemma','philosophical_text','graphic_notice',"
            "'dialogue','cloze_text')"
        ),
        nullable=False,
    )
    stem: Mapped[str] = mapped_column(Text, nullable=False)

    # Opciones
    option_a: Mapped[str] = mapped_column(Text, nullable=False)
    option_b: Mapped[str] = mapped_column(Text, nullable=False)
    option_c: Mapped[str] = mapped_column(Text, nullable=False)
    option_d: Mapped[str | None] = mapped_column(Text)
    correct_answer: Mapped[str] = mapped_column(
        String(1), CheckConstraint("correct_answer IN ('A','B','C','D')"), nullable=False
    )

    # Explicaciones pedagógicas
    explanation_correct: Mapped[str] = mapped_column(Text, nullable=False)
    explanation_a: Mapped[str | None] = mapped_column(Text)
    explanation_b: Mapped[str | None] = mapped_column(Text)
    explanation_c: Mapped[str | None] = mapped_column(Text)
    explanation_d: Mapped[str | None] = mapped_column(Text)

    # Metadatos
    cognitive_process: Mapped[str | None] = mapped_column(Text)
    difficulty_estimated: Mapped[float | None] = mapped_column(
        Numeric(3, 2), CheckConstraint("difficulty_estimated BETWEEN 0 AND 1")
    )
    discrimination_index: Mapped[float | None] = mapped_column(Numeric(3, 2))

    # Origen
    source: Mapped[str] = mapped_column(
        String(10), CheckConstraint("source IN ('AI','MANUAL')"), nullable=False
    )
    created_by_user_id: Mapped[int | None] = mapped_column(Integer)
    created_by_ai_model: Mapped[str | None] = mapped_column(String(50))

    # Flujo de aprobación
    status: Mapped[str] = mapped_column(
        String(20),
        CheckConstraint(
            "status IN ('DRAFT','PENDING_REVIEW','APPROVED','REJECTED','ARCHIVED')"
        ),
        nullable=False,
        default="DRAFT",
    )
    reviewed_by_user_id: Mapped[int | None] = mapped_column(Integer)
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    review_notes: Mapped[str | None] = mapped_column(Text)

    # Inglés
    english_section: Mapped[int | None] = mapped_column(
        Integer, CheckConstraint("english_section BETWEEN 1 AND 7")
    )
    mcer_level: Mapped[str | None] = mapped_column(
        String(5), CheckConstraint("mcer_level IN ('A-','A1','A2','B1','B+')")
    )

    # TRI
    irt_difficulty: Mapped[float | None] = mapped_column(Numeric(5, 3))
    irt_discrimination: Mapped[float | None] = mapped_column(Numeric(5, 3))
    irt_guessing: Mapped[float | None] = mapped_column(Numeric(5, 3))
    times_used: Mapped[int] = mapped_column(Integer, default=0)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow, onupdate=_utcnow
    )

    # Relaciones
    media: Mapped[list["QuestionMedia"]] = relationship(
        back_populates="question", cascade="all, delete-orphan"
    )


class QuestionMedia(Base):
    """Recurso multimedia asociado a una pregunta."""

    __tablename__ = "question_media"
    __table_args__ = (
        UniqueConstraint("question_id", "position"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    question_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("questions.id", ondelete="CASCADE"), nullable=False
    )

    media_type: Mapped[str] = mapped_column(
        String(25),
        CheckConstraint(
            "media_type IN ('chart','table','diagram','map','infographic','comic',"
            "'public_sign','photograph','timeline','state_structure','geometric_figure',"
            "'probability_diagram')"
        ),
        nullable=False,
    )
    source: Mapped[str] = mapped_column(
        String(20),
        CheckConstraint("source IN ('UPLOAD','PROGRAMMATIC','ASSET_LIBRARY')"),
        nullable=False,
    )

    storage_url: Mapped[str | None] = mapped_column(Text)
    thumbnail_url: Mapped[str | None] = mapped_column(Text)
    visual_data: Mapped[dict | None] = mapped_column(Text)  # JSON serializado
    render_engine: Mapped[str | None] = mapped_column(
        String(20),
        CheckConstraint(
            "render_engine IN ('chart_js','svg_template','html_template',"
            "'map_renderer','timeline_renderer')"
        ),
    )

    alt_text: Mapped[str] = mapped_column(Text, nullable=False)
    alt_text_detailed: Mapped[str | None] = mapped_column(Text)
    is_essential: Mapped[bool] = mapped_column(Boolean, default=True)

    position: Mapped[int] = mapped_column(Integer, default=0)
    display_mode: Mapped[str] = mapped_column(
        String(20),
        CheckConstraint("display_mode IN ('INLINE','ABOVE_STEM','FULL_WIDTH','SIDE_BY_SIDE')"),
        default="INLINE",
    )
    caption: Mapped[str | None] = mapped_column(Text)
    width_px: Mapped[int | None] = mapped_column(Integer)
    height_px: Mapped[int | None] = mapped_column(Integer)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)

    question: Mapped[Question] = relationship(back_populates="media")


class VisualAsset(Base):
    """Banco curado de recursos visuales reutilizables."""

    __tablename__ = "visual_assets"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )

    # Clasificación
    area_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("areas.id"))
    media_type: Mapped[str] = mapped_column(
        String(25),
        CheckConstraint(
            "media_type IN ('chart','table','diagram','map','infographic','comic',"
            "'public_sign','photograph','timeline','state_structure','geometric_figure',"
            "'probability_diagram')"
        ),
        nullable=False,
    )

    # Almacenamiento
    storage_url: Mapped[str] = mapped_column(Text, nullable=False)
    thumbnail_url: Mapped[str | None] = mapped_column(Text)
    original_filename: Mapped[str] = mapped_column(String(255), nullable=False)
    content_type: Mapped[str] = mapped_column(String(100), nullable=False)
    file_size_bytes: Mapped[int] = mapped_column(Integer, nullable=False)
    width_px: Mapped[int | None] = mapped_column(Integer)
    height_px: Mapped[int | None] = mapped_column(Integer)

    # Metadata y accesibilidad
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    alt_text: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    tags: Mapped[str | None] = mapped_column(Text)  # Comma-separated
    license_type: Mapped[str] = mapped_column(
        String(30),
        CheckConstraint(
            "license_type IN ('OWN','CC0','CC_BY','CC_BY_SA','CC_BY_NC','PUBLIC_DOMAIN',"
            "'EDUCATIONAL_USE')"
        ),
        default="OWN",
    )
    attribution: Mapped[str | None] = mapped_column(Text)

    # Uso
    times_used: Mapped[int] = mapped_column(Integer, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    uploaded_by_user_id: Mapped[int | None] = mapped_column(Integer)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow, onupdate=_utcnow
    )
