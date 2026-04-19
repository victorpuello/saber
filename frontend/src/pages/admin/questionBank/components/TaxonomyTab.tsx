import type {
  QuestionFormData,
  FormErrors,
  AreaSummary,
  CompetencyItem,
  AssertionItem,
  EvidenceItem,
  ContentComponentItem,
} from "../questionFormTypes";

interface TaxonomyTabProps {
  formData: QuestionFormData;
  errors: FormErrors;
  areas: AreaSummary[];
  competencies: CompetencyItem[];
  assertions: AssertionItem[];
  evidences: EvidenceItem[];
  contentComponents: ContentComponentItem[];
  loadingAreas: boolean;
  loadingDetail: boolean;
  updateField: <K extends keyof QuestionFormData>(field: K, value: QuestionFormData[K]) => void;
  handleBlur: (field: keyof QuestionFormData) => void;
}

function FormSelect({
  label,
  value,
  options,
  onChange,
  onBlur,
  error,
  loading,
  placeholder,
  required,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
  onBlur?: () => void;
  error?: string;
  loading?: boolean;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[10px] font-bold uppercase tracking-widest text-secondary">
        {label}
        {required && <span className="text-error"> *</span>}
      </label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          disabled={loading}
          className="w-full appearance-none rounded-xl bg-surface-container-lowest py-2.5 pl-3 pr-8 text-sm font-medium text-on-surface outline-none ring-1 ring-outline-variant/20 transition focus:ring-2 focus:ring-primary/40 disabled:opacity-50"
        >
          <option value="">{loading ? "Cargando…" : (placeholder ?? "Seleccionar")}</option>
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {loading ? (
          <span className="material-symbols-outlined pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 animate-spin text-[16px] text-primary">
            progress_activity
          </span>
        ) : (
          <span className="material-symbols-outlined pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[16px] text-secondary">
            expand_more
          </span>
        )}
      </div>
      {error && <p className="text-xs text-error">{error}</p>}
    </div>
  );
}

export default function TaxonomyTab({
  formData,
  errors,
  areas,
  competencies,
  assertions,
  evidences,
  contentComponents,
  loadingAreas,
  loadingDetail,
  updateField,
  handleBlur,
}: TaxonomyTabProps) {
  return (
    <div className="space-y-5">
      <p className="text-sm text-secondary">
        Selecciona la ubicación curricular de la pregunta dentro de la estructura Saber&nbsp;11.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormSelect
          label="Área"
          value={formData.area_id}
          options={areas.map((a) => ({ value: a.id, label: a.name }))}
          onChange={(v) => updateField("area_id", v)}
          onBlur={() => handleBlur("area_id")}
          error={errors.area_id}
          loading={loadingAreas}
          placeholder="Seleccionar área"
          required
        />

        <FormSelect
          label="Competencia"
          value={formData.competency_id}
          options={competencies.map((c) => ({ value: c.id, label: c.name }))}
          onChange={(v) => updateField("competency_id", v)}
          onBlur={() => handleBlur("competency_id")}
          error={errors.competency_id}
          loading={loadingDetail}
          placeholder={formData.area_id ? "Seleccionar competencia" : "Primero selecciona un área"}
          required
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormSelect
          label="Afirmación"
          value={formData.assertion_id}
          options={assertions.map((a) => ({ value: a.id, label: a.statement }))}
          onChange={(v) => updateField("assertion_id", v)}
          onBlur={() => handleBlur("assertion_id")}
          error={errors.assertion_id}
          loading={loadingDetail}
          placeholder={formData.competency_id ? "Seleccionar afirmación" : "Primero selecciona competencia"}
          required
        />

        <FormSelect
          label="Evidencia"
          value={formData.evidence_id}
          options={evidences.map((e) => ({ value: e.id, label: e.observable_behavior }))}
          onChange={(v) => updateField("evidence_id", v)}
          placeholder={formData.assertion_id ? "Seleccionar evidencia" : "Primero selecciona afirmación"}
        />
      </div>

      <FormSelect
        label="Componente temático"
        value={formData.content_component_id}
        options={contentComponents.map((cc) => ({ value: cc.id, label: cc.name }))}
        onChange={(v) => updateField("content_component_id", v)}
        loading={loadingDetail}
        placeholder="Opcional"
      />
    </div>
  );
}
