import type { DashboardMetricModel } from "../types";

interface DashboardMetricsGridProps {
  metrics: DashboardMetricModel[];
  loading: boolean;
}

export default function DashboardMetricsGrid({ metrics, loading }: DashboardMetricsGridProps) {
  return (
    <section className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
      {metrics.map((metric) => (
        <article key={metric.id} className="rounded-3xl border border-outline-variant/[0.08] bg-surface-container-lowest p-5 shadow-[0_12px_40px_rgba(25,28,30,0.05)]">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-secondary">{metric.label}</p>
          {loading ? (
            <div className="mt-3 h-9 w-24 animate-pulse rounded bg-surface-container-high" />
          ) : (
            <p className="mt-2 text-[28px] font-bold leading-none tracking-tight">{metric.value}</p>
          )}
          {metric.helper && <p className="mt-1.5 text-[11px] text-on-surface-variant">{metric.helper}</p>}
        </article>
      ))}
    </section>
  );
}
