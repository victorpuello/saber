import { Router } from "express";
import { createProxyMiddleware } from "http-proxy-middleware";
import config from "../lib/config.js";
import { authenticate } from "../middleware/auth.js";
import { revocationCheck } from "../middleware/revocationCheck.js";
import { userLimiter } from "../middleware/rateLimiter.js";

const router = Router();

/** Mapeo servicio → URL interna */
const SERVICE_MAP = {
  "/api/questions": config.questionBankUrl,
  "/api/taxonomy": config.questionBankUrl,
  "/api/ai": config.aiGeneratorUrl,
  "/api/exams": config.examEngineUrl,
  "/api/sessions": config.examEngineUrl,
  "/api/diagnostic": config.diagnosticUrl,
  "/api/plans": config.studyPlannerUrl,
  "/api/analytics": config.analyticsUrl,
  "/api/notifications": config.notificationsUrl,
  "/api/students": config.studentsUrl,
};

/**
 * Crea un proxy que reenvía la petición al microservicio destino,
 * propagando el JWT del simulador como header interno.
 */
function proxyTo(target) {
  return createProxyMiddleware({
    target,
    changeOrigin: true,
    autoRewrite: true,
    protocolRewrite: "http",
    // Mantener la ruta completa (incluyendo prefijo /api/*) al reenviar.
    pathRewrite: (_path, req) => req.originalUrl,
    on: {
      proxyReq(proxyReq, req) {
        // Propagar identidad del usuario como headers internos
        if (req.user) {
          proxyReq.setHeader("X-User-Id", req.user.userId);
          proxyReq.setHeader("X-User-Role", req.user.role);
          proxyReq.setHeader("X-User-Name", req.user.name || "");
          if (req.user.grade) {
            proxyReq.setHeader("X-User-Grade", req.user.grade);
          }
          proxyReq.setHeader(
            "X-Institution-Id",
            req.user.institutionId || ""
          );
        }
      },
    },
  });
}

// Serving de uploads del question-bank. No exige Authorization porque los
// recursos se consumen desde etiquetas <img> del frontend.
router.use("/uploads", proxyTo(config.questionBankUrl));

// Registrar rutas de proxy con autenticación y rate limit
for (const [path, target] of Object.entries(SERVICE_MAP)) {
  router.use(path, authenticate, revocationCheck, userLimiter, proxyTo(target));
}

export default router;
