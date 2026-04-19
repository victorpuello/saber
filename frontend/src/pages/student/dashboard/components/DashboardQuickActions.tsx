import type { DashboardQuickActionModel } from "../types";

interface DashboardQuickActionsProps {
  actions: DashboardQuickActionModel[];
  loading: boolean;
  onAction?: (action: DashboardQuickActionModel) => void;
}

const ACTION_ICON: Record<string, string> = {
  diagnostic: "analytics",
  plan: "auto_stories",
  results: "military_tech",
};

export default function DashboardQuickActions({ actions, loading, onAction }: DashboardQuickActionsProps) {
  return (
    <section className="rounded-4xl border border-outline-variant/10 bg-surface-container-lowest py-7 px-8 shadow-[0_12px_40px_rgba(25,28,30,0.05)]">
      <h2 className="mb-4 text-lg font-bold tracking-tight">Acciones rápidas</h2>

      <div className="grid gap-2.5">
        {actions.map((action) => (
          <button
            key={action.id}
            type="button"
            className="flex min-h-13 items-center gap-3 rounded-[18px] bg-surface-container-low px-4 py-3.5 text-left transition-all hover:scale-[1.01] hover:bg-surface-container active:scale-[0.99]"
            onClick={() => onAction?.(action)}
          >
            <span className="material-symbols-outlined text-[20px] text-primary">
              {ACTION_ICON[action.id] ?? "arrow_forward"}
            </span>
            <div className="flex-1">
              <p className="text-[13px] font-bold">{action.label}</p>
              {loading ? (
                <div className="mt-1 h-3 w-40 animate-pulse rounded bg-surface-container-high" />
              ) : (
                <p className="mt-0.5 text-[11px] text-on-surface-variant">{action.description}</p>
              )}
            </div>
            <span className="material-symbols-outlined text-[16px] text-secondary">chevron_right</span>
          </button>
        ))}
      </div>
    </section>
  );
}
