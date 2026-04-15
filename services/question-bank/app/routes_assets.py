"""Rutas API para el banco de visual assets reutilizables."""

import os
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile
from saber11_shared.auth import CurrentUser, get_current_user, require_role
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from .models import Area, VisualAsset
from .routes_media import (
    ALLOWED_CONTENT_TYPES,
    MAX_FILE_SIZE,
    _generate_thumbnail,
)
from .schemas import (
    LicenseType,
    MediaType,
    PaginatedResponse,
    VisualAssetOut,
    VisualAssetSummary,
)

router = APIRouter(prefix="/api/assets", tags=["assets"])

ASSET_UPLOAD_DIR = Path(os.getenv("ASSET_UPLOAD_DIR", "/data/uploads/assets"))
ASSET_THUMB_DIR = Path(os.getenv("ASSET_THUMB_DIR", "/data/uploads/assets/thumbs"))


async def _get_db():
    """Inyectada en main.py al registrar el router."""
    raise NotImplementedError


# ── Subir un nuevo asset al banco ─────────────────────────────────────


@router.post("/", response_model=VisualAssetOut, status_code=201)
async def create_asset(
    file: UploadFile,
    title: str,
    alt_text: str,
    media_type: MediaType,
    area_id: uuid.UUID | None = None,
    description: str | None = None,
    tags: str | None = None,
    license_type: LicenseType = LicenseType.OWN,
    attribution: str | None = None,
    db: AsyncSession = Depends(_get_db),
    user: CurrentUser = Depends(require_role("TEACHER", "ADMIN")),
):
    """Sube un archivo al banco de assets visuales reutilizables."""
    # Validaciones
    if len(title.strip()) < 3:
        raise HTTPException(422, "title debe tener al menos 3 caracteres")
    if len(alt_text.strip()) < 5:
        raise HTTPException(
            422, "alt_text obligatorio (mínimo 5 caracteres para accesibilidad)"
        )
    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            415,
            f"Tipo no soportado: {file.content_type}. "
            f"Permitidos: {', '.join(sorted(ALLOWED_CONTENT_TYPES))}",
        )

    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(413, f"Archivo excede el máximo de {MAX_FILE_SIZE} bytes")

    # Validar area_id si se proporciona
    if area_id:
        area = await db.get(Area, area_id)
        if not area:
            raise HTTPException(404, "Área no encontrada")

    # Guardar archivo
    asset_id = uuid.uuid4()
    ext = Path(file.filename or "file").suffix.lower() or ".png"
    filename = f"{asset_id}{ext}"

    ASSET_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    file_path = ASSET_UPLOAD_DIR / filename
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
        ASSET_THUMB_DIR.mkdir(parents=True, exist_ok=True)
        thumb_filename = f"thumb_{asset_id}.png"
        thumb_path = ASSET_THUMB_DIR / thumb_filename
        _generate_thumbnail(file_path, thumb_path)
        if thumb_path.exists():
            thumb_url = f"/uploads/assets/thumbs/{thumb_filename}"

    storage_url = f"/uploads/assets/{filename}"

    asset = VisualAsset(
        id=asset_id,
        area_id=area_id,
        media_type=media_type.value,
        storage_url=storage_url,
        thumbnail_url=thumb_url,
        original_filename=file.filename or "unknown",
        content_type=file.content_type or "application/octet-stream",
        file_size_bytes=len(content),
        width_px=width,
        height_px=height,
        title=title.strip(),
        alt_text=alt_text.strip(),
        description=description,
        tags=tags,
        license_type=license_type.value,
        attribution=attribution,
        uploaded_by_user_id=user.id,
    )
    db.add(asset)
    await db.flush()
    await db.refresh(asset)
    return asset


# ── Buscar y listar assets ────────────────────────────────────────────


@router.get("/", response_model=PaginatedResponse)
async def search_assets(
    area_id: uuid.UUID | None = None,
    media_type: MediaType | None = None,
    tag: str | None = Query(None, description="Buscar por tag (parcial)"),
    q: str | None = Query(None, description="Texto libre en título/descripción"),
    is_active: bool = True,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(_get_db),
    _user: CurrentUser = Depends(get_current_user),
):
    """Busca assets en el banco con filtros por área, tipo, tag, texto."""
    query = select(VisualAsset).where(VisualAsset.is_active == is_active)

    if area_id:
        query = query.where(VisualAsset.area_id == area_id)
    if media_type:
        query = query.where(VisualAsset.media_type == media_type.value)
    if tag:
        query = query.where(VisualAsset.tags.ilike(f"%{tag}%"))
    if q:
        pattern = f"%{q}%"
        query = query.where(
            VisualAsset.title.ilike(pattern) | VisualAsset.description.ilike(pattern)
        )

    count_q = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_q)).scalar_one()

    offset = (page - 1) * page_size
    items_q = query.order_by(VisualAsset.created_at.desc()).offset(offset).limit(page_size)
    result = await db.execute(items_q)
    items = [VisualAssetSummary.model_validate(r) for r in result.scalars().all()]

    pages = (total + page_size - 1) // page_size
    return PaginatedResponse(
        items=items, total=total, page=page, page_size=page_size, pages=pages
    )


# ── Obtener un asset por ID ──────────────────────────────────────────


@router.get("/{asset_id}", response_model=VisualAssetOut)
async def get_asset(
    asset_id: uuid.UUID,
    db: AsyncSession = Depends(_get_db),
    _user: CurrentUser = Depends(get_current_user),
):
    """Obtiene un asset visual por ID."""
    asset = await db.get(VisualAsset, asset_id)
    if not asset:
        raise HTTPException(404, "Asset no encontrado")
    return asset


# ── Actualizar metadata de un asset ───────────────────────────────────


@router.patch("/{asset_id}", response_model=VisualAssetOut)
async def update_asset(
    asset_id: uuid.UUID,
    title: str | None = None,
    alt_text: str | None = None,
    description: str | None = None,
    tags: str | None = None,
    license_type: LicenseType | None = None,
    attribution: str | None = None,
    is_active: bool | None = None,
    db: AsyncSession = Depends(_get_db),
    _user: CurrentUser = Depends(require_role("ADMIN")),
):
    """Actualiza la metadata de un asset (solo ADMIN)."""
    asset = await db.get(VisualAsset, asset_id)
    if not asset:
        raise HTTPException(404, "Asset no encontrado")

    if title is not None:
        if len(title.strip()) < 3:
            raise HTTPException(422, "title debe tener al menos 3 caracteres")
        asset.title = title.strip()
    if alt_text is not None:
        if len(alt_text.strip()) < 5:
            raise HTTPException(422, "alt_text mínimo 5 caracteres")
        asset.alt_text = alt_text.strip()
    if description is not None:
        asset.description = description
    if tags is not None:
        asset.tags = tags
    if license_type is not None:
        asset.license_type = license_type.value
    if attribution is not None:
        asset.attribution = attribution
    if is_active is not None:
        asset.is_active = is_active

    await db.flush()
    await db.refresh(asset)
    return asset


# ── Estadísticas de assets ────────────────────────────────────────────


@router.get("/stats/summary")
async def asset_stats(
    db: AsyncSession = Depends(_get_db),
    _user: CurrentUser = Depends(get_current_user),
):
    """Estadísticas del banco de assets visuales."""
    total = (
        await db.execute(
            select(func.count()).where(VisualAsset.is_active.is_(True))
        )
    ).scalar_one()

    by_type = (
        await db.execute(
            select(VisualAsset.media_type, func.count())
            .where(VisualAsset.is_active.is_(True))
            .group_by(VisualAsset.media_type)
        )
    ).all()

    by_area = (
        await db.execute(
            select(Area.name, func.count())
            .join(VisualAsset, VisualAsset.area_id == Area.id)
            .where(VisualAsset.is_active.is_(True))
            .group_by(Area.name)
        )
    ).all()

    return {
        "total_active": total,
        "by_type": {row[0]: row[1] for row in by_type},
        "by_area": {row[0]: row[1] for row in by_area},
    }
