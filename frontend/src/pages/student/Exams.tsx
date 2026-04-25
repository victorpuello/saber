import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { listExams, type ExamOut } from "../../services/examSession";

type TypeFilter = "" | "FULL_SIMULATION" | "AREA_PRACTICE" | "CUSTOM";

const TYPE_FILTER_OPTIONS: { value: TypeFilter; label: string }[] = [
  { value: "",                label: "Todos" },
  { value: "FULL_SIMULATION", label: "Simulacro completo" },
  { value: "AREA_PRACTICE",   label: "Por área" },
  { value: "CUSTOM",          label: "Personalizado" },
];

// ── Exam type visual config ──────────────────────────────────────────

interface ExamVisualConfig {
  icon: string;
  typeLabel: string;
  iconBg: string;
  iconColor: string;
  btnFrom: string;
  btnTo: string;
}

const AREA_CONFIG: Record<string, Omit<ExamVisualConfig, "typeLabel">> = {
  MAT: { icon: "calculate",        iconBg: "#eff6ff", iconColor: "#1d4ed8", btnFrom: "#1d4ed8", btnTo: "#3b82f6" },
  LC:  { icon: "menu_book",        iconBg: "#f5f3ff", iconColor: "#6d28d9", btnFrom: "#6d28d9", btnTo: "#7c3aed" },
  SC:  { icon: "account_balance",  iconBg: "#fff1f2", iconColor: "#be123c", btnFrom: "#be123c", btnTo: "#e11d48" },
  CN:  { icon: "science",          iconBg: "#ecfdf5", iconColor: "#047857", btnFrom: "#047857", btnTo: "#059669" },
  ING: { icon: "language",         iconBg: "#fffbeb", iconColor: "#b45309", btnFrom: "#b45309", btnTo: "#d97706" },
};

function getExamConfig(exam: ExamOut): ExamVisualConfig {
  if (exam.exam_type === "FULL_SIMULATION") {
    return { icon: "fact_check", typeLabel: "Simulacro completo", iconBg: "#ecfdf5", iconColor: "#047857", btnFrom: "#004ac6", btnTo: "#2563eb" };
  }
  if (exam.exam_type === "AREA_PRACTICE" && exam.area_code && AREA_CONFIG[exam.area_code]) {
    const a = AREA_CONFIG[exam.area_code];
    return { ...a, typeLabel: "Práctica por área" };
  }
  if (exam.exam_type === "CUSTOM") {
    return { icon: "tune", typeLabel: "Personalizado", iconBg: "#f1f5f9", iconColor: "#505f76", btnFrom: "#64748b", btnTo: "#94a3b8" };
  }
  return { icon: "analytics", typeLabel: "Diagnóstico Adaptativo", iconBg: "rgba(0,74,198,0.08)", iconColor: "#004ac6", btnFrom: "#004ac6", btnTo: "#2563eb" };
}

function getDifficultyBadge(exam: ExamOut): { label: string; bg: string; color: string } {
  if (exam.exam_type === "FULL_SIMULATION") return { label: "Alta",        bg: "#fff1f2", color: "#be123c" };
  if (exam.exam_type === "CUSTOM")          return { label: "Personalizable", bg: "#f1f5f9", color: "#505f76" };
  if (exam.exam_type === "AREA_PRACTICE") {
    if (exam.area_code === "LC" || exam.area_code === "SC") return { label: "Alta",  bg: "#fff1f2", color: "#be123c" };
    if (exam.area_code === "ING") return { label: "Baja–Media", bg: "#ecfdf5", color: "#047857" };
    return { label: "Media", bg: "#fef3c7", color: "#b45309" };
  }
  return { label: "Media", bg: "#fef3c7", color: "#b45309" };
}

// ── Exam card ────────────────────────────────────────────────────────

function ExamCard({ exam, onStart }: { exam: ExamOut; onStart: (exam: ExamOut) => void }) {
  const cfg = getExamConfig(exam);
  const diff = getDifficultyBadge(exam);

  return (
    <article
      onClick={() => onStart(exam)}
      className="flex cursor-pointer flex-col overflow-hidden rounded-3xl border border-black/6 bg-white shadow-[0_12px_40px_rgba(25,28,30,0.05)] transition hover:-translate-y-0.5 hover:shadow-[0_20px_48px_rgba(0,74,198,0.12)]"
    >
      {/* Top */}
      <div className="flex flex-col gap-3.5 p-6">
        <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-secondary">
          <span
            className="material-symbols-outlined text-[16px]"
            style={{ fontVariationSettings: "'FILL' 1", color: cfg.iconColor }}
          >
            {cfg.icon}
          </span>
          {cfg.typeLabel}
        </div>
        <div
          className="flex h-11 w-11 items-center justify-center rounded-[14px]"
          style={{ background: cfg.iconBg }}
        >
          <span
            className="material-symbols-outlined text-[22px]"
            style={{ fontVariationSettings: "'FILL' 1", color: cfg.iconColor }}
          >
            {cfg.icon}
          </span>
        </div>
        <h3 className="text-[17px] font-extrabold leading-snug tracking-tight text-on-surface">
          {exam.title}
        </h3>
        {exam.description && (
          <p className="line-clamp-2 text-[13px] leading-relaxed text-on-surface-variant">
            {exam.description}
          </p>
        )}
      </div>

      {/* Meta strip */}
      <div className="flex items-center gap-4 border-t border-black/5 bg-surface-container-low px-6 py-3.5">
        <span className="flex items-center gap-1.5 text-[11px] font-semibold text-secondary">
          <span className="material-symbols-outlined text-[15px]">quiz</span>
          {exam.total_questions} preguntas
        </span>
        <span className="flex items-center gap-1.5 text-[11px] font-semibold text-secondary">
          <span className="material-symbols-outlined text-[15px]">timer</span>
          {exam.time_limit_minutes ? `${exam.time_limit_minutes} min` : "Sin límite"}
        </span>
        {exam.is_adaptive && (
          <span className="flex items-center gap-1.5 text-[11px] font-semibold text-secondary">
            <span className="material-symbols-outlined text-[15px]">bolt</span>
            Adaptativo
          </span>
        )}
      </div>

      {/* CTA row */}
      <div className="flex items-center justify-between px-6 py-4">
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onStart(exam); }}
          className="flex items-center gap-1.5 rounded-xl px-5 py-2.5 text-[13px] font-bold text-white shadow-md transition hover:opacity-90 active:scale-[0.98]"
          style={{ background: `linear-gradient(135deg, ${cfg.btnFrom}, ${cfg.btnTo})` }}
        >
          <span className="material-symbols-outlined text-[16px]">play_arrow</span>
          Iniciar
        </button>
        <span
          className="rounded-full px-3 py-1 text-[11px] font-bold"
          style={{ background: diff.bg, color: diff.color }}
        >
          {diff.label}
        </span>
      </div>
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

  const totalQuestions = exams.reduce((s, e) => s + e.total_questions, 0);

  return (
    <div>
      {/* ── Hero ─────────────────────────────────────────────────── */}
      <div className="relative -mx-6 -mt-9 mb-9 overflow-hidden bg-linear-to-br from-primary to-primary-container px-10 py-12 text-white md:-mx-9">
        <div className="pointer-events-none absolute -right-16 -top-20 h-75 w-75 rounded-full bg-white/4" />
        <div className="flex items-center gap-1.5 mb-3 text-[11px] font-bold uppercase tracking-[0.28em] opacity-75">
          <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>quiz</span>
          Simulacros y Práctica
        </div>
        <h1 className="text-[40px] font-black leading-[1.05] tracking-[-0.04em]">
          Practica.<br />Aprende. Supera.
        </h1>
        <p className="mt-2.5 max-w-130 text-base font-light leading-[1.65] opacity-80">
          Simulacros adaptativos y sesiones de práctica alineados con la estructura oficial del examen Saber 11.
        </p>
        <div className="mt-7 flex gap-8">
          <div>
            <div className="text-[28px] font-black tracking-[-0.03em]">
              {totalQuestions > 0 ? totalQuestions.toLocaleString("es-CO") : "—"}
            </div>
            <div className="mt-0.5 text-[11px] opacity-65">preguntas disponibles</div>
          </div>
          <div>
            <div className="text-[28px] font-black tracking-[-0.03em]">{exams.length}</div>
            <div className="mt-0.5 text-[11px] opacity-65">simulacros disponibles</div>
          </div>
        </div>
      </div>

      {/* ── Filter pills ─────────────────────────────────────────── */}
      <div className="mb-8 flex flex-wrap gap-2">
        {TYPE_FILTER_OPTIONS.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            onClick={() => setTypeFilter(value)}
            className={`rounded-full border-[1.5px] px-4.5 py-2 text-[13px] font-semibold transition ${
              typeFilter === value
                ? "border-primary bg-primary text-white"
                : "border-outline-variant/30 bg-white text-secondary hover:border-primary hover:text-primary"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Error ────────────────────────────────────────────────── */}
      {error && (
        <div className="mb-6 rounded-2xl bg-error-container px-4 py-3 text-sm font-medium text-error">
          {error}
        </div>
      )}

      {/* ── Grid ─────────────────────────────────────────────────── */}
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
