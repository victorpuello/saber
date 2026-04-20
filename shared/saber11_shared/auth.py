"""Dependencia de autenticación interna para microservicios.

Los microservicios NO validan JWT directamente; confían en los headers
que el API Gateway inyecta tras autenticar. Esto evita duplicar la
verificación de firma en cada servicio.
"""

from dataclasses import dataclass
from typing import Annotated

from fastapi import Depends, Header, HTTPException


@dataclass(frozen=True, slots=True)
class CurrentUser:
    """Identidad del usuario extraída de headers internos del gateway."""

    user_id: int
    role: str
    name: str
    grade: str | None
    institution_id: str


async def get_current_user(
    x_user_id: str = Header(..., alias="X-User-Id"),
    x_user_role: str = Header(..., alias="X-User-Role"),
    x_user_name: str = Header("", alias="X-User-Name"),
    x_user_grade: str | None = Header(None, alias="X-User-Grade"),
    x_institution_id: str = Header("", alias="X-Institution-Id"),
) -> CurrentUser:
    """FastAPI dependency que extrae el usuario de headers internos."""
    try:
        user_id = int(x_user_id)
    except (ValueError, TypeError) as exc:
        raise HTTPException(status_code=401, detail="X-User-Id inválido") from exc

    if x_user_role not in {"STUDENT", "TEACHER", "ADMIN"}:
        raise HTTPException(status_code=401, detail="Rol inválido")

    return CurrentUser(
        user_id=user_id,
        role=x_user_role,
        name=x_user_name,
        grade=x_user_grade,
        institution_id=x_institution_id,
    )


def require_role(*allowed_roles: str):
    """Devuelve una dependencia que verifica que el usuario tenga un rol permitido."""
    async def _check(user: Annotated[CurrentUser, Depends(get_current_user)]):
        if user.role not in allowed_roles:
            raise HTTPException(
                status_code=403,
                detail=f"Se requiere rol {' o '.join(allowed_roles)}",
            )
        return user

    return _check
