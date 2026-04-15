import type { DashboardActivityModel } from "../types";
import DashboardSectionEmptyState from "./DashboardSectionEmptyState";

interface DashboardRecentActivityProps {
  items: DashboardActivityModel[];
  loading: boolean;
}

const TONE_ICON: Record<DashboardActivityModel["tone"], string> = {
  success: "check_circle",
  info: "auto_stories",
  warning: "feedback",
};

function toneClasses(tone: DashboardActivityModel["tone"]): string {
  if (tone === "success") return "bg-emerald-50 text-emerald-700";
  if (tone === "warning") return "bg-red-50 text-error";
  return "bg-blue-50 text-primary";
}

export default function DashboardRecentActivity({ items, loading }: DashboardRecentActivityProps) {
  return (
    <section className="rounded-4xl border border-outline-variant/10 bg-surface-container-lowest p-6 sm:p-8">
      <h2 className="mb-5 text-lg font-bold tracking-tight sm:mb-6 sm:text-xl">Actividad reciente</h2>

      {items.length === 0 ? (
        <DashboardSectionEmptyState
          title="Aun no hay actividad reciente"
          description="Cuando completes simulacros o recibas eventos académicos aparecerán aquí."
        />
      ) : (
        <>
          <div className="space-y-6">
            {items.map((item) => (
              <div key={item.id} className="flex items-center gap-4">
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${toneClasses(item.tone)}`}
                >
                  <span className="material-symbols-outlined text-[20px]">
                    {TONE_ICON[item.tone]}
                  </span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold">{item.title}</p>
                  {loading ? (
                    <div className="mt-1 h-3.5 w-32 animate-pulse rounded bg-surface-container-high sm:w-48" />
                  ) : (
                    <p className="text-xs text-secondary">{item.detail}</p>
                  )}
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            className="mt-6 min-h-11 w-full rounded-xl py-2.5 text-sm font-bold text-primary transition-colors hover:bg-primary/5 sm:mt-8 sm:py-3"
          >
            Ver toda la actividad
          </button>
        </>
      )}
    </section>
  );
}
