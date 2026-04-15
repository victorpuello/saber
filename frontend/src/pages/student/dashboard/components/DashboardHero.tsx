import type { DashboardHeroModel } from "../types";

interface DashboardHeroProps {
  model: DashboardHeroModel;
  loading: boolean;
}

export default function DashboardHero({ model, loading }: DashboardHeroProps) {
  return (
    <article className="flex h-full min-h-64 flex-col justify-between rounded-4xl bg-linear-to-br from-primary to-primary-container p-6 text-white shadow-lg shadow-primary/10 sm:min-h-80 sm:p-8">
      <div>
        <span className="text-xs font-bold uppercase tracking-widest opacity-80">{model.title}</span>
        <div className="mt-4 flex items-baseline gap-2">
          {loading ? (
            <div className="h-12 w-32 animate-pulse rounded-lg bg-white/30 sm:h-16 sm:w-40" />
          ) : (
            <>
              <span className="text-5xl font-black tracking-tighter sm:text-6xl md:text-7xl">{model.value}</span>
              {model.maxValueLabel && (
                <span className="text-lg font-medium opacity-60 sm:text-xl">{model.maxValueLabel}</span>
              )}
            </>
          )}
        </div>
      </div>

      <div className="mt-6 sm:mt-8">
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
