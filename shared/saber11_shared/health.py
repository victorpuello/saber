"""Endpoint de health check reutilizable."""

from fastapi import APIRouter

router = APIRouter(tags=["health"])


def create_health_router(service_name: str) -> APIRouter:
    """Crea un router con un health check parametrizado por servicio."""
    health_router = APIRouter(tags=["health"])

    @health_router.get("/health")
    async def health_check():
        return {
            "status": "ok",
            "service": service_name,
        }

    return health_router
