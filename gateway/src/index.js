import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";

import config from "./lib/config.js";
import logger from "./lib/logger.js";
import { ipLimiter } from "./middleware/rateLimiter.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import healthRoutes from "./routes/health.js";
import proxyRoutes from "./routes/proxy.js";

const app = express();

// --- Seguridad ---
app.use(helmet());
app.use(
  cors({
    origin: config.corsOrigins.split(",").map((o) => o.trim()),
    credentials: true,
  })
);
app.use(ipLimiter);

// --- Parsing y logging ---
app.use(express.json({ limit: "1mb" }));
app.use(
  morgan("short", {
    stream: { write: (msg) => logger.info(msg.trim()) },
  })
);

// --- Rutas ---
app.use(healthRoutes);
app.use(proxyRoutes);

// --- Errores ---
app.use(notFoundHandler);
app.use(errorHandler);

// --- Arranque ---
app.listen(config.port, () => {
  logger.info({ port: config.port, env: config.nodeEnv }, "Gateway iniciado");
});

export default app;
