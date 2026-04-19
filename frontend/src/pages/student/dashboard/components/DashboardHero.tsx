import type { DashboardHeroModel } from "../types";

interface DashboardHeroProps {
  model: DashboardHeroModel;
  loading: boolean;
}

export default function DashboardHero({ model, loading }: DashboardHeroProps) {
  return (
    <article className="flex h-full min-h-60 flex-col justify-between rounded-4xl bg-linear-to-br from-primary to-primary-container p-7 text-white shadow-[0_8px_24px_rgba(0,74,198,0.18)] sm:min-h-60">
      <div>
        <span className="text-[10px] font-bold uppercase tracking-[0.32em] opacity-80">{model.title}</span>
        <div className="mt-3 flex items-baseline gap-2">
          {loading ? (
            <div className="h-16 w-32 animate-pulse rounded-lg bg-white/30" />
          ) : (
            <>
              <span className="text-[64px] font-black leading-none tracking-tighter">{model.value}</span>
              {model.maxValueLabel && (
                <span className="text-xl font-medium opacity-60">{model.maxValueLabel}</span>
              )}
            </>
          )}
        </div>
      </div>

      <div>
        <div className="mb-[7px] flex items-end justify-between text-[13px] font-medium">
          <span>{model.trendLabel}</span>
          <span>{model.progressPercent}%</span>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-white/20">
          <div
            className="h-full rounded-full bg-white transition-all duration-600"
            style={{ width: `${model.progressPercent}%` }}
          />
        </div>
      </div>
    </article>
  );
}
