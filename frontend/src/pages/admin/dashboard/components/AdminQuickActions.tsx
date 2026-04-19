import type { AdminQuickActionModel } from "../types";

interface AdminQuickActionsProps {
  actions: AdminQuickActionModel[];
  loading: boolean;
  onAction: (action: AdminQuickActionModel) => void;
}

export default function AdminQuickActions({ actions, loading, onAction }: AdminQuickActionsProps) {
  return (
    <section className="rounded-4xl border border-outline-variant/10 bg-surface-container-lowest p-7 shadow-[0_12px_40px_rgba(25,28,30,0.05)]">
      <h2 className="mb-5 text-lg font-bold tracking-tight">Acciones rápidas</h2>

      <ul className="space-y-3">
        {actions.map((action) => (
          <li key={action.id}>
            <button
              type="button"
              disabled={loading}
              onClick={() => onAction(action)}
              className={`group flex w-full items-center gap-3.5 rounded-[20px] p-3.5 text-left transition-all active:scale-[0.98] ${
                action.variant === "primary"
                  ? "bg-primary text-white shadow-md shadow-primary/20 hover:opacity-90"
                  : "border border-outline-variant/20 bg-surface-container-low hover:border-primary/20 hover:bg-primary/5"
              }`}
            >
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] transition-transform group-hover:scale-110 ${
                  action.variant === "primary"
                    ? "bg-white/20 text-white"
                    : "bg-primary/8 text-primary"
                }`}
              >
                <span className="material-symbols-outlined text-[20px]">{action.icon}</span>
              </div>

              <div className="min-w-0 flex-1">
                <p
                  className={`text-sm font-bold ${
                    action.variant === "primary" ? "text-white" : "text-on-surface"
                  }`}
                >
                  {action.label}
                </p>
                <p
                  className={`mt-0.5 text-xs ${
                    action.variant === "primary" ? "text-white/70" : "text-on-surface-variant"
                  }`}
                >
                  {action.description}
                </p>
              </div>

              <span
                className={`material-symbols-outlined text-[20px] shrink-0 transition-transform group-hover:translate-x-0.5 ${
                  action.variant === "primary" ? "text-white/60" : "text-secondary"
                }`}
              >
                chevron_right
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
