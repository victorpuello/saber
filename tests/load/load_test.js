// =============================================================================
// Simulador Saber 11 — Prueba de carga con k6
// Instalación: https://k6.io/docs/getting-started/installation/
// Ejecutar:    k6 run tests/load/load_test.js
// Con reporte: k6 run --out json=results.json tests/load/load_test.js
// =============================================================================

import http from "k6/http";
import { check, group, sleep } from "k6";
import { Rate, Trend } from "k6/metrics";

// ── Configuración ──────────────────────────────────────────────────

const BASE_URL = __ENV.BASE_URL || "http://localhost:3000";
const USERNAME = __ENV.USERNAME || "admin";
const PASSWORD = __ENV.PASSWORD || "admin";

// Métricas custom
const loginSuccess = new Rate("login_success");
const apiErrors = new Rate("api_errors");
const questionLatency = new Trend("question_latency");

// ── Escenarios de carga ────────────────────────────────────────────

export const options = {
  scenarios: {
    // Rampa gradual: simula carga creciente típica de inicio de jornada
    ramp_up: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "1m", target: 10 },  // Calentamiento
        { duration: "3m", target: 50 },  // Carga media (un salón)
        { duration: "2m", target: 100 }, // Pico (varios salones)
        { duration: "2m", target: 50 },  // Bajada
        { duration: "1m", target: 0 },   // Enfriamiento
      ],
      gracefulRampDown: "30s",
    },
  },
  thresholds: {
    http_req_duration: ["p(95)<2000", "p(99)<5000"], // 95% < 2s, 99% < 5s
    http_req_failed: ["rate<0.05"],                   // <5% errores
    login_success: ["rate>0.95"],                      // >95% logins exitosos
    api_errors: ["rate<0.05"],                         // <5% errores API
  },
};

// ── Helpers ─────────────────────────────────────────────────────────

function login() {
  const resp = http.post(
    `${BASE_URL}/api/auth/login`,
    JSON.stringify({ username: USERNAME, password: PASSWORD }),
    { headers: { "Content-Type": "application/json" } }
  );
  const success = resp.status === 200;
  loginSuccess.add(success);
  if (success) {
    return resp.json();
  }
  return null;
}

function authHeaders(token) {
  return {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  };
}

// ── Flujo principal ────────────────────────────────────────────────

export default function () {
  // 1. Login
  const tokens = login();
  if (!tokens) {
    sleep(1);
    return;
  }
  const opts = authHeaders(tokens.access_token);

  // 2. Consultar perfil
  group("Profile", () => {
    const resp = http.get(`${BASE_URL}/api/auth/me`, opts);
    check(resp, { "me OK": (r) => r.status === 200 });
    apiErrors.add(resp.status >= 500);
  });

  sleep(0.5);

  // 3. Ver banco de preguntas
  group("Question Bank", () => {
    const start = Date.now();
    const resp = http.get(`${BASE_URL}/api/questions?limit=10`, opts);
    questionLatency.add(Date.now() - start);
    check(resp, { "questions OK": (r) => r.status === 200 });
    apiErrors.add(resp.status >= 500);
  });

  sleep(0.5);

  // 4. Consultar taxonomía
  group("Taxonomy", () => {
    const resp = http.get(`${BASE_URL}/api/taxonomy/areas`, opts);
    check(resp, { "areas OK": (r) => r.status === 200 });
    apiErrors.add(resp.status >= 500);
  });

  sleep(0.5);

  // 5. Consultar perfil diagnóstico
  group("Diagnostic Profile", () => {
    const resp = http.get(`${BASE_URL}/api/diagnostic/profile`, opts);
    check(resp, { "profile OK": (r) => [200, 404].includes(r.status) });
    apiErrors.add(resp.status >= 500);
  });

  sleep(0.5);

  // 6. Consultar planes
  group("Study Plans", () => {
    const resp = http.get(`${BASE_URL}/api/plans`, opts);
    check(resp, { "plans OK": (r) => [200, 404].includes(r.status) });
    apiErrors.add(resp.status >= 500);
  });

  sleep(0.5);

  // 7. Consultar notificaciones
  group("Notifications", () => {
    const resp = http.get(`${BASE_URL}/api/notifications`, opts);
    check(resp, { "notifications OK": (r) => r.status === 200 });
    apiErrors.add(resp.status >= 500);
  });

  sleep(1);
}
