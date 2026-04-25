import type { EnglishAudit } from "../../../../services/questions";

const DEFECT_LABELS: Record<string, string> = {
  missing_english_section: "Sin sección",
  invalid_english_section: "Sección inválida",
  missing_mcer_level: "Sin MCER",
  invalid_mcer_level: "MCER inválido",
  missing_dce_metadata: "Sin DCE",
  missing_grammar_tags: "Sin grammar tags",
  missing_four_options: "Faltan 4 opciones",
  invalid_correct_answer: "Respuesta inválida",
  invalid_react_context_type: "Contexto React inválido",
  invalid_component_name: "Componente inválido",
  invalid_cloze_context_type: "Cloze inválido",
  missing_cloze_blank: "Sin [BLANK]",
};

const TARGET_BY_SECTION: Record<string, number> = {
  "1": 100,
  "2": 70,
  "3": 100,
  "4": 70,
  "5": 60,
  "6": 60,
  "7": 40,
};

function formatDefect(code: string): string {
  return DEFECT_LABELS[code] ?? code.replaceAll("_", " ");
}

export default function EnglishAuditPanel({ audit }: { audit: EnglishAudit | null }) {
  if (!audit) {
    return null;
  }

  const approved = audit.by_status.APPROVED ?? 0;
  const validPct = audit.total > 0 ? Math.round((audit.valid / audit.total) * 100) : 0;
  const topDefects = Object.entries(audit.defects_by_code)
    .sort((left, right) => right[1] - left[1])
    .slice(0, 4);

  return (
    <section className="rounded-[24px] border border-outline-variant/20 bg-white p-5 shadow-[0_8px_28px_rgba(25,28,30,0.04)]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px] text-primary" aria-hidden="true">translate</span>
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-secondary">
              Auditoría Sprint 4 · Inglés
            </p>
          </div>
          <h3 className="mt-1 text-lg font-black text-on-surface">
            {audit.valid.toLocaleString("es-CO")} ítems listos de {audit.total.toLocaleString("es-CO")}
          </h3>
          <p className="mt-1 text-sm text-on-surface-variant">
            {approved.toLocaleString("es-CO")} aprobados · {audit.invalid.toLocaleString("es-CO")} con defectos estructurales · {validPct}% válidos
          </p>
        </div>

        <div className="flex min-w-48 flex-col gap-2">
          <div className="flex justify-between text-[11px] font-bold uppercase tracking-[0.14em] text-secondary">
            <span>Meta aprobados</span>
            <span>{approved}/500</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-surface-container-high">
            <div
              className="h-full rounded-full bg-[#047857] transition-all"
              style={{ width: `${Math.min((approved / 500) * 100, 100)}%` }}
            />
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div>
          <p className="mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-secondary">
            Distribución por sección
          </p>
          <div className="grid gap-2 sm:grid-cols-7">
            {Object.entries(TARGET_BY_SECTION).map(([section, target]) => {
              const count = audit.by_section[section] ?? 0;
              const pct = Math.min((count / target) * 100, 100);
              return (
                <div key={section} className="rounded-xl bg-surface-container-low px-3 py-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-black text-secondary">P{section}</span>
                    <span className="text-[11px] font-bold text-on-surface">{count}</span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div>
          <p className="mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-secondary">
            Defectos principales
          </p>
          {topDefects.length > 0 ? (
            <div className="flex flex-col gap-2">
              {topDefects.map(([code, count]) => (
                <div key={code} className="flex items-center justify-between rounded-xl bg-amber-50 px-3 py-2 text-sm">
                  <span className="font-semibold text-amber-900">{formatDefect(code)}</span>
                  <span className="font-black text-amber-700">{count}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl bg-emerald-50 px-3 py-3 text-sm font-semibold text-emerald-800">
              Sin defectos estructurales detectados.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
