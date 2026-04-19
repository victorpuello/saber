import type { AdminModuleModel, AdminModuleStatus } from "../types";

interface AdminModulesStatusProps {
  modules: AdminModuleModel[];
}

const STATUS_ICON: Record<AdminModuleStatus, string> = {
  connected: "check_circle",
  degraded: "error",
  pending: "schedule",
};

const STATUS_BADGE_CLASSES: Record<AdminModuleStatus, string> = {
  connected: "bg-emerald-50 text-emerald-700",
  degraded: "bg-rose-50 text-rose-700",
  pending: "bg-amber-50 text-amber-700",
};

const STATUS_LABEL: Record<AdminModuleStatus, string> = {
  connected: "Conectado",
  degraded: "Degradado",
  pending: "Pendiente",
};

const ICON_BG: Record<AdminModuleStatus, string> = {
  connected: "bg-emerald-50 text-emerald-600",
  degraded: "bg-rose-50 text-rose-600",
  pending: "bg-slate-100 text-secondary",
};

export default function AdminModulesStatus({ modules }: AdminModulesStatusProps) {
  const connectedCount = modules.filter((m) => m.status === "connected").length;
  const degradedCount = modules.filter((m) => m.status === "degraded").length;

  return (
    <section className="rounded-4xl border border-outline-variant/10 bg-surface-container-lowest p-7 shadow-[0_12px_40px_rgba(25,28,30,0.05)]">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-secondary">
          Estado de módulos del sistema
        </h2>
        <div className="flex items-center gap-3">
          {degradedCount > 0 && (
            <span className="flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-1 text-[11px] font-bold text-rose-600">
              <span className="material-symbols-outlined text-[13px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                error
              </span>
              {degradedCount} con incidencia
            </span>
          )}
          <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-600">
            <span className="material-symbols-outlined text-[13px]" style={{ fontVariationSettings: "'FILL' 1" }}>
              check_circle
            </span>
            {connectedCount} de {modules.length} activos
          </span>
        </div>
      </div>

      <ul className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
        {modules.map((module) => (
          <li key={module.id} className="rounded-[20px] bg-surface-container-low p-4">
            <div className="mb-3 flex items-start justify-between gap-2">
              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${ICON_BG[module.status]}`}
              >
                <span className="material-symbols-outlined text-[18px]">{module.icon}</span>
              </div>
              <span
                className={`flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-bold ${STATUS_BADGE_CLASSES[module.status]}`}
              >
                <span
                  className="material-symbols-outlined text-[11px]"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  {STATUS_ICON[module.status]}
                </span>
                {STATUS_LABEL[module.status]}
              </span>
            </div>
            <p className="text-sm font-semibold text-on-surface">{module.title}</p>
            <p className="mt-1 text-xs leading-relaxed text-on-surface-variant">{module.detail}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
