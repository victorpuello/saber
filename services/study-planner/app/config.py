"""Configuración del Study Planner Service."""

from saber11_shared.config import BaseServiceSettings


class Settings(BaseServiceSettings):
    service_name: str = "study-planner"
    database_url: str = "postgresql+asyncpg://saber11:saber11_dev_password@db-profiles:5432/saber11_profiles"
    question_bank_url: str = "http://question-bank:3001"
    diagnostic_url: str = "http://diagnostic:3004"
    redis_url: str = "redis://redis-saber11:6379/0"


settings = Settings()
