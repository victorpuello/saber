import { useMemo } from "react";
import {
  type AuthFetch,
  type StudentDashboardSummary,
} from "../../../services/dashboard";
import type {
  DashboardActivityModel,
  DashboardAreaPerformanceModel,
  DashboardHeroModel,
  DashboardMetricModel,
  DashboardModuleModel,
  DashboardNotificationModel,
  DashboardQuickActionModel,
  DashboardTaskModel,
  StudentDashboardViewModel,
} from "./types";
import { useStudentDashboardSummary } from "./useStudentDashboardSummary";

const AREA_LABELS: Record<string, string> = {
  MAT: "Matematicas",
  LC: "Lectura critica",
  SC: "Sociales",
  CN: "Ciencias naturales",
  ING: "Ingles",
};

interface UseStudentDashboardViewModelOptions {
  authFetch: AuthFetch;
  userId: number | null;
  studentName: string;
  grade: string | null;
}

interface UseStudentDashboardViewModelResult {
  viewModel: StudentDashboardViewModel;
  reload: () => Promise<void>;
}

function getAreaLabel(areaCode: string | null | undefined): string {
  if (!areaCode) {
    return "tu progreso general";
  }

  return AREA_LABELS[areaCode] ?? areaCode;
}

function formatDateLabel(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat("es-CO", {
    day: "2-digit",
    month: "short",
  }).format(date);
}

function buildHero(summary: StudentDashboardSummary | null, loading: boolean): DashboardHeroModel {
  if (loading) {
    return {
      title: "Ritmo academico actual",
      subtitle: "Cargando resumen del estudiante...",
      value: "...",
      maxValueLabel: "",
      progressPercent: 0,
      trendLabel: "Sin datos aun",
    };
  }

  const hasActivePlan = Boolean(summary?.activePlanWeeks && summary.currentPlanWeek);
  const score = summary?.estimatedScoreGlobal ?? summary?.avgExamScore;
  const progress = summary?.progressPercent ?? 0;
  const strongestArea = getAreaLabel(summary?.strongestAreaCode);
  const diagnosticDate = formatDateLabel(summary?.lastDiagnosticAt);

  return {
    title: "Ritmo academico actual",
    subtitle: hasActivePlan
      ? "Avanza con consistencia sobre tu plan activo."
      : "Aun no tienes plan activo. Genera uno para empezar.",
    value: score !== null ? `${score}` : hasActivePlan ? `Semana ${summary?.currentPlanWeek ?? 1}` : "Sin plan",
    maxValueLabel: score !== null ? "/ 500" : hasActivePlan ? `${summary?.activePlanWeeks ?? 0} semanas` : "",
    progressPercent: progress,
    trendLabel:
      score !== null
        ? diagnosticDate
          ? `Ultimo diagnostico: ${diagnosticDate} · Fortaleza actual: ${strongestArea}`
          : `Progreso del plan: ${progress}%`
        : "Completa diagnostico y genera plan para activar progreso.",
  };
}

function buildMetrics(summary: StudentDashboardSummary | null, loading: boolean): DashboardMetricModel[] {
  return [
    {
      id: "plan",
      label: "Plan activo",
      value: loading ? "..." : summary?.activePlanWeeks ? `${summary.activePlanWeeks} semanas` : "Sin plan",
      helper: summary && summary.progressPercent !== null ? `${summary.progressPercent}% completado` : "Estado del plan actual",
    },
    {
      id: "week",
      label: "Semana actual",
      value: loading ? "..." : summary?.currentPlanWeek ? `Semana ${summary.currentPlanWeek}` : "-",
      helper: "Semana en curso",
    },
    {
      id: "sessions",
      label: "Sesiones completadas",
      value: loading ? "..." : String(summary?.completedSessions ?? 0),
      helper:
        summary && summary.avgExamScore !== null
          ? `Promedio: ${summary.avgExamScore}/500${summary.avgAccuracy !== null ? ` · Precision ${summary.avgAccuracy}%` : ""}`
          : "Historial registrado",
    },
    {
      id: "notifications",
      label: "Notificaciones",
      value: loading ? "..." : String(summary?.unreadNotifications ?? 0),
      helper:
        summary && summary.totalUnits > 0
          ? `${summary.completedUnits}/${summary.totalUnits} unidades completadas`
          : "Pendientes por leer",
    },
  ];
}

function buildNextTask(summary: StudentDashboardSummary | null, loading: boolean): DashboardTaskModel {
  if (loading) {
    return {
      title: "Preparando siguiente accion",
      description: "Estamos calculando la mejor accion para hoy.",
      ctaLabel: "Cargando...",
      hint: "Esto tarda solo unos segundos.",
    };
  }

  if ((summary?.diagnosticInProgressSessions ?? 0) > 0) {
    return {
      title: `Retoma tu diagnostico de ${getAreaLabel(summary?.latestDiagnosticAreaCode)}`,
      description: "Hay una sesion diagnostica en curso. Terminarla mejora la precision del plan y del foco semanal.",
      ctaLabel: "Continuar diagnostico",
      hint: `${summary?.diagnosticInProgressSessions ?? 0} sesion(es) en progreso.`,
      emphasis: "Diagnostico en curso",
      targetPath: "/student/diagnostico",
    };
  }

  if ((summary?.diagnosticCompetencies ?? 0) === 0) {
    return {
      title: "Completa tu diagnostico inicial",
      description: "Necesitamos tu perfil de competencias para personalizar mejor tus tareas.",
      ctaLabel: "Iniciar diagnostico",
      hint: "Tu plan se vuelve mas preciso con este paso.",
      emphasis: "Diagnostico pendiente",
      targetPath: "/student/diagnostico",
    };
  }

  if (!summary?.activePlanWeeks) {
    return {
      title: "Genera tu primer plan de estudio",
      description: "No encontramos un plan activo. Genera uno para empezar a estudiar con foco semanal.",
      ctaLabel: "Generar plan",
      hint: "Recomendado para iniciar el recorrido.",
      emphasis: "Sin plan activo",
      targetPath: "/student/plan",
    };
  }

  if (summary.nextRecommendedUnit) {
    return {
      title: summary.nextRecommendedUnit.title,
      description:
        summary.nextRecommendedUnit.description ??
        `Unidad prioritaria del area ${summary.nextRecommendedUnit.areaCode} para sostener el avance de esta semana.`,
      ctaLabel: "Continuar unidad",
      hint: `${summary.nextRecommendedUnit.recommendedQuestions} preguntas recomendadas`,
      emphasis: `Prioridad ${summary.nextRecommendedUnit.priority}`,
      targetPath: "/student/plan",
    };
  }

  if (summary?.weakestAreaCode) {
    return {
      title: `Refuerza ${getAreaLabel(summary.weakestAreaCode)}`,
      description: "Tus datos recientes muestran que esta area necesita mas consistencia. Una sesion corta hoy puede corregir la tendencia.",
      ctaLabel: "Practicar area",
      hint: "Prioriza una sesion breve de preguntas guiadas.",
      emphasis: "Area a reforzar",
      targetPath: "/student/plan",
    };
  }

  return {
    title: `Continua con la semana ${summary.currentPlanWeek ?? 1}`,
    description:
      summary.progressPercent !== null && summary.progressPercent < 50
        ? "Tu avance aun esta en la primera mitad del plan. Mantener continuidad esta semana es la prioridad correcta."
        : "Ya tienes una base activa. Mantener continuidad semanal acelera tu progreso global.",
    ctaLabel: "Continuar plan",
    hint: "Sesion corta recomendada: 25 minutos.",
    emphasis: "Semana activa",
    targetPath: "/student/plan",
  };
}

function buildActivities(summary: StudentDashboardSummary | null, loading: boolean): DashboardActivityModel[] {
  if (loading) {
    return [
      { id: "a1", title: "Cargando actividad...", detail: "Espera un momento", tone: "info" },
      { id: "a2", title: "Cargando actividad...", detail: "Espera un momento", tone: "info" },
      { id: "a3", title: "Cargando actividad...", detail: "Espera un momento", tone: "info" },
    ];
  }

  const recentExams = (summary?.recentExams ?? []).map((exam) => ({
    id: exam.id,
    title: `${exam.exam_type}${exam.area_code ? ` · ${exam.area_code}` : ""}`,
    detail:
      exam.score_global !== null
        ? `Puntaje registrado: ${Math.round(exam.score_global)}/500${exam.accuracy !== null ? ` · ${Math.round(exam.accuracy)}% de precision` : ""}`
        : "Resultado disponible.",
    tone: "success" as const,
  }));

  const diagnosticItem = summary?.lastDiagnosticAt
    ? {
        id: "diagnostic-last",
        title: `Diagnostico reciente · ${getAreaLabel(summary.latestDiagnosticAreaCode)}`,
        detail: `Ultima actualizacion del perfil: ${formatDateLabel(summary.lastDiagnosticAt) ?? "reciente"}.`,
        tone: "info" as const,
      }
    : null;

  const inboxTone: "warning" | "info" = (summary?.unreadNotifications ?? 0) > 0 ? "warning" : "info";

  const inboxItem = {
    id: "inbox",
    title: "Bandeja academica",
    detail: `${summary?.unreadNotifications ?? 0} notificaciones pendientes de lectura.`,
    tone: inboxTone,
  };

  return [diagnosticItem, ...recentExams, inboxItem]
    .filter((item): item is DashboardActivityModel => Boolean(item))
    .slice(0, 4);
}

function buildAreaPerformance(summary: StudentDashboardSummary | null, loading: boolean): DashboardAreaPerformanceModel[] {
  if (loading) {
    return [
      { id: "p1", label: "Cargando...", progressPercent: 0, progressLabel: "", accuracyLabel: "" },
      { id: "p2", label: "Cargando...", progressPercent: 0, progressLabel: "", accuracyLabel: "" },
      { id: "p3", label: "Cargando...", progressPercent: 0, progressLabel: "", accuracyLabel: "" },
    ];
  }

  return (summary?.areaBreakdown ?? []).map((area) => ({
    id: area.areaCode,
    label: AREA_LABELS[area.areaCode] ?? area.areaCode,
    progressPercent: area.progressPercent,
    progressLabel: `${area.completedUnits}/${area.totalUnits} unidades completadas`,
    accuracyLabel:
      area.accuracyPercent !== null
        ? `Precision registrada: ${area.accuracyPercent}% · ${area.competenciesTracked} competencias con datos`
        : "Sin precision historica disponible",
  }));
}

function buildNotifications(summary: StudentDashboardSummary | null, loading: boolean): DashboardNotificationModel[] {
  if (loading) {
    return [
      { id: "n1", title: "Cargando...", detail: "", meta: "", unread: false },
      { id: "n2", title: "Cargando...", detail: "", meta: "", unread: false },
    ];
  }

  return (summary?.recentNotifications ?? []).map((notification) => ({
    id: notification.id,
    title: notification.title,
    detail: notification.body,
    meta: notification.created_at.replace("T", " ").slice(0, 16),
    unread: !notification.read,
  }));
}

function buildQuickActions(loading: boolean): DashboardQuickActionModel[] {
  if (loading) {
    return [
      { id: "q1", label: "Cargando...", description: "" },
      { id: "q2", label: "Cargando...", description: "" },
      { id: "q3", label: "Cargando...", description: "" },
    ];
  }

  return [
    {
      id: "diagnostic",
      label: "Diagnostico",
      description: "Mide fortalezas y brechas por competencia.",
      targetPath: "/student/diagnostico",
    },
    {
      id: "plan",
      label: "Plan semanal",
      description: "Revisa tareas recomendadas y prioridades.",
      targetPath: "/student/plan",
    },
    {
      id: "results",
      label: "Resultados",
      description: "Consulta desempeno de simulacros recientes.",
      targetPath: "/student/resultados",
    },
  ];
}

function buildModules(summary: StudentDashboardSummary | null, loading: boolean): DashboardModuleModel[] {
  if (loading) {
    return [
      { id: "m1", title: "Diagnostico", status: "pending", detail: "Cargando estado..." },
      { id: "m2", title: "Plan de estudio", status: "pending", detail: "Cargando estado..." },
      { id: "m3", title: "Simulacros", status: "pending", detail: "Cargando estado..." },
    ];
  }

  return [
    {
      id: "diagnostic",
      title: "Diagnostico",
      status: summary?.moduleHealth.diagnostic.status ?? "pending",
      detail:
        summary?.moduleHealth.diagnostic.status === "degraded"
          ? summary.moduleHealth.diagnostic.error ?? "El diagnostico respondio con errores parciales."
          : (summary?.diagnosticCompetencies ?? 0) > 0
            ? `${summary?.diagnosticCompetencies ?? 0} competencias registradas${summary?.diagnosticInProgressSessions ? ` · ${summary.diagnosticInProgressSessions} sesion(es) en curso` : ""}.`
            : "Aun no hay competencias registradas.",
    },
    {
      id: "plan",
      title: "Plan de estudio",
      status: summary?.moduleHealth.plan.status ?? "pending",
      detail:
        summary?.moduleHealth.plan.status === "degraded"
          ? summary.moduleHealth.plan.error ?? "El plan activo no se pudo reconstruir completo."
          : summary?.activePlanWeeks
            ? `Activo: ${summary.activePlanWeeks} semanas, semana ${summary.currentPlanWeek ?? 1}.`
            : "No hay plan activo.",
    },
    {
      id: "sessions",
      title: "Simulacros",
      status: summary?.moduleHealth.sessions.status ?? "pending",
      detail:
        summary?.moduleHealth.sessions.status === "degraded"
          ? summary.moduleHealth.sessions.error ?? "El historial de simulacros no pudo consolidarse."
          : (summary?.completedSessions ?? 0) > 0
            ? `${summary?.completedSessions ?? 0} sesiones en historial${summary && summary.avgExamScore !== null ? ` · promedio ${summary.avgExamScore}/500` : ""}.`
            : "Sin sesiones registradas todavia.",
    },
    {
      id: "notifications",
      title: "Notificaciones",
      status: summary?.moduleHealth.notifications.status ?? "connected",
      detail:
        summary?.moduleHealth.notifications.status === "degraded"
          ? summary.moduleHealth.notifications.error ?? "La bandeja no se pudo sincronizar por completo."
          : `${summary?.unreadNotifications ?? 0} pendientes de lectura.`,
    },
  ];
}

function buildViewModel(
  summary: StudentDashboardSummary | null,
  loading: boolean,
  studentName: string,
  grade: string | null,
): StudentDashboardViewModel {
  return {
    studentName,
    periodLabel: grade ? `Grado ${grade}` : "Sin grado asignado",
    loading,
    errors: summary?.errors ?? [],
    hero: buildHero(summary, loading),
    metrics: buildMetrics(summary, loading),
    nextTask: buildNextTask(summary, loading),
    areaPerformance: buildAreaPerformance(summary, loading),
    notifications: buildNotifications(summary, loading),
    activities: buildActivities(summary, loading),
    quickActions: buildQuickActions(loading),
    modules: buildModules(summary, loading),
  };
}

export function useStudentDashboardViewModel({
  authFetch,
  userId,
  studentName,
  grade,
}: UseStudentDashboardViewModelOptions): UseStudentDashboardViewModelResult {
  const { summary, loading, reload } = useStudentDashboardSummary({ authFetch, userId });

  const viewModel = useMemo(
    () => buildViewModel(summary, loading, studentName, grade),
    [summary, loading, studentName, grade],
  );

  return {
    viewModel,
    reload,
  };
}
