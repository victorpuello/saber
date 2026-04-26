import type { MatCompetencyBreakdownItem, MatQuestionErrorItem, MatStrugglingComponentItem } from "../../../../services/dashboard";

interface AdminMathAnalyticsCardProps {
  competencies: MatCompetencyBreakdownItem[];
  strugglingComponents: MatStrugglingComponentItem[];
  hardestQuestions: MatQuestionErrorItem[];
  loading: boolean;
}

function pct(value: number | null): number {
  return value === null ? 0 : Math.round(value);
}

function shortId(id: string): string {
  return id.slice(0, 8).toUpperCase();
}

export default function AdminMathAnalyticsCard({
  competencies,
  strugglingComponents,
  hardestQuestions,
  loading,
}: AdminMathAnalyticsCardProps) {
  const weakest = [...competencies]
    .filter((item) => item.avg_accuracy !== null)
    .sort((a, b) => (a.avg_accuracy ?? 101) - (b.avg_accuracy ?? 101))[0];
  const insight = weakest
    ? `${pct(weakest.avg_accuracy)}% de acierto en ${shortId(weakest.competency_id)}. Conviene revisar procedimientos y distractores frecuentes.`
    : "Aun no hay suficientes datos MAT para generar un insight confiable.";

  return (
    <section className="flex h-full flex-col rounded-4xl bg-white p-6 shadow-[0_12px_40px_rgba(25,28,30,0.05)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-secondary">Matematicas</p>
          <h3 className="mt-1 text-lg font-black tracking-tight text-on-surface">Razonamiento vs ejecucion</h3>
        </div>
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/8 text-primary">
          <span className="material-symbols-outlined text-[24px]">functions</span>
        </div>
      </div>

      {loading ? (
        <div className="mt-6 flex items-center gap-2 text-sm font-semibold text-secondary">
          <span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>
          Cargando analitica MAT...
        </div>
      ) : (
        <>
          <div className="mt-5 rounded-2xl bg-surface-container-low px-4 py-3 text-sm font-semibold text-on-surface-variant">
            {insight}
          </div>

          <div className="mt-5 flex flex-col gap-3">
            {competencies.length === 0 && (
              <p className="text-sm text-secondary">Sin snapshots de competencia MAT todavia.</p>
            )}
            {competencies.map((item) => {
              const value = pct(item.avg_accuracy);
              const warning = item.avg_accuracy !== null && value < 40;
              return (
                <div key={item.competency_id}>
                  <div className="mb-1.5 flex items-center justify-between gap-3 text-[12px]">
                    <span className="font-bold text-on-surface">Competencia {shortId(item.competency_id)}</span>
                    <span className={warning ? "font-bold text-rose-700" : "font-semibold text-secondary"}>
                      {item.avg_accuracy === null ? "Sin intentos" : `${value}%`}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-surface-container-high">
                    <div
                      className={`h-full rounded-full ${warning ? "bg-rose-500" : "bg-primary"}`}
                      style={{ width: `${value}%` }}
                    />
                  </div>
                  {warning && <p className="mt-1 text-[11px] font-semibold text-rose-700">Alerta: por debajo del 40%</p>}
                </div>
              );
            })}
          </div>

          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-secondary">Mayor tasa de error</p>
              <div className="flex flex-col gap-2">
                {hardestQuestions.length === 0 && <p className="text-xs text-secondary">Sin preguntas MAT trazadas.</p>}
                {hardestQuestions.slice(0, 3).map((item) => (
                  <div key={item.questionId} className="rounded-2xl bg-surface-container-low px-3 py-2">
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="font-bold text-on-surface">Pregunta {shortId(item.questionId)}</span>
                      <span className="font-semibold text-rose-700">{pct(item.accuracyRate)}%</span>
                    </div>
                    <p className="mt-1 text-[11px] text-secondary">
                      Distractor mas elegido: {item.mostSelected ?? "sin datos"} ({item.mostSelectedCount})
                    </p>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-secondary">Componentes criticos</p>
              <div className="flex flex-col gap-2">
                {strugglingComponents.length === 0 && <p className="text-xs text-secondary">Sin componentes con fallo mayor al 60%.</p>}
                {strugglingComponents.slice(0, 3).map((item) => (
                  <div key={item.component_id} className="rounded-2xl bg-rose-50 px-3 py-2">
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="font-bold text-on-surface">{shortId(item.component_id)}</span>
                      <span className="font-semibold text-rose-700">{Math.round(item.failure_rate)}% falla</span>
                    </div>
                    <p className="mt-1 text-[11px] text-secondary">{item.questions_attempted} intentos registrados</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
