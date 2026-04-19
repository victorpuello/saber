import { useState, useEffect, useCallback } from "react";
import type { QuestionOut, QuestionFormData } from "../questionFormTypes";
import { useNewQuestionFormViewModel } from "../useNewQuestionFormViewModel";
import ConfirmModal from "../../../../components/ConfirmModal";

interface NewManualQuestionModalProps {
  onClose: () => void;
  onSuccess: (q: QuestionOut) => void;
  editQuestionId?: string;
}

const LETTERS = ["A", "B", "C", "D"] as const;

export default function NewManualQuestionModal({
  onClose,
  onSuccess,
  editQuestionId,
}: NewManualQuestionModalProps) {
  const vm = useNewQuestionFormViewModel({
    onSuccess: (q) => { onSuccess(q); },
    editQuestionId,
  });

  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  // Cerrar con Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") handleClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  });

  // Prevenir scroll del body
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const handleClose = useCallback(() => {
    const isDirty = Object.values(vm.formData).some((v) => v !== "");
    if (isDirty) {
      setShowDiscardConfirm(true);
      return;
    }
    onClose();
  }, [onClose, vm.formData]);

  const handleSubmitSimple = useCallback(() => {
    vm.handleSubmit();
  }, [vm]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-on-surface/40 backdrop-blur-sm p-5"
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <div className="relative flex max-h-[88vh] w-full max-w-[620px] flex-col overflow-hidden rounded-3xl bg-white shadow-xl shadow-on-surface/15">
        {/* ── Header ─────────────────────────────────── */}
        <header className="flex items-center justify-between px-7 pt-6">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-secondary">
              Nueva pregunta
            </p>
            <h2 className="mt-1 text-[22px] font-extrabold tracking-tight text-on-surface">
              {vm.isEditMode ? "Editar Pregunta" : "Crear Pregunta Manual"}
            </h2>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-surface-container-high text-on-surface transition hover:bg-surface-container-highest"
            aria-label="Cerrar"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </header>

        {/* ── Body ────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-7 pt-6 pb-7 space-y-5">
          {/* Error global */}
          {vm.errors.form && (
            <div className="flex items-center gap-2 rounded-2xl bg-error-container px-4 py-3 text-sm font-semibold text-on-error-container">
              <span className="material-symbols-outlined text-[18px]">error</span>
              {vm.errors.form}
            </div>
          )}

          {/* Fila: Área + Competencia */}
          <div className="grid grid-cols-2 gap-3.5">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-[0.14em] text-secondary">
                Área
              </label>
              <div className="relative">
                <select
                  value={vm.formData.area_id}
                  onChange={(e) => vm.updateField("area_id", e.target.value)}
                  onBlur={() => vm.handleBlur("area_id")}
                  disabled={vm.loadingAreas}
                  className="w-full appearance-none rounded-xl border border-outline-variant/20 bg-surface-container-highest py-3 pl-3.5 pr-9 text-sm font-medium text-on-surface outline-none transition focus:border-transparent focus:ring-2 focus:ring-primary/30 disabled:opacity-50"
                >
                  <option value="">{vm.loadingAreas ? "Cargando…" : "Seleccionar"}</option>
                  {vm.areas.map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
                <span className="material-symbols-outlined pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[16px] text-secondary">
                  expand_more
                </span>
              </div>
              {vm.errors.area_id && <p className="text-xs text-error">{vm.errors.area_id}</p>}
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-[0.14em] text-secondary">
                Competencia
              </label>
              <div className="relative">
                <select
                  value={vm.formData.competency_id}
                  onChange={(e) => vm.updateField("competency_id", e.target.value)}
                  onBlur={() => vm.handleBlur("competency_id")}
                  disabled={vm.loadingDetail || !vm.formData.area_id}
                  className="w-full appearance-none rounded-xl border border-outline-variant/20 bg-surface-container-highest py-3 pl-3.5 pr-9 text-sm font-medium text-on-surface outline-none transition focus:border-transparent focus:ring-2 focus:ring-primary/30 disabled:opacity-50"
                >
                  <option value="">{vm.loadingDetail ? "Cargando…" : "Seleccionar"}</option>
                  {vm.competencies.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <span className="material-symbols-outlined pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[16px] text-secondary">
                  expand_more
                </span>
              </div>
              {vm.errors.competency_id && <p className="text-xs text-error">{vm.errors.competency_id}</p>}
            </div>
          </div>

          {/* Fila: Afirmación + Tipo de contexto */}
          <div className="grid grid-cols-2 gap-3.5">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-[0.14em] text-secondary">
                Afirmación
              </label>
              <div className="relative">
                <select
                  value={vm.formData.assertion_id}
                  onChange={(e) => vm.updateField("assertion_id", e.target.value)}
                  onBlur={() => vm.handleBlur("assertion_id")}
                  disabled={vm.loadingDetail || !vm.formData.competency_id}
                  className="w-full appearance-none rounded-xl border border-outline-variant/20 bg-surface-container-highest py-3 pl-3.5 pr-9 text-sm font-medium text-on-surface outline-none transition focus:border-transparent focus:ring-2 focus:ring-primary/30 disabled:opacity-50"
                >
                  <option value="">{vm.loadingDetail ? "Cargando…" : "Seleccionar"}</option>
                  {vm.assertions.map((a) => (
                    <option key={a.id} value={a.id}>{a.statement}</option>
                  ))}
                </select>
                <span className="material-symbols-outlined pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[16px] text-secondary">
                  expand_more
                </span>
              </div>
              {vm.errors.assertion_id && <p className="text-xs text-error">{vm.errors.assertion_id}</p>}
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-[0.14em] text-secondary">
                Tipo de contexto
              </label>
              <div className="relative">
                <select
                  value={vm.formData.context_type}
                  onChange={(e) => vm.updateField("context_type", e.target.value as QuestionFormData["context_type"])}
                  onBlur={() => vm.handleBlur("context_type")}
                  className="w-full appearance-none rounded-xl border border-outline-variant/20 bg-surface-container-highest py-3 pl-3.5 pr-9 text-sm font-medium text-on-surface outline-none transition focus:border-transparent focus:ring-2 focus:ring-primary/30"
                >
                  <option value="">Seleccionar</option>
                  <option value="continuous_text">Texto continuo</option>
                  <option value="discontinuous_text">Texto discontinuo</option>
                  <option value="scientific_scenario">Escenario científico</option>
                  <option value="math_problem">Problema matemático</option>
                  <option value="social_dilemma">Dilema social</option>
                  <option value="philosophical_text">Texto filosófico</option>
                  <option value="graphic_notice">Aviso gráfico</option>
                  <option value="dialogue">Diálogo</option>
                  <option value="cloze_text">Texto cloze</option>
                </select>
                <span className="material-symbols-outlined pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[16px] text-secondary">
                  expand_more
                </span>
              </div>
              {vm.errors.context_type && <p className="text-xs text-error">{vm.errors.context_type}</p>}
            </div>
          </div>

          {/* Contexto / Texto base */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold uppercase tracking-[0.14em] text-secondary">
              Contexto / Texto base
            </label>
            <textarea
              value={vm.formData.context}
              onChange={(e) => vm.updateField("context", e.target.value)}
              onBlur={() => vm.handleBlur("context")}
              placeholder="Escribe el texto, tabla, gráfica descrita o contexto de la pregunta…"
              rows={3}
              className="w-full resize-vertical rounded-xl border border-outline-variant/20 bg-surface-container-highest px-3.5 py-3 text-sm text-on-surface outline-none transition focus:border-transparent focus:bg-white focus:ring-2 focus:ring-primary/30"
            />
            <span className="text-[11px] text-secondary">
              El contexto es el material que el estudiante debe leer o interpretar antes de responder.
            </span>
            {vm.errors.context && <p className="text-xs text-error">{vm.errors.context}</p>}
          </div>

          {/* Enunciado (stem) */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold uppercase tracking-[0.14em] text-secondary">
              Enunciado (stem)
            </label>
            <textarea
              value={vm.formData.stem}
              onChange={(e) => vm.updateField("stem", e.target.value)}
              onBlur={() => vm.handleBlur("stem")}
              placeholder="Escribe el enunciado de la pregunta…"
              rows={3}
              className="w-full resize-vertical rounded-xl border border-outline-variant/20 bg-surface-container-highest px-3.5 py-3 text-sm text-on-surface outline-none transition focus:border-transparent focus:bg-white focus:ring-2 focus:ring-primary/30"
            />
            {vm.errors.stem && <p className="text-xs text-error">{vm.errors.stem}</p>}
          </div>

          {/* Opciones de respuesta */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold uppercase tracking-[0.14em] text-secondary">
              Opciones de respuesta
            </label>
            <div className="flex flex-col gap-2">
              {LETTERS.map((letter) => {
                const field = `option_${letter.toLowerCase()}` as keyof typeof vm.formData;
                const isCorrect = vm.formData.correct_answer === letter;
                return (
                  <div key={letter} className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => vm.updateField("correct_answer", letter)}
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[13px] font-bold transition ${
                        isCorrect
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-surface-container-high text-secondary hover:bg-surface-container-highest"
                      }`}
                    >
                      {isCorrect ? `${letter} ✓` : letter}
                    </button>
                    <input
                      type="text"
                      value={vm.formData[field]}
                      onChange={(e) => vm.updateField(field, e.target.value)}
                      onBlur={() => vm.handleBlur(field)}
                      placeholder={isCorrect ? `Opción ${letter} (correcta)…` : `Opción ${letter} (distractor)…`}
                      className="flex-1 rounded-xl border border-outline-variant/20 bg-surface-container-highest px-3.5 py-3 text-sm text-on-surface outline-none transition focus:border-transparent focus:bg-white focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                );
              })}
            </div>
            <span className="text-[11px] text-secondary">
              Haz clic en la letra para marcar la opción correcta (A por defecto).
            </span>
            {vm.errors.correct_answer && <p className="text-xs text-error">{vm.errors.correct_answer}</p>}
            {(vm.errors.option_a || vm.errors.option_b || vm.errors.option_c) && (
              <p className="text-xs text-error">Todas las opciones A, B y C son requeridas.</p>
            )}
          </div>

          {/* Fila: Dificultad + Explicación correcta */}
          <div className="grid grid-cols-2 gap-3.5">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-[0.14em] text-secondary">
                Dificultad
              </label>
              <div className="relative">
                <select
                  value={vm.formData.difficulty_estimated}
                  onChange={(e) => vm.updateField("difficulty_estimated", e.target.value)}
                  className="w-full appearance-none rounded-xl border border-outline-variant/20 bg-surface-container-highest py-3 pl-3.5 pr-9 text-sm font-medium text-on-surface outline-none transition focus:border-transparent focus:ring-2 focus:ring-primary/30"
                >
                  <option value="">Sin especificar</option>
                  <option value="0.3">Baja</option>
                  <option value="0.5">Media</option>
                  <option value="0.8">Alta</option>
                </select>
                <span className="material-symbols-outlined pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[16px] text-secondary">
                  expand_more
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-[0.14em] text-secondary">
                Explicación correcta
              </label>
              <textarea
                value={vm.formData.explanation_correct}
                onChange={(e) => vm.updateField("explanation_correct", e.target.value)}
                onBlur={() => vm.handleBlur("explanation_correct")}
                placeholder="¿Por qué es correcta?"
                rows={2}
                className="w-full resize-vertical rounded-xl border border-outline-variant/20 bg-surface-container-highest px-3.5 py-3 text-sm text-on-surface outline-none transition focus:border-transparent focus:bg-white focus:ring-2 focus:ring-primary/30"
              />
              {vm.errors.explanation_correct && (
                <p className="text-xs text-error">{vm.errors.explanation_correct}</p>
              )}
            </div>
          </div>
        </div>

        {/* ── Footer ──────────────────────────────────── */}
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
            onClick={handleSubmitSimple}
            disabled={vm.submitting}
            className="flex items-center gap-2 rounded-xl bg-linear-to-br from-primary to-primary-container px-6 py-2.5 text-sm font-bold text-white shadow-md shadow-primary/20 transition hover:opacity-90 disabled:opacity-50"
          >
            {vm.submitting ? (
              <>
                <span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>
                Guardando…
              </>
            ) : (
              "Guardar pregunta"
            )}
          </button>
          {vm.isEditMode && (
            <p className="text-[11px] text-secondary">Solo se pueden editar preguntas en estado Borrador.</p>
          )}
        </footer>
      </div>

      {showDiscardConfirm && (
        <ConfirmModal
          title="Descartar cambios"
          message="Tienes cambios sin guardar. ¿Deseas descartarlos?"
          confirmLabel="Sí, descartar"
          cancelLabel="Seguir editando"
          icon="delete"
          destructive
          onConfirm={onClose}
          onCancel={() => setShowDiscardConfirm(false)}
        />
      )}
    </div>
  );
}
