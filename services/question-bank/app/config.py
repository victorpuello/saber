"""Configuración del Question Bank Service."""

from saber11_shared.config import BaseServiceSettings


class Settings(BaseServiceSettings):
    service_name: str = "question-bank"
    database_url: str = "postgresql+asyncpg://saber11:saber11_dev_password@db-questions:5432/saber11_questions"


settings = Settings()
