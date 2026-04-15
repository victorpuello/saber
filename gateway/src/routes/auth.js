import { Router } from "express";
import jwt from "jsonwebtoken";
import crypto from "node:crypto";
import config from "../lib/config.js";
import logger from "../lib/logger.js";
import { authenticate } from "../middleware/auth.js";
import { ipLimiter } from "../middleware/rateLimiter.js";

const router = Router();

// ─── Usuarios de desarrollo (solo cuando DEV_AUTH_ENABLED=true) ──────────────
const DEV_USERS = {
  estudiante: { userId: 1, role: "STUDENT", name: "Estudiante Demo", grade: "11", institutionId: "demo-inst" },
  docente:    { userId: 2, role: "TEACHER", name: "Docente Demo",    grade: null,  institutionId: "demo-inst" },
  admin:      { userId: 3, role: "ADMIN",   name: "Admin Demo",      grade: null,  institutionId: "demo-inst" },
};

/**
 * Mapa en memoria para refresh tokens.
 * En producción se usaría Redis.
 * Cada entrada: refreshToken → { userId, kampusUserId, role, name, grade, institutionId, expiresAt }
 */
const refreshTokenStore = new Map();

/** Limpia tokens expirados cada 10 minutos */
setInterval(() => {
  const now = Date.now();
  for (const [token, data] of refreshTokenStore) {
    if (data.expiresAt < now) {
      refreshTokenStore.delete(token);
    }
  }
}, 10 * 60 * 1000);

/**
 * Mapea el rol de Kampus (Django) al rol del simulador.
 * Kampus puede enviar: is_staff, is_superuser, groups, o un campo role/tipo personalizado.
 */
function mapKampusRole(kampusUser) {
  // 1. Flags de Django admin
  if (kampusUser.is_superuser || kampusUser.is_staff) {
    return "ADMIN";
  }

  // 2. Campo role/tipo explícito que Kampus pueda incluir
  const explicitRole = (kampusUser.role || kampusUser.tipo || kampusUser.tipo_usuario || "").toLowerCase();
  if (["admin", "administrador", "administrator", "superadmin", "super_admin", "super-admin"].includes(explicitRole)) {
    return "ADMIN";
  }
  if (explicitRole === "teacher" || explicitRole === "docente" || explicitRole === "profesor") {
    return "TEACHER";
  }

  // 3. Verificar grupos de Kampus
  const groups = (kampusUser.groups || []).map((g) =>
    typeof g === "string" ? g.toLowerCase() : (g.name || "").toLowerCase()
  );

  if (groups.some((g) => ["admin", "admins", "administrador", "administradores", "administrator"].includes(g))) {
    return "ADMIN";
  }

  if (groups.some((g) => ["docentes", "teachers", "docente", "teacher", "profesores"].includes(g))) {
    return "TEACHER";
  }

  return "STUDENT";
}

/**
 * Genera el par de tokens (access + refresh) para un usuario autenticado.
 */
function generateTokenPair(userData) {
  const accessPayload = {
    user_id: userData.userId,
    kampus_user_id: userData.kampusUserId,
    role: userData.role,
    name: userData.name,
    grade: userData.grade || null,
    institution_id: userData.institutionId,
  };

  const accessToken = jwt.sign(accessPayload, config.jwtSecret, {
    algorithm: "HS256",
    expiresIn: parseInt(config.jwtExpiration, 10),
  });

  const refreshToken = crypto.randomBytes(48).toString("hex");
  const refreshExpiresAt =
    Date.now() + parseInt(config.jwtRefreshExpiration, 10) * 1000;

  refreshTokenStore.set(refreshToken, {
    ...userData,
    expiresAt: refreshExpiresAt,
  });

  return {
    access_token: accessToken,
    refresh_token: refreshToken,
    token_type: "Bearer",
    expires_in: parseInt(config.jwtExpiration, 10),
  };
}

// =============================================================================
// POST /api/auth/login
// Autentica contra Kampus y emite JWT interno del simulador.
// =============================================================================
router.post("/api/auth/login", ipLimiter, async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res
      .status(400)
      .json({ error: "Se requiere username y password" });
  }

  try {
    // ─── Modo desarrollo: permite cuentas demo con contraseña "demo1234" ────
    // Solo intercepta si username Y contraseña coinciden exactamente con una
    // cuenta demo. Cualquier otro caso cae a Kampus para no bloquear usuarios
    // reales cuyo username coincida con un nombre demo.
    if (config.devAuthEnabled) {
      const devUser = DEV_USERS[username.toLowerCase()];

      if (devUser && password === "demo1234") {
        const userData = { ...devUser, kampusUserId: devUser.userId };
        const tokens = generateTokenPair(userData);
        logger.info({ userId: userData.userId, role: userData.role }, "Login dev exitoso");
        return res.json({
          ...tokens,
          user: { id: userData.userId, name: userData.name, role: userData.role, grade: userData.grade },
        });
      }

      // Contraseña ≠ demo1234 → intentar Kampus aunque el username coincida
      // con un usuario demo (puede ser un usuario real de Kampus con ese nombre).
    }

    // 1. Autenticar contra Kampus (SimpleJWT por defecto)
    const kampusTokenUrl = `${config.kampusBaseUrl}${config.kampusAuthEndpoint}`;
    const tokenRes = await fetch(kampusTokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!tokenRes.ok) {
      const status = tokenRes.status;
      if (status === 401 || status === 400) {
        logger.info({ username }, "Login fallido — credenciales inválidas");
        return res
          .status(401)
          .json({ error: "Credenciales inválidas" });
      }
      logger.error(
        { status, username },
        "Error inesperado de Kampus al autenticar"
      );
      return res
        .status(502)
        .json({ error: "Error al comunicarse con Kampus" });
    }

    const kampusTokens = await tokenRes.json();

    // 2. Obtener datos del usuario autenticado desde Kampus
    const userRes = await fetch(
      `${config.kampusBaseUrl}${config.kampusUsersEndpoint}me/`,
      {
        headers: {
          Authorization: `Bearer ${kampusTokens.access}`,
        },
        signal: AbortSignal.timeout(10_000),
      }
    );

    if (!userRes.ok) {
      logger.error(
        { status: userRes.status },
        "No se pudo obtener datos del usuario de Kampus"
      );
      return res
        .status(502)
        .json({ error: "Error al obtener datos del usuario" });
    }

    const kampusUser = await userRes.json();

    // Log para diagnóstico de mapeo de roles
    logger.info(
      {
        kampus_id: kampusUser.id,
        is_staff: kampusUser.is_staff,
        is_superuser: kampusUser.is_superuser,
        role: kampusUser.role,
        tipo: kampusUser.tipo,
        groups: (kampusUser.groups || []).map((g) =>
          typeof g === "string" ? g : g.name
        ),
      },
      "Datos de usuario recibidos desde Kampus"
    );

    // 3. Mapear a estructura del simulador
    const userData = {
      userId: kampusUser.id,
      kampusUserId: kampusUser.id,
      role: mapKampusRole(kampusUser),
      name: `${kampusUser.first_name || ""} ${kampusUser.last_name || ""}`.trim() || kampusUser.username,
      grade: kampusUser.grade || kampusUser.grado || null,
      institutionId: kampusUser.institution_id || kampusUser.institucion_id || "default",
    };

    // 4. Emitir tokens del simulador
    const tokens = generateTokenPair(userData);

    logger.info(
      { userId: userData.userId, role: userData.role, name: userData.name },
      "Login exitoso"
    );

    return res.json({
      ...tokens,
      user: {
        id: userData.userId,
        name: userData.name,
        role: userData.role,
        grade: userData.grade,
      },
    });
  } catch (err) {
    if (err.name === "TimeoutError" || err.code === "UND_ERR_CONNECT_TIMEOUT") {
      logger.error("Timeout al conectar con Kampus");
      return res
        .status(504)
        .json({ error: "Kampus no respondió a tiempo" });
    }
    logger.error({ err: err.message }, "Error en login");
    return res.status(500).json({ error: "Error interno del servidor" });
  }
});

// =============================================================================
// POST /api/auth/refresh
// Renueva el access token usando un refresh token válido.
// =============================================================================
router.post("/api/auth/refresh", ipLimiter, (req, res) => {
  const { refresh_token } = req.body;

  if (!refresh_token) {
    return res
      .status(400)
      .json({ error: "Se requiere refresh_token" });
  }

  const storedData = refreshTokenStore.get(refresh_token);

  if (!storedData) {
    return res.status(401).json({ error: "Refresh token inválido" });
  }

  if (storedData.expiresAt < Date.now()) {
    refreshTokenStore.delete(refresh_token);
    return res.status(401).json({ error: "Refresh token expirado" });
  }

  // Rotar: invalidar el viejo y emitir nuevo par
  refreshTokenStore.delete(refresh_token);

  const userData = {
    userId: storedData.userId,
    kampusUserId: storedData.kampusUserId,
    role: storedData.role,
    name: storedData.name,
    grade: storedData.grade,
    institutionId: storedData.institutionId,
  };

  const tokens = generateTokenPair(userData);

  logger.info({ userId: userData.userId }, "Token renovado");

  return res.json(tokens);
});

// =============================================================================
// GET /api/auth/me
// Retorna datos del usuario actual desde el JWT.
// =============================================================================
router.get("/api/auth/me", authenticate, (req, res) => {
  return res.json({
    id: req.user.userId,
    kampus_user_id: req.user.kampusUserId,
    name: req.user.name,
    role: req.user.role,
    grade: req.user.grade,
    institution_id: req.user.institutionId,
  });
});

// =============================================================================
// POST /api/auth/logout
// Invalida el refresh token (logout seguro).
// =============================================================================
router.post("/api/auth/logout", authenticate, (req, res) => {
  const { refresh_token } = req.body;

  if (refresh_token) {
    refreshTokenStore.delete(refresh_token);
    logger.info({ userId: req.user.userId }, "Logout — refresh token invalidado");
  }

  return res.json({ message: "Sesión cerrada" });
});

export default router;
