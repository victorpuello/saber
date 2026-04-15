import jwt from "jsonwebtoken";
import config from "../lib/config.js";
import logger from "../lib/logger.js";

/** Roles válidos del simulador */
const VALID_ROLES = new Set(["STUDENT", "TEACHER", "ADMIN"]);

/**
 * Middleware que valida el JWT interno del simulador y adjunta `req.user`.
 * No contacta Kampus; solo verifica firma y claims del token propio.
 */
export function authenticate(req, res, next) {
  const header = req.headers.authorization;

  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Token de autenticación requerido" });
  }

  const token = header.slice(7);

  try {
    const payload = jwt.verify(token, config.jwtSecret, {
      algorithms: ["HS256"],
    });

    if (!payload.user_id || !VALID_ROLES.has(payload.role)) {
      return res.status(401).json({ error: "Token con claims inválidos" });
    }

    req.user = {
      userId: payload.user_id,
      kampusUserId: payload.kampus_user_id,
      role: payload.role,
      name: payload.name,
      grade: payload.grade || null,
      institutionId: payload.institution_id,
    };

    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ error: "Token expirado" });
    }
    logger.warn({ err: err.message }, "JWT inválido");
    return res.status(401).json({ error: "Token inválido" });
  }
}

/**
 * Genera middleware que verifica que el usuario tenga uno de los roles permitidos.
 * @param  {...string} allowedRoles - Roles aceptados (STUDENT, TEACHER, ADMIN)
 */
export function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: "No autenticado" });
    }

    if (!allowedRoles.includes(req.user.role)) {
      logger.warn(
        { userId: req.user.userId, role: req.user.role, required: allowedRoles },
        "Acceso denegado por rol"
      );
      return res.status(403).json({ error: "No tiene permisos para esta acción" });
    }

    next();
  };
}
