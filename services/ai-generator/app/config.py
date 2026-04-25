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

    # Modelos Gemini por tipo de contenido
    gemini_text_model: str = "gemini-3.1-flash-lite-preview"
    gemini_image_model: str = "gemini-3.1-flash-image-preview"

    # Defaults para generación (se sobreescriben con config de BD)
    default_provider: str = "anthropic"
    max_tokens: int = 4096
    generation_temperature: float = 0.7

    # Jobs asíncronos
    ai_jobs_max_active_per_user: int = 3
    ai_jobs_consumer_group: str = "ai-generator-jobs"
    ai_jobs_consumer_name: str = "ai-generator-worker-1"
    ai_jobs_item_timeout_seconds: int = 45


settings = Settings()
