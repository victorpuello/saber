import type { StudentStatsOverview } from "../../../../services/students";

interface StudentsMetricsGridProps {
  stats: StudentStatsOverview | null;
}

interface MetricCard {
  id: string;
  label: string;
  value: string;
  icon: string;
  variant: "default" | "grade9" | "grade10" | "grade11" | "warning";
}

const ICON_BG: Record<MetricCard["variant"], string> = {
  default: "bg-primary/8 text-primary",
  grade9: "bg-blue-50 text-blue-600",
  grade10: "bg-emerald-50 text-emerald-600",
  grade11: "bg-violet-50 text-violet-600",
  warning: "bg-rose-50 text-rose-600",
};

const VALUE_COLOR: Record<MetricCard["variant"], string> = {
  default: "text-on-surface",
  grade9: "text-blue-700",
  grade10: "text-emerald-700",
  grade11: "text-violet-700",
  warning: "text-rose-700",
};

function buildMetrics(stats: StudentStatsOverview | null): MetricCard[] {
  if (!stats) {
    return [
      { id: "total", label: "Total Activos", value: "—", icon: "people", variant: "default" },
      { id: "g9", label: "Grado 9", value: "—", icon: "school", variant: "grade9" },
      { id: "g10", label: "Grado 10", value: "—", icon: "school", variant: "grade10" },
      { id: "g11", label: "Grado 11", value: "—", icon: "school", variant: "grade11" },
    ];
  }

  const gradeMap: Record<string, number> = {};
  for (const g of stats.by_grade) gradeMap[g.grade] = g.count;

  return [
    {
      id: "total",
      label: "Total Activos",
      value: String(stats.total_active),
      icon: "people",
      variant: "default",
    },
    {
      id: "g9",
      label: "Grado 9",
      value: String(gradeMap["9"] ?? 0),
      icon: "school",
      variant: "grade9",
    },
    {
      id: "g10",
      label: "Grado 10",
      value: String(gradeMap["10"] ?? 0),
      icon: "school",
      variant: "grade10",
    },
    {
      id: "g11",
      label: "Grado 11",
      value: String(gradeMap["11"] ?? 0),
      icon: "school",
      variant: "grade11",
    },
  ];
}

export default function StudentsMetricsGrid({ stats }: StudentsMetricsGridProps) {
  const metrics = buildMetrics(stats);

  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {metrics.map((m) => (
        <article
          key={m.id}
          className="relative overflow-hidden rounded-3xl bg-surface-container-lowest p-5 shadow-[0_12px_40px_rgba(25,28,30,0.05)]"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold uppercase tracking-widest text-secondary">
                {m.label}
              </p>
              <div className="mt-3 flex items-baseline gap-2">
                <span className={`text-3xl font-black tracking-tight ${VALUE_COLOR[m.variant]}`}>
                  {m.value}
                </span>
              </div>
            </div>
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${ICON_BG[m.variant]}`}
            >
              <span
                className="material-symbols-outlined text-[20px]"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                {m.icon}
              </span>
            </div>
          </div>
        </article>
      ))}

      {/* Withdrawn/inactive mini card */}
      {stats && (stats.total_withdrawn > 0 || stats.total_inactive > 0) && (
        <article className="relative overflow-hidden rounded-3xl bg-rose-50/50 p-5 shadow-[0_12px_40px_rgba(25,28,30,0.05)] sm:col-span-2 xl:col-span-4">
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-rose-100 text-rose-600">
              <span
                className="material-symbols-outlined text-[20px]"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                person_off
              </span>
            </div>
            <div className="flex gap-6">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-rose-600">Retirados</p>
                <span className="text-xl font-black text-rose-700">{stats.total_withdrawn}</span>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Inactivos</p>
                <span className="text-xl font-black text-slate-600">{stats.total_inactive}</span>
              </div>
            </div>
          </div>
        </article>
      )}
    </section>
  );
}
