import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../../../context/AuthContext";
import { fetchAreas, fetchAreaDetail } from "../../../../services/questions";
import {
  cancelGenerationJob,
  createGenerationJob,
  fetchGenerationJob,
  retryGenerationJob,
  type CreateGenerationJobPayload,
  type GenerationJobDetail,
  type GenerationJobStatus,
} from "../../../../services/aiJobs";
import type { AreaSummary, CompetencyItem } from "../questionFormTypes";
import ConfirmModal from "../../../../components/ConfirmModal";

interface GenerateAIModalProps {
  onClose: () => void;
  onSuccess: (count: number) => void;
}

type Difficulty = "low" | "medium" | "high" | "mixed";

const AREA_META: Record<string, { emoji: string; color: string; code: string }> = {
  MAT: { emoji: "📐", color: "#1d4ed8", code: "MAT" },
  LC: { emoji: "📖", color: "#6d28d9", code: "LC" },
  ING: { emoji: "🌐", color: "#b45309", code: "ING" },
  CN: { emoji: "🔬", color: "#047857", code: "CN" },
  SC: { emoji: "🗺️", color: "#be123c", code: "SC" },
};

const DIFFICULTIES: { key: Difficulty; label: string }[] = [
  { key: "low", label: "Baja" },
  { key: "medium", label: "Media" },
  { key: "high", label: "Alta" },
  { key: "mixed", label: "Mixta" },
];

const STATUS_META: Record<GenerationJobStatus, { label: string; tone: string }> = {
  QUEUED: { label: "En cola", tone: "bg-secondary-container text-on-secondary-container" },
  RUNNING: { label: "Procesando", tone: "bg-primary-container text-on-primary-container" },
  COMPLETED: { label: "Completado", tone: "bg-tertiary-container text-on-tertiary-container" },
  PARTIAL: { label: "Completado parcial", tone: "bg-secondary-container text-on-secondary-container" },
  FAILED: { label: "Fallido", tone: "bg-error-container text-on-error-container" },
  CANCELLED: { label: "Cancelado", tone: "bg-surface-container-high text-on-surface" },
};

function isTerminalStatus(status: GenerationJobStatus): boolean {
  return status === "COMPLETED" || status === "PARTIAL" || status === "FAILED" || status === "CANCELLED";
}

function isSuccessfulTerminalStatus(status: GenerationJobStatus): boolean {
  return status === "COMPLETED" || status === "PARTIAL";
}

export default function GenerateAIModal({ onClose, onSuccess }: GenerateAIModalProps) {
  const { authFetch } = useAuth();

  const [areas, setAreas] = useState<AreaSummary[]>([]);
  const [selectedAreaId, setSelectedAreaId] = useState("");
  const [competencies, setCompetencies] = useState<CompetencyItem[]>([]);
  const [selectedCompetencyId, setSelectedCompetencyId] = useState("");
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [count, setCount] = useState(5);
  const [additionalContext, setAdditionalContext] = useState("");

  const [loadingAreas, setLoadingAreas] = useState(false);
  const [loadingComps, setLoadingComps] = useState(false);
  const [creatingJob, setCreatingJob] = useState(false);
  const [jobDetail, setJobDetail] = useState<GenerationJobDetail | null>(null);
  const [trackingJobId, setTrackingJobId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  useEffect(() => {
    let active = true;
    setLoadingAreas(true);
    fetchAreas(authFetch)
      .then((data) => {
        if (active) {
          setAreas(data);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (active) {
          setLoadingAreas(false);
        }
      });
    return () => {
      active = false;
    };
  }, [authFetch]);

  useEffect(() => {
    if (!selectedAreaId) {
      setCompetencies([]);
      return;
    }

    let active = true;
    setLoadingComps(true);
    setSelectedCompetencyId("");
    fetchAreaDetail(authFetch, selectedAreaId)
      .then((data) => {
        if (active) {
          setCompetencies(data.competencies);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (active) {
          setLoadingComps(false);
        }
      });

    return () => {
      active = false;
    };
  }, [authFetch, selectedAreaId]);

  useEffect(() => {
    if (!trackingJobId) {
      return;
    }

    if (jobDetail && isTerminalStatus(jobDetail.status)) {
      return;
    }

    let active = true;
    let polling = false;

    const pollJob = async () => {
      if (!active || polling) {
        return;
      }
      polling = true;
      try {
        const next = await fetchGenerationJob(authFetch, trackingJobId);
        if (active) {
          setJobDetail(next);
        }
      } catch (err) {
        if (active) {
          const msg = err instanceof Error ? err.message : "No se pudo consultar el progreso del job";
          setError(msg);
        }
      } finally {
        polling = false;
      }
    };

    void pollJob();
    const interval = window.setInterval(() => {
      void pollJob();
    }, 2000);

    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [authFetch, jobDetail?.status, trackingJobId]);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !creatingJob) {
        handleClose();
      }
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  });

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const selectedAreaCode = areas.find((a) => a.id === selectedAreaId)?.code ?? "";
  const hasRunningJob = jobDetail ? !isTerminalStatus(jobDetail.status) : creatingJob;
  const isTracking = creatingJob || !!jobDetail;
  const isDirty =
    selectedAreaId !== "" ||
    additionalContext !== "" ||
    count !== 5 ||
    difficulty !== "medium" ||
    hasRunningJob;

  const handleClose = useCallback(() => {
    if (creatingJob) {
      return;
    }
    if (isDirty) {
      setShowDiscardConfirm(true);
      return;
    }
    onClose();
  }, [creatingJob, isDirty, onClose]);

  const adjustCount = (delta: number) => {
    setCount((prev) => Math.max(1, Math.min(20, prev + delta)));
  };

  const handleGenerate = useCallback(async () => {
    if (!selectedAreaId) {
      setError("Selecciona un área del examen.");
      return;
    }

    setError("");
    setCreatingJob(true);

    const cognitiveLevel =
      difficulty === "low" ? 1 : difficulty === "high" ? 3 : difficulty === "mixed" ? undefined : 2;

    try {
      const body: CreateGenerationJobPayload = {
        area_code: selectedAreaCode,
        count,
      };
      if (selectedCompetencyId) {
        const comp = competencies.find((c) => c.id === selectedCompetencyId);
        if (comp) {
          body.competency_code = comp.code;
        }
      }
      if (cognitiveLevel !== undefined) {
        body.cognitive_level = cognitiveLevel;
      }

      const createdJob = await createGenerationJob(authFetch, body);
      setTrackingJobId(createdJob.id);
      setJobDetail({ ...createdJob, items: [] });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error al encolar generación";
      setError(msg);
    } finally {
      setCreatingJob(false);
    }
  }, [
    authFetch,
    competencies,
    count,
    difficulty,
    selectedAreaCode,
    selectedAreaId,
    selectedCompetencyId,
  ]);

  const handleCancelJob = useCallback(async () => {
    if (!jobDetail) {
      return;
    }

    setError("");
    try {
      const updated = await cancelGenerationJob(authFetch, jobDetail.id);
      setJobDetail((prev) => (prev ? { ...prev, ...updated } : { ...updated, items: [] }));
    } catch (err) {
      const msg = err instanceof Error ? err.message : "No se pudo cancelar el job";
      setError(msg);
    }
  }, [authFetch, jobDetail]);

  const handleRetry = useCallback(async () => {
    if (!jobDetail) {
      return;
    }

    setError("");
    setCreatingJob(true);
    try {
      const retryJob = await retryGenerationJob(authFetch, jobDetail.id);
      setTrackingJobId(retryJob.id);
      setJobDetail({ ...retryJob, items: [] });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "No se pudo reintentar el job";
      setError(msg);
    } finally {
      setCreatingJob(false);
    }
  }, [authFetch, jobDetail]);

  const handleApplyResults = useCallback(() => {
    if (!jobDetail) {
      onSuccess(0);
      return;
    }
    const generatedCount = Math.max(jobDetail.total_valid, jobDetail.total_generated, jobDetail.total_processed);
    onSuccess(generatedCount);
  }, [jobDetail, onSuccess]);

  const progressPercent = Math.max(0, Math.min(100, jobDetail?.progress_percent ?? 0));
  const statusLabel = jobDetail ? STATUS_META[jobDetail.status].label : "Encolando";
  const statusTone = jobDetail ? STATUS_META[jobDetail.status].tone : "bg-primary-container text-on-primary-container";
  const isTerminal = jobDetail ? isTerminalStatus(jobDetail.status) : false;
  const isSuccessTerminal = jobDetail ? isSuccessfulTerminalStatus(jobDetail.status) : false;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-on-surface/40 p-5 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          handleClose();
        }
      }}
    >
      <div className="relative flex max-h-[88vh] w-full max-w-[620px] flex-col overflow-hidden rounded-3xl bg-white shadow-xl shadow-on-surface/15">
        <header className="flex items-center justify-between px-7 pt-6">
          <div>
            <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-violet-700">
              <span
                className="material-symbols-outlined text-[14px] text-violet-700"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                auto_awesome
              </span>
              ScholarAI
            </p>
            <h2 className="mt-1 text-[22px] font-extrabold tracking-tight text-on-surface">
              Generar Preguntas con IA
            </h2>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={creatingJob}
            className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-surface-container-high text-on-surface transition hover:bg-surface-container-highest disabled:opacity-50"
            aria-label="Cerrar"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </header>

        {!isTracking ? (
          <div className="flex-1 space-y-5 overflow-y-auto px-7 pt-6 pb-7">
            {error && (
              <div className="flex items-center gap-2 rounded-2xl bg-error-container px-4 py-3 text-sm font-semibold text-on-error-container">
                <span className="material-symbols-outlined text-[18px]">error</span>
                {error}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-[0.14em] text-secondary">
                Área del examen
              </label>
              {loadingAreas ? (
                <div className="flex items-center gap-2 py-4 text-sm text-secondary">
                  <span className="material-symbols-outlined animate-spin text-[16px] text-primary">
                    progress_activity
                  </span>
                  Cargando áreas…
                </div>
              ) : (
                <div className="grid grid-cols-5 gap-2">
                  {areas.map((area) => {
                    const meta = AREA_META[area.code] ?? { emoji: "📋", color: "#505f76", code: area.code };
                    const isSelected = selectedAreaId === area.id;
                    return (
                      <button
                        key={area.id}
                        type="button"
                        onClick={() => setSelectedAreaId(isSelected ? "" : area.id)}
                        className={`rounded-xl border-2 px-2 py-2.5 text-center transition ${
                          isSelected
                            ? "border-primary bg-primary-fixed"
                            : "border-transparent bg-surface-container-high hover:bg-surface-container-highest"
                        }`}
                      >
                        <div className="text-lg">{meta.emoji}</div>
                        <div className="mt-1 text-[11px] font-bold" style={{ color: meta.color }}>
                          {meta.code}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-[0.14em] text-secondary">
                Competencia específica
              </label>
              <div className="relative">
                <select
                  value={selectedCompetencyId}
                  onChange={(e) => setSelectedCompetencyId(e.target.value)}
                  disabled={!selectedAreaId || loadingComps}
                  className="w-full appearance-none rounded-xl border border-outline-variant/20 bg-surface-container-highest py-3 pl-3.5 pr-9 text-sm font-medium text-on-surface outline-none transition focus:border-transparent focus:ring-2 focus:ring-primary/30 disabled:opacity-50"
                >
                  <option value="">
                    {loadingComps
                      ? "Cargando…"
                      : !selectedAreaId
                        ? "Selecciona un área primero"
                        : "Todas las competencias"}
                  </option>
                  {competencies.map((comp) => (
                    <option key={comp.id} value={comp.id}>
                      {comp.name}
                    </option>
                  ))}
                </select>
                {loadingComps ? (
                  <span className="material-symbols-outlined pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 animate-spin text-[16px] text-primary">
                    progress_activity
                  </span>
                ) : (
                  <span className="material-symbols-outlined pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[16px] text-secondary">
                    expand_more
                  </span>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-[0.14em] text-secondary">
                Nivel de dificultad
              </label>
              <div className="flex gap-2">
                {DIFFICULTIES.map((item) => {
                  const isSelected = difficulty === item.key;
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setDifficulty(item.key)}
                      className={`flex-1 rounded-[10px] border-2 py-2 text-center text-xs font-semibold transition ${
                        isSelected
                          ? "border-primary bg-primary-fixed text-on-primary-fixed"
                          : "border-transparent bg-surface-container-high text-secondary hover:bg-surface-container-highest"
                      }`}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-[0.14em] text-secondary">
                Cantidad de preguntas
              </label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => adjustCount(-1)}
                  className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-surface-container-high text-lg font-bold text-on-surface transition hover:bg-surface-container-highest"
                >
                  −
                </button>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={count}
                  onChange={(e) => {
                    const n = parseInt(e.target.value, 10);
                    if (!Number.isNaN(n)) {
                      setCount(Math.max(1, Math.min(20, n)));
                    }
                  }}
                  className="w-[72px] rounded-xl border border-outline-variant/20 bg-surface-container-highest py-3 text-center text-sm font-medium text-on-surface outline-none transition focus:border-transparent focus:ring-2 focus:ring-primary/30"
                />
                <button
                  type="button"
                  onClick={() => adjustCount(1)}
                  className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-surface-container-high text-lg font-bold text-on-surface transition hover:bg-surface-container-highest"
                >
                  +
                </button>
                <span className="text-[13px] text-secondary">máx. 20 por sesión</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-[0.14em] text-secondary">
                Contexto adicional (opcional)
              </label>
              <textarea
                value={additionalContext}
                onChange={(e) => setAdditionalContext(e.target.value)}
                placeholder="Ej: 'Preguntas sobre funciones cuadráticas con contexto de física aplicada'"
                rows={3}
                className="w-full resize-vertical rounded-xl border border-outline-variant/20 bg-surface-container-highest px-3.5 py-3 text-sm text-on-surface outline-none transition focus:border-transparent focus:bg-white focus:ring-2 focus:ring-primary/30"
              />
              <span className="text-[11px] text-secondary">
                Guía a la IA con un tema específico o tipo de contexto.
              </span>
            </div>
          </div>
        ) : (
          <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-7 pt-6 pb-7">
            {error && (
              <div className="flex items-center gap-2 rounded-2xl bg-error-container px-4 py-3 text-sm font-semibold text-on-error-container">
                <span className="material-symbols-outlined text-[18px]">error</span>
                {error}
              </div>
            )}

            {creatingJob && !jobDetail ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-4 py-16">
                <div className="h-12 w-12 animate-spin rounded-full border-[3px] border-primary-fixed border-t-primary" />
                <p className="text-[15px] font-bold text-on-surface">Encolando job de generación…</p>
                <p className="text-xs text-secondary">Preparando procesamiento en background</p>
              </div>
            ) : jobDetail ? (
              <>
                <div className="rounded-2xl border border-outline-variant/20 bg-surface-container-low p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold text-secondary">Job</p>
                      <p className="mt-1 font-mono text-xs text-on-surface/80">{jobDetail.id}</p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-bold ${statusTone}`}>
                      {statusLabel}
                    </span>
                  </div>

                  <div className="mt-4">
                    <div className="mb-1 flex items-center justify-between text-xs text-secondary">
                      <span>Progreso</span>
                      <span>{Math.round(progressPercent)}%</span>
                    </div>
                    <div className="h-2.5 rounded-full bg-surface-container-high">
                      <div
                        className="h-2.5 rounded-full bg-gradient-to-r from-primary to-secondary transition-all duration-500"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-xl bg-surface-container-high p-3">
                      <p className="text-xs text-secondary">Solicitadas</p>
                      <p className="text-lg font-bold text-on-surface">{jobDetail.total_requested}</p>
                    </div>
                    <div className="rounded-xl bg-surface-container-high p-3">
                      <p className="text-xs text-secondary">Procesadas</p>
                      <p className="text-lg font-bold text-on-surface">{jobDetail.total_processed}</p>
                    </div>
                    <div className="rounded-xl bg-surface-container-high p-3">
                      <p className="text-xs text-secondary">Válidas</p>
                      <p className="text-lg font-bold text-tertiary">{jobDetail.total_valid}</p>
                    </div>
                    <div className="rounded-xl bg-surface-container-high p-3">
                      <p className="text-xs text-secondary">Fallidas</p>
                      <p className="text-lg font-bold text-error">{jobDetail.total_failed}</p>
                    </div>
                  </div>

                  {jobDetail.error_summary && (
                    <div className="mt-4 rounded-xl border border-error/20 bg-error-container/40 p-3 text-xs text-on-error-container">
                      {jobDetail.error_summary}
                    </div>
                  )}
                </div>

                {isTerminal && (
                  <div
                    className={`rounded-2xl px-4 py-3 text-sm font-semibold ${
                      isSuccessTerminal
                        ? "bg-tertiary-container text-on-tertiary-container"
                        : "bg-error-container text-on-error-container"
                    }`}
                  >
                    {isSuccessTerminal
                      ? "El job finalizó. Puedes actualizar el banco con los resultados generados."
                      : "El job terminó con error o fue cancelado. Puedes reintentarlo."}
                  </div>
                )}
              </>
            ) : null}
          </div>
        )}

        {!isTracking ? (
          <footer className="flex items-center justify-end gap-2.5 border-t border-outline-variant/10 px-7 py-5">
            <button
              type="button"
              onClick={handleClose}
              className="rounded-xl bg-surface-container-high px-5 py-2.5 text-sm font-semibold text-on-surface transition hover:bg-surface-container-highest"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleGenerate}
              className="flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-bold text-white shadow-md transition hover:opacity-90"
              style={{ background: "linear-gradient(135deg, #6d28d9, #7c3aed)" }}
            >
              <span
                className="material-symbols-outlined text-[16px]"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                auto_awesome
              </span>
              Generar preguntas
            </button>
          </footer>
        ) : (
          <footer className="flex items-center justify-between gap-2.5 border-t border-outline-variant/10 px-7 py-5">
            <div>
              {jobDetail && !isTerminalStatus(jobDetail.status) && (
                <button
                  type="button"
                  onClick={handleCancelJob}
                  className="rounded-xl bg-surface-container-high px-4 py-2 text-sm font-semibold text-on-surface transition hover:bg-surface-container-highest"
                >
                  Cancelar job
                </button>
              )}
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={handleClose}
                className="rounded-xl bg-surface-container-high px-5 py-2.5 text-sm font-semibold text-on-surface transition hover:bg-surface-container-highest"
              >
                Cerrar
              </button>

              {jobDetail && isTerminalStatus(jobDetail.status) && isSuccessfulTerminalStatus(jobDetail.status) && (
                <button
                  type="button"
                  onClick={handleApplyResults}
                  className="rounded-xl bg-gradient-to-r from-primary to-secondary px-5 py-2.5 text-sm font-bold text-white shadow-md transition hover:opacity-90"
                >
                  Actualizar banco
                </button>
              )}

              {jobDetail && isTerminalStatus(jobDetail.status) && !isSuccessfulTerminalStatus(jobDetail.status) && (
                <button
                  type="button"
                  onClick={handleRetry}
                  className="rounded-xl bg-gradient-to-r from-primary to-secondary px-5 py-2.5 text-sm font-bold text-white shadow-md transition hover:opacity-90"
                >
                  Reintentar job
                </button>
              )}
            </div>
          </footer>
        )}
      </div>

      {showDiscardConfirm && (
        <ConfirmModal
          title="Descartar cambios"
          message={
            hasRunningJob
              ? "Hay un job en curso. Si cierras, continuará en background. ¿Deseas cerrar?"
              : "Tienes configuración sin usar. ¿Deseas descartarla?"
          }
          confirmLabel="Sí, cerrar"
          cancelLabel="Seguir aquí"
          icon="delete"
          destructive
          onConfirm={onClose}
          onCancel={() => setShowDiscardConfirm(false)}
        />
      )}
    </div>
  );
}
