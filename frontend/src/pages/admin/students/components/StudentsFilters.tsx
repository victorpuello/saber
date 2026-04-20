import type { StudentsFiltersState } from "../useStudentsViewModel";

interface StudentsFiltersProps {
  filters: StudentsFiltersState;
  searchQuery: string;
  onUpdate: (key: keyof StudentsFiltersState, value: string) => void;
  onSearchChange: (value: string) => void;
  onClear: () => void;
}

const GRADE_OPTIONS = ["", "9", "10", "11"];
const GRADE_LABELS: Record<string, string> = { "": "Todos los Grados", "9": "Grado 9", "10": "Grado 10", "11": "Grado 11" };
const STATUS_OPTIONS = ["", "ACTIVE", "WITHDRAWN", "INACTIVE"];
const STATUS_LABELS: Record<string, string> = { "": "Cualquier Estado", ACTIVE: "Activo", WITHDRAWN: "Retirado", INACTIVE: "Inactivo" };

function FilterSelect({
  label,
  value,
  options,
  labels,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  labels: Record<string, string>;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1">
      <label className="text-[10px] font-bold uppercase tracking-widest text-secondary">
        {label}
      </label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full appearance-none rounded-xl bg-surface-container-lowest py-2.5 pl-3 pr-8 text-sm font-medium text-on-surface outline-none ring-1 ring-outline-variant/20 transition focus:ring-2 focus:ring-primary/40"
        >
          {options.map((opt) => (
            <option key={opt} value={opt}>
              {labels[opt] ?? opt}
            </option>
          ))}
        </select>
        <span className="material-symbols-outlined pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[16px] text-secondary">
          expand_more
        </span>
      </div>
    </div>
  );
}

export default function StudentsFilters({
  filters,
  searchQuery,
  onUpdate,
  onSearchChange,
  onClear,
}: StudentsFiltersProps) {
  return (
    <section className="rounded-3xl bg-surface-container-low p-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className="material-symbols-outlined text-[18px] text-secondary"
            style={{ fontVariationSettings: "'FILL' 0" }}
          >
            filter_list
          </span>
          <span className="text-xs font-bold uppercase tracking-widest text-secondary">
            Filtros de Búsqueda
          </span>
        </div>
        <button
          type="button"
          onClick={onClear}
          className="text-xs font-semibold text-primary transition hover:opacity-70"
        >
          Limpiar todo
        </button>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row">
        {/* Search */}
        <div className="flex min-w-0 flex-[2] flex-col gap-1">
          <label className="text-[10px] font-bold uppercase tracking-widest text-secondary">
            Buscar
          </label>
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-secondary">
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Nombre, apellido o correo…"
              className="w-full rounded-xl bg-surface-container-lowest py-2.5 pl-10 pr-4 text-sm font-medium text-on-surface outline-none ring-1 ring-outline-variant/20 transition placeholder:text-secondary/50 focus:ring-2 focus:ring-primary/40"
            />
          </div>
        </div>

        <FilterSelect
          label="Grado"
          value={filters.grade}
          options={GRADE_OPTIONS}
          labels={GRADE_LABELS}
          onChange={(v) => onUpdate("grade", v)}
        />

        <FilterSelect
          label="Estado"
          value={filters.status}
          options={STATUS_OPTIONS}
          labels={STATUS_LABELS}
          onChange={(v) => onUpdate("status", v)}
        />
      </div>
    </section>
  );
}
