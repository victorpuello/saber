import type { DashboardHeroModel } from "../types";

interface DashboardHeroProps {
  model: DashboardHeroModel;
  loading: boolean;
}

export default function DashboardHero({ model, loading }: DashboardHeroProps) {
  return (
    <article className="flex h-full min-h-80 flex-col justify-between rounded-4xl bg-linear-to-br from-primary to-primary-container p-8 text-white shadow-lg shadow-primary/10">
      <div>
        <span className="text-xs font-bold uppercase tracking-widest opacity-80">{model.title}</span>
        <div className="mt-4 flex items-baseline gap-2">
          {loading ? (
            <div className="h-16 w-40 animate-pulse rounded-lg bg-white/30" />
          ) : (
            <>
              <span className="text-7xl font-black tracking-tighter">{model.value}</span>
              {model.maxValueLabel && (
                <span className="text-xl font-medium opacity-60">{model.maxValueLabel}</span>
              )}
            </>
          )}
        </div>
      </div>

      <div className="mt-8">
        <div className="mb-2 flex items-end justify-between">
          <span className="text-sm font-medium">{model.trendLabel}</span>
          <span className="text-sm font-medium">{model.progressPercent}%</span>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-white/20">
          <div
            className="h-full rounded-full bg-white transition-all"
            style={{ width: `${model.progressPercent}%` }}
          />
        </div>
      </div>
    </article>
  );
}
