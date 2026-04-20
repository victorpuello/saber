import type { ExamMetric } from "../types";

interface ExamsMetricsGridProps {
  metrics: ExamMetric[];
}

const ICON_CLASSES: Record<ExamMetric["variant"], string> = {
  default: "bg-primary/8 text-primary",
  warning: "bg-amber-50 text-amber-600",
  success: "bg-emerald-50 text-emerald-600",
  ai:      "bg-violet-50 text-violet-600",
};

const VALUE_CLASSES: Record<ExamMetric["variant"], string> = {
  default: "text-on-surface",
  warning: "text-amber-700",
  success: "text-emerald-700",
  ai:      "text-violet-700",
};

export default function ExamsMetricsGrid({ metrics }: ExamsMetricsGridProps) {
  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {metrics.map((metric) => (
        <article
          key={metric.id}
          className="relative overflow-hidden rounded-3xl bg-surface-container-lowest p-5 shadow-[0_12px_40px_rgba(25,28,30,0.05)]"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold uppercase tracking-widest text-secondary">
                {metric.label}
              </p>
              <div className="mt-3 flex items-baseline gap-2">
                <span className={`text-3xl font-black tracking-tight ${VALUE_CLASSES[metric.variant]}`}>
                  {metric.value}
                </span>
              </div>
            </div>
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${ICON_CLASSES[metric.variant]}`}>
              <span
                className="material-symbols-outlined text-[20px]"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                {metric.icon}
              </span>
            </div>
          </div>
        </article>
      ))}
    </section>
  );
}
