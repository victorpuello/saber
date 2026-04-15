"""Configuración del AI Generator Service."""

from saber11_shared.config import BaseServiceSettings


class Settings(BaseServiceSettings):
    service_name: str = "ai-generator"
    question_bank_url: str = "http://question-bank:3001"
    anthropic_api_key: str = ""
    anthropic_model: str = "claude-sonnet-4-20250514"
    max_tokens: int = 4096
    generation_temperature: float = 0.7


settings = Settings()
