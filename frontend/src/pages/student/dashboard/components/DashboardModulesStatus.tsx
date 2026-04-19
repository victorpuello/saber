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
    <section className="rounded-4xl border border-outline-variant/10 bg-surface-container-lowest py-7 px-8 shadow-[0_12px_40px_rgba(25,28,30,0.05)]">
      <h2 className="mb-4 text-[10px] font-bold uppercase tracking-[0.2em] text-secondary">
        Estado de módulos
      </h2>

      <ul className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
        {modules.map((module) => (
          <li key={module.id} className="rounded-[18px] bg-surface-container-low p-4">
            <div className="mb-2.5 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-secondary">
                  {MODULE_ICON[module.id] ?? "circle"}
                </span>
                <p className="text-[13px] font-semibold">{module.title}</p>
              </div>
              <span
                className={`flex items-center gap-[3px] rounded-full px-[9px] py-[3px] text-[10px] font-bold ${STATUS_CLASSES[module.status]}`}
              >
                <span
                  className="material-symbols-outlined text-[12px]"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  {STATUS_ICON[module.status]}
                </span>
                {STATUS_LABEL[module.status]}
              </span>
            </div>
            <p className="text-[11px] leading-normal text-on-surface-variant">{module.detail}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
