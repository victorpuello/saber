"""Configuración del AI Generator Service."""

from saber11_shared.config import BaseServiceSettings


class Settings(BaseServiceSettings):
    service_name: str = "ai-generator"
    question_bank_url: str = "http://question-bank:3001"

    # Clave maestra para cifrado de API keys en BD (Fernet)
    encryption_key: str = ""

    # API keys desde variables de entorno (fallback si no están en BD)
    anthropic_api_key: str = ""
    gemini_api_key: str = ""

    # Defaults para generación (se sobreescriben con config de BD)
    default_provider: str = "anthropic"
    max_tokens: int = 4096
    generation_temperature: float = 0.7


settings = Settings()
