"""Configuración del Diagnostic Engine."""

from saber11_shared.config import BaseServiceSettings


class Settings(BaseServiceSettings):
    service_name: str = "diagnostic"
    database_url: str = "postgresql+asyncpg://saber11:saber11_dev_password@db-profiles:5432/saber11_profiles"
    question_bank_url: str = "http://question-bank:3001"


settings = Settings()
