import rateLimit from "express-rate-limit";
import config from "../lib/config.js";

/**
 * Rate limiter global por IP.
 * 1000 peticiones por minuto por IP.
 */
export const ipLimiter = rateLimit({
  windowMs: config.rateLimitWindowMs,
  max: config.rateLimitMaxPerIp,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip,
  message: { error: "Demasiadas peticiones desde esta IP, intente más tarde" },
});

/**
 * Rate limiter por usuario autenticado.
 * 100 peticiones por minuto por user_id.
 */
export const userLimiter = rateLimit({
  windowMs: config.rateLimitWindowMs,
  max: config.rateLimitMaxPerUser,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.userId?.toString() || req.ip,
  message: { error: "Demasiadas peticiones para este usuario, intente más tarde" },
  skip: (req) => !req.user,
});
