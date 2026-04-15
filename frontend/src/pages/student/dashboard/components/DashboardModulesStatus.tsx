import type { DashboardModuleModel } from "../types";

interface DashboardModulesStatusProps {
  modules: DashboardModuleModel[];
}

const STATUS_ICON: Record<DashboardModuleModel["status"], string> = {
  connected: "check_circle",
  degraded: "error",
  pending: "schedule",
};

const STATUS_CLASSES: Record<DashboardModuleModel["status"], string> = {
  connected: "bg-emerald-50 text-emerald-700",
  degraded: "bg-rose-50 text-rose-700",
  pending: "bg-amber-50 text-amber-700",
};

const STATUS_LABEL: Record<DashboardModuleModel["status"], string> = {
  connected: "Conectado",
  degraded: "Parcial",
  pending: "Pendiente",
};

const MODULE_ICON: Record<string, string> = {
  diagnostic: "analytics",
  plan: "auto_stories",
  sessions: "quiz",
  notifications: "notifications",
};

export default function DashboardModulesStatus({ modules }: DashboardModulesStatusProps) {
  return (
    <section className="rounded-4xl border border-outline-variant/10 bg-surface-container-lowest p-8">
      <h2 className="mb-6 text-xs font-bold uppercase tracking-widest text-secondary">
        Estado de módulos
      </h2>

      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {modules.map((module) => (
          <li key={module.id} className="rounded-2xl bg-surface-container-low p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-secondary">
                  {MODULE_ICON[module.id] ?? "circle"}
                </span>
                <p className="text-sm font-semibold">{module.title}</p>
              </div>
              <span
                className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${STATUS_CLASSES[module.status]}`}
              >
                <span
                  className="material-symbols-outlined text-[13px]"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  {STATUS_ICON[module.status]}
                </span>
                {STATUS_LABEL[module.status]}
              </span>
            </div>
            <p className="text-xs leading-relaxed text-on-surface-variant">{module.detail}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
