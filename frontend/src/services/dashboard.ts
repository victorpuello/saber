import { getApiErrorMessage, isApiError } from "./api";

export type AuthFetch = <T = unknown>(path: string, init?: RequestInit) => Promise<T>;

export type DashboardDataStatus = "connected" | "pending" | "degraded";

export interface StudentDashboardModuleHealth {
  status: DashboardDataStatus;
  error: string | null;
}

interface QuestionStatsSummary {
  total: number;
  by_status: Record<string, number>;
}

interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
}

interface PlanHistoryItem {
  id: string;
  status: string;
  total_weeks: number;
  current_week: number;
}

interface PlanProgressByArea {
  total: number;
  completed: number;
  correct: number;
  attempted: number;
}

interface PlanProgressOut {
  total_units: number;
  completed_units: number;
  progress_percent: number;
  current_week: number;
  total_weeks: number;
  by_area: Record<string, PlanProgressByArea>;
}

interface WeekUnitOut {
  id: string;
  competency_id: string;
  area_code: string;
  title: string;
  description: string | null;
  priority: string;
  recommended_questions: number;
  completed: boolean;
}

interface WeekOut {
  week_number: number;
  units: WeekUnitOut[];
}

interface DiagnosticCompetencyScoreOut {
  competency_id: string;
  theta_estimate: number;
  standard_error: number;
  performance_level: number | null;
  classification: string | null;
  questions_attempted: number;
  questions_correct: number;
  last_updated_at: string;
}

interface ProfileOut {
  last_diagnostic_at: string | null;
  overall_estimated_level: number | null;
  estimated_score_global: number | null;
  competency_scores: DiagnosticCompetencyScoreOut[];
}

interface StudentExamResultOut {
  id: string;
  exam_type: string;
  area_code: string | null;
  score_global: number | null;
  accuracy: number | null;
  total_questions: number;
  correct_answers: number;
  completed_at: string;
}

interface CompetencySnapshotOut {
  competency_id: string;
  area_code: string;
  theta_estimate: number;
  performance_level: number | null;
  classification: string | null;
  questions_attempted: number;
  questions_correct: number;
  last_updated_at: string;
}

interface StudentProgressOut {
  student_user_id: number;
  exam_count: number;
  avg_score: number | null;
  avg_accuracy: number | null;
  recent_exams: StudentExamResultOut[];
  competencies: CompetencySnapshotOut[];
}

interface ClassroomAnalyticsOut {
  total_students: number;
  avg_score: number | null;
}

interface InstitutionReportOut {
  total_students: number;
  total_exams?: number;
  total_diagnostics?: number;
  avg_score_global: number | null;
  avg_accuracy_global?: number | null;
  areas?: Array<{
    area_code: string;
    avg_score: number | null;
    avg_accuracy: number | null;
    exams_count: number;
    students_count: number;
  }>;
}

interface QuestionStatOut {
  question_id: string;
  area_code: string | null;
  competency_id: string | null;
  times_presented: number;
  times_correct: number;
  accuracy_rate: number | null;
  count_a: number;
  count_b: number;
  count_c: number;
  count_d: number;
}

interface QuestionPerformanceOut {
  avg_accuracy_rate: number | null;
  hardest_questions?: QuestionStatOut[];
}

export interface MatCompetencyBreakdownItem {
  competency_id: string;
  students: number;
  avg_theta: number | null;
  questions_attempted: number;
  questions_correct: number;
  avg_accuracy: number | null;
}

interface MatCompetencyBreakdownOut {
  items: MatCompetencyBreakdownItem[];
}

export interface MatStrugglingComponentItem {
  component_id: string;
  label: string;
  failure_rate: number;
  avg_accuracy: number;
  students: number;
  questions_attempted: number;
  source: string;
}

interface MatStrugglingComponentsOut {
  items: MatStrugglingComponentItem[];
}

export interface MatQuestionErrorItem {
  questionId: string;
  accuracyRate: number | null;
  timesPresented: number;
  mostSelected: string | null;
  mostSelectedCount: number;
}

interface UnreadCountOut {
  unread: number;
}

interface NotificationItemOut {
  id: string;
  title: string;
  body: string;
  read: boolean;
  created_at: string;
}

interface NotificationListOut {
  items: NotificationItemOut[];
  unread: number;
}

interface MarkReadResponse {
  marked: number;
}

interface StudentStatsOverviewOut {
  total_active: number;
  total_withdrawn: number;
  total_inactive: number;
}

interface DiagnosticStatsOut {
  total: number;
  in_progress: number;
  completed: number;
  abandoned: number;
  students: number;
  avg_questions_answered: number | null;
}

interface PlanStatsOut {
  total: number;
  active: number;
  paused: number;
  completed: number;
  replaced: number;
  total_units: number;
  completed_units: number;
}

interface SessionStatsOut {
  total: number;
  in_progress: number;
  completed: number;
  abandoned: number;
  timed_out: number;
  avg_score_global: number | null;
  avg_time_spent_seconds: number | null;
}

interface DiagnosticSessionSummary {
  id: string;
  area_code: string;
  status: string;
  current_theta: number;
  questions_answered: number;
  started_at: string;
  finished_at: string | null;
}

interface SessionHistoryItem {
  id: string;
  status: string;
  score_global: number | null;
  total_correct: number | null;
  total_answered: number | null;
  started_at: string;
  finished_at: string | null;
}

interface SafeCallOptions {
  optionalStatuses?: number[];
  fallbackMessage?: string;
}

interface SafeCallResult<T> {
  data: T | null;
  error: string | null;
}

async function safeCall<T>(
  promiseFactory: () => Promise<T>,
  options: SafeCallOptions = {},
): Promise<SafeCallResult<T>> {
  try {
    const data = await promiseFactory();
    return { data, error: null };
  } catch (error) {
    if (isApiError(error) && options.optionalStatuses?.includes(error.status)) {
      return { data: null, error: null };
    }

    return {
      data: null,
      error: getApiErrorMessage(error, options.fallbackMessage ?? "No se pudo cargar información del módulo."),
    };
  }
}

function compactErrors(...errors: Array<string | null | undefined>): string[] {
  return [...new Set(errors.filter((value): value is string => Boolean(value)))];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function asBoolean(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asRecord(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

function adaptPlanHistory(payload: unknown): PlanHistoryItem[] {
  return asArray(payload)
    .map((item) => {
      const record = asRecord(item);
      const id = asString(record.id);
      const status = asString(record.status);
      const totalWeeks = asNumber(record.total_weeks);
      const currentWeek = asNumber(record.current_week);

      if (!id || !status || totalWeeks === null || currentWeek === null) {
        return null;
      }

      return {
        id,
        status,
        total_weeks: totalWeeks,
        current_week: currentWeek,
      } satisfies PlanHistoryItem;
    })
    .filter((item): item is PlanHistoryItem => item !== null);
}

function adaptPlanProgress(payload: unknown): PlanProgressOut | null {
  if (!isRecord(payload)) {
    return null;
  }

  const totalUnits = asNumber(payload.total_units);
  const completedUnits = asNumber(payload.completed_units);
  const progressPercent = asNumber(payload.progress_percent);
  const currentWeek = asNumber(payload.current_week);
  const totalWeeks = asNumber(payload.total_weeks);

  if (
    totalUnits === null ||
    completedUnits === null ||
    progressPercent === null ||
    currentWeek === null ||
    totalWeeks === null
  ) {
    return null;
  }

  const by_area: Record<string, PlanProgressByArea> = {};
  for (const [areaCode, value] of Object.entries(asRecord(payload.by_area))) {
    const area = asRecord(value);
    const total = asNumber(area.total);
    const completed = asNumber(area.completed);
    const correct = asNumber(area.correct);
    const attempted = asNumber(area.attempted);

    if (total === null || completed === null || correct === null || attempted === null) {
      continue;
    }

    by_area[areaCode] = { total, completed, correct, attempted };
  }

  return {
    total_units: totalUnits,
    completed_units: completedUnits,
    progress_percent: progressPercent,
    current_week: currentWeek,
    total_weeks: totalWeeks,
    by_area,
  };
}

function adaptWeek(payload: unknown): WeekOut | null {
  if (!isRecord(payload)) {
    return null;
  }

  const weekNumber = asNumber(payload.week_number);
  if (weekNumber === null) {
    return null;
  }

  const units = asArray(payload.units)
    .map((item) => {
      const unit = asRecord(item);
      const id = asString(unit.id);
      const competencyId = asString(unit.competency_id);
      const areaCode = asString(unit.area_code);
      const title = asString(unit.title);
      const priority = asString(unit.priority);
      const recommendedQuestions = asNumber(unit.recommended_questions);
      const completed = asBoolean(unit.completed);

      if (!id || !competencyId || !areaCode || !title || !priority || recommendedQuestions === null || completed === null) {
        return null;
      }

      return {
        id,
        competency_id: competencyId,
        area_code: areaCode,
        title,
        description: asString(unit.description),
        priority,
        recommended_questions: recommendedQuestions,
        completed,
      } satisfies WeekUnitOut;
    })
    .filter((item): item is WeekUnitOut => item !== null);

  return { week_number: weekNumber, units };
}

function adaptDiagnosticSessions(payload: unknown): DiagnosticSessionSummary[] {
  return asArray(payload)
    .map((item) => {
      const record = asRecord(item);
      const id = asString(record.id);
      const areaCode = asString(record.area_code);
      const status = asString(record.status);
      const currentTheta = asNumber(record.current_theta);
      const questionsAnswered = asNumber(record.questions_answered);
      const startedAt = asString(record.started_at);

      if (!id || !areaCode || !status || currentTheta === null || questionsAnswered === null || !startedAt) {
        return null;
      }

      return {
        id,
        area_code: areaCode,
        status,
        current_theta: currentTheta,
        questions_answered: questionsAnswered,
        started_at: startedAt,
        finished_at: asString(record.finished_at),
      } satisfies DiagnosticSessionSummary;
    })
    .filter((item): item is DiagnosticSessionSummary => item !== null);
}

function adaptProfile(payload: unknown): ProfileOut | null {
  if (!isRecord(payload)) {
    return null;
  }

  const competencyScores = asArray(payload.competency_scores)
    .map((item) => {
      const score = asRecord(item);
      const competencyId = asString(score.competency_id);
      const thetaEstimate = asNumber(score.theta_estimate);
      const standardError = asNumber(score.standard_error);
      const questionsAttempted = asNumber(score.questions_attempted);
      const questionsCorrect = asNumber(score.questions_correct);
      const lastUpdatedAt = asString(score.last_updated_at);

      if (
        !competencyId ||
        thetaEstimate === null ||
        standardError === null ||
        questionsAttempted === null ||
        questionsCorrect === null ||
        !lastUpdatedAt
      ) {
        return null;
      }

      return {
        competency_id: competencyId,
        theta_estimate: thetaEstimate,
        standard_error: standardError,
        performance_level: asNumber(score.performance_level),
        classification: asString(score.classification),
        questions_attempted: questionsAttempted,
        questions_correct: questionsCorrect,
        last_updated_at: lastUpdatedAt,
      } satisfies DiagnosticCompetencyScoreOut;
    })
    .filter((item): item is DiagnosticCompetencyScoreOut => item !== null);

  const profile: ProfileOut = {
    last_diagnostic_at: asString(payload.last_diagnostic_at),
    overall_estimated_level: asNumber(payload.overall_estimated_level),
    estimated_score_global: asNumber(payload.estimated_score_global),
    competency_scores: competencyScores,
  };

  if (
    profile.last_diagnostic_at === null &&
    profile.overall_estimated_level === null &&
    profile.estimated_score_global === null &&
    profile.competency_scores.length === 0
  ) {
    return null;
  }

  return profile;
}

function adaptStudentProgress(payload: unknown): StudentProgressOut | null {
  if (!isRecord(payload)) {
    return null;
  }

  const studentUserId = asNumber(payload.student_user_id);
  const examCount = asNumber(payload.exam_count);
  if (studentUserId === null || examCount === null) {
    return null;
  }

  const recent_exams = asArray(payload.recent_exams)
    .map((item) => {
      const exam = asRecord(item);
      const id = asString(exam.id);
      const examType = asString(exam.exam_type);
      const totalQuestions = asNumber(exam.total_questions);
      const correctAnswers = asNumber(exam.correct_answers);
      const completedAt = asString(exam.completed_at);

      if (!id || !examType || totalQuestions === null || correctAnswers === null || !completedAt) {
        return null;
      }

      return {
        id,
        exam_type: examType,
        area_code: asString(exam.area_code),
        score_global: asNumber(exam.score_global),
        accuracy: asNumber(exam.accuracy),
        total_questions: totalQuestions,
        correct_answers: correctAnswers,
        completed_at: completedAt,
      } satisfies StudentExamResultOut;
    })
    .filter((item): item is StudentExamResultOut => item !== null);

  const competencies = asArray(payload.competencies)
    .map((item) => {
      const competency = asRecord(item);
      const competencyId = asString(competency.competency_id);
      const areaCode = asString(competency.area_code);
      const thetaEstimate = asNumber(competency.theta_estimate);
      const questionsAttempted = asNumber(competency.questions_attempted);
      const questionsCorrect = asNumber(competency.questions_correct);
      const lastUpdatedAt = asString(competency.last_updated_at);

      if (
        !competencyId ||
        !areaCode ||
        thetaEstimate === null ||
        questionsAttempted === null ||
        questionsCorrect === null ||
        !lastUpdatedAt
      ) {
        return null;
      }

      return {
        competency_id: competencyId,
        area_code: areaCode,
        theta_estimate: thetaEstimate,
        performance_level: asNumber(competency.performance_level),
        classification: asString(competency.classification),
        questions_attempted: questionsAttempted,
        questions_correct: questionsCorrect,
        last_updated_at: lastUpdatedAt,
      } satisfies CompetencySnapshotOut;
    })
    .filter((item): item is CompetencySnapshotOut => item !== null);

  return {
    student_user_id: studentUserId,
    exam_count: examCount,
    avg_score: asNumber(payload.avg_score),
    avg_accuracy: asNumber(payload.avg_accuracy),
    recent_exams,
    competencies,
  };
}

function adaptUnreadCount(payload: unknown): UnreadCountOut | null {
  if (!isRecord(payload)) {
    return null;
  }

  const unread = asNumber(payload.unread);
  return unread === null ? null : { unread };
}

function adaptNotificationList(payload: unknown): NotificationListOut | null {
  if (!isRecord(payload)) {
    return null;
  }

  const items = asArray(payload.items)
    .map((item) => {
      const notification = asRecord(item);
      const id = asString(notification.id);
      const title = asString(notification.title);
      const body = asString(notification.body);
      const read = asBoolean(notification.read);
      const createdAt = asString(notification.created_at);

      if (!id || !title || !body || read === null || !createdAt) {
        return null;
      }

      return {
        id,
        title,
        body,
        read,
        created_at: createdAt,
      } satisfies NotificationItemOut;
    })
    .filter((item): item is NotificationItemOut => item !== null);

  const unread = asNumber(payload.unread);
  if (unread === null && items.length === 0) {
    return null;
  }

  return {
    items,
    unread: unread ?? items.filter((item) => !item.read).length,
  };
}

function adaptSessionHistory(payload: unknown): PaginatedResponse<SessionHistoryItem> | null {
  if (!isRecord(payload)) {
    return null;
  }

  const total = asNumber(payload.total);
  const page = asNumber(payload.page);
  const pageSize = asNumber(payload.page_size);
  const pages = asNumber(payload.pages);

  if (total === null || page === null || pageSize === null || pages === null) {
    return null;
  }

  const items = asArray(payload.items)
    .map((item) => {
      const session = asRecord(item);
      const id = asString(session.id);
      const status = asString(session.status);
      const startedAt = asString(session.started_at);

      if (!id || !status || !startedAt) {
        return null;
      }

      return {
        id,
        status,
        score_global: asNumber(session.score_global),
        total_correct: asNumber(session.total_correct),
        total_answered: asNumber(session.total_answered),
        started_at: startedAt,
        finished_at: asString(session.finished_at),
      } satisfies SessionHistoryItem;
    })
    .filter((item): item is SessionHistoryItem => item !== null);

  return { items, total, page, page_size: pageSize, pages };
}

export interface StudentDashboardSummary {
  activePlanWeeks: number | null;
  currentPlanWeek: number | null;
  totalUnits: number;
  completedUnits: number;
  progressPercent: number | null;
  completedSessions: number;
  examCount: number;
  avgExamScore: number | null;
  avgAccuracy: number | null;
  estimatedScoreGlobal: number | null;
  overallEstimatedLevel: number | null;
  diagnosticCompetencies: number;
  diagnosticCompletedSessions: number;
  diagnosticInProgressSessions: number;
  lastDiagnosticAt: string | null;
  latestDiagnosticAreaCode: string | null;
  unreadNotifications: number;
  nextRecommendedUnit: {
    id: string;
    competencyId: string;
    areaCode: string;
    title: string;
    description: string | null;
    priority: string;
    recommendedQuestions: number;
  } | null;
  recentExams: StudentExamResultOut[];
  recentNotifications: NotificationItemOut[];
  areaBreakdown: Array<{
    areaCode: string;
    totalUnits: number;
    completedUnits: number;
    progressPercent: number;
    accuracyPercent: number | null;
    competenciesTracked: number;
  }>;
  weakestAreaCode: string | null;
  strongestAreaCode: string | null;
  moduleHealth: {
    diagnostic: StudentDashboardModuleHealth;
    plan: StudentDashboardModuleHealth;
    sessions: StudentDashboardModuleHealth;
    notifications: StudentDashboardModuleHealth;
  };
  errors: string[];
}

function roundScore(value: number | null | undefined): number | null {
  return typeof value === "number" ? Math.round(value) : null;
}

export function buildAreaBreakdown(
  planProgress: PlanProgressOut | null,
  studentProgress: StudentProgressOut | null,
): StudentDashboardSummary["areaBreakdown"] {
  const areaMap = new Map<
    string,
    {
      totalUnits: number;
      completedUnits: number;
      attempted: number;
      correct: number;
      competenciesTracked: number;
    }
  >();

  if (planProgress?.by_area) {
    for (const [areaCode, stats] of Object.entries(planProgress.by_area)) {
      areaMap.set(areaCode, {
        totalUnits: stats.total,
        completedUnits: stats.completed,
        attempted: stats.attempted,
        correct: stats.correct,
        competenciesTracked: 0,
      });
    }
  }

  for (const competency of studentProgress?.competencies ?? []) {
    const current = areaMap.get(competency.area_code) ?? {
      totalUnits: 0,
      completedUnits: 0,
      attempted: 0,
      correct: 0,
      competenciesTracked: 0,
    };

    current.attempted += competency.questions_attempted;
    current.correct += competency.questions_correct;
    current.competenciesTracked += 1;
    areaMap.set(competency.area_code, current);
  }

  return [...areaMap.entries()]
    .map(([areaCode, stats]) => {
      const progressPercent = stats.totalUnits > 0 ? Math.round((stats.completedUnits / stats.totalUnits) * 100) : 0;
      const accuracyPercent = stats.attempted > 0 ? Math.round((stats.correct / stats.attempted) * 100) : null;

      return {
        areaCode,
        totalUnits: stats.totalUnits,
        completedUnits: stats.completedUnits,
        progressPercent,
        accuracyPercent,
        competenciesTracked: stats.competenciesTracked,
      };
    })
    .sort((left, right) => right.progressPercent - left.progressPercent || left.areaCode.localeCompare(right.areaCode));
}

export function pickAreaByPriority(
  areaBreakdown: StudentDashboardSummary["areaBreakdown"],
  direction: "asc" | "desc",
): string | null {
  const ranked = [...areaBreakdown].sort((left, right) => {
    const leftAccuracy = left.accuracyPercent ?? (direction === "asc" ? 101 : -1);
    const rightAccuracy = right.accuracyPercent ?? (direction === "asc" ? 101 : -1);

    if (leftAccuracy !== rightAccuracy) {
      return direction === "asc" ? leftAccuracy - rightAccuracy : rightAccuracy - leftAccuracy;
    }

    return direction === "asc"
      ? left.progressPercent - right.progressPercent
      : right.progressPercent - left.progressPercent;
  });

  return ranked[0]?.areaCode ?? null;
}

export function pickNextRecommendedUnit(weekData: WeekOut | null): StudentDashboardSummary["nextRecommendedUnit"] {
  const nextUnit = weekData?.units?.find((unit) => !unit.completed) ?? null;

  if (!nextUnit) {
    return null;
  }

  return {
    id: nextUnit.id,
    competencyId: nextUnit.competency_id,
    areaCode: nextUnit.area_code,
    title: nextUnit.title,
    description: nextUnit.description,
    priority: nextUnit.priority,
    recommendedQuestions: nextUnit.recommended_questions,
  };
}

function buildModuleHealth(status: DashboardDataStatus, error: string | null): StudentDashboardModuleHealth {
  return { status, error };
}

export async function fetchStudentDashboardSummary(authFetch: AuthFetch, studentUserId: number | null): Promise<StudentDashboardSummary> {
  const [planHistoryRes, planProgressRes, diagnosticSessionsRes, profileRes, sessionsRes, notificationsRes, notificationListRes, studentProgressRes] = await Promise.all([
    safeCall(() => authFetch<unknown>("/api/plans/history"), {
      fallbackMessage: "No se pudo cargar el historial del plan de estudio.",
    }),
    safeCall(() => authFetch<unknown>("/api/plans/active/progress"), {
      optionalStatuses: [404],
      fallbackMessage: "No se pudo cargar el progreso del plan activo.",
    }),
    safeCall(() => authFetch<unknown>("/api/diagnostic/sessions"), {
      fallbackMessage: "No se pudo cargar el historial del diagnóstico.",
    }),
    safeCall(() => authFetch<unknown>("/api/diagnostic/profile"), {
      optionalStatuses: [404],
      fallbackMessage: "No se pudo cargar el perfil diagnóstico.",
    }),
    safeCall(() => authFetch<unknown>("/api/sessions/history?page=1&page_size=5"), {
      fallbackMessage: "No se pudo cargar el historial de simulacros.",
    }),
    safeCall(() => authFetch<unknown>("/api/notifications/unread-count"), {
      fallbackMessage: "No se pudo cargar el contador de notificaciones.",
    }),
    safeCall(() => authFetch<unknown>("/api/notifications?limit=3"), {
      fallbackMessage: "No se pudo cargar la bandeja de notificaciones.",
    }),
    studentUserId
      ? safeCall(() => authFetch<unknown>(`/api/analytics/student/${studentUserId}/progress`), {
          optionalStatuses: [404],
          fallbackMessage: "No se pudo cargar el progreso analítico del estudiante.",
        })
      : Promise.resolve({ data: null, error: null } as SafeCallResult<unknown>),
  ]);

  const planHistory = adaptPlanHistory(planHistoryRes.data);
  const planProgress = adaptPlanProgress(planProgressRes.data);
  const diagnosticSessions = adaptDiagnosticSessions(diagnosticSessionsRes.data);
  const profile = adaptProfile(profileRes.data);
  const sessionHistory = adaptSessionHistory(sessionsRes.data);
  const unreadCount = adaptUnreadCount(notificationsRes.data);
  const notificationList = adaptNotificationList(notificationListRes.data);
  const studentProgress = adaptStudentProgress(studentProgressRes.data);

  const activePlan = planHistory.find((plan) => plan.status === "ACTIVE") ?? null;

  const activeWeekRes = activePlan?.current_week
    ? await safeCall(() => authFetch<unknown>(`/api/plans/active/week/${activePlan.current_week}`), {
        optionalStatuses: [404],
        fallbackMessage: "No se pudo cargar la semana activa del plan.",
      })
    : ({ data: null, error: null } as SafeCallResult<unknown>);

  const activeWeek = adaptWeek(activeWeekRes.data);
  const areaBreakdown = buildAreaBreakdown(planProgress, studentProgress);

  const diagnosticCompletedSessions = diagnosticSessions.filter((session) => session.status === "COMPLETED").length;
  const diagnosticInProgressSessions = diagnosticSessions.filter((session) => session.status === "IN_PROGRESS").length;
  const latestDiagnosticSession = diagnosticSessions[0] ?? null;

  const diagnosticError = diagnosticSessionsRes.error ?? profileRes.error;
  const planError = planHistoryRes.error ?? planProgressRes.error ?? activeWeekRes.error;
  const sessionsError = sessionsRes.error ?? studentProgressRes.error;
  const notificationsError = notificationsRes.error ?? notificationListRes.error;

  const diagnosticStatus: DashboardDataStatus = diagnosticError
    ? "degraded"
    : profile || diagnosticSessions.length > 0
      ? "connected"
      : "pending";

  const planStatus: DashboardDataStatus = planError
    ? "degraded"
    : activePlan || planProgress || activeWeek
      ? "connected"
      : "pending";

  const sessionsStatus: DashboardDataStatus = sessionsError
    ? "degraded"
    : (studentProgress?.exam_count ?? 0) > 0 || (sessionHistory?.total ?? 0) > 0
      ? "connected"
      : "pending";

  const notificationsStatus: DashboardDataStatus = notificationsError ? "degraded" : "connected";

  return {
    activePlanWeeks: activePlan?.total_weeks ?? null,
    currentPlanWeek: activePlan?.current_week ?? null,
    totalUnits: planProgress?.total_units ?? 0,
    completedUnits: planProgress?.completed_units ?? 0,
    progressPercent: planProgress?.progress_percent ?? null,
    completedSessions: sessionHistory?.total ?? studentProgress?.exam_count ?? 0,
    examCount: studentProgress?.exam_count ?? 0,
    avgExamScore: roundScore(studentProgress?.avg_score),
    avgAccuracy: roundScore(studentProgress?.avg_accuracy),
    estimatedScoreGlobal: roundScore(profile?.estimated_score_global),
    overallEstimatedLevel: profile?.overall_estimated_level ?? null,
    diagnosticCompetencies: profile?.competency_scores.length ?? 0,
    diagnosticCompletedSessions,
    diagnosticInProgressSessions,
    lastDiagnosticAt: profile?.last_diagnostic_at ?? latestDiagnosticSession?.finished_at ?? null,
    latestDiagnosticAreaCode: latestDiagnosticSession?.area_code ?? null,
    unreadNotifications: unreadCount?.unread ?? notificationList?.unread ?? 0,
    nextRecommendedUnit: pickNextRecommendedUnit(activeWeek),
    recentExams: studentProgress?.recent_exams.slice(0, 3) ?? [],
    recentNotifications: notificationList?.items ?? [],
    areaBreakdown,
    weakestAreaCode: pickAreaByPriority(areaBreakdown, "asc"),
    strongestAreaCode: pickAreaByPriority(areaBreakdown, "desc"),
    moduleHealth: {
      diagnostic: buildModuleHealth(diagnosticStatus, diagnosticError),
      plan: buildModuleHealth(planStatus, planError),
      sessions: buildModuleHealth(sessionsStatus, sessionsError),
      notifications: buildModuleHealth(notificationsStatus, notificationsError),
    },
    errors: compactErrors(
      planHistoryRes.error,
      planProgressRes.error,
      diagnosticSessionsRes.error,
      profileRes.error,
      sessionsRes.error,
      notificationsRes.error,
      notificationListRes.error,
      studentProgressRes.error,
      activeWeekRes.error,
    ),
  };
}

export async function markNotificationsAsRead(authFetch: AuthFetch, notificationIds: string[]): Promise<number> {
  if (notificationIds.length === 0) {
    return 0;
  }

  const response = await authFetch<MarkReadResponse>("/api/notifications/read", {
    method: "POST",
    body: JSON.stringify({ notification_ids: notificationIds }),
  });

  return response.marked ?? 0;
}

export interface TeacherDashboardSummary {
  questionBankTotal: number;
  pendingReviewQuestions: number;
  examsAvailable: number;
  classroomStudents: number;
  classroomAvgScore: number | null;
  matCompetencies: MatCompetencyBreakdownItem[];
  matStrugglingComponents: MatStrugglingComponentItem[];
  matHardestQuestions: MatQuestionErrorItem[];
  unreadNotifications: number;
  errors: string[];
}

export async function fetchTeacherDashboardSummary(
  authFetch: AuthFetch,
  grade = "11",
): Promise<TeacherDashboardSummary> {
  const [questionStatsRes, examsRes, classroomRes, notificationsRes, matCompetencyRes, matStrugglingRes, performanceRes] = await Promise.all([
    safeCall(() => authFetch<QuestionStatsSummary>("/api/questions/stats/summary")),
    safeCall(() => authFetch<PaginatedResponse<unknown>>("/api/exams/?page=1&page_size=5")),
    safeCall(() => authFetch<ClassroomAnalyticsOut>(`/api/analytics/classroom/${grade}`), { optionalStatuses: [404] }),
    safeCall(() => authFetch<UnreadCountOut>("/api/notifications/unread-count")),
    safeCall(() => authFetch<MatCompetencyBreakdownOut>(`/api/analytics/areas/MAT/competency-breakdown?group_id=${encodeURIComponent(grade)}`), { optionalStatuses: [404] }),
    safeCall(() => authFetch<MatStrugglingComponentsOut>(`/api/analytics/areas/MAT/struggling-components?group_id=${encodeURIComponent(grade)}`), { optionalStatuses: [404] }),
    safeCall(() => authFetch<QuestionPerformanceOut>("/api/analytics/questions/performance?limit=5"), { optionalStatuses: [404] }),
  ]);
  const matHardestQuestions = (performanceRes.data?.hardest_questions ?? [])
    .filter((question) => question.area_code === "MAT")
    .map((question) => {
      const counts = { A: question.count_a, B: question.count_b, C: question.count_c, D: question.count_d };
      const mostSelected = Object.entries(counts).sort((left, right) => right[1] - left[1])[0] ?? null;
      return {
        questionId: question.question_id,
        accuracyRate: question.accuracy_rate,
        timesPresented: question.times_presented,
        mostSelected: mostSelected && mostSelected[1] > 0 ? mostSelected[0] : null,
        mostSelectedCount: mostSelected?.[1] ?? 0,
      } satisfies MatQuestionErrorItem;
    });

  return {
    questionBankTotal: questionStatsRes.data?.total ?? 0,
    pendingReviewQuestions: questionStatsRes.data?.by_status?.PENDING_REVIEW ?? 0,
    examsAvailable: examsRes.data?.total ?? 0,
    classroomStudents: classroomRes.data?.total_students ?? 0,
    classroomAvgScore: classroomRes.data?.avg_score ?? null,
    matCompetencies: matCompetencyRes.data?.items ?? [],
    matStrugglingComponents: matStrugglingRes.data?.items ?? [],
    matHardestQuestions,
    unreadNotifications: notificationsRes.data?.unread ?? 0,
    errors: compactErrors(
      questionStatsRes.error,
      examsRes.error,
      classroomRes.error,
      notificationsRes.error,
      matCompetencyRes.error,
      matStrugglingRes.error,
      performanceRes.error,
    ),
  };
}

export interface AdminDashboardModuleHealth {
  questionBank: StudentDashboardModuleHealth;
  analytics: StudentDashboardModuleHealth;
  notifications: StudentDashboardModuleHealth;
}

export interface AdminDashboardSummary {
  questionBankTotal: number;
  pendingReviewQuestions: number;
  institutionStudents: number;
  institutionAvgScore: number | null;
  avgQuestionAccuracy: number | null;
  completedDiagnostics: number;
  totalDiagnostics: number;
  activeStudyPlans: number;
  totalStudyPlans: number;
  completedExamSessions: number;
  avgSessionMinutes: number | null;
  areaPerformance: Array<{
    areaCode: string;
    avgScore: number | null;
    avgAccuracyPercent: number | null;
    examsCount: number;
    studentsCount: number;
  }>;
  matCompetencies: MatCompetencyBreakdownItem[];
  matStrugglingComponents: MatStrugglingComponentItem[];
  matHardestQuestions: MatQuestionErrorItem[];
  unreadNotifications: number;
  recentAuditEntries: number;
  moduleHealth: AdminDashboardModuleHealth;
  errors: string[];
}

export async function fetchAdminDashboardSummary(authFetch: AuthFetch): Promise<AdminDashboardSummary> {
  const [
    questionStatsRes,
    institutionRes,
    performanceRes,
    notificationsRes,
    auditRes,
    matCompetencyRes,
    matStrugglingRes,
    studentStatsRes,
    diagnosticStatsRes,
    planStatsRes,
    sessionStatsRes,
  ] = await Promise.all([
    safeCall(() => authFetch<QuestionStatsSummary>("/api/questions/stats/summary")),
    safeCall(() => authFetch<InstitutionReportOut>("/api/analytics/institution?days=30")),
    safeCall(() => authFetch<QuestionPerformanceOut>("/api/analytics/questions/performance?limit=5")),
    safeCall(() => authFetch<UnreadCountOut>("/api/notifications/unread-count")),
    safeCall(() => authFetch<unknown[]>("/api/notifications/audit?limit=5"), { optionalStatuses: [404] }),
    safeCall(() => authFetch<MatCompetencyBreakdownOut>("/api/analytics/areas/MAT/competency-breakdown"), { optionalStatuses: [404] }),
    safeCall(() => authFetch<MatStrugglingComponentsOut>("/api/analytics/areas/MAT/struggling-components"), { optionalStatuses: [404] }),
    safeCall(() => authFetch<StudentStatsOverviewOut>("/api/students/stats")),
    safeCall(() => authFetch<DiagnosticStatsOut>("/api/diagnostic/stats")),
    safeCall(() => authFetch<PlanStatsOut>("/api/plans/stats")),
    safeCall(() => authFetch<SessionStatsOut>("/api/sessions/stats")),
  ]);

  const questionBankStatus: DashboardDataStatus = questionStatsRes.error
    ? "degraded"
    : (questionStatsRes.data?.total ?? 0) > 0
      ? "connected"
      : "pending";

  const analyticsStatus: DashboardDataStatus =
    institutionRes.error ?? performanceRes.error
      ? "degraded"
      : institutionRes.data
        ? "connected"
      : "pending";

  const notificationsStatus: DashboardDataStatus = notificationsRes.error ? "degraded" : "connected";
  const matHardestQuestions = (performanceRes.data?.hardest_questions ?? [])
    .filter((question) => question.area_code === "MAT")
    .map((question) => {
      const counts = {
        A: question.count_a,
        B: question.count_b,
        C: question.count_c,
        D: question.count_d,
      };
      const mostSelected = Object.entries(counts).sort((left, right) => right[1] - left[1])[0] ?? null;
      return {
        questionId: question.question_id,
        accuracyRate: question.accuracy_rate,
        timesPresented: question.times_presented,
        mostSelected: mostSelected && mostSelected[1] > 0 ? mostSelected[0] : null,
        mostSelectedCount: mostSelected?.[1] ?? 0,
      } satisfies MatQuestionErrorItem;
    });
  const areaPerformance = (institutionRes.data?.areas ?? []).map((area) => ({
    areaCode: area.area_code,
    avgScore: area.avg_score !== null ? Math.round(area.avg_score) : null,
    avgAccuracyPercent: area.avg_accuracy !== null ? Math.round(area.avg_accuracy) : null,
    examsCount: area.exams_count,
    studentsCount: area.students_count,
  }));

  return {
    questionBankTotal: questionStatsRes.data?.total ?? 0,
    pendingReviewQuestions: questionStatsRes.data?.by_status?.PENDING_REVIEW ?? 0,
    institutionStudents: studentStatsRes.data?.total_active ?? institutionRes.data?.total_students ?? 0,
    institutionAvgScore: institutionRes.data?.avg_score_global ?? sessionStatsRes.data?.avg_score_global ?? null,
    avgQuestionAccuracy: performanceRes.data?.avg_accuracy_rate ?? null,
    completedDiagnostics: diagnosticStatsRes.data?.completed ?? institutionRes.data?.total_diagnostics ?? 0,
    totalDiagnostics: diagnosticStatsRes.data?.total ?? institutionRes.data?.total_diagnostics ?? 0,
    activeStudyPlans: planStatsRes.data?.active ?? 0,
    totalStudyPlans: planStatsRes.data?.total ?? 0,
    completedExamSessions: sessionStatsRes.data?.completed ?? institutionRes.data?.total_exams ?? 0,
    avgSessionMinutes:
      sessionStatsRes.data?.avg_time_spent_seconds !== null &&
      sessionStatsRes.data?.avg_time_spent_seconds !== undefined
        ? Math.round(sessionStatsRes.data.avg_time_spent_seconds / 60)
        : null,
    areaPerformance,
    matCompetencies: matCompetencyRes.data?.items ?? [],
    matStrugglingComponents: matStrugglingRes.data?.items ?? [],
    matHardestQuestions,
    unreadNotifications: notificationsRes.data?.unread ?? 0,
    recentAuditEntries: auditRes.data?.length ?? 0,
    moduleHealth: {
      questionBank: { status: questionBankStatus, error: questionStatsRes.error },
      analytics: { status: analyticsStatus, error: institutionRes.error ?? performanceRes.error },
      notifications: { status: notificationsStatus, error: notificationsRes.error },
    },
    errors: compactErrors(
      questionStatsRes.error,
      institutionRes.error,
      performanceRes.error,
      notificationsRes.error,
      auditRes.error,
      matCompetencyRes.error,
      matStrugglingRes.error,
      studentStatsRes.error,
      diagnosticStatsRes.error,
      planStatsRes.error,
      sessionStatsRes.error,
    ),
  };
}
