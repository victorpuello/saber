import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { fetchSessionResults, type QuestionResultDetail, type SessionResults } from "../../services/examSession";

// ── Performance level helper ─────────────────────────────────────────

function getLevel(score: number): { level: number; desc: string } {
  if (score >= 80) return { level: 4, desc: "Dominio sobresaliente. Resuelves problemas de alta complejidad con precisión y fluidez." };
  if (score >= 60) return { level: 3, desc: "Posees las capacidades para abordar problemas de complejidad media y alta. Sigue consolidando este nivel." };
  if (score >= 40) return { level: 2, desc: "Manejo básico de los contenidos. Refuerza los temas fundamentales para avanzar al siguiente nivel." };
  return { level: 1, desc: "Requiere atención en los contenidos básicos. Comienza con los fundamentos de cada área." };
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

// ── Per-question row ──────────────────────────────────────────────────

function QuestionResultRow({ question: q }: { question: QuestionResultDetail }) {
  const [open, setOpen] = useState(false);
  const correct = q.is_correct;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => setOpen((o) => !o)}
      onKeyDown={(e) => e.key === "Enter" && setOpen((o) => !o)}
      className={`cursor-pointer rounded-2xl p-4 transition ${
        correct ? "bg-emerald-50 hover:bg-emerald-100/70" : "bg-rose-50 hover:bg-rose-100/70"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span
            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-black ${
              correct ? "bg-emerald-600 text-white" : "bg-rose-500 text-white"
            }`}
          >
            <span
              className="material-symbols-outlined text-[14px]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              {correct ? "check" : "close"}
            </span>
          </span>
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-widest text-secondary">
              Pregunta {q.position}
            </p>
            <p className="mt-0.5 text-sm font-medium text-on-surface">
              {q.stem.length > 100 ? q.stem.slice(0, 100) + "…" : q.stem}
            </p>
            <div className="mt-2 flex flex-wrap gap-4 text-xs">
              <span>
                Tu respuesta:{" "}
                <strong className={correct ? "text-emerald-700" : "text-rose-700"}>
                  {q.selected_answer ?? "—"}
                </strong>
              </span>
              {!correct && (
                <span>
                  Correcta: <strong className="text-emerald-700">{q.correct_answer}</strong>
                </span>
              )}
              {q.time_spent_seconds != null && (
                <span className="text-secondary/60">{q.time_spent_seconds}s</span>
              )}
            </div>
          </div>
        </div>
        <span className="material-symbols-outlined shrink-0 text-[18px] text-secondary">
          {open ? "expand_less" : "expand_more"}
        </span>
      </div>

      {open && (
        <div className="mt-3 rounded-xl bg-white p-3 text-sm leading-relaxed text-on-surface-variant">
          {q.explanation_selected && q.selected_answer !== q.correct_answer && (
            <div className="mb-3">
              <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-rose-600">
                Tu opción ({q.selected_answer})
              </p>
              <p>{q.explanation_selected}</p>
            </div>
          )}
          {q.explanation_correct && (
            <div>
              <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-emerald-600">
                Respuesta correcta ({q.correct_answer})
              </p>
              <p>{q.explanation_correct}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────

export default function ExamResults() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const { authFetch } = useAuth();
  const navigate = useNavigate();

  const [results, setResults] = useState<SessionResults | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;
    fetchSessionResults(authFetch, sessionId)
      .then((data) => { if (!cancelled) setResults(data); })
      .catch((e) => { if (!cancelled) setError(e instanceof Error ? e.message : "Error"); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [authFetch, sessionId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <span className="material-symbols-outlined animate-spin text-[32px] text-secondary">
          progress_activity
        </span>
      </div>
    );
  }

  if (error || !results) {
    return (
      <div className="flex flex-col items-center gap-4 py-24 text-center">
        <span className="material-symbols-outlined text-[48px] text-error/60">error</span>
        <p className="text-sm text-secondary">{error ?? "No se pudieron cargar los resultados."}</p>
        <button
          type="button"
          onClick={() => navigate("/student/examenes")}
          className="rounded-2xl bg-primary px-5 py-2.5 text-sm font-bold text-white transition hover:opacity-90"
        >
          Volver a Simulacros
        </button>
      </div>
    );
  }

  const pct = results.total_questions > 0
    ? Math.round((results.total_correct / results.total_questions) * 100)
    : 0;
  const { level, desc: levelDesc } = getLevel(results.score_global);
  const sortedQuestions = [...results.questions].sort((a, b) => a.position - b.position);

  // Derive strengths from accuracy buckets
  const correct = sortedQuestions.filter((q) => q.is_correct).length;
  const wrong   = sortedQuestions.length - correct;
  const strongFirst = correct >= wrong;

  return (
    <div className="flex flex-col gap-6">

      {/* ── V4 Header bar ────────────────────────────────────────── */}
      <div className="sticky top-16 z-30 -mx-6 -mt-9 flex items-center justify-between border-b border-black/6 bg-white/90 px-10 py-4 backdrop-blur-xl md:-mx-9">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate("/student/examenes")}
            className="flex items-center gap-1.5 rounded-[10px] bg-surface-container-high px-4 py-2 text-[13px] font-semibold text-on-surface transition hover:bg-surface-container-highest"
          >
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            Volver
          </button>
          <div>
            <div className="text-[11px] font-bold uppercase tracking-widest text-secondary">
              Reporte de Competencias
            </div>
            <div className="text-[15px] font-bold text-on-surface">{results.exam_title}</div>
          </div>
        </div>
        <button
          type="button"
          className="flex items-center gap-1.5 rounded-xl border border-outline-variant/30 bg-white px-4.5 py-2.25 text-[13px] font-semibold text-on-surface transition hover:bg-surface-container-low"
        >
          <span className="material-symbols-outlined text-[18px]">download</span>
          Exportar PDF
        </button>
      </div>

      {/* ── Intro line ───────────────────────────────────────────── */}
      <div>
        <p className="text-[14px] leading-relaxed text-on-surface-variant max-w-xl">
          Análisis de desempeño completado. Tu perfil muestra{" "}
          {pct >= 60 ? "una base sólida con oportunidades de optimización." : "áreas que requieren refuerzo prioritario."}
        </p>
      </div>

      {/* ── Top 3 cards ──────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">

        {/* Level card */}
        <div className="relative col-span-1 overflow-hidden rounded-[28px] bg-primary p-7 text-white sm:col-span-1">
          <div
            className="pointer-events-none absolute -bottom-3 -right-2 select-none font-['Material_Symbols_Outlined'] text-[110px] leading-none text-white/8"
            style={{ fontVariationSettings: "'FILL' 1, 'wght' 420" }}
            aria-hidden="true"
          >
            trending_up
          </div>
          <div className="text-[11px] font-semibold uppercase tracking-widest opacity-70">
            Nivel de Desempeño Global
          </div>
          <div className="mt-1.5 flex items-baseline gap-1">
            <span className="text-[80px] font-black leading-none tracking-[-0.05em]">{level}</span>
            <span className="text-[22px] font-medium opacity-60">de 4</span>
          </div>
          <p className="mt-3 text-[13px] leading-[1.65] opacity-[0.82]">{levelDesc}</p>
        </div>

        {/* Accuracy stat card */}
        <div className="flex flex-col justify-between rounded-[28px] bg-white p-7 shadow-[0_12px_40px_rgba(25,28,30,0.05)]">
          <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-secondary">
            Precisión Global
          </div>
          <div
            className="mt-2 text-[48px] font-black tracking-[-0.05em]"
            style={{ color: pct >= 60 ? "#047857" : pct >= 40 ? "#b45309" : "#be123c" }}
          >
            {pct}%
          </div>
          <div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-container-high">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${pct}%`,
                  background: pct >= 60 ? "#34d399" : pct >= 40 ? "#fbbf24" : "#f43f5e",
                }}
              />
            </div>
            <p className="mt-1.5 text-[11px] text-secondary">
              {results.total_correct} de {results.total_questions} correctas
            </p>
          </div>
        </div>

        {/* Score / time stat card */}
        <div className="flex flex-col justify-between rounded-[28px] bg-white p-7 shadow-[0_12px_40px_rgba(25,28,30,0.05)]">
          <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-secondary">
            Puntaje Estimado
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-[48px] font-black tracking-[-0.05em] text-on-surface">
              {results.score_global.toFixed(0)}
            </span>
          </div>
          <div>
            <div className="mt-3 flex items-center gap-2">
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-container-high">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-700"
                  style={{ width: `${results.score_global}%` }}
                />
              </div>
              <span className="shrink-0 text-[13px] font-semibold text-secondary">/ 100</span>
            </div>
            {results.time_spent_seconds != null && (
              <p className="mt-1.5 text-[11px] text-secondary">
                Tiempo: {formatDuration(results.time_spent_seconds)}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── Strength banner ──────────────────────────────────────── */}
      <div className="flex items-center justify-between rounded-[18px] bg-white px-5 py-4 shadow-[0_12px_40px_rgba(25,28,30,0.05)]">
        <div className="flex items-center gap-3.5">
          <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${strongFirst ? "bg-emerald-50" : "bg-rose-50"}`}>
            <span
              className="material-symbols-outlined text-[24px]"
              style={{
                fontVariationSettings: "'FILL' 1",
                color: strongFirst ? "#047857" : "#be123c",
              }}
            >
              {strongFirst ? "verified" : "trending_up"}
            </span>
          </div>
          <div>
            <div className="text-[13px] font-bold text-on-surface">
              {strongFirst ? "Fortaleza Principal" : "Área Prioritaria"}
            </div>
            <div className="mt-0.5 text-[13px] text-on-surface-variant">
              {strongFirst
                ? `${pct}% de precisión — sigue consolidando este nivel`
                : `Refuerza los temas con mayor impacto en tu puntaje`}
            </div>
          </div>
        </div>
        <span className="material-symbols-outlined shrink-0 text-[22px] text-secondary">chevron_right</span>
      </div>

      {/* ── Lower two-col ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">

        {/* Fortalezas y oportunidades */}
        <div className="rounded-3xl bg-white p-6 shadow-[0_12px_40px_rgba(25,28,30,0.05)]">
          <h3 className="mb-4.5 text-[16px] font-bold text-on-surface">
            Fortalezas y Oportunidades
          </h3>
          <div className="flex flex-col gap-4">
            {correct > 0 && (
              <div className="flex gap-3.5">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-50">
                  <span className="material-symbols-outlined text-[22px] text-emerald-700" style={{ fontVariationSettings: "'FILL' 1" }}>thumb_up</span>
                </div>
                <div>
                  <div className="text-[13px] font-bold text-on-surface">Respuestas correctas — Buen dominio</div>
                  <div className="mt-1 text-[12px] leading-relaxed text-on-surface-variant">
                    Respondiste correctamente {correct} de {results.total_questions} preguntas. Sigue consolidando este diferencial.
                  </div>
                </div>
              </div>
            )}
            {wrong > 0 && (
              <div className="flex gap-3.5">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[rgba(0,74,198,0.08)]">
                  <span className="material-symbols-outlined text-[22px] text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>psychology</span>
                </div>
                <div>
                  <div className="text-[13px] font-bold text-on-surface">Área de Mejora — Análisis profundo</div>
                  <div className="mt-1 text-[12px] leading-relaxed text-on-surface-variant">
                    {wrong} pregunta{wrong !== 1 ? "s" : ""} sin respuesta correcta. Revisa las explicaciones para identificar patrones de error.
                  </div>
                </div>
              </div>
            )}
            {pct < 60 && (
              <div className="flex gap-3.5">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-rose-50">
                  <span className="material-symbols-outlined text-[22px] text-rose-700" style={{ fontVariationSettings: "'FILL' 1" }}>trending_up</span>
                </div>
                <div>
                  <div className="text-[13px] font-bold text-on-surface">Oportunidad de Crecimiento</div>
                  <div className="mt-1 text-[12px] leading-relaxed text-on-surface-variant">
                    Mejorar en los temas débiles tiene el mayor impacto sobre tu puntaje estimado en el Saber 11.
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Próximos pasos */}
        <div className="rounded-3xl bg-white p-6 shadow-[0_12px_40px_rgba(25,28,30,0.05)]">
          <h3 className="mb-4.5 text-[16px] font-bold text-on-surface">Próximos Pasos</h3>
          <div className="flex flex-col gap-2.5">
            {[
              { n: 1, priority: true,  text: "Revisar las preguntas incorrectas y leer las explicaciones" },
              { n: 2, priority: false, text: "Repetir este simulacro en 3–5 días para medir progreso" },
              { n: 3, priority: false, text: "Explorar la sección de práctica por área para reforzar" },
            ].map(({ n, priority, text }) => (
              <div
                key={n}
                className={`flex items-center gap-3.5 rounded-[14px] px-4 py-3.5 ${
                  priority
                    ? "bg-[rgba(0,74,198,0.05)] shadow-[0_0_0_1px_rgba(0,74,198,0.12)]"
                    : "bg-surface-container-low"
                }`}
              >
                <div
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-black ${
                    priority ? "bg-primary text-white" : "bg-outline-variant/20 text-on-surface-variant"
                  }`}
                >
                  {n}
                </div>
                <span className={`text-[13px] font-semibold ${priority ? "text-on-surface" : "text-on-surface-variant"}`}>
                  {text}
                </span>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => navigate("/student/plan")}
            className="mt-4 flex w-full items-center justify-between rounded-[14px] bg-on-surface px-4.5 py-3.5 text-[14px] font-bold text-white transition hover:opacity-85"
          >
            Ver Plan de Estudio Completo
            <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
          </button>
        </div>
      </div>

      {/* ── CTA banner ───────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-[28px] bg-[#0a1a3a] px-10 py-9 flex items-center justify-between gap-6">
        <div className="pointer-events-none absolute inset-0 bg-linear-to-r from-[#0a1a3a] via-[#0a1a3a80] to-transparent" />
        <div className="relative z-10">
          <h3 className="text-[24px] font-black text-white tracking-[-0.02em]">
            {level < 4 ? `¿Listo para subir al Nivel ${level + 1}?` : "¡Nivel máximo alcanzado!"}
          </h3>
          <p className="mt-2 text-[14px] text-white/65">
            {level < 4
              ? "Hemos preparado una sesión de refuerzo basada en tus errores más frecuentes."
              : "Sigue practicando para mantener tu nivel de excelencia."}
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate("/student/examenes")}
          className="relative z-10 shrink-0 rounded-full bg-white px-7 py-3 text-[14px] font-bold text-on-surface transition hover:opacity-90"
        >
          Iniciar sesión de refuerzo
        </button>
      </div>

      {/* ── Question breakdown ────────────────────────────────────── */}
      <div>
        <h2 className="mb-4 text-[16px] font-bold text-on-surface">
          Revisión pregunta a pregunta
        </h2>
        <div className="space-y-3">
          {sortedQuestions.map((q) => (
            <QuestionResultRow key={q.question_id} question={q} />
          ))}
        </div>
      </div>

      {/* ── Bottom CTAs ──────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-3 pb-4">
        <button
          type="button"
          onClick={() => navigate("/student/examenes")}
          className="flex items-center gap-2 rounded-2xl bg-surface-container-high px-5 py-2.5 text-sm font-semibold text-on-surface transition hover:bg-surface-container-highest"
        >
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          Volver a Simulacros
        </button>
        <button
          type="button"
          onClick={() => navigate("/student/examenes")}
          className="flex items-center gap-2 rounded-2xl bg-linear-to-br from-primary to-primary-container px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-primary/20 transition hover:opacity-90"
        >
          <span className="material-symbols-outlined text-[18px]">replay</span>
          Intentar otro
        </button>
      </div>
    </div>
  );
}

