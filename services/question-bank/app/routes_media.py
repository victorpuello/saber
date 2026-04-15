"""Rutas API para media de preguntas: upload, CRUD, thumbnails."""

import os
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, UploadFile
from pydantic import BaseModel
from saber11_shared.auth import CurrentUser, get_current_user, require_role
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from .models import Question, QuestionMedia, VisualAsset
from .schemas import (
    DisplayMode,
    MediaSource,
    MediaType,
    QuestionMediaOut,
)

router = APIRouter(prefix="/api/questions", tags=["media"])

# ── Configuración de upload ──────────────────────────────────────────
UPLOAD_DIR = Path(os.getenv("UPLOAD_DIR", "/data/uploads/media"))
THUMBNAIL_DIR = Path(os.getenv("THUMBNAIL_DIR", "/data/uploads/thumbnails"))
ALLOWED_CONTENT_TYPES = {
    "image/png",
    "image/jpeg",
    "image/webp",
    "image/svg+xml",
}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5 MB


async def _get_db():
    """Inyectada en main.py al registrar el router."""
    raise NotImplementedError


def _generate_thumbnail(source_path: Path, thumb_path: Path, size: int = 200):
    """Genera thumbnail con Pillow (síncrono, archivos pequeños)."""
    try:
        from PIL import Image

        with Image.open(source_path) as img:
            img.thumbnail((size, size))
            img.save(thumb_path, format="PNG")
    except Exception:  # noqa: S110
        pass


# ── Upload de archivo a una pregunta ──────────────────────────────────


@router.post(
    "/{question_id}/media/upload",
    response_model=QuestionMediaOut,
    status_code=201,
)
async def upload_media(
    question_id: uuid.UUID,
    file: UploadFile,
    media_type: MediaType,
    alt_text: str,
    is_essential: bool = True,
    position: int = 0,
    display_mode: DisplayMode = DisplayMode.INLINE,
    caption: str | None = None,
    db: AsyncSession = Depends(_get_db),
    user: CurrentUser = Depends(require_role("TEACHER", "ADMIN")),
):
    """Sube un archivo multimedia y lo asocia a una pregunta."""
    # Validar que la pregunta existe y pertenece al usuario
    question = await db.get(Question, question_id)
    if not question:
        raise HTTPException(404, "Pregunta no encontrada")
    if question.status != "DRAFT":
        raise HTTPException(400, "Solo se puede añadir media a preguntas en DRAFT")
    if user.role == "TEACHER" and question.created_by_user_id != user.id:
        raise HTTPException(403, "No puedes modificar esta pregunta")

    # Validar alt_text
    if len(alt_text.strip()) < 5:
        raise HTTPException(
            422, "alt_text obligatorio (mínimo 5 caracteres para accesibilidad)"
        )

    # Validar tipo MIME
    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            415,
            f"Tipo no soportado: {file.content_type}. "
            f"Permitidos: {', '.join(sorted(ALLOWED_CONTENT_TYPES))}",
        )

    # Leer y validar tamaño
    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(413, f"Archivo excede el máximo de {MAX_FILE_SIZE} bytes")

    # Guardar archivo
    file_id = uuid.uuid4()
    ext = Path(file.filename or "file").suffix.lower() or ".png"
    filename = f"{file_id}{ext}"

    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    file_path = UPLOAD_DIR / filename
    file_path.write_bytes(content)

    # Dimensiones y thumbnail
    width, height, thumb_url = None, None, None
    if file.content_type != "image/svg+xml":
        try:
            from PIL import Image

            with Image.open(file_path) as img:
                width, height = img.size
        except Exception:  # noqa: S110
            pass
        # Thumbnail
        THUMBNAIL_DIR.mkdir(parents=True, exist_ok=True)
        thumb_filename = f"thumb_{filename.rsplit('.', 1)[0]}.png"
        thumb_path = THUMBNAIL_DIR / thumb_filename
        _generate_thumbnail(file_path, thumb_path)
        if thumb_path.exists():
            thumb_url = f"/uploads/thumbnails/{thumb_filename}"

    storage_url = f"/uploads/media/{filename}"

    media = QuestionMedia(
        id=file_id,
        question_id=question_id,
        media_type=media_type.value,
        source=MediaSource.UPLOAD.value,
        storage_url=storage_url,
        thumbnail_url=thumb_url,
        original_filename=file.filename,
        content_type=file.content_type,
        file_size_bytes=len(content),
        width_px=width,
        height_px=height,
        alt_text=alt_text.strip(),
        is_essential=is_essential,
        position=position,
        display_mode=display_mode.value,
        caption=caption,
    )
    db.add(media)
    await db.flush()
    await db.refresh(media)
    return media


# ── Asociar un asset existente (del banco) a una pregunta ─────────────


@router.post(
    "/{question_id}/media/from-asset/{asset_id}",
    response_model=QuestionMediaOut,
    status_code=201,
)
async def link_asset_to_question(
    question_id: uuid.UUID,
    asset_id: uuid.UUID,
    alt_text: str,
    is_essential: bool = True,
    position: int = 0,
    display_mode: DisplayMode = DisplayMode.INLINE,
    caption: str | None = None,
    db: AsyncSession = Depends(_get_db),
    user: CurrentUser = Depends(require_role("TEACHER", "ADMIN")),
):
    """Asocia un visual asset del banco a una pregunta."""
    question = await db.get(Question, question_id)
    if not question:
        raise HTTPException(404, "Pregunta no encontrada")
    if question.status != "DRAFT":
        raise HTTPException(400, "Solo se puede añadir media a preguntas en DRAFT")

    asset = await db.get(VisualAsset, asset_id)
    if not asset or not asset.is_active:
        raise HTTPException(404, "Asset no encontrado o inactivo")

    if len(alt_text.strip()) < 5:
        raise HTTPException(
            422, "alt_text obligatorio (mínimo 5 caracteres para accesibilidad)"
        )

    media = QuestionMedia(
        question_id=question_id,
        media_type=asset.media_type,
        source=MediaSource.ASSET_LIBRARY.value,
        storage_url=asset.storage_url,
        thumbnail_url=asset.thumbnail_url,
        original_filename=asset.original_filename,
        content_type=asset.content_type,
        file_size_bytes=asset.file_size_bytes,
        width_px=asset.width_px,
        height_px=asset.height_px,
        alt_text=alt_text.strip(),
        is_essential=is_essential,
        position=position,
        display_mode=display_mode.value,
        caption=caption,
    )
    db.add(media)

    # Incrementar contador de uso del asset
    asset.times_used = (asset.times_used or 0) + 1
    await db.flush()
    await db.refresh(media)
    return media


# ── Crear media programática (desde AI Generator) ────────────────────


class ProgrammaticMediaRequest(BaseModel):
    """Request body para media programática generada por IA."""

    media_type: str
    source: str = "PROGRAMMATIC"
    visual_data: str
    render_engine: str
    alt_text: str
    alt_text_detailed: str | None = None
    display_mode: str = "ABOVE_STEM"
    is_essential: bool = True
    position: int = 0
    caption: str | None = None


@router.post(
    "/{question_id}/media/programmatic",
    response_model=QuestionMediaOut,
    status_code=201,
)
async def create_programmatic_media(
    question_id: uuid.UUID,
    body: ProgrammaticMediaRequest,
    db: AsyncSession = Depends(_get_db),
    user: CurrentUser = Depends(require_role("ADMIN")),
):
    """Crea media programática (visual_data + render_engine) para una pregunta."""
    question = await db.get(Question, question_id)
    if not question:
        raise HTTPException(404, "Pregunta no encontrada")

    if len(body.alt_text.strip()) < 5:
        raise HTTPException(
            422, "alt_text obligatorio (mínimo 5 caracteres para accesibilidad)"
        )

    media = QuestionMedia(
        question_id=question_id,
        media_type=body.media_type,
        source="PROGRAMMATIC",
        visual_data=body.visual_data,
        render_engine=body.render_engine,
        alt_text=body.alt_text.strip(),
        alt_text_detailed=body.alt_text_detailed,
        is_essential=body.is_essential,
        position=body.position,
        display_mode=body.display_mode,
        caption=body.caption,
    )
    db.add(media)
    await db.flush()
    await db.refresh(media)
    return media


# ── Listar media de una pregunta ──────────────────────────────────────


@router.get(
    "/{question_id}/media",
    response_model=list[QuestionMediaOut],
)
async def list_question_media(
    question_id: uuid.UUID,
    db: AsyncSession = Depends(_get_db),
    _user: CurrentUser = Depends(get_current_user),
):
    """Lista los archivos multimedia asociados a una pregunta."""
    question = await db.get(Question, question_id)
    if not question:
        raise HTTPException(404, "Pregunta no encontrada")

    result = await db.execute(
        select(QuestionMedia)
        .where(QuestionMedia.question_id == question_id)
        .order_by(QuestionMedia.position)
    )
    return result.scalars().all()


# ── Obtener una media individual ──────────────────────────────────────


@router.get(
    "/{question_id}/media/{media_id}",
    response_model=QuestionMediaOut,
)
async def get_media(
    question_id: uuid.UUID,
    media_id: uuid.UUID,
    db: AsyncSession = Depends(_get_db),
    _user: CurrentUser = Depends(get_current_user),
):
    """Obtiene un archivo multimedia específico de una pregunta."""
    media = await db.get(QuestionMedia, media_id)
    if not media or media.question_id != question_id:
        raise HTTPException(404, "Media no encontrada")
    return media


# ── Eliminar media ────────────────────────────────────────────────────


@router.delete(
    "/{question_id}/media/{media_id}",
    status_code=204,
)
async def delete_media(
    question_id: uuid.UUID,
    media_id: uuid.UUID,
    db: AsyncSession = Depends(_get_db),
    user: CurrentUser = Depends(require_role("TEACHER", "ADMIN")),
):
    """Elimina un archivo multimedia de una pregunta."""
    question = await db.get(Question, question_id)
    if not question:
        raise HTTPException(404, "Pregunta no encontrada")
    if question.status != "DRAFT":
        raise HTTPException(400, "Solo se puede modificar media en preguntas DRAFT")
    if user.role == "TEACHER" and question.created_by_user_id != user.id:
        raise HTTPException(403, "No puedes modificar esta pregunta")

    media = await db.get(QuestionMedia, media_id)
    if not media or media.question_id != question_id:
        raise HTTPException(404, "Media no encontrada")

    # Eliminar archivo físico si es upload
    if media.source == MediaSource.UPLOAD.value and media.storage_url:
        file_path = Path("/data") / media.storage_url.lstrip("/")
        if file_path.exists():
            file_path.unlink()
        # Thumbnail
        if media.thumbnail_url:
            thumb_path = Path("/data") / media.thumbnail_url.lstrip("/")
            if thumb_path.exists():
                thumb_path.unlink()

    await db.delete(media)
