export type AdminModuleStatus = "connected" | "degraded" | "pending";

export interface AdminModuleModel {
  id: string;
  title: string;
  status: AdminModuleStatus;
  detail: string;
  icon: string;
}

export interface AdminMetricModel {
  id: string;
  label: string;
  value: string;
  helper?: string;
  icon: string;
  variant: "default" | "warning" | "error" | "success";
}

export interface AdminHeroModel {
  institutionStudents: number | null;
  institutionAvgScore: number | null;
  questionBankTotal: number;
  pendingCount: number;
  avgAccuracyPercent: number | null;
}

export interface AdminQuickActionModel {
  id: string;
  label: string;
  description: string;
  icon: string;
  targetPath?: string;
  variant: "primary" | "default";
}
