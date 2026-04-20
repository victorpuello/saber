import type { GenerationJob } from "../../../../services/aiJobs";

interface QBGenerationJobsProps {
  jobs: GenerationJob[];
  loading: boolean;
  error: string;
  onRefresh: () => void;
  onCancel: (jobId: string) => void;
  onRetry: (jobId: string) => void;
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
  return status === "COMPLETED" || status === "PARTIAL" || status === "FAILED" || status === "CANCELLED";
}

function relativeTime(timestamp: string): string {
  const t = Date.parse(timestamp);
  if (Number.isNaN(t)) {
    return "hace un momento";
  }
  const diffSec = Math.max(0, Math.floor((Date.now() - t) / 1000));
  if (diffSec < 60) {
    return `hace ${diffSec}s`;
  }
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) {
    return `hace ${diffMin}m`;
  }
  const diffH = Math.floor(diffMin / 60);
  return `hace ${diffH}h`;
}

export default function QBGenerationJobs({
  jobs,
  loading,
  error,
  onRefresh,
  onCancel,
  onRetry,
  actionLoadingJobId,
}: QBGenerationJobsProps) {
  return (
    <section className="rounded-3xl bg-surface-container-lowest p-6 shadow-[0_12px_40px_rgba(25,28,30,0.05)]">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-secondary">Centro de jobs IA</p>
          <h2 className="mt-1 text-lg font-black tracking-tight text-on-surface">Generación en segundo plano</h2>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          className="inline-flex items-center gap-1.5 rounded-xl bg-surface-container-high px-3 py-2 text-xs font-semibold text-on-surface transition hover:bg-surface-container-highest"
        >
          <span className="material-symbols-outlined text-[15px]">refresh</span>
          Actualizar
        </button>
      </header>

      {error && (
        <div className="mb-4 rounded-2xl border border-error/20 bg-error-container/45 px-3 py-2 text-sm text-on-error-container">
          {error}
        </div>
      )}

      {loading && jobs.length === 0 ? (
        <div className="flex items-center gap-2 rounded-2xl bg-surface-container-low px-4 py-3 text-sm text-secondary">
          <span className="material-symbols-outlined animate-spin text-[16px] text-primary">progress_activity</span>
          Cargando jobs...
        </div>
      ) : jobs.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-outline-variant/30 bg-surface-container-low px-4 py-6 text-center text-sm text-secondary">
          No hay jobs recientes. Inicia una generación IA para ver progreso aquí.
        </div>
      ) : (
        <ul className="space-y-3">
          {jobs.map((job) => {
            const statusMeta = STATUS_META[job.status];
            const progress = Math.max(0, Math.min(100, Math.round(job.progress_percent)));
            const busy = actionLoadingJobId === job.id;
            return (
              <li key={job.id} className="rounded-2xl border border-outline-variant/20 bg-surface px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-xs text-secondary">
                      {job.area_code} · {job.total_requested} preguntas · {relativeTime(job.created_at)}
                    </p>
                    <p className="mt-0.5 text-sm font-semibold text-on-surface">
                      {job.total_valid} válidas / {job.total_failed} fallidas / {job.total_processed} procesadas
                    </p>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${statusMeta.tone}`}>
                    {statusMeta.label}
                  </span>
                </div>

                <div className="mt-3">
                  <div className="mb-1 flex items-center justify-between text-xs text-secondary">
                    <span>Progreso</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-surface-container-high">
                    <div
                      className={`h-2 rounded-full bg-linear-to-r ${statusMeta.progressTone} transition-all duration-500`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>

                {job.error_summary && (
                  <div className="mt-3 rounded-xl border border-error/20 bg-error-container/40 px-3 py-2 text-xs text-on-error-container">
                    {job.error_summary}
                  </div>
                )}

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

                  {isTerminal(job.status) && (job.status === "FAILED" || job.status === "PARTIAL" || job.status === "CANCELLED") && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => onRetry(job.id)}
                      className="rounded-lg bg-linear-to-r from-primary to-secondary px-3 py-1.5 text-xs font-bold text-white transition hover:opacity-90 disabled:opacity-50"
                    >
                      Reintentar
                    </button>
                  )}

                  {busy && (
                    <span className="inline-flex items-center gap-1 text-xs text-secondary">
                      <span className="material-symbols-outlined animate-spin text-[14px]">progress_activity</span>
                      Procesando acción...
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
