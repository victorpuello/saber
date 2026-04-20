import type { AdminHeroModel } from "../types";

interface AdminInstitutionStatsProps {
  model: AdminHeroModel;
  loading: boolean;
}

const AREAS = [
  { code: "MAT", label: "Matemáticas", icon: "calculate" },
  { code: "LC", label: "Lectura Crítica", icon: "menu_book" },
  { code: "SC", label: "Sociales y Ciudadanas", icon: "public" },
  { code: "CN", label: "Ciencias Naturales", icon: "science" },
  { code: "ING", label: "Inglés", icon: "language" },
];

export default function AdminInstitutionStats({ model, loading }: AdminInstitutionStatsProps) {
  const scorePercent =
    model.institutionAvgScore !== null
      ? Math.min(100, Math.round((model.institutionAvgScore / 100) * 100))
      : null;

  return (
    <section className="rounded-4xl border border-outline-variant/10 bg-surface-container-lowest p-7 shadow-[0_12px_40px_rgba(25,28,30,0.05)]">
      <div className="mb-5 flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold tracking-tight">Reporte institucional</h2>
        <span className="rounded-full bg-primary/8 px-3 py-1 text-xs font-bold text-primary">
          Últimos 30 días
        </span>
      </div>

      {/* Main score */}
      <div className="mb-6 flex items-end gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-secondary">
            Puntaje promedio global
          </p>
          {loading ? (
            <div className="mt-2 h-12 w-32 animate-pulse rounded-lg bg-surface-container-high" />
          ) : (
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-5xl font-black tracking-tighter text-primary">
                {model.institutionAvgScore !== null ? model.institutionAvgScore : "—"}
              </span>
              <span className="text-lg font-medium text-secondary">/ 100 pts</span>
            </div>
          )}
        </div>

        {scorePercent !== null && !loading && (
          <div className="mb-1 flex-1">
            <div className="mb-1.5 flex justify-between text-xs text-secondary">
              <span>Progreso hacia 100</span>
              <span className="font-bold">{scorePercent}%</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-surface-container-high">
              <div
                className="h-full rounded-full bg-primary transition-all duration-700"
                style={{ width: `${scorePercent}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Area breakdown placeholder */}
      <div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-secondary">
          Áreas de evaluación
        </p>
        <ul className="space-y-2">
          {AREAS.map((area) => (
            <li key={area.code} className="flex items-center gap-2.5 rounded-[14px] bg-surface-container-low px-3.5 py-2.5">
              <span className="material-symbols-outlined text-[18px] text-secondary">{area.icon}</span>
              <span className="flex-1 text-sm font-medium text-on-surface">{area.label}</span>
              <span className="rounded-md bg-surface-container px-2 py-0.5 text-xs font-bold text-secondary">
                {area.code}
              </span>
              {loading ? (
                <div className="h-3 w-16 animate-pulse rounded-full bg-surface-container-high" />
              ) : (
                <div className="h-2 w-16 overflow-hidden rounded-full bg-surface-container-high">
                  <div
                    className="h-full rounded-full bg-primary/60"
                    style={{ width: "0%" }}
                  />
                </div>
              )}
              <span className="w-8 text-right text-[11px] font-bold text-secondary">
                {loading ? "" : "—"}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-center text-xs text-on-surface-variant">
          Datos detallados por grado disponibles en Analytics Institucional
        </p>
      </div>
    </section>
  );
}
