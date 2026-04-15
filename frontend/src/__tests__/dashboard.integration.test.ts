// S4-T03: Pruebas de integración de carga inicial del dashboard
// S4-T06: Validación de fallback por error parcial de servicio
import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetchStudentDashboardSummary, type AuthFetch } from "../services/dashboard";

// ─── Payloads de ejemplo ───────────────────────────────────────────────────

const PLAN_HISTORY_ACTIVE = [
  { id: "plan-1", status: "ACTIVE", total_weeks: 8, current_week: 3 },
];

const PLAN_PROGRESS = {
  total_units: 40,
  completed_units: 15,
  progress_percent: 38,
  current_week: 3,
  total_weeks: 8,
  by_area: {
    MAT: { total: 10, completed: 4, correct: 30, attempted: 40 },
    LC: { total: 10, completed: 3, correct: 18, attempted: 30 },
  },
};

const ACTIVE_WEEK = {
  week_number: 3,
  units: [
    {
      id: "u1",
      competency_id: "c1",
      area_code: "MAT",
      title: "Álgebra lineal",
      description: null,
      priority: "HIGH",
      recommended_questions: 15,
      completed: false,
    },
  ],
};

const DIAGNOSTIC_SESSIONS = [
  {
    id: "ds1",
    area_code: "MAT",
    status: "COMPLETED",
    current_theta: 0.5,
    questions_answered: 20,
    started_at: "2026-04-01T10:00:00",
    finished_at: "2026-04-01T10:30:00",
  },
];

const PROFILE = {
  last_diagnostic_at: "2026-04-01T10:30:00",
  overall_estimated_level: 3,
  estimated_score_global: 340,
  competency_scores: [
    {
      competency_id: "c1",
      theta_estimate: 0.5,
      standard_error: 0.2,
      performance_level: 3,
      classification: "MEDIUM",
      questions_attempted: 20,
      questions_correct: 14,
      last_updated_at: "2026-04-01T10:30:00",
    },
  ],
};

const UNREAD_COUNT = { unread: 2 };

const NOTIFICATION_LIST = {
  unread: 2,
  items: [
    {
      id: "n1",
      title: "Nuevo simulacro disponible",
      body: "Tienes un simulacro nuevo esta semana.",
      read: false,
      created_at: "2026-04-14T08:00:00",
    },
  ],
};

const SESSION_HISTORY = {
  items: [],
  total: 0,
  page: 1,
  page_size: 5,
  pages: 0,
};

const STUDENT_PROGRESS = {
  student_user_id: 1,
  exam_count: 3,
  avg_score: 360,
  avg_accuracy: 72,
  recent_exams: [],
  competencies: [],
};

// ─── Helper para mock de authFetch ────────────────────────────────────────

function buildAuthFetch(overrides: Record<string, unknown> = {}): AuthFetch {
  const defaults: Record<string, unknown> = {
    "/api/plans/history": PLAN_HISTORY_ACTIVE,
    "/api/plans/active/progress": PLAN_PROGRESS,
    "/api/plans/active/week/3": ACTIVE_WEEK,
    "/api/diagnostic/sessions": DIAGNOSTIC_SESSIONS,
    "/api/diagnostic/profile": PROFILE,
    "/api/sessions/history?page=1&page_size=5": SESSION_HISTORY,
    "/api/notifications/unread-count": UNREAD_COUNT,
    "/api/notifications?limit=3": NOTIFICATION_LIST,
    "/api/analytics/student/1/progress": STUDENT_PROGRESS,
  };

  const responses = { ...defaults, ...overrides };

  return vi.fn().mockImplementation((path: string) => {
    const val = responses[path];
    if (val instanceof Error) {
      return Promise.reject(val);
    }
    return Promise.resolve(val);
  }) as unknown as AuthFetch;
}

// ─── Tests ─────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
});

describe("fetchStudentDashboardSummary — carga completa", () => {
  it("construye el summary correctamente con todos los datos", async () => {
    const authFetch = buildAuthFetch();
    const summary = await fetchStudentDashboardSummary(authFetch, 1);

    expect(summary.activePlanWeeks).toBe(8);
    expect(summary.currentPlanWeek).toBe(3);
    expect(summary.progressPercent).toBe(38);
    expect(summary.estimatedScoreGlobal).toBe(340);
    expect(summary.diagnosticCompletedSessions).toBe(1);
    expect(summary.unreadNotifications).toBe(2);
    expect(summary.errors).toHaveLength(0);
  });

  it("reporta moduleHealth 'connected' cuando los endpoints responden", async () => {
    const summary = await fetchStudentDashboardSummary(buildAuthFetch(), 1);
    expect(summary.moduleHealth.diagnostic.status).toBe("connected");
    expect(summary.moduleHealth.plan.status).toBe("connected");
    expect(summary.moduleHealth.notifications.status).toBe("connected");
  });

  it("construye areaBreakdown con las áreas del plan", async () => {
    const summary = await fetchStudentDashboardSummary(buildAuthFetch(), 1);
    expect(summary.areaBreakdown.length).toBeGreaterThan(0);
    const mat = summary.areaBreakdown.find((a) => a.areaCode === "MAT");
    expect(mat).toBeDefined();
    expect(mat?.progressPercent).toBe(40); // 4/10 * 100
  });

  it("detecta nextRecommendedUnit desde la semana activa", async () => {
    const summary = await fetchStudentDashboardSummary(buildAuthFetch(), 1);
    expect(summary.nextRecommendedUnit?.id).toBe("u1");
    expect(summary.nextRecommendedUnit?.areaCode).toBe("MAT");
  });
});

// ─── S4-T06: Fallback por error parcial ────────────────────────────────────

describe("fetchStudentDashboardSummary — fallback por error parcial", () => {
  it("degrada solo el módulo de diagnóstico cuando ese servicio falla", async () => {
    const authFetch = buildAuthFetch({
      "/api/diagnostic/sessions": new Error("Service unavailable"),
      "/api/diagnostic/profile": new Error("Service unavailable"),
    });
    const summary = await fetchStudentDashboardSummary(authFetch, 1);

    expect(summary.moduleHealth.diagnostic.status).toBe("degraded");
    // Los otros módulos NO se ven afectados
    expect(summary.moduleHealth.plan.status).toBe("connected");
    expect(summary.moduleHealth.notifications.status).toBe("connected");
  });

  it("degrada solo el módulo de plan cuando ese servicio falla", async () => {
    const authFetch = buildAuthFetch({
      "/api/plans/history": new Error("timeout"),
    });
    const summary = await fetchStudentDashboardSummary(authFetch, 1);

    expect(summary.moduleHealth.plan.status).toBe("degraded");
    expect(summary.moduleHealth.diagnostic.status).toBe("connected");
  });

  it("degrada solo notificaciones cuando ese servicio falla", async () => {
    const authFetch = buildAuthFetch({
      "/api/notifications/unread-count": new Error("500"),
      "/api/notifications?limit=3": new Error("500"),
    });
    const summary = await fetchStudentDashboardSummary(authFetch, 1);

    expect(summary.moduleHealth.notifications.status).toBe("degraded");
    expect(summary.moduleHealth.plan.status).toBe("connected");
    expect(summary.moduleHealth.diagnostic.status).toBe("connected");
  });

  it("acumula errores de múltiples módulos fallidos sin bloquear el resumen", async () => {
    const authFetch = buildAuthFetch({
      "/api/diagnostic/sessions": new Error("down"),
      "/api/diagnostic/profile": new Error("down"),
      "/api/notifications/unread-count": new Error("down"),
      "/api/notifications?limit=3": new Error("down"),
    });
    const summary = await fetchStudentDashboardSummary(authFetch, 1);

    expect(summary.moduleHealth.diagnostic.status).toBe("degraded");
    expect(summary.moduleHealth.notifications.status).toBe("degraded");
    expect(summary.errors.length).toBeGreaterThan(0);
    // Plan y sesiones siguen conectados
    expect(summary.moduleHealth.plan.status).toBe("connected");
  });

  it("retorna summary válido aunque todos los endpoints fallen", async () => {
    const authFetch = vi.fn().mockRejectedValue(new Error("network error")) as unknown as AuthFetch;
    const summary = await fetchStudentDashboardSummary(authFetch, 1);

    // Nunca debe lanzar — siempre retorna un summary degradado
    expect(summary).toBeDefined();
    expect(summary.activePlanWeeks).toBeNull();
    expect(summary.errors.length).toBeGreaterThan(0);
    expect(summary.moduleHealth.diagnostic.status).toBe("degraded");
    expect(summary.moduleHealth.plan.status).toBe("degraded");
  });
});

describe("fetchStudentDashboardSummary — estudiante sin userId", () => {
  it("omite la llamada de analytics cuando userId es null", async () => {
    const authFetch = buildAuthFetch();
    const summary = await fetchStudentDashboardSummary(authFetch, null);
    // No debe lanzar ni incluir error de analytics
    expect(summary).toBeDefined();
    const analyticsCall = (authFetch as ReturnType<typeof vi.fn>).mock.calls.find(
      (args: unknown[]) => typeof args[0] === "string" && args[0].includes("/api/analytics/student"),
    );
    expect(analyticsCall).toBeUndefined();
  });
});
