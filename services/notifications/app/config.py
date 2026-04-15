"""Configuración del Notification Service."""

from saber11_shared.config import BaseServiceSettings


class Settings(BaseServiceSettings):
    service_name: str = "notifications"
    kampus_api_url: str = "http://kampus-backend:8000"


settings = Settings()
