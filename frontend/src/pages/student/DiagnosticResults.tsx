import { useNavigate } from "react-router-dom";
import type { StudentDashboardSummary } from "../../services/dashboard";

interface Props {
  summary: StudentDashboardSummary;
  studentName: string;
}

const AREA_META: Record<string, { label: string; icon: string }> = {
  MAT: { label: "Matemáticas", icon: "functions" },
  LC:  { label: "Lectura Crítica", icon: "menu_book" },
  SC:  { label: "Sociales", icon: "public" },
  CN:  { label: "Naturales", icon: "science" },
  ING: { label: "Inglés", icon: "translate" },
};

const ORDERED_AREAS = ["MAT", "LC", "SC", "CN", "ING"];

const LEVEL_DESCRIPTIONS: Record<number, string> = {
  1: "Estás comenzando. Con práctica constante puedes mejorar tus resultados significativamente.",
  2: "Tienes una base sólida. Sigue reforzando las áreas con menor desempeño.",
  3: "Posees las capacidades para abordar problemas de complejidad media y alta.",
  4: "¡Nivel Avanzado! Tienes las herramientas para enfrentar el examen con confianza.",
};

// Umbrales de score (/ 500) por nivel para calcular puntos al nivel siguiente
const NEXT_LEVEL_THRESHOLDS: Record<number, number> = { 1: 250, 2: 300, 3: 400 };

function formatDiagnosticDate(isoString: string | null): string {
  if (!isoString) return "";
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("es-CO", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(d);
}

function pct(value: number | null, fallback = 0): number {
  return value !== null ? Math.max(0, Math.min(100, Math.round(value))) : fallback;
}

export default function DiagnosticResults({ summary, studentName }: Props) {
  const navigate = useNavigate();

  const level = summary.overallEstimatedLevel ?? 1;
  const score = summary.estimatedScoreGlobal ?? null;
  const dateLabel = formatDiagnosticDate(summary.lastDiagnosticAt);

  // Percentile approximation: derived from global accuracy average
  const percentile =
    summary.avgAccuracy !== null
      ? pct(summary.avgAccuracy)
      : score !== null
        ? pct((score / 500) * 100)
        : null;

  // Points to next level
  const nextThreshold = NEXT_LEVEL_THRESHOLDS[level];
  const pointsToNext =
    nextThreshold && score !== null ? Math.max(0, nextThreshold - score) : null;

  // Area breakdown mapped and sorted by ORDERED_AREAS
  const areaMap = new Map(summary.areaBreakdown.map((a) => [a.areaCode, a]));

  // Sorted areas by accuracy desc for strengths/opportunities
  const rankedAreas = ORDERED_AREAS
    .map((code) => ({ code, ...areaMap.get(code) }))
    .filter((a) => a.accuracyPercent !== undefined && a.accuracyPercent !== null)
    .sort((a, b) => (b.accuracyPercent ?? 0) - (a.accuracyPercent ?? 0));

  const strongestArea = rankedAreas[0];
  const secondArea = rankedAreas[1];
  const weakestArea = rankedAreas[rankedAreas.length - 1];

  // Próximos pasos
  const nextUnit = summary.nextRecommendedUnit;
  const steps = [
    nextUnit
      ? nextUnit.title
      : weakestArea
        ? `Refuerzo de ${AREA_META[weakestArea.code]?.label ?? weakestArea.code}`
        : "Sesión de práctica diagnóstica",
    secondArea
      ? `Taller de ${AREA_META[secondArea.code]?.label ?? secondArea.code}`
      : "Revisión de avance semanal",
    weakestArea && weakestArea.code !== (rankedAreas[rankedAreas.length - 2]?.code)
      ? `Análisis de ${AREA_META[weakestArea.code]?.label ?? weakestArea.code}`
      : "Análisis de competencias críticas",
  ];

  return (
    <div className="space-y-6">
      {/* ── Header ─────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
            Reporte de Competencias
          </p>
          <h1 className="font-headline text-3xl font-black tracking-tight text-on-surface">
            {studentName}
          </h1>
          <p className="max-w-lg text-sm leading-relaxed text-on-surface-variant">
            Análisis profundo del desempeño diagnóstico
            {dateLabel ? ` realizado el ${dateLabel}` : ""}. Tu perfil muestra una base
            sólida con oportunidades de optimización en razonamiento complejo.
          </p>
        </div>
        <button
          type="button"
          className="flex items-center gap-2 rounded-xl border border-outline-variant bg-white px-4 py-2.5 text-sm font-semibold text-on-surface shadow-sm transition-opacity hover:opacity-80"
        >
          <span className="material-symbols-outlined text-[18px]">download</span>
          Exportar PDF
        </button>
      </div>

      {/* ── Top metrics ────────────────────────── */}
      <div className="grid gap-4 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)]">
        {/* Level card */}
        <div className="relative overflow-hidden rounded-3xl bg-primary p-7 text-white">
          {/* watermark icon */}
          <span
            className="material-symbols-outlined pointer-events-none absolute -bottom-4 -right-4 select-none text-[120px] text-white/10"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            trending_up
          </span>
          <p className="text-sm font-semibold text-white/70">Nivel de Desempeño Global</p>
          <div className="mt-3 flex items-end gap-2">
            <span className="font-headline text-8xl font-black leading-none">{level}</span>
            <span className="mb-3 text-2xl font-semibold text-white/60">de 4</span>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-white/80 text-balance">
            {LEVEL_DESCRIPTIONS[level] ?? LEVEL_DESCRIPTIONS[1]}
            {pointsToNext !== null && pointsToNext > 0 && (
              <>
                {" "}Estás a{" "}
                <strong className="text-white">{pointsToNext} puntos</strong> del Nivel{" "}
                {level + 1}.
              </>
            )}
          </p>
        </div>

        {/* Percentile */}
        <div className="flex flex-col justify-between rounded-3xl bg-white p-7 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
            Percentil Nacional
          </p>
          <div>
            <p className="font-headline text-5xl font-black text-on-surface">
              {percentile !== null ? `${percentile}%` : "--"}
            </p>
            {percentile !== null && (
              <div className="mt-3">
                <div className="h-2 w-full overflow-hidden rounded-full bg-surface-container-high">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all"
                    style={{ width: `${percentile}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Score */}
        <div className="flex flex-col justify-between rounded-3xl bg-white p-7 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
            Puntaje Estimado
          </p>
          <div className="flex items-end gap-1">
            <span className="font-headline text-5xl font-black text-on-surface">
              {score !== null ? score : "--"}
            </span>
            <span className="mb-1.5 text-lg font-semibold text-on-surface-variant">/ 500</span>
          </div>
        </div>
      </div>

      {/* ── Fortaleza principal ─────────────────── */}
      {strongestArea && (
        <div className="flex items-center justify-between rounded-2xl bg-white px-6 py-4 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-50">
              <span
                className="material-symbols-outlined text-2xl text-emerald-600"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                verified
              </span>
            </div>
            <div>
              <p className="text-sm font-bold text-on-surface">Fortaleza Principal</p>
              <p className="text-sm text-on-surface-variant">
                {AREA_META[strongestArea.code]?.label ?? strongestArea.code}
                {strongestArea.accuracyPercent !== null
                  ? ` · ${pct(strongestArea.accuracyPercent ?? null)}% de precisión`
                  : ""}
              </p>
            </div>
          </div>
          <span className="material-symbols-outlined text-xl text-on-surface-variant">
            chevron_right
          </span>
        </div>
      )}

      {/* ── Desglose por Áreas ──────────────────── */}
      <section>
        <h2 className="mb-4 flex items-center gap-2 font-headline text-lg font-bold text-on-surface">
          <span
            className="material-symbols-outlined text-[22px] text-primary"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            bar_chart
          </span>
          Desglose por Áreas
        </h2>
        <div className="flex gap-4 overflow-x-auto pb-2">
          {ORDERED_AREAS.map((code) => {
            const area = areaMap.get(code);
            const score = area?.accuracyPercent !== null ? pct(area?.accuracyPercent ?? null) : null;
            return (
              <div
                key={code}
                className="min-w-35 flex-1 rounded-2xl bg-white p-5 shadow-sm"
              >
                <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                  {AREA_META[code]?.label ?? code}
                </p>
                <p className="mt-2 font-headline text-3xl font-black text-on-surface">
                  {score !== null ? score : "--"}
                </p>
                <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-surface-container-high">
                  {score !== null && (
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${score}%` }}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Fortalezas / Próximos pasos ────────── */}
      <div className="grid gap-5 md:grid-cols-2">
        {/* Fortalezas y Oportunidades */}
        <div className="rounded-3xl bg-white p-7 shadow-sm">
          <h3 className="font-headline text-lg font-bold text-on-surface">
            Fortalezas y Oportunidades
          </h3>
          <ul className="mt-5 space-y-5">
            {/* Strength 1 */}
            {strongestArea && (
              <li className="flex gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-50">
                  <span
                    className="material-symbols-outlined text-xl text-emerald-600"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    thumb_up
                  </span>
                </div>
                <div>
                  <p className="text-sm font-bold text-on-surface">
                    {AREA_META[strongestArea.code]?.label ?? strongestArea.code} — Nivel destacado
                  </p>
                  <p className="mt-0.5 text-sm leading-relaxed text-on-surface-variant">
                    Tu desempeño en esta área está por encima del promedio. Sigue consolidando
                    este diferencial para el examen.
                  </p>
                </div>
              </li>
            )}

            {/* Strength 2 */}
            {secondArea && (
              <li className="flex gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10">
                  <span
                    className="material-symbols-outlined text-xl text-primary"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    psychology
                  </span>
                </div>
                <div>
                  <p className="text-sm font-bold text-on-surface">
                    {AREA_META[secondArea.code]?.label ?? secondArea.code} — Pensamiento aplicado
                  </p>
                  <p className="mt-0.5 text-sm leading-relaxed text-on-surface-variant">
                    Resolución eficiente de problemas en esta área. Refuerza los temas de mayor
                    complejidad para escalar al siguiente nivel.
                  </p>
                </div>
              </li>
            )}

            {/* Opportunity */}
            {weakestArea && (
              <li className="flex gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-red-50">
                  <span
                    className="material-symbols-outlined text-xl text-red-500"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    trending_up
                  </span>
                </div>
                <div>
                  <p className="text-sm font-bold text-on-surface">
                    Área de Oportunidad — {AREA_META[weakestArea.code]?.label ?? weakestArea.code}
                  </p>
                  <p className="mt-0.5 text-sm leading-relaxed text-on-surface-variant">
                    Esta área requiere atención prioritaria. Mejorar aquí tiene el mayor impacto
                    sobre tu puntaje estimado.
                  </p>
                </div>
              </li>
            )}
          </ul>
        </div>

        {/* Próximos Pasos */}
        <div className="flex flex-col rounded-3xl bg-white p-7 shadow-sm">
          <div>
            <h3 className="font-headline text-lg font-bold text-on-surface">Próximos Pasos</h3>
            <p className="mt-0.5 text-sm text-on-surface-variant">Ruta de aprendizaje personalizada</p>
          </div>
          <ol className="mt-5 flex-1 space-y-3">
            {steps.map((step, i) => (
              <li
                key={step}
                className={`flex items-center gap-4 rounded-2xl px-5 py-4 ${i === 0 ? "bg-primary/5 ring-1 ring-primary/15" : "bg-surface-container-low"}`}
              >
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-black ${i === 0 ? "bg-primary text-white" : "bg-outline/20 text-on-surface-variant"}`}
                >
                  {i + 1}
                </span>
                <span
                  className={`text-sm font-semibold ${i === 0 ? "text-on-surface" : "text-on-surface-variant"}`}
                >
                  {step}
                </span>
              </li>
            ))}
          </ol>
          <button
            type="button"
            onClick={() => void navigate("/student/plan")}
            className="mt-5 flex w-full items-center justify-between rounded-2xl bg-on-surface px-6 py-4 font-bold text-surface transition-opacity hover:opacity-85 active:scale-95"
          >
            Ver Plan de Estudio Completo
            <span className="material-symbols-outlined text-xl">arrow_forward</span>
          </button>
        </div>
      </div>

      {/* ── CTA banner ─────────────────────────── */}
      <div className="relative overflow-hidden rounded-3xl bg-[#0a1a3a] px-8 py-10">
        {/* gradient overlay */}
        <div className="pointer-events-none absolute inset-0 bg-linear-to-r from-[#0a1a3a] via-[#0a1a3a]/80 to-transparent" />
        <div className="relative z-10 max-w-sm space-y-4">
          <h3 className="font-headline text-2xl font-black text-white text-balance">
            ¿Listo para subir al Nivel {Math.min(4, level + 1)}?
          </h3>
          <p className="text-sm leading-relaxed text-white/70">
            Hemos preparado una sesión de refuerzo intensivo basada en tus errores más frecuentes.
          </p>
          <button
            type="button"
            onClick={() => void navigate("/student/diagnostico/iniciar")}
            className="rounded-full bg-white px-6 py-2.5 text-sm font-bold text-on-surface transition-opacity hover:opacity-90"
          >
            Agendar Mentoría
          </button>
        </div>
      </div>
    </div>
  );
}
