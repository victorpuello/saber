import Redis from "ioredis";
import config from "../lib/config.js";
import logger from "../lib/logger.js";

const REVOKED_SET_KEY = "saber11:revoked_users";

let redisClient = null;

function getRedis() {
  if (!redisClient) {
    redisClient = new Redis(config.redisUrl, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      retryStrategy: (times) => Math.min(times * 200, 3000),
    });
    redisClient.on("error", (err) =>
      logger.warn({ err: err.message }, "Redis revocation client error")
    );
    redisClient.connect().catch(() => {});
  }
  return redisClient;
}

/**
 * Middleware que verifica si el usuario autenticado tiene sus
 * credenciales revocadas (consultando un SET en Redis).
 * Se ejecuta DESPUÉS de authenticate() en las rutas proxy.
 */
export function revocationCheck(req, res, next) {
  if (!req.user?.kampusUserId) {
    return next();
  }

  const redis = getRedis();
  if (redis.status !== "ready") {
    // Si Redis no está disponible, dejar pasar (fail-open para no bloquear)
    logger.warn("Redis no disponible para revocation check — fail-open");
    return next();
  }

  redis
    .sismember(REVOKED_SET_KEY, String(req.user.kampusUserId))
    .then((isMember) => {
      if (isMember) {
        logger.info(
          { userId: req.user.userId, kampusUserId: req.user.kampusUserId },
          "Acceso denegado: credenciales revocadas"
        );
        return res.status(403).json({
          error: "Acceso revocado. Contacte al administrador.",
        });
      }
      next();
    })
    .catch((err) => {
      logger.warn({ err: err.message }, "Error en revocation check — fail-open");
      next();
    });
}
