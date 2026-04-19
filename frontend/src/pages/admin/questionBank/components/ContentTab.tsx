import type {
  QuestionFormData,
  FormErrors,
} from "../questionFormTypes";
import { CONTEXT_TYPE_OPTIONS, CORRECT_ANSWER_OPTIONS } from "../questionFormTypes";

interface ContentTabProps {
  formData: QuestionFormData;
  errors: FormErrors;
  updateField: <K extends keyof QuestionFormData>(field: K, value: QuestionFormData[K]) => void;
  handleBlur: (field: keyof QuestionFormData) => void;
}

function FormTextarea({
  label,
  value,
  onChange,
  onBlur,
  error,
  placeholder,
  rows,
  required,
  minLength,
  maxLength,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  onBlur?: () => void;
  error?: string;
  placeholder?: string;
  rows?: number;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between">
        <label className="text-[10px] font-bold uppercase tracking-widest text-secondary">
          {label}
          {required && <span className="text-error"> *</span>}
        </label>
        {(minLength || maxLength) && (
          <span className="text-[10px] tabular-nums text-secondary">
            {value.length}
            {maxLength ? `/${maxLength}` : ""} caracteres
          </span>
        )}
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        placeholder={placeholder}
        rows={rows ?? 3}
        className="w-full resize-vertical rounded-xl bg-surface-container-lowest px-4 py-3 text-sm font-medium text-on-surface outline-none ring-1 ring-outline-variant/20 transition focus:ring-2 focus:ring-primary/40"
      />
      {error && <p className="text-xs text-error">{error}</p>}
    </div>
  );
}

export default function ContentTab({
  formData,
  errors,
  updateField,
  handleBlur,
}: ContentTabProps) {
  return (
    <div className="space-y-5">
      <p className="text-sm text-secondary">
        Redacta el contexto, enunciado y opciones de respuesta.
      </p>

      {/* Tipo de contexto */}
      <div className="flex flex-col gap-1">
        <label className="text-[10px] font-bold uppercase tracking-widest text-secondary">
          Tipo de contexto <span className="text-error">*</span>
        </label>
        <div className="relative">
          <select
            value={formData.context_type}
            onChange={(e) => updateField("context_type", e.target.value as QuestionFormData["context_type"])}
            onBlur={() => handleBlur("context_type")}
            className="w-full appearance-none rounded-xl bg-surface-container-lowest py-2.5 pl-3 pr-8 text-sm font-medium text-on-surface outline-none ring-1 ring-outline-variant/20 transition focus:ring-2 focus:ring-primary/40"
          >
            <option value="">Seleccionar tipo</option>
            {CONTEXT_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <span className="material-symbols-outlined pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[16px] text-secondary">
            expand_more
          </span>
        </div>
        {errors.context_type && <p className="text-xs text-error">{errors.context_type}</p>}
      </div>

      {/* Contexto */}
      <FormTextarea
        label="Contexto"
        value={formData.context}
        onChange={(v) => updateField("context", v)}
        onBlur={() => handleBlur("context")}
        error={errors.context}
        placeholder="Párrafo introductorio, escenario o texto de lectura…"
        rows={5}
        required
        minLength={10}
      />

      {/* Enunciado */}
      <FormTextarea
        label="Enunciado (stem)"
        value={formData.stem}
        onChange={(v) => updateField("stem", v)}
        onBlur={() => handleBlur("stem")}
        error={errors.stem}
        placeholder="¿Cuál de las siguientes afirmaciones…?"
        rows={3}
        required
        minLength={5}
      />

      {/* Opciones de respuesta */}
      <fieldset className="space-y-3">
        <legend className="mb-1 text-[10px] font-bold uppercase tracking-widest text-secondary">
          Opciones de respuesta <span className="text-error">*</span>
        </legend>

        {(["A", "B", "C", "D"] as const).map((letter) => {
          const field = `option_${letter.toLowerCase()}` as keyof QuestionFormData;
          const isOptional = letter === "D";
          return (
            <div key={letter} className="flex items-start gap-3">
              <span
                className={`mt-2.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                  formData.correct_answer === letter
                    ? "bg-tertiary/10 text-tertiary"
                    : "bg-surface-container-high text-secondary"
                }`}
              >
                {letter}
              </span>
              <div className="min-w-0 flex-1">
                <textarea
                  value={formData[field]}
                  onChange={(e) => updateField(field, e.target.value)}
                  onBlur={() => handleBlur(field)}
                  placeholder={isOptional ? "Opción D (opcional)" : `Opción ${letter}`}
                  rows={2}
                  className="w-full resize-vertical rounded-xl bg-surface-container-lowest px-4 py-2.5 text-sm font-medium text-on-surface outline-none ring-1 ring-outline-variant/20 transition focus:ring-2 focus:ring-primary/40"
                />
                {errors[field] && <p className="mt-0.5 text-xs text-error">{errors[field]}</p>}
              </div>
            </div>
          );
        })}
      </fieldset>

      {/* Respuesta correcta */}
      <div className="flex flex-col gap-1">
        <label className="text-[10px] font-bold uppercase tracking-widest text-secondary">
          Respuesta correcta <span className="text-error">*</span>
        </label>
        <div className="flex gap-2">
          {CORRECT_ANSWER_OPTIONS.map((letter) => {
            const isDisabled = letter === "D" && !formData.option_d.trim();
            const isSelected = formData.correct_answer === letter;
            return (
              <button
                key={letter}
                type="button"
                disabled={isDisabled}
                onClick={() => updateField("correct_answer", letter)}
                className={`flex h-10 w-10 items-center justify-center rounded-xl text-sm font-bold transition ${
                  isSelected
                    ? "bg-tertiary text-on-tertiary shadow-sm"
                    : "bg-surface-container-lowest text-on-surface ring-1 ring-outline-variant/20 hover:bg-surface-container-high"
                } disabled:cursor-not-allowed disabled:opacity-30`}
              >
                {letter}
              </button>
            );
          })}
        </div>
        {errors.correct_answer && <p className="text-xs text-error">{errors.correct_answer}</p>}
      </div>
    </div>
  );
}
