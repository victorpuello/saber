import { useCallback, useEffect, useState } from "react";
import { fetchAdminDashboardSummary, type AdminDashboardSummary, type AuthFetch } from "../../../services/dashboard";
import type { AdminHeroModel, AdminMetricModel, AdminModuleModel, AdminModuleStatus, AdminQuickActionModel } from "./types";

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
  return [
    {
      id: "diagnostics",
      label: "Diagnosticos completados",
      value: loading ? "..." : String(summary.completedDiagnostics),
      helper: `${summary.totalDiagnostics} sesiones registradas`,
      icon: "analytics",
      variant: "default",
    },
    {
      id: "pending_review",
      label: "Preguntas sin revisar",
      value: loading ? "..." : String(summary.pendingReviewQuestions),
      helper: "requieren aprobacion",
      icon: "pending_actions",
      variant: "warning",
      badge: summary.pendingReviewQuestions > 0 ? "Requiere atencion" : undefined,
    },
    {
      id: "study_plans",
      label: "Planes de estudio activos",
      value: loading ? "..." : String(summary.activeStudyPlans),
      helper: `${summary.totalStudyPlans} planes creados`,
      icon: "auto_stories",
      variant: "success",
    },
    {
      id: "avg_session",
      label: "Promedio de sesion",
      value: loading ? "..." : summary.avgSessionMinutes !== null ? `${summary.avgSessionMinutes} min` : "-",
      helper: `${summary.completedExamSessions} sesiones finalizadas`,
      icon: "timer",
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
      id: "gateway",
      title: "API Gateway",
      status: "connected" as AdminModuleStatus,
      detail: "Node.js - Puerto 3000 - OK",
      icon: "hub",
    },
    {
      id: "questionBank",
      title: "Question Bank",
      status: toStatus(summary.moduleHealth.questionBank.status),
      detail:
        summary.moduleHealth.questionBank.error ??
        `FastAPI - Puerto 3001 - ${summary.questionBankTotal} items`,
      icon: "quiz",
    },
    {
      id: "aiGenerator",
      title: "AI Generator",
      status: "pending" as AdminModuleStatus,
      detail: "FastAPI - Puerto 3002 - Sin consultar",
      icon: "auto_awesome",
    },
    {
      id: "examEngine",
      title: "Exam Engine",
      status: summary.completedExamSessions > 0 ? "connected" : "pending",
      detail: `FastAPI - Puerto 3003 - ${summary.completedExamSessions} sesiones`,
      icon: "edit_note",
    },
    {
      id: "diagnostic",
      title: "Diagnostic Engine",
      status: summary.totalDiagnostics > 0 ? "connected" : "pending",
      detail: `FastAPI - Puerto 3004 - ${summary.completedDiagnostics} completados`,
      icon: "psychology",
    },
    {
      id: "studyPlanner",
      title: "Study Planner",
      status: summary.totalStudyPlans > 0 ? "connected" : "pending",
      detail: `FastAPI - Puerto 3005 - ${summary.activeStudyPlans} activos`,
      icon: "calendar_month",
    },
    {
      id: "notifications",
      title: "Notifications",
      status: toStatus(summary.moduleHealth.notifications.status),
      detail:
        summary.moduleHealth.notifications.error ??
        `FastAPI - Puerto 3007 - ${summary.unreadNotifications} sin leer`,
      icon: "notifications",
    },
  ];
}

function buildQuickActions(summary: AdminDashboardSummary): AdminQuickActionModel[] {
  return [
    {
      id: "review-questions",
      label: "Revisar preguntas pendientes",
      description: `${summary.pendingReviewQuestions} preguntas esperan aprobacion`,
      icon: "quiz",
      targetPath: "/admin/preguntas",
      variant: "primary",
    },
    {
      id: "generate-ai",
      label: "Generar preguntas con IA",
      description: "ScholarAI - ICFES Evidence-Centered Design",
      icon: "auto_awesome",
      targetPath: "/admin/preguntas",
      variant: "default",
    },
    {
      id: "report",
      label: "Ver reporte institucional",
      description: "Exportar PDF - ultimos 30 dias",
      icon: "analytics",
      targetPath: "/admin/analytics",
      variant: "default",
    },
    {
      id: "students",
      label: "Gestionar estudiantes",
      description: `${summary.institutionStudents} activos - sincronizado con Kampus`,
      icon: "people",
      targetPath: "/admin/estudiantes",
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
  completedDiagnostics: 0,
  totalDiagnostics: 0,
  activeStudyPlans: 0,
  totalStudyPlans: 0,
  completedExamSessions: 0,
  avgSessionMinutes: null,
  areaPerformance: [],
  matCompetencies: [],
  matStrugglingComponents: [],
  matHardestQuestions: [],
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
    areaPerformance: summary.areaPerformance,
    metrics: buildMetrics(summary, loading),
    matAnalytics: {
      competencies: summary.matCompetencies,
      strugglingComponents: summary.matStrugglingComponents,
      hardestQuestions: summary.matHardestQuestions,
    },
    modules: buildModules(summary),
    quickActions: buildQuickActions(summary),
    reload: load,
  };
}
