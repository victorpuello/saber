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
    <section className="rounded-4xl border border-outline-variant/10 bg-surface-container-lowest py-7 px-8 shadow-[0_12px_40px_rgba(25,28,30,0.05)]">
      <h2 className="mb-5 text-lg font-bold tracking-tight">Actividad reciente</h2>

      {items.length === 0 ? (
        <DashboardSectionEmptyState
          title="Aun no hay actividad reciente"
          description="Cuando completes simulacros o recibas eventos académicos aparecerán aquí."
        />
      ) : (
        <>
          <div className="space-y-5">
            {items.map((item) => (
              <div key={item.id} className="flex items-center gap-3.5">
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${toneClasses(item.tone)}`}
                >
                  <span
                    className="material-symbols-outlined text-[20px]"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    {TONE_ICON[item.tone]}
                  </span>
                </div>
                <div className="flex-1">
                  <p className="text-[13px] font-bold">{item.title}</p>
                  {loading ? (
                    <div className="mt-1 h-3.5 w-32 animate-pulse rounded bg-surface-container-high sm:w-48" />
                  ) : (
                    <p className="mt-0.5 text-[11px] text-secondary">{item.detail}</p>
                  )}
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            className="mt-5 min-h-10 w-full rounded-xl py-2.5 text-[13px] font-bold text-primary transition-colors hover:bg-primary/5"
          >
            Ver toda la actividad
          </button>
        </>
      )}
    </section>
  );
}
