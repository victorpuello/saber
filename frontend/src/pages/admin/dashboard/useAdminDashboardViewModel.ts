import { useCallback, useEffect, useState } from "react";
import { fetchAdminDashboardSummary, type AdminDashboardSummary, type AuthFetch } from "../../../services/dashboard";
import type { AdminHeroModel, AdminMetricModel, AdminModuleModel, AdminModuleStatus, AdminQuickActionModel } from "./types";

function fmt(value: number | null, suffix = ""): string {
  if (value === null) return "—";
  return `${value}${suffix}`;
}

function buildHero(summary: AdminDashboardSummary): AdminHeroModel {
  const rawAccuracy = summary.avgQuestionAccuracy;
  const avgAccuracyPercent =
    rawAccuracy !== null ? Math.round(rawAccuracy * (rawAccuracy <= 1 ? 100 : 1)) : null;

  return {
    institutionStudents: summary.institutionStudents,
    institutionAvgScore: summary.institutionAvgScore !== null ? Math.round(summary.institutionAvgScore) : null,
    questionBankTotal: summary.questionBankTotal,
    pendingCount: summary.pendingReviewQuestions,
    avgAccuracyPercent,
  };
}

function buildMetrics(summary: AdminDashboardSummary, loading: boolean): AdminMetricModel[] {
  const rawAccuracy = summary.avgQuestionAccuracy;
  const accuracyDisplay =
    rawAccuracy !== null
      ? `${Math.round(rawAccuracy * (rawAccuracy <= 1 ? 100 : 1))}%`
      : "—";

  return [
    {
      id: "questions",
      label: "Banco de preguntas",
      value: loading ? "..." : String(summary.questionBankTotal),
      helper: `${summary.pendingReviewQuestions} pendientes de revisión`,
      icon: "quiz",
      variant: summary.pendingReviewQuestions > 10 ? "warning" : "default",
    },
    {
      id: "students",
      label: "Estudiantes",
      value: loading ? "..." : fmt(summary.institutionStudents),
      helper: "Registrados en la institución",
      icon: "group",
      variant: "default",
    },
    {
      id: "avg_score",
      label: "Puntaje promedio",
      value: loading ? "..." : `${fmt(summary.institutionAvgScore !== null ? Math.round(summary.institutionAvgScore) : null)} pts`,
      helper: "Últimos 30 días",
      icon: "leaderboard",
      variant: "success",
    },
    {
      id: "accuracy",
      label: "Precisión media",
      value: loading ? "..." : accuracyDisplay,
      helper: "Del banco de preguntas",
      icon: "target",
      variant: "default",
    },
    {
      id: "notifications",
      label: "Notificaciones",
      value: loading ? "..." : String(summary.unreadNotifications),
      helper: summary.unreadNotifications === 1 ? "Sin leer" : "Sin leer",
      icon: "notifications",
      variant: summary.unreadNotifications > 0 ? "warning" : "default",
    },
    {
      id: "audit",
      label: "Eventos de auditoría",
      value: loading ? "..." : String(summary.recentAuditEntries),
      helper: "Registros recientes",
      icon: "history",
      variant: "default",
    },
  ];
}

function buildModules(summary: AdminDashboardSummary): AdminModuleModel[] {
  function toStatus(s: string): AdminModuleStatus {
    if (s === "connected" || s === "degraded" || s === "pending") return s;
    return "pending";
  }

  return [
    {
      id: "questionBank",
      title: "Banco de Preguntas",
      status: toStatus(summary.moduleHealth.questionBank.status),
      detail:
        summary.moduleHealth.questionBank.error ??
        `${summary.questionBankTotal} preguntas · ${summary.pendingReviewQuestions} pendientes`,
      icon: "quiz",
    },
    {
      id: "analytics",
      title: "Analytics",
      status: toStatus(summary.moduleHealth.analytics.status),
      detail:
        summary.moduleHealth.analytics.error ??
        `${summary.institutionStudents ?? 0} estudiantes registrados`,
      icon: "analytics",
    },
    {
      id: "notifications",
      title: "Notificaciones",
      status: toStatus(summary.moduleHealth.notifications.status),
      detail:
        summary.moduleHealth.notifications.error ??
        `${summary.unreadNotifications} sin leer`,
      icon: "notifications",
    },
    {
      id: "examEngine",
      title: "Motor de Exámenes",
      status: "pending" as AdminModuleStatus,
      detail: "Estado no consultado",
      icon: "edit_note",
    },
    {
      id: "diagnostic",
      title: "Diagnóstico",
      status: "pending" as AdminModuleStatus,
      detail: "Estado no consultado",
      icon: "biotech",
    },
    {
      id: "studyPlanner",
      title: "Plan de Estudio",
      status: "pending" as AdminModuleStatus,
      detail: "Estado no consultado",
      icon: "auto_stories",
    },
    {
      id: "aiGenerator",
      title: "Generador IA",
      status: "pending" as AdminModuleStatus,
      detail: "Estado no consultado",
      icon: "smart_toy",
    },
  ];
}

function buildQuickActions(): AdminQuickActionModel[] {
  return [
    {
      id: "questions",
      label: "Banco de Preguntas",
      description: "Revisar y gestionar preguntas del banco",
      icon: "quiz",
      targetPath: "/admin/preguntas",
      variant: "primary",
    },
    {
      id: "analytics",
      label: "Analytics Institucional",
      description: "Ver reportes de rendimiento y progreso",
      icon: "analytics",
      targetPath: "/admin/analytics",
      variant: "default",
    },
    {
      id: "students",
      label: "Gestión de Estudiantes",
      description: "Administrar cuentas y asignaciones",
      icon: "group",
      targetPath: "/admin/estudiantes",
      variant: "default",
    },
    {
      id: "notifications",
      label: "Notificaciones",
      description: "Enviar alertas y comunicados",
      icon: "send",
      targetPath: "/admin/notificaciones",
      variant: "default",
    },
  ];
}

const EMPTY_SUMMARY: AdminDashboardSummary = {
  questionBankTotal: 0,
  pendingReviewQuestions: 0,
  institutionStudents: 0,
  institutionAvgScore: null,
  avgQuestionAccuracy: null,
  unreadNotifications: 0,
  recentAuditEntries: 0,
  moduleHealth: {
    questionBank: { status: "pending", error: null },
    analytics: { status: "pending", error: null },
    notifications: { status: "pending", error: null },
  },
  errors: [],
};

interface UseAdminDashboardViewModelOptions {
  authFetch: AuthFetch;
  adminName: string;
}

export function useAdminDashboardViewModel({ authFetch, adminName }: UseAdminDashboardViewModelOptions) {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<AdminDashboardSummary>(EMPTY_SUMMARY);

  const load = useCallback(async () => {
    setLoading(true);
    const next = await fetchAdminDashboardSummary(authFetch);
    setSummary(next);
    setLoading(false);
  }, [authFetch]);

  useEffect(() => {
    let active = true;

    async function run() {
      setLoading(true);
      const next = await fetchAdminDashboardSummary(authFetch);
      if (active) {
        setSummary(next);
        setLoading(false);
      }
    }

    run();

    return () => {
      active = false;
    };
  }, [authFetch]);

  return {
    loading,
    errors: summary.errors,
    adminName,
    hero: buildHero(summary),
    metrics: buildMetrics(summary, loading),
    modules: buildModules(summary),
    quickActions: buildQuickActions(),
    reload: load,
  };
}
