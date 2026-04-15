"""Configuración del AI Generator Service."""

from saber11_shared.config import BaseServiceSettings


class Settings(BaseServiceSettings):
    service_name: str = "ai-generator"
    question_bank_url: str = "http://question-bank:3001"
    anthropic_api_key: str = ""


settings = Settings()
