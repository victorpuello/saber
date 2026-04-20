import type { GenerationJob } from "../../../../services/aiJobs";

interface QBJobsTrayProps {
  isOpen: boolean;
  onToggle: () => void;
  jobs: GenerationJob[];
  loading: boolean;
  error: string;
  onRefresh: () => void;
  onCancel: (jobId: string) => void;
  onRetry: (jobId: string) => void;
  onDelete: (jobId: string) => void;
  actionLoadingJobId: string | null;
}

const STATUS_META: Record<
  GenerationJob["status"],
  { label: string; tone: string; progressTone: string }
> = {
  QUEUED: {
    label: "En cola",
    tone: "bg-secondary-container text-on-secondary-container",
    progressTone: "from-secondary to-primary",
  },
  RUNNING: {
    label: "Procesando",
    tone: "bg-primary-container text-on-primary-container",
    progressTone: "from-primary to-tertiary",
  },
  COMPLETED: {
    label: "Completado",
    tone: "bg-tertiary-container text-on-tertiary-container",
    progressTone: "from-tertiary to-tertiary",
  },
  PARTIAL: {
    label: "Parcial",
    tone: "bg-secondary-container text-on-secondary-container",
    progressTone: "from-secondary to-tertiary",
  },
  FAILED: {
    label: "Fallido",
    tone: "bg-error-container text-on-error-container",
    progressTone: "from-error to-error",
  },
  CANCELLED: {
    label: "Cancelado",
    tone: "bg-surface-container-high text-on-surface",
    progressTone: "from-secondary to-secondary",
  },
};

function isTerminal(status: GenerationJob["status"]): boolean {
  return (
    status === "COMPLETED" ||
    status === "PARTIAL" ||
    status === "FAILED" ||
    status === "CANCELLED"
  );
}

function relativeTime(timestamp: string): string {
  const t = Date.parse(timestamp);
  if (Number.isNaN(t)) return "hace un momento";
  const diffSec = Math.max(0, Math.floor((Date.now() - t) / 1000));
  if (diffSec < 60) return `hace ${diffSec}s`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `hace ${diffMin}m`;
  return `hace ${Math.floor(diffMin / 60)}h`;
}

export default function QBJobsTray({
  isOpen,
  onToggle,
  jobs,
  loading,
  error,
  onRefresh,
  onCancel,
  onRetry,
  onDelete,
  actionLoadingJobId,
}: QBJobsTrayProps) {
  const activeCount = jobs.filter(
    (j) => j.status === "RUNNING" || j.status === "QUEUED",
  ).length;
  const hasError = jobs.some((j) => j.status === "FAILED");

  return (
    <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-3">
      {/* ── Floating panel ─────────────────────────────────────────────── */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Centro de jobs IA"
        className={`flex w-95 max-w-[calc(100vw-3rem)] flex-col overflow-hidden rounded-3xl bg-surface-container-lowest shadow-[0_20px_60px_rgba(25,28,30,0.18)] ring-1 ring-outline-variant/20 transition-all duration-200 ease-out ${
          isOpen
            ? "translate-y-0 opacity-100 pointer-events-auto"
            : "translate-y-3 opacity-0 pointer-events-none"
        }`}
      >
        {/* Panel header */}
        <header className="flex items-center justify-between border-b border-outline-variant/15 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <span
              className="material-symbols-outlined text-[18px] text-primary"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              auto_awesome
            </span>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-secondary">
                Centro de jobs IA
              </p>
              <p className="text-sm font-black tracking-tight text-on-surface">
                Generación en segundo plano
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={onRefresh}
              title="Actualizar"
              className="flex h-8 w-8 items-center justify-center rounded-xl text-secondary transition hover:bg-surface-container-high"
            >
              <span className="material-symbols-outlined text-[16px]">refresh</span>
            </button>
            <button
              type="button"
              onClick={onToggle}
              title="Cerrar panel"
              className="flex h-8 w-8 items-center justify-center rounded-xl text-secondary transition hover:bg-surface-container-high"
            >
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
          </div>
        </header>

        {/* Panel body — scrollable job list */}
        <div className="max-h-110 overflow-y-auto p-4">
          {error && (
            <div className="mb-3 rounded-2xl border border-error/20 bg-error-container/45 px-3 py-2 text-sm text-on-error-container">
              {error}
            </div>
          )}

          {loading && jobs.length === 0 ? (
            <div className="flex items-center gap-2 rounded-2xl bg-surface-container-low px-4 py-3 text-sm text-secondary">
              <span className="material-symbols-outlined animate-spin text-[16px] text-primary">
                progress_activity
              </span>
              Cargando jobs…
            </div>
          ) : jobs.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-outline-variant/30 bg-surface-container-low px-4 py-6 text-center text-sm text-secondary">
              No hay jobs recientes. Inicia una generación IA para ver progreso aquí.
            </div>
          ) : (
            <ul className="space-y-3">
              {jobs.map((job) => {
                const meta = STATUS_META[job.status];
                const progress = Math.max(
                  0,
                  Math.min(100, Math.round(job.progress_percent)),
                );
                const busy = actionLoadingJobId === job.id;

                return (
                  <li
                    key={job.id}
                    className="rounded-2xl border border-outline-variant/20 bg-surface px-4 py-3"
                  >
                    {/* Job header row */}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-xs text-secondary">
                          {job.area_code} · {job.total_requested} preguntas ·{" "}
                          {relativeTime(job.created_at)}
                        </p>
                        <p className="mt-0.5 text-sm font-semibold text-on-surface">
                          {job.total_valid} válidas / {job.total_failed} fallidas /{" "}
                          {job.total_processed} proc.
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-bold ${meta.tone}`}
                      >
                        {meta.label}
                      </span>
                    </div>

                    {/* Progress bar */}
                    <div className="mt-3">
                      <div className="mb-1 flex items-center justify-between text-xs text-secondary">
                        <span>Progreso</span>
                        <span>{progress}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-surface-container-high">
                        <div
                          className={`h-2 rounded-full bg-linear-to-r ${meta.progressTone} transition-all duration-500`}
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>

                    {/* Error summary */}
                    {job.error_summary && (
                      <div className="mt-3 rounded-xl border border-error/20 bg-error-container/40 px-3 py-2 text-xs text-on-error-container">
                        {job.error_summary}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      {!isTerminal(job.status) && (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => onCancel(job.id)}
                          className="rounded-lg bg-surface-container-high px-3 py-1.5 text-xs font-semibold text-on-surface transition hover:bg-surface-container-highest disabled:opacity-50"
                        >
                          Cancelar
                        </button>
                      )}

                      {isTerminal(job.status) &&
                        (job.status === "FAILED" ||
                          job.status === "PARTIAL" ||
                          job.status === "CANCELLED") && (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => onRetry(job.id)}
                            className="rounded-lg bg-linear-to-r from-primary to-secondary px-3 py-1.5 text-xs font-bold text-white transition hover:opacity-90 disabled:opacity-50"
                          >
                            Reintentar
                          </button>
                        )}

                      {isTerminal(job.status) && (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => onDelete(job.id)}
                          className="ml-auto rounded-lg border border-error/20 bg-error-container/30 px-3 py-1.5 text-xs font-semibold text-on-error-container transition hover:bg-error-container/60 disabled:opacity-50"
                        >
                          Eliminar
                        </button>
                      )}

                      {busy && (
                        <span className="inline-flex items-center gap-1 text-xs text-secondary">
                          <span className="material-symbols-outlined animate-spin text-[14px]">
                            progress_activity
                          </span>
                          Procesando…
                        </span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {/* ── FAB launcher ──────────────────────────────────────────────── */}
      <button
        type="button"
        onClick={onToggle}
        title={isOpen ? "Cerrar jobs IA" : "Ver jobs de generación IA"}
        className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-linear-to-br from-primary to-primary-container text-white shadow-lg shadow-primary/25 transition hover:opacity-90 hover:shadow-xl active:scale-95"
      >
        {/* Ping ring while active jobs exist */}
        {activeCount > 0 && (
          <span className="absolute inset-0 rounded-2xl animate-ping bg-primary/20" />
        )}

        <span
          className={`material-symbols-outlined text-[22px] transition-transform duration-200 ${isOpen ? "rotate-180" : "rotate-0"}`}
          style={{ fontVariationSettings: `'FILL' 1` }}
        >
          {isOpen ? "keyboard_arrow_down" : "auto_awesome"}
        </span>

        {/* Active-jobs badge */}
        {activeCount > 0 && (
          <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-error px-1 text-[10px] font-black text-white">
            {activeCount}
          </span>
        )}

        {/* Error dot (no active jobs, but failures exist) */}
        {activeCount === 0 && hasError && (
          <span className="absolute -right-1 -top-1 h-3.5 w-3.5 rounded-full border-2 border-white bg-error" />
        )}
      </button>
    </div>
  );
}
