import type { ExamsFiltersState } from "../types";

interface ExamsFiltersProps {
  filters: ExamsFiltersState;
  onUpdate: (key: keyof ExamsFiltersState, value: string) => void;
  onClear: () => void;
}

const TYPE_OPTIONS = [
  { value: "",                label: "Todos los tipos" },
  { value: "FULL_SIMULATION", label: "Simulacro Completo" },
  { value: "AREA_PRACTICE",   label: "Práctica por Área" },
  { value: "CUSTOM",          label: "Personalizado" },
  { value: "DIAGNOSTIC",      label: "Diagnóstico" },
];

const AREA_OPTIONS = [
  { value: "",    label: "Todas las áreas" },
  { value: "MAT", label: "Matemáticas" },
  { value: "LC",  label: "Lectura Crítica" },
  { value: "SC",  label: "Sociales" },
  { value: "CN",  label: "Ciencias Naturales" },
  { value: "ING", label: "Inglés" },
];

const STATUS_OPTIONS = [
  { value: "ACTIVE",   label: "Activo" },
  { value: "ARCHIVED", label: "Archivado" },
  { value: "",         label: "Todos" },
];

const selectClass =
  "w-full appearance-none rounded-xl bg-surface-container-lowest py-2.5 pl-3 pr-8 text-sm font-medium text-on-surface outline-none ring-1 ring-outline-variant/20 transition focus:ring-2 focus:ring-primary/40";

function FilterSelect({
  value,
  onChange,
  options,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  label: string;
}) {
  return (
    <div className="flex-1">
      <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-secondary">
        {label}
      </label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={selectClass}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 material-symbols-outlined text-[16px] text-secondary">
          expand_more
        </span>
      </div>
    </div>
  );
}

const hasActiveFilters = (f: ExamsFiltersState) =>
  f.exam_type !== "" || f.area_code !== "" || f.status !== "ACTIVE" || f.search !== "";

export default function ExamsFilters({ filters, onUpdate, onClear }: ExamsFiltersProps) {
  return (
    <section className="rounded-3xl bg-surface-container-low p-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px] text-secondary">filter_list</span>
          <span className="text-xs font-bold uppercase tracking-widest text-secondary">
            Filtros de búsqueda
          </span>
        </div>
        {hasActiveFilters(filters) && (
          <button
            type="button"
            onClick={onClear}
            className="text-xs font-semibold text-primary transition hover:opacity-70"
          >
            Limpiar todo
          </button>
        )}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        {/* Search */}
        <div className="flex-[1.5]">
          <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-secondary">
            Búsqueda
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-[16px] text-secondary">
              search
            </span>
            <input
              type="text"
              placeholder="Buscar por título…"
              value={filters.search}
              onChange={(e) => onUpdate("search", e.target.value)}
              className="w-full rounded-xl bg-surface-container-lowest py-2.5 pl-10 pr-3 text-sm text-on-surface outline-none ring-1 ring-outline-variant/20 transition placeholder:text-secondary/50 focus:ring-2 focus:ring-primary/40"
            />
          </div>
        </div>

        <FilterSelect
          label="Tipo"
          value={filters.exam_type}
          onChange={(v) => onUpdate("exam_type", v)}
          options={TYPE_OPTIONS}
        />
        <FilterSelect
          label="Área"
          value={filters.area_code}
          onChange={(v) => onUpdate("area_code", v)}
          options={AREA_OPTIONS}
        />
        <FilterSelect
          label="Estado"
          value={filters.status}
          onChange={(v) => onUpdate("status", v)}
          options={STATUS_OPTIONS}
        />
      </div>
    </section>
  );
}
