"""Gestión segura de API keys con cifrado Fernet (AES-128-CBC + HMAC)."""

import logging

from cryptography.fernet import Fernet
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from .config import settings
from .models import AIProviderConfig

logger = logging.getLogger(__name__)

_fernet: Fernet | None = None


def _is_placeholder_api_key(key: str) -> bool:
    """Detecta valores de ejemplo que no son API keys reales."""
    normalized = key.strip()
    if not normalized:
        return True

    markers = [
        "XXXX",
        "YOUR_",
        "TU_",
        "CHANGE_ME",
        "REPLACE_ME",
        "PLACEHOLDER",
        "<",
        ">",
    ]
    upper = normalized.upper()
    return any(marker in upper for marker in markers)


def _get_fernet() -> Fernet:
    """Obtiene instancia de Fernet usando la clave maestra del entorno."""
    global _fernet  # noqa: PLW0603
    if _fernet is None:
        key = settings.encryption_key
        if not key:
            msg = (
                "ENCRYPTION_KEY no configurada. "
                "Genera una con: python -c 'from cryptography.fernet "
                "import Fernet; print(Fernet.generate_key().decode())'"
            )
            raise RuntimeError(msg)
        _fernet = Fernet(key.encode() if isinstance(key, str) else key)
    return _fernet


def encrypt_api_key(plain_key: str) -> bytes:
    """Cifra una API key en texto plano."""
    return _get_fernet().encrypt(plain_key.encode("utf-8"))


def decrypt_api_key(encrypted_key: bytes) -> str:
    """Descifra una API key."""
    return _get_fernet().decrypt(encrypted_key).decode("utf-8")


async def get_provider_config(
    db: AsyncSession, provider: str
) -> AIProviderConfig | None:
    """Obtiene la configuración de un proveedor por nombre."""
    result = await db.execute(
        select(AIProviderConfig).where(AIProviderConfig.provider == provider)
    )
    return result.scalar_one_or_none()


async def get_enabled_providers(db: AsyncSession) -> list[AIProviderConfig]:
    """Lista todos los proveedores habilitados."""
    result = await db.execute(
        select(AIProviderConfig).where(AIProviderConfig.is_enabled.is_(True))
    )
    return list(result.scalars().all())


async def get_all_providers(db: AsyncSession) -> list[AIProviderConfig]:
    """Lista todos los proveedores (habilitados e inhabilitados)."""
    result = await db.execute(select(AIProviderConfig))
    return list(result.scalars().all())


async def upsert_provider(
    db: AsyncSession,
    *,
    provider: str,
    display_name: str,
    default_model: str,
    api_key: str | None = None,
    is_enabled: bool = True,
    max_tokens: int = 4096,
    temperature: float = 0.7,
) -> AIProviderConfig:
    """Crea o actualiza un proveedor. Si se pasa api_key, la cifra."""
    config = await get_provider_config(db, provider)
    if config is None:
        config = AIProviderConfig(
            provider=provider,
            display_name=display_name,
            default_model=default_model,
            is_enabled=is_enabled,
            max_tokens=max_tokens,
            temperature=temperature,
        )
        db.add(config)
    else:
        config.display_name = display_name
        config.default_model = default_model
        config.is_enabled = is_enabled
        config.max_tokens = max_tokens
        config.temperature = temperature

    if api_key:
        config.api_key_encrypted = encrypt_api_key(api_key)

    await db.flush()
    return config


async def get_decrypted_api_key(db: AsyncSession, provider: str) -> str:
    """Obtiene la API key descifrada de un proveedor.

    Primero busca en BD; si no existe, usa la variable de entorno como fallback.
    """
    config = await get_provider_config(db, provider)
    if config and config.api_key_encrypted:
        return decrypt_api_key(config.api_key_encrypted)

    # Fallback a variables de entorno
    env_key = getattr(settings, f"{provider}_api_key", "")
    if env_key and not _is_placeholder_api_key(env_key):
        return env_key

    if not config:
        msg = f"Proveedor no configurado: {provider}"
        raise ValueError(msg)
    msg = f"API key no configurada para: {provider}"
    raise ValueError(msg)


async def seed_default_providers(db: AsyncSession) -> None:
    """Crea proveedores por defecto si no existen.

    Si hay API keys en variables de entorno, las cifra y almacena.
    """
    defaults = [
        {
            "provider": "anthropic",
            "display_name": "Anthropic (Claude)",
            "default_model": "claude-sonnet-4-20250514",
        },
        {
            "provider": "gemini",
            "display_name": "Google Gemini",
            "default_model": "gemini-3.1-flash-lite-preview",
        },
    ]
    for d in defaults:
        existing = await get_provider_config(db, d["provider"])
        if not existing:
            env_key = getattr(settings, f"{d['provider']}_api_key", "")
            config = AIProviderConfig(**d)
            if env_key and not _is_placeholder_api_key(env_key):
                config.api_key_encrypted = encrypt_api_key(env_key)
                logger.info("Seeded %s con API key desde variable de entorno", d["provider"])
            db.add(config)
        elif not existing.api_key_encrypted:
            # Proveedor existente sin key: rellenar desde env si disponible
            env_key = getattr(settings, f"{existing.provider}_api_key", "")
            if env_key and not _is_placeholder_api_key(env_key):
                existing.api_key_encrypted = encrypt_api_key(env_key)
                logger.info(
                    "Actualizado %s con API key desde variable de entorno",
                    existing.provider,
                )
    await db.flush()
