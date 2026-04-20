import type { SyncLog } from "../../../../services/students";

interface SyncStatusBarProps {
  syncStatus: SyncLog | null;
}

function formatDate(iso: string | null): string {
  if (!iso) return "Nunca";
  return new Date(iso).toLocaleString("es-CO", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

const STATUS_STYLE: Record<string, { bg: string; text: string; icon: string }> = {
  SUCCESS: { bg: "bg-emerald-50", text: "text-emerald-700", icon: "check_circle" },
  FAILED: { bg: "bg-rose-50", text: "text-rose-700", icon: "error" },
  RUNNING: { bg: "bg-amber-50", text: "text-amber-700", icon: "sync" },
};

export default function SyncStatusBar({ syncStatus }: SyncStatusBarProps) {
  if (!syncStatus) {
    return (
      <div className="flex items-center gap-3 rounded-2xl bg-surface-container-low px-5 py-3">
        <span className="material-symbols-outlined text-[18px] text-secondary">info</span>
        <p className="text-xs text-secondary">Nunca se ha ejecutado una sincronización con Kampus.</p>
      </div>
    );
  }

  const style = STATUS_STYLE[syncStatus.status] ?? STATUS_STYLE.FAILED;

  return (
    <div className={`flex flex-wrap items-center gap-4 rounded-2xl px-5 py-3 ${style.bg}`}>
      <span
        className={`material-symbols-outlined text-[18px] ${style.text} ${syncStatus.status === "RUNNING" ? "animate-spin" : ""}`}
        style={{ fontVariationSettings: "'FILL' 1" }}
      >
        {style.icon}
      </span>
      <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs">
        <span className={`font-semibold ${style.text}`}>
          Última sync: {formatDate(syncStatus.started_at)}
        </span>
        <span className="text-secondary">
          Encontrados: {syncStatus.records_fetched}
        </span>
        <span className="text-secondary">
          Nuevos: {syncStatus.records_created}
        </span>
        <span className="text-secondary">
          Actualizados: {syncStatus.records_updated}
        </span>
        {syncStatus.records_revoked > 0 && (
          <span className="font-semibold text-rose-700">
            Revocados: {syncStatus.records_revoked}
          </span>
        )}
        {syncStatus.errors > 0 && (
          <span className="font-semibold text-rose-700">
            Errores: {syncStatus.errors}
          </span>
        )}
      </div>
    </div>
  );
}
