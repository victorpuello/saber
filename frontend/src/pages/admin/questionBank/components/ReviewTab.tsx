import type {
  QuestionFormData,
  FormErrors,
  AreaSummary,
  CompetencyItem,
  AssertionItem,
} from "../questionFormTypes";
import { CONTEXT_TYPE_OPTIONS } from "../questionFormTypes";
import { validateAll, hasErrors } from "../questionFormValidators";

interface ReviewTabProps {
  formData: QuestionFormData;
  errors: FormErrors;
  areas: AreaSummary[];
  competencies: CompetencyItem[];
  assertions: AssertionItem[];
}

function Field({ label, value, missing }: { label: string; value?: string; missing?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] font-bold uppercase tracking-widest text-secondary">{label}</span>
      <span className={`text-sm ${missing ? "italic text-error" : "text-on-surface"}`}>
        {missing ? "Sin completar" : value}
      </span>
    </div>
  );
}

export default function ReviewTab({
  formData,
  errors: _passedErrors,
  areas,
  competencies,
  assertions,
}: ReviewTabProps) {
  const allErrors = validateAll(formData);
  const valid = !hasErrors(allErrors);

  const areaName = areas.find((a) => a.id === formData.area_id)?.name;
  const compName = competencies.find((c) => c.id === formData.competency_id)?.name;
  const assertStatement = assertions.find((a) => a.id === formData.assertion_id)?.statement;
  const ctxLabel = CONTEXT_TYPE_OPTIONS.find((o) => o.value === formData.context_type)?.label;

  return (
    <div className="space-y-6">
      {valid ? (
        <div className="flex items-center gap-2 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
          <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>
            check_circle
          </span>
          Todos los campos obligatorios están completos. Puedes guardar.
        </div>
      ) : (
        <div className="flex items-start gap-2 rounded-2xl bg-error-container px-4 py-3 text-sm text-on-error-container">
          <span className="material-symbols-outlined mt-0.5 text-[18px]">error</span>
          <div>
            <p className="font-semibold">Hay campos pendientes:</p>
            <ul className="mt-1 list-inside list-disc text-xs">
              {Object.entries(allErrors).map(([key, msg]) => (
                <li key={key}>{msg}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Taxonomía */}
      <section className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-widest text-secondary">Taxonomía</h3>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Área" value={areaName} missing={!areaName} />
          <Field label="Competencia" value={compName} missing={!compName} />
          <Field label="Afirmación" value={assertStatement} missing={!assertStatement} />
        </div>
      </section>

      {/* Contenido */}
      <section className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-widest text-secondary">Contenido</h3>
        <Field label="Tipo de contexto" value={ctxLabel} missing={!ctxLabel} />
        <Field label="Contexto" value={formData.context.slice(0, 200) + (formData.context.length > 200 ? "…" : "")} missing={!formData.context.trim()} />
        <Field label="Enunciado" value={formData.stem} missing={!formData.stem.trim()} />
        <Field label="Etiquetas" value={formData.tags || "Sin etiquetas"} />
      </section>

      {/* Opciones */}
      <section className="space-y-2">
        <h3 className="text-xs font-bold uppercase tracking-widest text-secondary">Opciones</h3>
        <div className="space-y-1.5">
          {(["A", "B", "C", "D"] as const).map((letter) => {
            const field = `option_${letter.toLowerCase()}` as keyof QuestionFormData;
            const value = formData[field];
            if (letter === "D" && !value.trim()) return null;
            const isCorrect = formData.correct_answer === letter;
            return (
              <div
                key={letter}
                className={`flex items-start gap-2 rounded-xl px-3 py-2 text-sm ${
                  isCorrect ? "bg-tertiary/10 font-semibold text-tertiary" : "bg-surface-container-low text-on-surface"
                }`}
              >
                <span className="mt-0.5 shrink-0 font-bold">{letter}.</span>
                <span>{value || <em className="text-error">Vacío</em>}</span>
                {isCorrect && (
                  <span className="material-symbols-outlined ml-auto text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                    check
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Explicación */}
      {formData.explanation_correct.trim() && (
        <section className="space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-widest text-secondary">Explicación</h3>
          <p className="rounded-2xl bg-surface-container-low p-4 text-sm text-on-surface">
            {formData.explanation_correct}
          </p>
        </section>
      )}
    </div>
  );
}
