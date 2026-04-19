import type { DashboardTaskModel } from "../types";

interface DashboardNextTaskProps {
  model: DashboardTaskModel;
  loading: boolean;
  onAction?: () => void;
}

export default function DashboardNextTask({ model, loading, onAction }: DashboardNextTaskProps) {
  return (
    <section className="flex flex-col rounded-4xl border border-outline-variant/10 bg-surface-container-lowest py-7 px-8 shadow-[0_12px_40px_rgba(25,28,30,0.05)]">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold tracking-tight">Siguiente tarea de estudio</h2>
          <p className="mt-1 text-[13px] text-secondary">Basada en tu plan de estudio personalizado</p>
        </div>
        <span className="shrink-0 rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-700">
          {model.emphasis ?? "Recomendado"}
        </span>
      </div>

      <div className="flex-1 rounded-2xl bg-surface-container-low py-5 px-6">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] bg-primary text-white">
            <span className="material-symbols-outlined text-[22px]">auto_stories</span>
          </div>
          <div className="flex-1">
            <h3 className="text-base font-bold">{model.title}</h3>
            {loading ? (
              <div className="mt-3 h-4 w-5/6 animate-pulse rounded bg-surface-container-high" />
            ) : (
              <p className="mt-1.5 text-[13px] leading-relaxed text-secondary">{model.description}</p>
            )}
            <div className="mt-3 flex items-center gap-1 text-xs font-semibold text-on-surface-variant">
              <span className="material-symbols-outlined text-[16px]">timer</span>
              <span>{model.hint}</span>
            </div>
          </div>
        </div>
      </div>

      <button
        type="button"
        disabled={loading}
        className="mt-5 min-h-12 w-full rounded-[14px] bg-primary py-3.5 text-sm font-bold text-white shadow-[0_4px_14px_rgba(0,74,198,0.22)] transition-all hover:opacity-[0.92] hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60"
        onClick={onAction}
      >
        {loading ? "Cargando..." : model.ctaLabel}
      </button>
    </section>
  );
}
