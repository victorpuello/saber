export type QuestionStatus = "APROBADO" | "PENDIENTE" | "BORRADOR";

export type AreaCode = "MAT" | "LEC" | "ING" | "NAT" | "SOC";

export interface QBMetric {
  id: string;
  label: string;
  value: string;
  badge?: string;
  helper?: string;
  icon: string;
  variant: "default" | "warning" | "success" | "ai";
}

export interface QuestionRow {
  id: string;
  code: string;
  area: string;
  areaCode: AreaCode;
  competencia: string;
  enunciado: string;
  authorName: string;
  authorInitial: string;
  status: QuestionStatus;
  performance: number | null; // 0-100
}

export interface ActivityItem {
  id: string;
  text: string;
  timeAgo: string;
  category: string;
  iconVariant: "success" | "warning" | "info";
}

export interface QBFiltersState {
  area: string;
  competencia: string;
  dificultad: string;
  estado: string;
}
