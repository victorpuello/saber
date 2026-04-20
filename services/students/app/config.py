"""Configuración del Students Service."""

from saber11_shared.config import BaseServiceSettings


class Settings(BaseServiceSettings):
    service_name: str = "students"
    database_url: str = "postgresql+asyncpg://saber11:saber11_dev_password@db-students:5432/saber11_students"
    redis_url: str = "redis://redis-saber11:6379/0"
    kampus_api_url: str = "http://kampus-backend:8000"
    kampus_api_token: str = ""
    kampus_api_username: str = ""
    kampus_api_password: str = ""
    kampus_auth_endpoint: str = "/api/token/"
    sync_interval_minutes: int = 60


settings = Settings()
