import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { listExams, type ExamOut } from "../../services/examSession";
import { ExamTypeBadge } from "../admin/exams/components/ExamsTable";

type TypeFilter = "" | "FULL_SIMULATION" | "AREA_PRACTICE" | "CUSTOM";

const TYPE_FILTER_OPTIONS: { value: TypeFilter; label: string }[] = [
  { value: "",                label: "Todos" },
  { value: "FULL_SIMULATION", label: "Simulacros" },
  { value: "AREA_PRACTICE",   label: "Por Área" },
  { value: "CUSTOM",          label: "Personalizados" },
];

// ── Exam card ────────────────────────────────────────────────────────

function ExamCard({ exam, onStart }: { exam: ExamOut; onStart: (exam: ExamOut) => void }) {
  return (
    <article className="flex flex-col gap-4 rounded-3xl bg-surface-container-lowest p-5 shadow-[0_12px_40px_rgba(25,28,30,0.05)]">
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-headline text-[17px] font-bold leading-snug text-on-surface">
          {exam.title}
        </h3>
        <div className="shrink-0">
          <ExamTypeBadge type={exam.exam_type} />
        </div>
      </div>

      {exam.description && (
        <p className="text-sm text-secondary leading-relaxed line-clamp-2">
          {exam.description}
        </p>
      )}

      <div className="flex flex-wrap gap-3 text-xs text-secondary">
        {exam.area_code && (
          <span className="flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px]">category</span>
            {exam.area_code}
          </span>
        )}
        <span className="flex items-center gap-1">
          <span className="material-symbols-outlined text-[14px]">quiz</span>
          {exam.total_questions} preguntas
        </span>
        <span className="flex items-center gap-1">
          <span className="material-symbols-outlined text-[14px]">schedule</span>
          {exam.time_limit_minutes ? `${exam.time_limit_minutes} min` : "Sin límite"}
        </span>
        {exam.is_adaptive && (
          <span className="flex items-center gap-1 text-violet-600">
            <span className="material-symbols-outlined text-[14px]">auto_awesome</span>
            Adaptativo
          </span>
        )}
      </div>

      <button
        type="button"
        onClick={() => onStart(exam)}
        className="mt-auto flex items-center justify-center gap-2 rounded-2xl bg-linear-to-br from-primary to-primary-container px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-primary/20 transition hover:opacity-90 active:scale-95"
      >
        <span className="material-symbols-outlined text-[18px]">play_arrow</span>
        Iniciar
      </button>
    </article>
  );
}

// ── Page ─────────────────────────────────────────────────────────────

export default function StudentExams() {
  const { authFetch } = useAuth();
  const navigate = useNavigate();

  const [exams, setExams] = useState<ExamOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listExams(authFetch, { status: "ACTIVE", page_size: 50 })
      .then((data) => {
        if (!cancelled) {
          // Exclude DIAGNOSTIC — that has its own dedicated flow
          setExams(data.items.filter((e) => e.exam_type !== "DIAGNOSTIC"));
        }
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Error al cargar exámenes");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [authFetch]);

  function handleStart(exam: ExamOut) {
    sessionStorage.setItem(
      `exam_meta_${exam.id}`,
      JSON.stringify({
        title: exam.title,
        exam_type: exam.exam_type,
        time_limit_minutes: exam.time_limit_minutes,
      }),
    );
    navigate(`/student/examenes/sesion/${exam.id}`);
  }

  const filtered =
    typeFilter === ""
      ? exams
      : exams.filter((e) => e.exam_type === typeFilter);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-headline text-4xl font-black tracking-tight text-on-surface">
          Simulacros y Práctica
        </h1>
        <p className="mt-2 text-sm text-secondary">
          Elige un examen para comenzar tu sesión de práctica.
        </p>
      </div>

      {/* Type filter pills */}
      <div className="flex flex-wrap gap-2">
        {TYPE_FILTER_OPTIONS.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            onClick={() => setTypeFilter(value)}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
              typeFilter === value
                ? "bg-primary text-white shadow-sm"
                : "bg-surface-container-high text-secondary hover:bg-surface-container-highest"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-2xl bg-error-container px-4 py-3 text-sm font-medium text-error">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <span className="material-symbols-outlined animate-spin text-[32px] text-secondary">
            progress_activity
          </span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <span
            className="material-symbols-outlined text-[48px] text-secondary/40"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            quiz
          </span>
          <p className="text-sm text-secondary">
            {typeFilter
              ? "No hay exámenes de este tipo disponibles."
              : "No hay exámenes disponibles en este momento."}
          </p>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((exam) => (
            <ExamCard key={exam.id} exam={exam} onStart={handleStart} />
          ))}
        </div>
      )}
    </div>
  );
}
