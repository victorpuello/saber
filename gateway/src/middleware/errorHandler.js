import logger from "../lib/logger.js";

/**
 * Manejador centralizado de errores.
 * Captura errores no controlados y responde con formato consistente.
 */
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, _next) {
  const statusCode = err.statusCode || 500;
  const message =
    statusCode === 500 ? "Error interno del servidor" : err.message;

  logger.error(
    {
      err: err.message,
      stack: process.env.NODE_ENV !== "production" ? err.stack : undefined,
      method: req.method,
      url: req.originalUrl,
      userId: req.user?.userId,
    },
    "Error no controlado"
  );

  res.status(statusCode).json({ error: message });
}

/**
 * Middleware para rutas no encontradas.
 */
export function notFoundHandler(req, res) {
  res.status(404).json({ error: `Ruta no encontrada: ${req.method} ${req.originalUrl}` });
}
