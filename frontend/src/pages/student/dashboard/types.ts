export interface DashboardMetricModel {
  id: string;
  label: string;
  value: string;
  helper?: string;
}

export interface DashboardHeroModel {
  title: string;
  subtitle: string;
  value: string;
  maxValueLabel: string;
  progressPercent: number;
  trendLabel: string;
}

export interface DashboardTaskModel {
  title: string;
  description: string;
  ctaLabel: string;
  hint: string;
  emphasis?: string;
  targetPath?: string;
}

export interface DashboardAreaPerformanceModel {
  id: string;
  label: string;
  progressPercent: number;
  progressLabel: string;
  accuracyLabel: string;
}

export interface DashboardNotificationModel {
  id: string;
  title: string;
  detail: string;
  meta: string;
  unread: boolean;
}

export type DashboardActivityTone = "success" | "info" | "warning";

export interface DashboardActivityModel {
  id: string;
  title: string;
  detail: string;
  tone: DashboardActivityTone;
}

export interface DashboardQuickActionModel {
  id: string;
  label: string;
  description: string;
  targetPath?: string;
}

export type DashboardModuleStatus = "connected" | "pending" | "degraded";

export interface DashboardModuleModel {
  id: string;
  title: string;
  status: DashboardModuleStatus;
  detail: string;
}

export interface StudentDashboardViewModel {
  studentName: string;
  periodLabel: string;
  loading: boolean;
  errors: string[];
  hero: DashboardHeroModel;
  metrics: DashboardMetricModel[];
  nextTask: DashboardTaskModel;
  areaPerformance: DashboardAreaPerformanceModel[];
  notifications: DashboardNotificationModel[];
  activities: DashboardActivityModel[];
  quickActions: DashboardQuickActionModel[];
  modules: DashboardModuleModel[];
}
