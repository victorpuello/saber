/** @type {Readonly<Record<string, string | number>>} */
const config = Object.freeze({
  port: parseInt(process.env.PORT || "3000", 10),
  nodeEnv: process.env.NODE_ENV || "development",

  // Kampus
  kampusBaseUrl: process.env.KAMPUS_BASE_URL || "http://localhost:8000",
  kampusAuthEndpoint: process.env.KAMPUS_AUTH_ENDPOINT || "/api/token/",
  kampusUsersEndpoint: process.env.KAMPUS_USERS_ENDPOINT || "/api/users/",

  // JWT propio del simulador
  jwtSecret: process.env.JWT_SECRET || "dev-secret-change-in-production",
  jwtExpiration: process.env.JWT_EXPIRATION || "3600",
  jwtRefreshExpiration: process.env.JWT_REFRESH_EXPIRATION || "604800",

  // Dev auth (bypass Kampus para entorno local)
  devAuthEnabled: process.env.DEV_AUTH_ENABLED === "true",

  // CORS
  corsOrigins: process.env.CORS_ORIGINS || "http://localhost:5174",

  // Servicios internos
  questionBankUrl: process.env.QUESTION_BANK_URL || "http://question-bank:3001",
  aiGeneratorUrl: process.env.AI_GENERATOR_URL || "http://ai-generator:3002",
  examEngineUrl: process.env.EXAM_ENGINE_URL || "http://exam-engine:3003",
  diagnosticUrl: process.env.DIAGNOSTIC_URL || "http://diagnostic:3004",
  studyPlannerUrl: process.env.STUDY_PLANNER_URL || "http://study-planner:3005",
  analyticsUrl: process.env.ANALYTICS_URL || "http://analytics:3006",
  notificationsUrl: process.env.NOTIFICATIONS_URL || "http://notifications:3007",

  // Rate limiting
  rateLimitWindowMs: 60_000,
  rateLimitMaxPerUser: 100,
  rateLimitMaxPerIp: 1000,
});

export default config;
