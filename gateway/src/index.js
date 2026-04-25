import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";

import config from "./lib/config.js";
import logger from "./lib/logger.js";
import { ipLimiter } from "./middleware/rateLimiter.js";
import { auditLog } from "./middleware/audit.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import healthRoutes from "./routes/health.js";
import authRoutes from "./routes/auth.js";
import proxyRoutes from "./routes/proxy.js";

const app = express();

// --- Seguridad ---
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(
  cors({
    origin: config.corsOrigins.split(",").map((o) => o.trim()),
    credentials: true,
  })
);
app.use(ipLimiter);

// --- Parsing y logging ---
// NO parsear body JSON en rutas de proxy — http-proxy-middleware necesita
// el stream crudo. Solo parsear en /api/auth (rutas locales del gateway).
app.use("/api/auth", express.json({ limit: "1mb" }));
app.use(
  morgan("short", {
    stream: { write: (msg) => logger.info(msg.trim()) },
  })
);
app.use(auditLog);

// --- Rutas ---
app.use(healthRoutes);
app.use(authRoutes);
app.use(proxyRoutes);

// --- Errores ---
app.use(notFoundHandler);
app.use(errorHandler);

// --- Arranque ---
app.listen(config.port, () => {
  logger.info({ port: config.port, env: config.nodeEnv }, "Gateway iniciado");
});

export default app;
