import type { QBFiltersState } from "../types";

interface QBFiltersProps {
  filters: QBFiltersState;
  searchQuery: string;
  tagFilter: string;
  areaOptions: string[];
  dificultadOptions: string[];
  estadoOptions: string[];
  onUpdate: <K extends keyof QBFiltersState>(key: K, value: QBFiltersState[K]) => void;
  onSearchChange: (value: string) => void;
  onTagFilterChange: (value: string) => void;
  onClear: () => void;
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
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
              {opt}
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

export default function QBFilters({
  filters,
  searchQuery,
  tagFilter,
  areaOptions,
  dificultadOptions,
  estadoOptions,
  onUpdate,
  onSearchChange,
  onTagFilterChange,
  onClear,
}: QBFiltersProps) {
  return (
    <section className="rounded-3xl bg-surface-container-low p-5">
      {/* Header */}
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

      {/* Search + selects row */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        {/* Search input */}
        <div className="flex min-w-0 flex-[1.5] flex-col gap-1">
          <label className="text-[10px] font-bold uppercase tracking-widest text-secondary">
            Buscar
          </label>
          <div className="relative">
            <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-outline">
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Buscar por código o enunciado…"
              className="w-full rounded-xl bg-surface-container-lowest py-2.5 pl-10 pr-3 text-sm text-on-surface outline-none ring-1 ring-outline-variant/20 transition placeholder:text-secondary/50 focus:ring-2 focus:ring-primary/40"
            />
          </div>
        </div>

        {/* Tag filter */}
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <label className="text-[10px] font-bold uppercase tracking-widest text-secondary">
            Etiqueta
          </label>
          <div className="relative">
            <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[16px] text-outline">
              label
            </span>
            <input
              type="text"
              value={tagFilter}
              onChange={(e) => onTagFilterChange(e.target.value)}
              placeholder="ej. Funciones lineales"
              className="w-full rounded-xl bg-surface-container-lowest py-2.5 pl-9 pr-3 text-sm text-on-surface outline-none ring-1 ring-outline-variant/20 transition placeholder:text-secondary/50 focus:ring-2 focus:ring-primary/40"
            />
          </div>
        </div>

        <FilterSelect
          label="Área"
          value={filters.area}
          options={areaOptions}
          onChange={(v) => onUpdate("area", v)}
        />
        <FilterSelect
          label="Dificultad"
          value={filters.dificultad}
          options={dificultadOptions}
          onChange={(v) => onUpdate("dificultad", v)}
        />
        <FilterSelect
          label="Estado"
          value={filters.estado}
          options={estadoOptions}
          onChange={(v) => onUpdate("estado", v)}
        />
      </div>
    </section>
  );
}
