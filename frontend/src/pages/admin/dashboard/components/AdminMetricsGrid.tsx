import type { AdminMetricModel } from "../types";

interface AdminMetricsGridProps {
  metrics: AdminMetricModel[];
  loading: boolean;
}

const VARIANT_CLASSES: Record<AdminMetricModel["variant"], string> = {
  default: "bg-primary/8 text-primary",
  warning: "bg-amber-50 text-amber-600",
  error: "bg-rose-50 text-rose-600",
  success: "bg-emerald-50 text-emerald-600",
};

const VALUE_VARIANT_CLASSES: Record<AdminMetricModel["variant"], string> = {
  default: "text-on-surface",
  warning: "text-amber-700",
  error: "text-rose-700",
  success: "text-emerald-700",
};

export default function AdminMetricsGrid({ metrics, loading }: AdminMetricsGridProps) {
  return (
    <section className="grid gap-3.5 sm:grid-cols-2">
      {metrics.map((metric) => (
        <article
          key={metric.id}
          className="rounded-3xl border border-outline-variant/[0.08] bg-surface-container-lowest p-5 shadow-[0_12px_40px_rgba(25,28,30,0.05)]"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-secondary">{metric.label}</p>
              {loading ? (
                <div className="mt-3 h-8 w-20 animate-pulse rounded bg-surface-container-high" />
              ) : (
                <p className={`mt-2 text-[30px] font-black leading-none tracking-tighter ${VALUE_VARIANT_CLASSES[metric.variant]}`}>
                  {metric.value}
                </p>
              )}
              {metric.helper && (
                <p className="mt-1.5 text-[11px] text-on-surface-variant">{metric.helper}</p>
              )}
            </div>
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] ${VARIANT_CLASSES[metric.variant]}`}
            >
              <span className="material-symbols-outlined text-[20px]">{metric.icon}</span>
            </div>
          </div>
        </article>
      ))}
    </section>
  );
}
