import type { GenerationJob } from "../../../../services/aiJobs";

interface QBJobsStatusBarProps {
  jobs: GenerationJob[];
  loading: boolean;
  onOpenTray: () => void;
}

export default function QBJobsStatusBar({
  jobs,
  loading,
  onOpenTray,
}: QBJobsStatusBarProps) {
  if (!loading && jobs.length === 0) return null;

  const activeCount = jobs.filter(
    (j) => j.status === "RUNNING" || j.status === "QUEUED",
  ).length;
  const errorCount = jobs.filter((j) => j.status === "FAILED").length;
  const completedCount = jobs.filter(
    (j) => j.status === "COMPLETED" || j.status === "PARTIAL",
  ).length;

  return (
    <div className="flex items-center justify-between rounded-2xl bg-surface-container-low px-4 py-2.5">
      {/* Left: icon + label + pills */}
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`material-symbols-outlined text-[16px] text-primary${activeCount > 0 ? " animate-pulse" : ""}`}
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          auto_awesome
        </span>

        <span className="text-sm font-medium text-on-surface">Jobs IA</span>

        {loading && jobs.length === 0 && (
          <span className="text-xs text-secondary">Cargando…</span>
        )}

        {activeCount > 0 && (
          <span className="rounded-full bg-primary-container px-2 py-0.5 text-[11px] font-bold text-on-primary-container">
            {activeCount} procesando
          </span>
        )}

        {errorCount > 0 && (
          <span className="rounded-full bg-error-container px-2 py-0.5 text-[11px] font-bold text-on-error-container">
            {errorCount} con error
          </span>
        )}

        {completedCount > 0 && activeCount === 0 && errorCount === 0 && (
          <span className="rounded-full bg-surface-container-highest px-2 py-0.5 text-[11px] font-medium text-on-surface-variant">
            {completedCount} completado{completedCount > 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Right: open tray link */}
      <button
        type="button"
        onClick={onOpenTray}
        className="flex shrink-0 items-center gap-0.5 text-xs font-semibold text-primary transition hover:opacity-70"
      >
        Ver detalle
        <span className="material-symbols-outlined text-[14px]">chevron_right</span>
      </button>
    </div>
  );
}
