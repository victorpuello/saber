import { useNavigate } from "react-router-dom";
import type { StudentDashboardSummary } from "../../services/dashboard";

interface Props {
  summary: StudentDashboardSummary;
  studentName: string;
}

interface AreaMeta {
  label: string;
  icon: string;
  color: string;
  bg: string;
}

const AREA_META: Record<string, AreaMeta> = {
  LC:  { label: "Lectura Crítica",      icon: "menu_book",  color: "#6d28d9", bg: "#f5f3ff" },
  MAT: { label: "Matemáticas",          icon: "calculate",  color: "#1d4ed8", bg: "#eff6ff" },
  SC:  { label: "Sociales",             icon: "public",     color: "#be123c", bg: "#fff1f2" },
  CN:  { label: "Ciencias Nat.",        icon: "science",    color: "#047857", bg: "#ecfdf5" },
  ING: { label: "Inglés",              icon: "translate",  color: "#b45309", bg: "#fffbeb" },
};

const ORDERED_AREAS = ["MAT", "LC", "SC", "CN", "ING"];

const LEVEL_LABELS: Record<number, { text: string; bg: string; color: string }> = {
  1: { text: "Insuficiente", bg: "#ffdad6", color: "#93000a" },
  2: { text: "Mínimo",      bg: "#fef3c7", color: "#b45309" },
  3: { text: "Satisfactorio", bg: "#ecfdf5", color: "#047857" },
  4: { text: "Avanzado",    bg: "#ecfdf5", color: "#047857" },
};

const LEVEL_DESCRIPTIONS: Record<number, string> = {
  1: "Estás comenzando. Con práctica constante puedes mejorar tus resultados significativamente.",
  2: "Tienes una base sólida. Sigue reforzando las áreas con menor desempeño.",
  3: "Posees las capacidades para abordar problemas de complejidad media y alta.",
  4: "¡Nivel Avanzado! Tienes las herramientas para enfrentar el examen con confianza.",
};

const NEXT_LEVEL_THRESHOLDS: Record<number, number> = { 1: 250, 2: 300, 3: 400 };

function pct(value: number | null | undefined, fallback = 0): number {
  return value != null ? Math.max(0, Math.min(100, Math.round(value))) : fallback;
}

function scoreLevel(accuracy: number): number {
  if (accuracy >= 75) return 4;
  if (accuracy >= 55) return 3;
  if (accuracy >= 40) return 2;
  return 1;
}

function formatDiagnosticDate(isoString: string | null): string {
  if (!isoString) return "";
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "long", year: "numeric" }).format(d);
}

export default function DiagnosticResults({ summary, studentName }: Props) {
  const navigate = useNavigate();

  const level = summary.overallEstimatedLevel ?? 1;
  const globalScore = summary.estimatedScoreGlobal ?? null;
  const dateLabel = formatDiagnosticDate(summary.lastDiagnosticAt);

  // Show accuracy as 0-100 score
  const displayScore =
    summary.avgAccuracy !== null
      ? pct(summary.avgAccuracy)
      : globalScore !== null
        ? pct((globalScore / 500) * 100)
        : null;

  const percentile = displayScore;

  const nextThreshold = NEXT_LEVEL_THRESHOLDS[level];
  const pointsToNext = nextThreshold && globalScore !== null ? Math.max(0, nextThreshold - globalScore) : null;

  const areaMap = new Map(summary.areaBreakdown.map((a) => [a.areaCode, a]));

  const rankedAreas = ORDERED_AREAS
    .map((code) => ({ code, ...areaMap.get(code) }))
    .filter((a) => a.accuracyPercent !== undefined && a.accuracyPercent !== null)
    .sort((a, b) => (b.accuracyPercent ?? 0) - (a.accuracyPercent ?? 0));

  const strongestArea = rankedAreas[0];
  const secondArea = rankedAreas[1];
  const weakestArea = rankedAreas[rankedAreas.length - 1];

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
    weakestArea && weakestArea.code !== rankedAreas[rankedAreas.length - 2]?.code
      ? `Análisis de ${AREA_META[weakestArea.code]?.label ?? weakestArea.code}`
      : "Análisis de competencias críticas",
  ];

  return (
    <div className="space-y-6">
      {/* ── Score Hero ──────────────────────────────────────────── */}
      <div
        className="relative overflow-hidden rounded-4xl p-9 text-white"
        style={{ backgroundColor: "#004ac6" }}
      >
        {/* decorative circles */}
        <div className="pointer-events-none absolute -right-14 -top-14 h-56 w-56 rounded-full bg-white/4" />
        <div className="pointer-events-none absolute -bottom-7.5 right-36 h-30 w-30 rounded-full bg-white/4" />

        <div className="relative z-10 flex flex-wrap items-center justify-between gap-6">
          {/* Left: name + date + chips */}
          <div className="space-y-2">
            <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-white/70">
              Diagnóstico completado
            </p>
            <h1 className="text-[28px] font-black tracking-[-0.03em] text-white">
              {studentName}
            </h1>
            {dateLabel && (
              <p className="text-[13px] text-white/65">
                {dateLabel} · {summary.diagnosticCompetencies ?? 0} competencias
              </p>
            )}
            <div className="flex flex-wrap gap-2 pt-1">
              <span className="flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[11px] font-bold">
                <span
                  className="material-symbols-outlined text-[13px]"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  check_circle
                </span>
                {summary.diagnosticCompetencies ?? 0} respondidas
              </span>
              <span className="flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[11px] font-bold">
                <span
                  className="material-symbols-outlined text-[13px]"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  bolt
                </span>
                Algoritmo CAT
              </span>
            </div>
          </div>

          {/* Center: big score */}
          <div className="text-center">
            <p className="mb-1 text-sm font-bold uppercase tracking-widest text-white/65">
              Puntaje estimado
            </p>
            <p className="text-[88px] font-black leading-none tracking-[-0.05em]">
              {displayScore !== null ? displayScore : "--"}
            </p>
            <p className="mt-1 text-base text-white/65">de 100 puntos</p>
          </div>

          {/* Right: level badge + chips */}
          <div className="flex flex-col items-end gap-3.5">
            <div className="rounded-[14px] bg-white/15 px-5 py-3 text-center">
              <p className="text-[32px] font-black leading-none">{level}</p>
              <p className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.2em] text-white/70">
                de 4
              </p>
            </div>
            <div className="flex flex-col items-end gap-1.5">
              {percentile !== null && (
                <span className="flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[11px] font-bold">
                  <span
                    className="material-symbols-outlined text-[13px]"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    trending_up
                  </span>
                  Percentil {percentile}%
                </span>
              )}
              {weakestArea && (
                <span
                  className="flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold"
                  style={{ backgroundColor: "rgba(245,158,11,0.25)", color: "#fde68a" }}
                >
                  <span
                    className="material-symbols-outlined text-[13px]"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    priority_high
                  </span>
                  {weakestArea.code} prioritario
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Area Cards ─────────────────────────────────────────── */}
      <div className="flex gap-3 overflow-x-auto pb-1">
        {ORDERED_AREAS.map((code) => {
          const area = areaMap.get(code);
          const meta = AREA_META[code];
          const areaScore = area?.accuracyPercent != null ? pct(area.accuracyPercent) : null;
          const areaLvl = areaScore !== null ? scoreLevel(areaScore) : null;
          const lvlMeta = areaLvl !== null ? LEVEL_LABELS[areaLvl] : null;
          return (
            <div key={code} className="min-w-32.5 flex-1 rounded-[20px] bg-white p-4.5 shadow-[0_12px_40px_rgba(25,28,30,0.06)]">
              <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">
                {meta?.label ?? code}
              </p>
              <p
                className="mt-1.5 text-[32px] font-black tracking-[-0.04em]"
                style={{ color: meta?.color ?? "#004ac6" }}
              >
                {areaScore !== null ? areaScore : "--"}
                <span className="text-[14px] font-medium text-on-surface-variant/50">/100</span>
              </p>
              {lvlMeta && (
                <span
                  className="mt-1.5 inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold"
                  style={{ backgroundColor: lvlMeta.bg, color: lvlMeta.color }}
                >
                  Nivel {areaLvl} — {lvlMeta.text}
                </span>
              )}
              <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-surface-container-high">
                {areaScore !== null && (
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${areaScore}%`, backgroundColor: meta?.color ?? "#004ac6" }}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Level card + Global score ────────────────────────────── */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="relative overflow-hidden rounded-3xl bg-primary p-7 text-white md:col-span-1">
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
          <p className="mt-4 text-sm leading-relaxed text-white/80">
            {LEVEL_DESCRIPTIONS[level] ?? LEVEL_DESCRIPTIONS[1]}
            {pointsToNext !== null && pointsToNext > 0 && (
              <>
                {" "}Estás a{" "}
                <strong className="text-white">{pointsToNext} pts</strong> del Nivel {level + 1}.
              </>
            )}
          </p>
        </div>

        <div className="flex flex-col justify-between rounded-3xl bg-white p-7 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
            Percentil Estimado
          </p>
          <div>
            <p className="font-headline text-5xl font-black text-on-surface">
              {percentile !== null ? `${percentile}%` : "--"}
            </p>
            {percentile !== null && (
              <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-surface-container-high">
                <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${percentile}%` }} />
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col justify-between rounded-3xl bg-white p-7 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
            Puntaje Estimado
          </p>
          <div className="flex items-end gap-1">
            <span className="font-headline text-5xl font-black text-on-surface">
              {globalScore !== null ? globalScore : "--"}
            </span>
            <span className="mb-1.5 text-lg font-semibold text-on-surface-variant">/ 500</span>
          </div>
        </div>
      </div>

      {/* ── Insights + Plan ─────────────────────────────────────── */}
      <div className="grid gap-5 md:grid-cols-2">
        {/* Fortalezas y Oportunidades */}
        <div className="rounded-3xl bg-white p-7 shadow-sm">
          <h3 className="mb-5 flex items-center gap-2 text-base font-bold text-on-surface">
            <span
              className="material-symbols-outlined text-[20px] text-primary"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              insights
            </span>
            Fortalezas y Oportunidades
          </h3>
          <ul className="space-y-5">
            {strongestArea && (
              <li className="flex gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] bg-emerald-50">
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
                    Tu desempeño supera el promedio nacional. Sigue consolidando este diferencial.
                  </p>
                </div>
              </li>
            )}
            {secondArea && (
              <li className="flex gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] bg-primary/10">
                  <span
                    className="material-symbols-outlined text-xl text-primary"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    science
                  </span>
                </div>
                <div>
                  <p className="text-sm font-bold text-on-surface">
                    {AREA_META[secondArea.code]?.label ?? secondArea.code} — Base sólida
                  </p>
                  <p className="mt-0.5 text-sm leading-relaxed text-on-surface-variant">
                    Refuerza los temas de mayor complejidad para escalar al siguiente nivel.
                  </p>
                </div>
              </li>
            )}
            {weakestArea && (
              <li className="flex gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] bg-red-50">
                  <span
                    className="material-symbols-outlined text-xl text-red-600"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    flag
                  </span>
                </div>
                <div>
                  <p className="text-sm font-bold text-on-surface">
                    {AREA_META[weakestArea.code]?.label ?? weakestArea.code} — Atención prioritaria
                  </p>
                  <p className="mt-0.5 text-sm leading-relaxed text-on-surface-variant">
                    Mejorar esta área tiene el mayor impacto potencial en tu puntaje global. El
                    plan se enfocará aquí primero.
                  </p>
                </div>
              </li>
            )}
          </ul>
        </div>

        {/* Próximos Pasos */}
        <div className="flex flex-col rounded-3xl bg-white p-7 shadow-sm">
          <h3 className="mb-1 flex items-center gap-2 text-base font-bold text-on-surface">
            <span
              className="material-symbols-outlined text-[20px] text-primary"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              route
            </span>
            Plan de Estudio Generado
          </h3>
          <p className="mb-5 text-sm text-on-surface-variant">Ruta de aprendizaje personalizada</p>
          <ol className="flex-1 space-y-2.5">
            {steps.map((step, i) => (
              <li
                key={step}
                className={`flex items-center gap-3 rounded-[13px] px-4 py-3.5 ${
                  i === 0
                    ? "bg-primary/5 ring-1 ring-inset ring-primary/15"
                    : "bg-surface-container-low"
                }`}
              >
                <span
                  className={`flex h-6.5 w-6.5 shrink-0 items-center justify-center rounded-full text-[11px] font-black ${
                    i === 0 ? "bg-primary text-white" : "bg-outline/20 text-on-surface-variant"
                  }`}
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
            className="mt-5 flex w-full items-center justify-between rounded-[13px] bg-on-surface px-5 py-3.5 text-sm font-bold text-surface transition-opacity hover:opacity-85"
          >
            Ir al Plan de Estudio Completo
            <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
          </button>
        </div>
      </div>

      {/* ── CTA Banner ──────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-[28px] px-9 py-8" style={{ backgroundColor: "#0a1a3a" }}>
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: "linear-gradient(to right,#0a1a3a,rgba(10,26,58,0.7),transparent)" }}
        />
        <div className="relative z-10 flex items-center justify-between gap-5">
          <div className="max-w-xs space-y-2">
            <h3 className="text-[22px] font-black tracking-[-0.02em] text-white">
              ¿Listo para subir al Nivel {Math.min(4, level + 1)}?
            </h3>
            <p className="text-sm leading-relaxed text-white/60">
              Hemos preparado tu primer simulacro de práctica basado en tus áreas débiles.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void navigate("/student/diagnostico/iniciar")}
            className="shrink-0 rounded-full bg-white px-6 py-2.5 text-sm font-bold text-on-surface transition-opacity hover:opacity-90"
          >
            Iniciar práctica ahora
          </button>
        </div>
      </div>
    </div>
  );
}
