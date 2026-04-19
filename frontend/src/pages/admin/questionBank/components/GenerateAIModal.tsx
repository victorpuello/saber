import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../../../context/AuthContext";
import { fetchAreas, fetchAreaDetail } from "../../../../services/questions";
import type { AreaSummary, CompetencyItem } from "../questionFormTypes";
import ConfirmModal from "../../../../components/ConfirmModal";

interface GenerateAIModalProps {
  onClose: () => void;
  onSuccess: (count: number) => void;
}

type Difficulty = "low" | "medium" | "high" | "mixed";

const AREA_META: Record<string, { emoji: string; color: string; code: string }> = {
  MAT: { emoji: "📐", color: "#1d4ed8", code: "MAT" },
  LC:  { emoji: "📖", color: "#6d28d9", code: "LC" },
  ING: { emoji: "🌐", color: "#b45309", code: "ING" },
  CN:  { emoji: "🔬", color: "#047857", code: "CN" },
  SC:  { emoji: "🗺️", color: "#be123c", code: "SC" },
};

const DIFFICULTIES: { key: Difficulty; label: string }[] = [
  { key: "low", label: "Baja" },
  { key: "medium", label: "Media" },
  { key: "high", label: "Alta" },
  { key: "mixed", label: "Mixta" },
];

export default function GenerateAIModal({ onClose, onSuccess }: GenerateAIModalProps) {
  const { authFetch } = useAuth();

  // Form state
  const [areas, setAreas] = useState<AreaSummary[]>([]);
  const [selectedAreaId, setSelectedAreaId] = useState("");
  const [competencies, setCompetencies] = useState<CompetencyItem[]>([]);
  const [selectedCompetencyId, setSelectedCompetencyId] = useState("");
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [count, setCount] = useState(5);
  const [additionalContext, setAdditionalContext] = useState("");

  // UI state
  const [loadingAreas, setLoadingAreas] = useState(false);
  const [loadingComps, setLoadingComps] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  // Load areas
  useEffect(() => {
    let active = true;
    setLoadingAreas(true);
    fetchAreas(authFetch)
      .then((data) => { if (active) setAreas(data); })
      .catch(() => {})
      .finally(() => { if (active) setLoadingAreas(false); });
    return () => { active = false; };
  }, [authFetch]);

  // Load competencies when area changes
  useEffect(() => {
    if (!selectedAreaId) {
      setCompetencies([]);
      return;
    }
    let active = true;
    setLoadingComps(true);
    setSelectedCompetencyId("");
    fetchAreaDetail(authFetch, selectedAreaId)
      .then((data) => { if (active) setCompetencies(data.competencies); })
      .catch(() => {})
      .finally(() => { if (active) setLoadingComps(false); });
    return () => { active = false; };
  }, [authFetch, selectedAreaId]);

  // Resolve area code from id
  const selectedAreaCode = areas.find((a) => a.id === selectedAreaId)?.code ?? "";

  // Close handlers
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !generating) handleClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  });

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const isDirty = selectedAreaId !== "" || additionalContext !== "" || count !== 5 || difficulty !== "medium";

  const handleClose = useCallback(() => {
    if (generating) return;
    if (isDirty) {
      setShowDiscardConfirm(true);
      return;
    }
    onClose();
  }, [generating, isDirty, onClose]);

  // Count helpers
  const adjustCount = (delta: number) => {
    setCount((prev) => Math.max(1, Math.min(25, prev + delta)));
  };

  // Submit
  const handleGenerate = useCallback(async () => {
    if (!selectedAreaId) {
      setError("Selecciona un área del examen.");
      return;
    }

    setError("");
    setGenerating(true);

    const cognitiveLevel = difficulty === "low" ? 1 : difficulty === "high" ? 3 : difficulty === "mixed" ? undefined : 2;

    try {
      const body: Record<string, unknown> = {
        area_code: selectedAreaCode,
        count,
      };
      if (selectedCompetencyId) {
        const comp = competencies.find((c) => c.id === selectedCompetencyId);
        if (comp) body.competency_code = comp.code;
      }
      if (cognitiveLevel !== undefined) body.cognitive_level = cognitiveLevel;

      await authFetch("/api/ai/generate/batch", {
        method: "POST",
        body: JSON.stringify(body),
      });

      onSuccess(count);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error al generar preguntas";
      setError(msg);
    } finally {
      setGenerating(false);
    }
  }, [authFetch, competencies, count, difficulty, onSuccess, selectedAreaCode, selectedAreaId, selectedCompetencyId]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-on-surface/40 backdrop-blur-sm p-5"
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <div className="relative flex max-h-[88vh] w-full max-w-[620px] flex-col overflow-hidden rounded-3xl bg-white shadow-xl shadow-on-surface/15">
        {/* ── Header ── */}
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
            disabled={generating}
            className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-surface-container-high text-on-surface transition hover:bg-surface-container-highest disabled:opacity-50"
            aria-label="Cerrar"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </header>

        {/* ── Body ── */}
        {!generating ? (
          <div className="flex-1 overflow-y-auto px-7 pt-6 pb-7 space-y-5">
            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 rounded-2xl bg-error-container px-4 py-3 text-sm font-semibold text-on-error-container">
                <span className="material-symbols-outlined text-[18px]">error</span>
                {error}
              </div>
            )}

            {/* Área del examen — grid de botones */}
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

            {/* Competencia específica */}
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
                  {competencies.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
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

            {/* Nivel de dificultad */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-[0.14em] text-secondary">
                Nivel de dificultad
              </label>
              <div className="flex gap-2">
                {DIFFICULTIES.map((d) => {
                  const isSelected = difficulty === d.key;
                  return (
                    <button
                      key={d.key}
                      type="button"
                      onClick={() => setDifficulty(d.key)}
                      className={`flex-1 rounded-[10px] border-2 py-2 text-center text-xs font-semibold transition ${
                        isSelected
                          ? "border-primary bg-primary-fixed text-on-primary-fixed"
                          : "border-transparent bg-surface-container-high text-secondary hover:bg-surface-container-highest"
                      }`}
                    >
                      {d.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Cantidad de preguntas */}
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
                  max={25}
                  value={count}
                  onChange={(e) => {
                    const n = parseInt(e.target.value, 10);
                    if (!isNaN(n)) setCount(Math.max(1, Math.min(25, n)));
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
                <span className="text-[13px] text-secondary">máx. 25 por sesión</span>
              </div>
            </div>

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
          /* ── Generating state ── */
          <div className="flex flex-1 flex-col items-center justify-center gap-4 py-16">
            <div className="h-12 w-12 animate-spin rounded-full border-[3px] border-primary-fixed border-t-primary" />
            <p className="text-[15px] font-bold text-on-surface">Generando preguntas…</p>
            <p className="text-xs text-secondary">
              ScholarAI está creando contenido basado en el ICFES
            </p>
            <div className="flex gap-1.5">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="h-1.5 w-1.5 rounded-full bg-primary"
                  style={{ animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite` }}
                />
              ))}
            </div>
          </div>
        )}

        {/* ── Footer ── */}
        {!generating && (
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
        )}
      </div>

      {/* Discard confirm */}
      {showDiscardConfirm && (
        <ConfirmModal
          title="Descartar cambios"
          message="Tienes configuración sin usar. ¿Deseas descartarla?"
          confirmLabel="Sí, descartar"
          cancelLabel="Seguir editando"
          icon="delete"
          destructive
          onConfirm={onClose}
          onCancel={() => setShowDiscardConfirm(false)}
        />
      )}

      {/* Pulse animation for dots */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
