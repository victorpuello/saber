import logger from "../lib/logger.js";

/**
 * Acciones críticas que requieren auditoría detallada.
 * Patrón: [método, pathRegex, acción legible].
 */
const CRITICAL_ACTIONS = [
  ["POST", /^\/api\/questions/, "question.create"],
  ["PUT", /^\/api\/questions/, "question.update"],
  ["PATCH", /^\/api\/questions\/[^/]+\/review/, "question.review"],
  ["DELETE", /^\/api\/questions/, "question.delete"],
  ["POST", /^\/api\/ai\/generate/, "ai.generate"],
  ["POST", /^\/api\/exams/, "exam.create"],
  ["DELETE", /^\/api\/exams/, "exam.delete"],
  ["POST", /^\/api\/diagnostic\/sessions/, "diagnostic.start"],
  ["POST", /^\/api\/plans/, "plan.create"],
  ["PUT", /^\/api\/plans/, "plan.update"],
];

/**
 * Middleware de auditoría para acciones sensibles.
 * Registra cada petición autenticada con datos del usuario y resultado.
 * Detecta acciones críticas y las marca con nivel elevado.
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

    // Detectar acciones críticas de dominio
    const critical = CRITICAL_ACTIONS.find(
      ([method, pattern]) => req.method === method && pattern.test(req.originalUrl)
    );
    if (critical) {
      entry.event = "critical_action";
      entry.action = critical[2];
    }

    if (res.statusCode >= 400) {
      logger.warn(entry, "Auditoría — respuesta con error");
    } else if (entry.event === "critical_action") {
      logger.warn(entry, "Auditoría — acción crítica");
    } else {
      logger.info(entry, "Auditoría");
    }
  });

  next();
}
