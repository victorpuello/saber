"""Configuración base que cada microservicio extiende."""

from pydantic_settings import BaseSettings


class BaseServiceSettings(BaseSettings):
    """Campos comunes a todos los microservicios."""

    service_name: str = "unknown"
    debug: bool = False
    log_level: str = "INFO"

    # Base de datos (los que la usen)
    database_url: str = ""

    # Redis event bus
    redis_url: str = "redis://redis-saber11:6379/0"

    # JWT del simulador (para validar tokens que llegan vía gateway)
    jwt_secret: str = "dev-secret-change-in-production"  # noqa: S105

    model_config = {"env_file": ".env", "extra": "ignore"}
