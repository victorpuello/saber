import type { DashboardMetricModel } from "../types";

interface DashboardMetricsGridProps {
  metrics: DashboardMetricModel[];
  loading: boolean;
}

export default function DashboardMetricsGrid({ metrics, loading }: DashboardMetricsGridProps) {
  return (
    <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {metrics.map((metric) => (
        <article key={metric.id} className="rounded-3xl border border-outline-variant/10 bg-surface-container-lowest p-5">
          <p className="text-xs font-semibold tracking-wide text-secondary uppercase">{metric.label}</p>
          {loading ? (
            <div className="mt-3 h-9 w-24 animate-pulse rounded bg-surface-container-high" />
          ) : (
            <p className="mt-2 text-2xl font-bold">{metric.value}</p>
          )}
          {metric.helper && <p className="mt-2 text-xs text-on-surface-variant">{metric.helper}</p>}
        </article>
      ))}
    </section>
  );
}
