import type { QuestionFormData, FormErrors } from "../questionFormTypes";
import { COGNITIVE_PROCESS_OPTIONS, MCER_LEVEL_OPTIONS } from "../questionFormTypes";

interface ExplanationsTabProps {
  formData: QuestionFormData;
  errors: FormErrors;
  isEnglish: boolean;
  updateField: <K extends keyof QuestionFormData>(field: K, value: QuestionFormData[K]) => void;
  handleBlur: (field: keyof QuestionFormData) => void;
}

function SmallTextarea({
  label,
  value,
  onChange,
  onBlur,
  error,
  placeholder,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  onBlur?: () => void;
  error?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[10px] font-bold uppercase tracking-widest text-secondary">
        {label}
        {required && <span className="text-error"> *</span>}
      </label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        placeholder={placeholder}
        rows={2}
        className="w-full resize-vertical rounded-xl bg-surface-container-lowest px-4 py-2.5 text-sm font-medium text-on-surface outline-none ring-1 ring-outline-variant/20 transition focus:ring-2 focus:ring-primary/40"
      />
      {error && <p className="text-xs text-error">{error}</p>}
    </div>
  );
}

export default function ExplanationsTab({
  formData,
  errors,
  isEnglish,
  updateField,
  handleBlur,
}: ExplanationsTabProps) {
  return (
    <div className="space-y-5">
      <p className="text-sm text-secondary">
        Justifica la respuesta correcta y explica por qué los distractores son incorrectos.
      </p>

      {/* Explicación de la correcta */}
      <SmallTextarea
        label="¿Por qué es correcta?"
        value={formData.explanation_correct}
        onChange={(v) => updateField("explanation_correct", v)}
        onBlur={() => handleBlur("explanation_correct")}
        error={errors.explanation_correct}
        placeholder="Explica por qué la opción seleccionada es correcta…"
        required
      />

      {/* Explicaciones de distractores */}
      <fieldset className="space-y-3 rounded-2xl bg-surface-container-low p-4">
        <legend className="text-[10px] font-bold uppercase tracking-widest text-secondary">
          Retroalimentación por distractor (opcional)
        </legend>

        {(["A", "B", "C", "D"] as const).map((letter) => {
          const field = `explanation_${letter.toLowerCase()}` as keyof QuestionFormData;
          if (letter === "D" && !formData.option_d.trim()) return null;
          return (
            <SmallTextarea
              key={letter}
              label={`Opción ${letter}`}
              value={formData[field]}
              onChange={(v) => updateField(field, v)}
              onBlur={() => handleBlur(field)}
              error={errors[field]}
              placeholder={`¿Por qué la opción ${letter} no es correcta?`}
            />
          );
        })}
      </fieldset>

      {/* Metadatos */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold uppercase tracking-widest text-secondary">
            Proceso cognitivo
          </label>
          <div className="relative">
            <select
              value={formData.cognitive_process}
              onChange={(e) => updateField("cognitive_process", e.target.value)}
              className="w-full appearance-none rounded-xl bg-surface-container-lowest py-2.5 pl-3 pr-8 text-sm font-medium text-on-surface outline-none ring-1 ring-outline-variant/20 transition focus:ring-2 focus:ring-primary/40"
            >
              <option value="">Opcional</option>
              {COGNITIVE_PROCESS_OPTIONS.map((p) => (
                <option key={p} value={p}>
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </option>
              ))}
            </select>
            <span className="material-symbols-outlined pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[16px] text-secondary">
              expand_more
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold uppercase tracking-widest text-secondary">
            Dificultad estimada (0–1)
          </label>
          <input
            type="number"
            step="0.05"
            min="0"
            max="1"
            value={formData.difficulty_estimated}
            onChange={(e) => updateField("difficulty_estimated", e.target.value)}
            onBlur={() => handleBlur("difficulty_estimated")}
            placeholder="Ej: 0.65"
            className="w-full rounded-xl bg-surface-container-lowest px-4 py-2.5 text-sm font-medium text-on-surface outline-none ring-1 ring-outline-variant/20 transition focus:ring-2 focus:ring-primary/40"
          />
          {errors.difficulty_estimated && (
            <p className="text-xs text-error">{errors.difficulty_estimated}</p>
          )}
        </div>
      </div>

      {/* Campos de Inglés (condicional) */}
      {isEnglish && (
        <fieldset className="space-y-4 rounded-2xl bg-surface-container-low p-4">
          <legend className="text-[10px] font-bold uppercase tracking-widest text-secondary">
            Sección de Inglés
          </legend>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-secondary">
                Sección (1–7)
              </label>
              <input
                type="number"
                min="1"
                max="7"
                value={formData.english_section}
                onChange={(e) => updateField("english_section", e.target.value)}
                onBlur={() => handleBlur("english_section")}
                placeholder="Ej: 3"
                className="w-full rounded-xl bg-surface-container-lowest px-4 py-2.5 text-sm font-medium text-on-surface outline-none ring-1 ring-outline-variant/20 transition focus:ring-2 focus:ring-primary/40"
              />
              {errors.english_section && (
                <p className="text-xs text-error">{errors.english_section}</p>
              )}
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-secondary">
                Nivel MCER
              </label>
              <div className="relative">
                <select
                  value={formData.mcer_level}
                  onChange={(e) => updateField("mcer_level", e.target.value)}
                  className="w-full appearance-none rounded-xl bg-surface-container-lowest py-2.5 pl-3 pr-8 text-sm font-medium text-on-surface outline-none ring-1 ring-outline-variant/20 transition focus:ring-2 focus:ring-primary/40"
                >
                  <option value="">Seleccionar</option>
                  {MCER_LEVEL_OPTIONS.map((l) => (
                    <option key={l} value={l}>{l}</option>
                  ))}
                </select>
                <span className="material-symbols-outlined pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[16px] text-secondary">
                  expand_more
                </span>
              </div>
            </div>
          </div>
        </fieldset>
      )}
    </div>
  );
}
