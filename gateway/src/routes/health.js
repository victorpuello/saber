import { Router } from "express";

const router = Router();

/**
 * Health check del gateway.
 * Responde 200 si el proceso está levantado.
 */
router.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "gateway",
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
  });
});

export default router;
