"""Gestión de revocación de credenciales vía Redis SET."""

import logging

import redis.asyncio as aioredis

logger = logging.getLogger(__name__)

REVOKED_SET_KEY = "saber11:revoked_users"


class RevocationManager:
    """Administra el SET de usuarios revocados en Redis."""

    def __init__(self, redis_url: str) -> None:
        self._redis = aioredis.from_url(redis_url, decode_responses=True)

    async def revoke(self, kampus_user_id: int) -> None:
        """Agrega un usuario al SET de revocación."""
        await self._redis.sadd(REVOKED_SET_KEY, str(kampus_user_id))
        logger.info("Credenciales revocadas para kampus_user_id=%d", kampus_user_id)

    async def restore(self, kampus_user_id: int) -> None:
        """Remueve un usuario del SET de revocación."""
        await self._redis.srem(REVOKED_SET_KEY, str(kampus_user_id))
        logger.info("Credenciales restauradas para kampus_user_id=%d", kampus_user_id)

    async def is_revoked(self, kampus_user_id: int) -> bool:
        """Verifica si un usuario está revocado."""
        return await self._redis.sismember(REVOKED_SET_KEY, str(kampus_user_id))

    async def close(self) -> None:
        await self._redis.aclose()
