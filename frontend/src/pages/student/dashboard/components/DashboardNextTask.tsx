import type { DashboardTaskModel } from "../types";

interface DashboardNextTaskProps {
  model: DashboardTaskModel;
  loading: boolean;
  onAction?: () => void;
}

export default function DashboardNextTask({ model, loading, onAction }: DashboardNextTaskProps) {
  return (
    <section className="flex flex-col rounded-4xl border border-outline-variant/10 bg-surface-container-lowest p-8">
      <div className="mb-6 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Siguiente tarea de estudio</h2>
          <p className="mt-1 text-sm text-secondary">Basada en tu plan de estudio personalizado</p>
        </div>
        <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold uppercase tracking-widest text-emerald-700">
          {model.emphasis ?? "Recomendado"}
        </span>
      </div>

      <div className="flex-1 rounded-2xl bg-surface-container-low p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary text-white">
            <span className="material-symbols-outlined text-[20px]">auto_stories</span>
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold">{model.title}</h3>
            {loading ? (
              <div className="mt-3 h-4 w-5/6 animate-pulse rounded bg-surface-container-high" />
            ) : (
              <p className="mt-2 text-sm text-secondary">{model.description}</p>
            )}
            <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-on-surface-variant">
              <span className="material-symbols-outlined text-sm">timer</span>
              <span>{model.hint}</span>
            </div>
          </div>
        </div>
      </div>

      <button
        type="button"
        disabled={loading}
        className="mt-6 w-full rounded-xl bg-primary py-4 font-bold text-white shadow-md shadow-primary/20 transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-60"
        onClick={onAction}
      >
        {loading ? "Cargando..." : model.ctaLabel}
      </button>
    </section>
  );
}
