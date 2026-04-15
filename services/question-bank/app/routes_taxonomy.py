"""Rutas API de taxonomía DCE."""

import uuid

from fastapi import APIRouter, Depends, HTTPException
from saber11_shared.auth import CurrentUser, get_current_user
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from .models import Area, Competency
from .schemas import AreaOut, AreaSummary, CompetencyOut

router = APIRouter(prefix="/api/taxonomy", tags=["taxonomy"])


async def _get_db():
    """Inyectada en main.py al registrar el router."""
    raise NotImplementedError


@router.get("/areas", response_model=list[AreaSummary])
async def list_areas(
    db: AsyncSession = Depends(_get_db),
    _user: CurrentUser = Depends(get_current_user),
):
    """Lista todas las áreas (resumen)."""
    result = await db.execute(select(Area).order_by(Area.code))
    return result.scalars().all()


@router.get("/areas/{area_id}", response_model=AreaOut)
async def get_area(
    area_id: uuid.UUID,
    db: AsyncSession = Depends(_get_db),
    _user: CurrentUser = Depends(get_current_user),
):
    """Obtiene un área con toda su jerarquía DCE."""
    result = await db.execute(
        select(Area)
        .where(Area.id == area_id)
        .options(
            selectinload(Area.competencies)
            .selectinload(Competency.assertions),
            selectinload(Area.content_components),
        )
    )
    area = result.scalar_one_or_none()
    if not area:
        raise HTTPException(status_code=404, detail="Área no encontrada")
    return area


@router.get("/areas/by-code/{code}", response_model=AreaOut)
async def get_area_by_code(
    code: str,
    db: AsyncSession = Depends(_get_db),
    _user: CurrentUser = Depends(get_current_user),
):
    """Obtiene un área por código (LC, MAT, SC, CN, ING)."""
    result = await db.execute(
        select(Area)
        .where(Area.code == code.upper())
        .options(
            selectinload(Area.competencies)
            .selectinload(Competency.assertions),
            selectinload(Area.content_components),
        )
    )
    area = result.scalar_one_or_none()
    if not area:
        raise HTTPException(status_code=404, detail=f"Área '{code}' no encontrada")
    return area


@router.get(
    "/areas/{area_id}/competencies",
    response_model=list[CompetencyOut],
)
async def list_competencies(
    area_id: uuid.UUID,
    db: AsyncSession = Depends(_get_db),
    _user: CurrentUser = Depends(get_current_user),
):
    """Lista competencias de un área con afirmaciones y evidencias."""
    result = await db.execute(
        select(Competency)
        .where(Competency.area_id == area_id)
        .options(selectinload(Competency.assertions))
        .order_by(Competency.code)
    )
    return result.scalars().all()
