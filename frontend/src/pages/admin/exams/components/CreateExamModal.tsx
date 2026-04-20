import { useEffect, useState } from "react";
import type { CreateExamPayload } from "../../../../services/examSession";
import QuestionPickerPanel, { type PickedQuestion } from "./QuestionPickerPanel";

interface CreateExamModalProps {
  onClose: () => void;
  onCreateExam: (payload: CreateExamPayload) => Promise<void>;
  onSuccess: () => void;
}

const AREA_OPTIONS = [
  { value: "MAT", label: "Matemáticas" },
  { value: "LC",  label: "Lectura Crítica" },
  { value: "SC",  label: "Ciencias Sociales" },
  { value: "CN",  label: "Ciencias Naturales" },
  { value: "ING", label: "Inglés" },
];

const inputClass =
  "w-full rounded-xl border border-outline-variant/20 bg-surface-container-highest px-3.5 py-3 text-sm text-on-surface outline-none transition focus:border-transparent focus:bg-white focus:ring-2 focus:ring-primary/30 placeholder:text-secondary/50";

const selectClass =
  "w-full appearance-none rounded-xl border border-outline-variant/20 bg-surface-container-highest px-3.5 py-3 text-sm text-on-surface outline-none transition focus:border-transparent focus:bg-white focus:ring-2 focus:ring-primary/30";

const labelClass = "mb-1 block text-xs font-semibold text-secondary";

export default function CreateExamModal({ onClose, onCreateExam, onSuccess }: CreateExamModalProps) {
  const [form, setForm] = useState({
    title: "",
    description: "",
    exam_type: "FULL_SIMULATION",
    area_code: "MAT",
    total_questions: 40,
    time_limit_minutes: 180,
    has_time_limit: true,
    is_adaptive: false,
  });
  // For CUSTOM type: selected questions from the picker
  const [pickedQuestions, setPickedQuestions] = useState<PickedQuestion[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [showDiscard, setShowDiscard] = useState(false);

  const isCustom = form.exam_type === "CUSTOM";

  // Sync total_questions with picker selection when CUSTOM
  useEffect(() => {
    if (isCustom && pickedQuestions.length > 0) {
      setForm((prev) => ({ ...prev, total_questions: pickedQuestions.length }));
    }
  }, [isCustom, pickedQuestions.length]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleRequestClose();
    };
    document.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDirty]);

  function updateField<K extends keyof typeof form>(key: K, value: typeof form[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setIsDirty(true);
  }

  function handleRequestClose() {
    if (isDirty || pickedQuestions.length > 0) setShowDiscard(true);
    else onClose();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) {
      setError("El título es obligatorio.");
      return;
    }
    if (isCustom && pickedQuestions.length === 0) {
      setError("Debes seleccionar al menos una pregunta para un examen personalizado.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const payload: CreateExamPayload = {
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        exam_type: form.exam_type,
        area_code: form.exam_type === "AREA_PRACTICE" ? form.area_code : undefined,
        total_questions: isCustom ? pickedQuestions.length : form.total_questions,
        time_limit_minutes: form.has_time_limit ? form.time_limit_minutes : undefined,
        is_adaptive: form.is_adaptive,
        question_ids: isCustom ? pickedQuestions.map((q) => q.id) : undefined,
      };
      await onCreateExam(payload);
      onSuccess();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al crear el examen.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-on-surface/40 backdrop-blur-sm"
        onClick={handleRequestClose}
      >
        {/* Modal — wider when CUSTOM to fit the picker */}
        <div
          className={`relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-3xl bg-white shadow-xl transition-all ${
            isCustom ? "max-w-195" : "max-w-150"
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-outline-variant/10 px-6 py-5">
            <div>
              <h2 className="font-headline text-xl font-black text-on-surface">Crear Examen</h2>
              <p className="mt-0.5 text-xs text-secondary">Configura el nuevo examen o simulacro.</p>
            </div>
            <button
              type="button"
              onClick={handleRequestClose}
              className="flex h-9 w-9 items-center justify-center rounded-xl text-secondary transition hover:bg-slate-100"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>

          {/* Error banner */}
          {error && (
            <div className="mx-6 mt-4 rounded-xl bg-error-container px-4 py-2.5 text-sm font-medium text-error">
              {error}
            </div>
          )}

          {/* Scrollable body */}
          <form
            id="create-exam-form"
            onSubmit={handleSubmit}
            className="flex-1 overflow-y-auto px-6 py-5"
          >
            {/* Two-column layout when CUSTOM */}
            <div className={isCustom ? "grid grid-cols-[1fr_1.4fr] gap-6" : "space-y-4"}>

              {/* ── Left column (always visible) ───────────────────── */}
              <div className="space-y-4">
                {/* Título */}
                <div>
                  <label className={labelClass}>
                    Título <span className="text-error">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={(e) => updateField("title", e.target.value)}
                    placeholder="Ej. Simulacro Saber 11 — 2025-1"
                    className={inputClass}
                    required
                  />
                </div>

                {/* Descripción */}
                <div>
                  <label className={labelClass}>Descripción (opcional)</label>
                  <textarea
                    rows={2}
                    value={form.description}
                    onChange={(e) => updateField("description", e.target.value)}
                    placeholder="Descripción breve del examen…"
                    className={`${inputClass} resize-vertical`}
                  />
                </div>

                {/* Tipo */}
                <div>
                  <label className={labelClass}>Tipo de Examen</label>
                  <div className="relative">
                    <select
                      value={form.exam_type}
                      onChange={(e) => {
                        updateField("exam_type", e.target.value);
                        if (e.target.value !== "CUSTOM") setPickedQuestions([]);
                      }}
                      className={selectClass}
                    >
                      <option value="FULL_SIMULATION">Simulacro Completo</option>
                      <option value="AREA_PRACTICE">Práctica por Área</option>
                      <option value="CUSTOM">Personalizado</option>
                    </select>
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-[16px] text-secondary">
                      expand_more
                    </span>
                  </div>
                </div>

                {/* Área — solo si AREA_PRACTICE */}
                {form.exam_type === "AREA_PRACTICE" && (
                  <div>
                    <label className={labelClass}>Área</label>
                    <div className="relative">
                      <select
                        value={form.area_code}
                        onChange={(e) => updateField("area_code", e.target.value)}
                        className={selectClass}
                      >
                        {AREA_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-[16px] text-secondary">
                        expand_more
                      </span>
                    </div>
                  </div>
                )}

                {/* Total preguntas + Tiempo */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>
                      {isCustom ? "Preguntas selec." : "Total Preguntas"}
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={200}
                      readOnly={isCustom}
                      value={isCustom ? pickedQuestions.length : form.total_questions}
                      onChange={(e) =>
                        !isCustom && updateField("total_questions", Number(e.target.value))
                      }
                      className={`${inputClass} ${isCustom ? "cursor-default bg-surface-container-low opacity-70" : ""}`}
                    />
                  </div>
                  <div>
                    <div className="mb-1 flex items-center justify-between">
                      <label className="text-xs font-semibold text-secondary">
                        Tiempo límite (min)
                      </label>
                      <label className="flex cursor-pointer items-center gap-1.5 text-xs text-secondary">
                        <input
                          type="checkbox"
                          checked={form.has_time_limit}
                          onChange={(e) => updateField("has_time_limit", e.target.checked)}
                          className="h-3.5 w-3.5 accent-primary"
                        />
                        Activar
                      </label>
                    </div>
                    <input
                      type="number"
                      min={1}
                      disabled={!form.has_time_limit}
                      value={form.time_limit_minutes}
                      onChange={(e) => updateField("time_limit_minutes", Number(e.target.value))}
                      className={`${inputClass} disabled:opacity-40`}
                    />
                  </div>
                </div>

                {/* Adaptativo toggle */}
                <div className="flex items-center justify-between rounded-2xl bg-surface-container-low px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold text-on-surface">Selección adaptativa</p>
                    <p className="text-xs text-secondary">
                      Las preguntas se ajustan al nivel del estudiante
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => updateField("is_adaptive", !form.is_adaptive)}
                    className={`relative flex h-5 w-10 items-center rounded-full transition-colors ${
                      form.is_adaptive ? "bg-primary" : "bg-surface-container-highest"
                    }`}
                  >
                    <span
                      className={`absolute h-4 w-4 rounded-full bg-white shadow transition-transform ${
                        form.is_adaptive ? "translate-x-5" : "translate-x-0.5"
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* ── Right column — Question Picker (CUSTOM only) ──── */}
              {isCustom && (
                <div className="flex flex-col gap-2">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-secondary">
                      Seleccionar preguntas
                    </p>
                    <p className="mt-0.5 text-[11px] text-secondary/70">
                      Solo se muestran preguntas aprobadas del banco.
                    </p>
                  </div>
                  <QuestionPickerPanel
                    selected={pickedQuestions}
                    onChange={(qs) => {
                      setPickedQuestions(qs);
                      setIsDirty(true);
                    }}
                  />
                </div>
              )}
            </div>
          </form>

          {/* Sticky footer */}
          <div className="flex items-center justify-between border-t border-outline-variant/10 px-6 py-4">
            {/* Summary for CUSTOM */}
            {isCustom ? (
              <p className="text-xs text-secondary">
                {pickedQuestions.length > 0 ? (
                  <span className="font-semibold text-primary">
                    {pickedQuestions.length} pregunta{pickedQuestions.length !== 1 ? "s" : ""} seleccionada{pickedQuestions.length !== 1 ? "s" : ""}
                  </span>
                ) : (
                  "Ninguna pregunta seleccionada"
                )}
              </p>
            ) : (
              <span />
            )}

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleRequestClose}
                className="rounded-2xl bg-surface-container-high px-5 py-2.5 text-sm font-semibold text-on-surface transition hover:bg-surface-container-highest"
              >
                Cancelar
              </button>
              <button
                type="submit"
                form="create-exam-form"
                disabled={submitting || (isCustom && pickedQuestions.length === 0)}
                className="flex items-center gap-2 rounded-2xl bg-linear-to-br from-primary to-primary-container px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-primary/20 transition hover:opacity-90 disabled:opacity-60"
              >
                {submitting ? (
                  <>
                    <span className="material-symbols-outlined animate-spin text-[16px]">
                      progress_activity
                    </span>
                    Creando…
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[16px]">add</span>
                    Crear Examen
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Discard confirmation */}
      {showDiscard && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-on-surface/40 backdrop-blur-sm">
          <div className="w-full max-w-[360px] rounded-3xl bg-white p-6 shadow-xl">
            <p className="font-headline text-lg font-black text-on-surface">¿Descartar cambios?</p>
            <p className="mt-2 text-sm text-secondary">Se perderán los datos ingresados.</p>
            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => setShowDiscard(false)}
                className="flex-1 rounded-2xl bg-surface-container-high py-2.5 text-sm font-semibold text-on-surface transition hover:bg-surface-container-highest"
              >
                Seguir editando
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-2xl bg-amber-500 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
              >
                Descartar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
