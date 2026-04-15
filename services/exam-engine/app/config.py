"""Configuración del Exam Engine Service."""

from saber11_shared.config import BaseServiceSettings


class Settings(BaseServiceSettings):
    service_name: str = "exam-engine"
    database_url: str = "postgresql+asyncpg://saber11:saber11_dev_password@db-exams:5432/saber11_exams"
    question_bank_url: str = "http://question-bank:3001"


settings = Settings()
