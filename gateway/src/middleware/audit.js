import logger from "../lib/logger.js";

/**
 * Middleware de auditoría para acciones sensibles.
 * Registra cada petición autenticada con datos del usuario y resultado.
 */
export function auditLog(req, res, next) {
  const start = Date.now();

  res.on("finish", () => {
    // Solo auditar rutas que requieren autenticación
    if (!req.user && !req.originalUrl.startsWith("/api/auth/login")) {
      return;
    }

    const duration = Date.now() - start;
    const entry = {
      event: "api_access",
      method: req.method,
      path: req.originalUrl,
      status: res.statusCode,
      duration_ms: duration,
      ip: req.ip,
      user_agent: req.get("user-agent"),
    };

    if (req.user) {
      entry.user_id = req.user.userId;
      entry.role = req.user.role;
    }

    // Eventos de auth se loguean siempre como audit
    if (req.originalUrl.startsWith("/api/auth/")) {
      entry.event = "auth_audit";

      if (req.originalUrl.includes("/login") && req.method === "POST") {
        entry.action = res.statusCode < 400 ? "login_success" : "login_failed";
        entry.username = req.body?.username;
      } else if (req.originalUrl.includes("/refresh")) {
        entry.action = res.statusCode < 400 ? "token_refreshed" : "refresh_failed";
      } else if (req.originalUrl.includes("/logout")) {
        entry.action = "logout";
      }
    }

    if (res.statusCode >= 400) {
      logger.warn(entry, "Auditoría — respuesta con error");
    } else {
      logger.info(entry, "Auditoría");
    }
  });

  next();
}
