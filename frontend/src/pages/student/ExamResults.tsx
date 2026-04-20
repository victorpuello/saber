import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { fetchSessionResults, type QuestionResultDetail, type SessionResults } from "../../services/examSession";
import { ExamTypeBadge } from "../admin/exams/components/ExamsTable";

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
          {/* Correct/wrong indicator */}
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

      {/* Expandable explanation */}
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

  const sortedQuestions = [...results.questions].sort((a, b) => a.position - b.position);

  return (
    <div className="space-y-6">
      {/* ── Score hero ──────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-3xl bg-primary p-7 text-white">
        {/* Background decoration */}
        <div className="absolute right-0 top-0 h-48 w-48 translate-x-16 -translate-y-16 rounded-full bg-white/5" />
        <div className="absolute right-12 top-12 h-28 w-28 rounded-full bg-white/5" />

        <div className="relative">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="mb-1">
                <ExamTypeBadge type={results.exam_type} />
              </div>
              <h1 className="mt-2 font-headline text-2xl font-black text-white">
                {results.exam_title}
              </h1>
            </div>
            <div className="text-right">
              <p className="text-xs font-semibold uppercase tracking-widest text-white/60">
                Puntaje
              </p>
              <p className="font-headline text-4xl font-black text-white">
                {results.score_global.toFixed(1)}
              </p>
              <p className="text-xs text-white/60">/ 100</p>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-white/60">
                Correctas
              </p>
              <p className="font-headline text-5xl font-black text-white">
                {results.total_correct}
                <span className="ml-1 text-xl font-semibold text-white/60">
                  / {results.total_questions}
                </span>
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-white/60">
                Precisión
              </p>
              <p className="font-headline text-5xl font-black text-white">{pct}%</p>
            </div>
            {results.time_spent_seconds != null && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-white/60">
                  Tiempo
                </p>
                <p className="font-mono text-3xl font-black text-white">
                  {Math.floor(results.time_spent_seconds / 60)}m {results.time_spent_seconds % 60}s
                </p>
              </div>
            )}
          </div>

          {/* Progress bar */}
          <div className="mt-5">
            <div className="h-2 w-full overflow-hidden rounded-full bg-white/20">
              <div
                className="h-full rounded-full bg-white transition-all duration-700"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Question breakdown ────────────────────────────────────── */}
      <div>
        <h2 className="mb-4 font-headline text-xl font-black text-on-surface">
          Revisión de preguntas
        </h2>
        <div className="space-y-3">
          {sortedQuestions.map((q) => (
            <QuestionResultRow key={q.question_id} question={q} />
          ))}
        </div>
      </div>

      {/* ── CTAs ──────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-3 pt-2">
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
