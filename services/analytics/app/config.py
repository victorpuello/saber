"""Configuración del Analytics Service."""

from saber11_shared.config import BaseServiceSettings


class Settings(BaseServiceSettings):
    service_name: str = "analytics"
    database_url: str = "postgresql+asyncpg://saber11:saber11_dev_password@db-analytics:5432/saber11_analytics"
    redis_url: str = "redis://redis-saber11:6379/0"


settings = Settings()
