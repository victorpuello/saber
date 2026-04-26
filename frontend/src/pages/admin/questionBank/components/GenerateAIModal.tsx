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
  type GenerationStructureType,
} from "../../../../services/aiJobs";
import type { AreaSummary, CompetencyItem, MediaType } from "../questionFormTypes";
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

interface VisualTypeOption {
  type: MediaType;
  label: string;
  emoji: string;
  areas?: string[];
}

interface EnglishContextOption {
  sections: number[];
  title: string;
  subtitle: string;
  component: string;
  icon: string;
}

const VISUAL_TYPE_OPTIONS: VisualTypeOption[] = [
  { type: "chart", label: "Gráfica", emoji: "📊" },
  { type: "table", label: "Tabla", emoji: "📋" },
  { type: "diagram", label: "Diagrama", emoji: "🔷" },
  { type: "geometric_figure", label: "Figura geométrica", emoji: "📐", areas: ["MAT"] },
  { type: "map", label: "Mapa", emoji: "🗺️", areas: ["SC"] },
  { type: "timeline", label: "Línea de tiempo", emoji: "📅", areas: ["SC", "LC"] },
  { type: "probability_diagram", label: "Diagrama prob.", emoji: "🎲", areas: ["MAT"] },
  { type: "infographic", label: "Infografía", emoji: "📰" },
  { type: "state_structure", label: "Estructura estatal", emoji: "🏛️", areas: ["SC"] },
  { type: "public_sign", label: "Aviso / señal", emoji: "🪧" },
];

const ENGLISH_CONTEXT_OPTIONS: EnglishContextOption[] = [
  {
    sections: [1],
    title: "Aviso / señal",
    subtitle: "Parte 1 · NoticeSign",
    component: "NoticeSign",
    icon: "signpost",
  },
  {
    sections: [2],
    title: "Matching léxico",
    subtitle: "Parte 2 · definición",
    component: "Lista de palabras",
    icon: "match_case",
  },
  {
    sections: [3],
    title: "Diálogo",
    subtitle: "Parte 3 · ChatUI",
    component: "ChatUI",
    icon: "forum",
  },
  {
    sections: [4, 7],
    title: "Cloze text",
    subtitle: "Partes 4 y 7 · [BLANK]",
    component: "ClozeText",
    icon: "fact_check",
  },
  {
    sections: [5, 6],
    title: "Lectura / email",
    subtitle: "Partes 5 y 6 · texto o correo",
    component: "EmailWrapper opcional",
    icon: "mail",
  },
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
  const [structureType, setStructureType] = useState<GenerationStructureType>("INDIVIDUAL");
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [count, setCount] = useState(5);
  const [additionalContext, setAdditionalContext] = useState("");

  // Visual generation
  const [includeVisual, setIncludeVisual] = useState(false);
  const [visualType, setVisualType] = useState<MediaType | "">("");

  // English section (only for ING)
  const [englishSection, setEnglishSection] = useState<number | "">("");

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
      .then((data) => { if (active) setAreas(data); })
      .catch(() => {})
      .finally(() => { if (active) setLoadingAreas(false); });
    return () => { active = false; };
  }, [authFetch]);

  useEffect(() => {
    if (!selectedAreaId) {
      setCompetencies([]);
      return;
    }
    let active = true;
    setLoadingComps(true);
    setSelectedCompetencyId("");
    setEnglishSection("");
    setStructureType("INDIVIDUAL");
    fetchAreaDetail(authFetch, selectedAreaId)
      .then((data) => { if (active) setCompetencies(data.competencies); })
      .catch(() => {})
      .finally(() => { if (active) setLoadingComps(false); });
    return () => { active = false; };
  }, [authFetch, selectedAreaId]);

  useEffect(() => {
    if (!trackingJobId) return;
    if (jobDetail && isTerminalStatus(jobDetail.status)) return;

    let active = true;
    let polling = false;

    const pollJob = async () => {
      if (!active || polling || document.visibilityState !== "visible") return;
      polling = true;
      try {
        const next = await fetchGenerationJob(authFetch, trackingJobId);
        if (active) setJobDetail(next);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "No se pudo consultar el progreso del job");
      } finally {
        polling = false;
      }
    };

    void pollJob();
    const interval = window.setInterval(() => { void pollJob(); }, 5000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") void pollJob();
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      active = false;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [authFetch, jobDetail?.status, trackingJobId]);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !creatingJob) handleClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  });

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const selectedAreaCode = areas.find((a) => a.id === selectedAreaId)?.code ?? "";
  const isING = selectedAreaCode === "ING";
  const isBlockMode = structureType === "QUESTION_BLOCK";
  const selectedEnglishContext = ENGLISH_CONTEXT_OPTIONS.find((option) => (
    englishSection !== "" && option.sections.includes(Number(englishSection))
  ));
  const hasRunningJob = jobDetail ? !isTerminalStatus(jobDetail.status) : creatingJob;
  const isTracking = creatingJob || !!jobDetail;
  const isDirty =
    selectedAreaId !== "" ||
    additionalContext !== "" ||
    count !== 5 ||
    structureType !== "INDIVIDUAL" ||
    difficulty !== "medium" ||
    includeVisual ||
    hasRunningJob;

  useEffect(() => {
    if (isING || isBlockMode) {
      setIncludeVisual(false);
      setVisualType("");
    }
  }, [isBlockMode, isING]);

  const handleClose = useCallback(() => {
    if (creatingJob) return;
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
    if (!isING && includeVisual && !visualType) {
      setError("Selecciona un tipo de visual o desactiva la opción de visual.");
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
        structure_type: structureType,
      };
      if (selectedCompetencyId) {
        const comp = competencies.find((c) => c.id === selectedCompetencyId);
        if (comp) body.competency_code = comp.code;
      }
      if (cognitiveLevel !== undefined) body.cognitive_level = cognitiveLevel;
      if (!isING && !isBlockMode && includeVisual && visualType) {
        body.include_visual = true;
        body.visual_type = visualType;
      }
      if (isING && englishSection !== "") {
        body.english_section = Number(englishSection);
      }
      if (additionalContext.trim()) {
        body.additional_context = additionalContext.trim();
      }

      const createdJob = await createGenerationJob(authFetch, body);
      setTrackingJobId(createdJob.id);
      setJobDetail({ ...createdJob, items: [] });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al encolar generación");
    } finally {
      setCreatingJob(false);
    }
  }, [
    authFetch, competencies, count, difficulty, includeVisual, visualType,
    isBlockMode, isING, englishSection, additionalContext, structureType,
    selectedAreaCode, selectedAreaId, selectedCompetencyId,
  ]);

  const handleCancelJob = useCallback(async () => {
    if (!jobDetail) return;
    setError("");
    try {
      const updated = await cancelGenerationJob(authFetch, jobDetail.id);
      setJobDetail((prev) => (prev ? { ...prev, ...updated } : { ...updated, items: [] }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cancelar el job");
    }
  }, [authFetch, jobDetail]);

  const handleRetry = useCallback(async () => {
    if (!jobDetail) return;
    setError("");
    setCreatingJob(true);
    try {
      const retryJob = await retryGenerationJob(authFetch, jobDetail.id);
      setTrackingJobId(retryJob.id);
      setJobDetail({ ...retryJob, items: [] });
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo reintentar el job");
    } finally {
      setCreatingJob(false);
    }
  }, [authFetch, jobDetail]);

  const handleApplyResults = useCallback(() => {
    if (!jobDetail) { onSuccess(0); return; }
    const generatedCount = Math.max(jobDetail.total_valid, jobDetail.total_generated, jobDetail.total_processed);
    onSuccess(generatedCount);
  }, [jobDetail, onSuccess]);

  const progressPercent = Math.max(0, Math.min(100, jobDetail?.progress_percent ?? 0));
  const statusLabel = jobDetail ? STATUS_META[jobDetail.status].label : "Encolando";
  const statusTone = jobDetail ? STATUS_META[jobDetail.status].tone : "bg-primary-container text-on-primary-container";
  const isTerminal = jobDetail ? isTerminalStatus(jobDetail.status) : false;
  const isSuccessTerminal = jobDetail ? isSuccessfulTerminalStatus(jobDetail.status) : false;

  // Filter visual type options to show relevant ones first based on selected area
  const sortedVisualOptions = [...VISUAL_TYPE_OPTIONS].sort((a, b) => {
    const aRelevant = a.areas?.includes(selectedAreaCode) ?? false;
    const bRelevant = b.areas?.includes(selectedAreaCode) ?? false;
    if (aRelevant && !bRelevant) return -1;
    if (!aRelevant && bRelevant) return 1;
    return 0;
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-on-surface/40 p-5 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <div className="relative flex max-h-[92vh] w-full max-w-165 flex-col overflow-hidden rounded-3xl bg-white shadow-xl shadow-on-surface/15">
        {/* Header */}
        <header className="flex items-center justify-between px-7 pt-6 pb-5">
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
            <h2 className="mt-0.5 text-[22px] font-extrabold tracking-tight text-on-surface">
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
          <div className="flex-1 space-y-5 overflow-y-auto px-7 pb-7 [scrollbar-color:var(--color-surface-container-highest)_transparent] [scrollbar-width:thin]">
            {error && (
              <div className="flex items-center gap-2 rounded-2xl bg-error-container px-4 py-3 text-sm font-semibold text-on-error-container">
                <span className="material-symbols-outlined text-[18px]">error</span>
                {error}
              </div>
            )}

            {/* Área */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-[0.14em] text-secondary">
                Área del examen
              </label>
              {loadingAreas ? (
                <div className="flex items-center gap-2 py-4 text-sm text-secondary">
                  <span className="material-symbols-outlined animate-spin text-[16px] text-primary">progress_activity</span>
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

            {/* Competencia */}
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
                    {loadingComps ? "Cargando…" : !selectedAreaId ? "Selecciona un área primero" : "Todas las competencias"}
                  </option>
                  {competencies.map((comp) => (
                    <option key={comp.id} value={comp.id}>{comp.name}</option>
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
                Estructura
              </label>
              <div className="grid grid-cols-2 gap-2">
                {([
                  { value: "INDIVIDUAL", label: "Individual", copy: "1 pregunta por unidad" },
                  { value: "QUESTION_BLOCK", label: "Bloque de preguntas", copy: "2 subpreguntas por bloque" },
                ] as const).map((option) => {
                  const isSelected = structureType === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setStructureType(option.value)}
                      className={`rounded-xl border-2 px-3 py-3 text-left transition ${
                        isSelected
                          ? "border-primary bg-primary-fixed"
                          : "border-transparent bg-surface-container-high hover:bg-surface-container-highest"
                      }`}
                    >
                      <div className="text-sm font-bold text-on-surface">{option.label}</div>
                      <div className="mt-1 text-[11px] text-secondary">{option.copy}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Sección inglés (solo ING) */}
            {isING && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-[0.14em] text-secondary">
                  Sección de inglés
                  <span className="ml-1.5 rounded-full bg-amber-100 px-2 py-0.5 text-[9px] text-amber-700">ING</span>
                </label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setEnglishSection(englishSection === n ? "" : n)}
                      className={`flex h-9 w-9 items-center justify-center rounded-[10px] border-2 text-sm font-bold transition ${
                        englishSection === n
                          ? "border-primary bg-primary-fixed text-primary"
                          : "border-transparent bg-surface-container-high text-secondary hover:bg-surface-container-highest"
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                  <span className="self-center text-[11px] text-secondary">Secciones 1–7</span>
                </div>
              </div>
            )}

            {/* Dificultad */}
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

            {/* Cantidad */}
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
                    if (!Number.isNaN(n)) setCount(Math.max(1, Math.min(20, n)));
                  }}
                  className="w-18 rounded-xl border border-outline-variant/20 bg-surface-container-highest py-3 text-center text-sm font-medium text-on-surface outline-none transition focus:border-transparent focus:ring-2 focus:ring-primary/30"
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

            {isING ? (
              <div className="space-y-3 rounded-2xl border border-outline-variant/15 bg-surface-container-low p-4">
                <div className="flex items-start gap-2.5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-violet-100">
                    <span
                      className="material-symbols-outlined text-[16px] text-violet-700"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      dashboard_customize
                    </span>
                  </div>
                  <div>
                    <p className="text-[13px] font-bold text-on-surface">Visuales de inglés por sección</p>
                    <p className="text-[11px] text-secondary">
                      La sección define el contexto que verá el estudiante.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {ENGLISH_CONTEXT_OPTIONS.map((option) => {
                    const isSelected = englishSection !== "" && option.sections.includes(Number(englishSection));
                    return (
                      <button
                        key={option.title}
                        type="button"
                        onClick={() => setEnglishSection(isSelected ? "" : option.sections[0])}
                        className={`flex min-h-18 items-start gap-2 rounded-xl border-2 px-3 py-2.5 text-left transition ${
                          isSelected
                            ? "border-violet-500 bg-violet-50"
                            : "border-transparent bg-white hover:border-violet-200 hover:bg-violet-50/40"
                        }`}
                      >
                        <span className={`material-symbols-outlined mt-0.5 text-[18px] ${isSelected ? "text-violet-700" : "text-secondary"}`}>
                          {option.icon}
                        </span>
                        <span className="min-w-0">
                          <span className={`block text-[12px] font-bold leading-tight ${isSelected ? "text-violet-800" : "text-on-surface"}`}>
                            {option.title}
                          </span>
                          <span className="mt-0.5 block text-[10px] leading-tight text-secondary">
                            {option.subtitle}
                          </span>
                          <span className="mt-1 block text-[10px] font-semibold leading-tight text-violet-700">
                            {option.component}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>

                <p className="text-[10px] text-secondary">
                  {selectedEnglishContext
                    ? `Seleccionado: ${selectedEnglishContext.title}`
                    : "Selecciona una sección arriba o elige un tipo visual aquí."}
                </p>
              </div>
            ) : (
              <div className="space-y-3 rounded-2xl border border-outline-variant/15 bg-surface-container-low p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-violet-100">
                      <span
                        className="material-symbols-outlined text-[16px] text-violet-700"
                        style={{ fontVariationSettings: "'FILL' 1" }}
                      >
                        image
                      </span>
                    </div>
                    <div>
                      <p className="text-[13px] font-bold text-on-surface">Visual generado por IA</p>
                      <p className="text-[11px] text-secondary">La IA crea datos programáticos para el visual</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={includeVisual}
                    onClick={() => {
                      setIncludeVisual((v) => !v);
                      if (includeVisual) setVisualType("");
                    }}
                    disabled={isBlockMode}
                    className={`relative h-6 w-11 rounded-full transition-colors duration-200 ${
                      includeVisual ? "bg-violet-600" : "bg-surface-container-highest"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-all duration-200 ${
                        includeVisual ? "left-5.5" : "left-0.5"
                      }`}
                    />
                  </button>
                </div>

                {isBlockMode ? (
                  <p className="text-[11px] text-secondary">
                    Los bloques IA usan un contexto compartido textual y no combinan visual programático en esta versión.
                  </p>
                ) : includeVisual && (
                  <div className="space-y-2.5 pt-1">
                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-secondary">
                      Tipo de visual
                    </p>
                    <div className="grid grid-cols-5 gap-2">
                      {sortedVisualOptions.map(({ type, label, emoji, areas: relevantAreas }) => {
                        const isSelected = visualType === type;
                        const isRelevant = relevantAreas?.includes(selectedAreaCode);
                        return (
                          <button
                            key={type}
                            type="button"
                            onClick={() => setVisualType(isSelected ? "" : type)}
                            className={`relative flex flex-col items-center gap-1 rounded-xl border-2 px-1 py-2.5 text-center transition ${
                              isSelected
                                ? "border-violet-500 bg-violet-50"
                                : "border-transparent bg-white hover:border-violet-200 hover:bg-violet-50/40"
                            }`}
                          >
                            {isRelevant && (
                              <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-violet-500" />
                            )}
                            <span className="text-base">{emoji}</span>
                            <span className={`text-[10px] font-semibold leading-tight ${isSelected ? "text-violet-700" : "text-secondary"}`}>
                              {label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                    <p className="text-[10px] text-secondary">
                      <span className="mr-1 inline-block h-2 w-2 rounded-full bg-violet-500 align-middle" />
                      Sugeridos para {selectedAreaCode || "el área seleccionada"}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Contexto adicional */}
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
          <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-7 pt-2 pb-7">
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
                {/* Job summary chips */}
                <div className="flex flex-wrap gap-2 py-1">
                  <span className="rounded-full bg-surface-container-high px-3 py-1 text-[11px] font-semibold text-secondary">
                    {AREA_META[jobDetail.area_code]?.emoji ?? "📋"} {jobDetail.area_code}
                  </span>
                  {jobDetail.include_visual && (
                    <span className="rounded-full bg-violet-100 px-3 py-1 text-[11px] font-semibold text-violet-700">
                      🖼 Con visual{jobDetail.visual_type ? ` · ${jobDetail.visual_type}` : ""}
                    </span>
                  )}
                  {jobDetail.cognitive_level && (
                    <span className="rounded-full bg-surface-container-high px-3 py-1 text-[11px] font-semibold text-secondary">
                      Nivel cognitivo {jobDetail.cognitive_level}
                    </span>
                  )}
                </div>

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
                        className="h-2.5 rounded-full bg-linear-to-r from-violet-600 to-primary transition-all duration-500"
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

        {/* Footer */}
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
              disabled={!selectedAreaId}
              className="flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-bold text-white shadow-md transition hover:opacity-90 disabled:opacity-50"
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
              {jobDetail && isTerminal && isSuccessTerminal && (
                <button
                  type="button"
                  onClick={handleApplyResults}
                  className="rounded-xl bg-linear-to-r from-primary to-secondary px-5 py-2.5 text-sm font-bold text-white shadow-md transition hover:opacity-90"
                >
                  Actualizar banco
                </button>
              )}
              {jobDetail && isTerminal && !isSuccessTerminal && (
                <button
                  type="button"
                  onClick={handleRetry}
                  className="rounded-xl bg-linear-to-r from-primary to-secondary px-5 py-2.5 text-sm font-bold text-white shadow-md transition hover:opacity-90"
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
