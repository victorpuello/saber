import React, { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  fetchActivePlan,
  fetchAllWeeks,
  fetchPlanProgress,
  fetchPlanWeek,
  fetchPracticeQuestion,
  fetchUnitDetail,
  generatePlan,
  readjustPlan,
  submitPracticeAnswer,
  type ActivePlan,
  type PlanProgress,
  type PlanUnit,
  type PlanWeek,
  type PracticeQuestion,
} from "../../services/plan";

// ── Area / Priority config ────────────────────────────────────────────────────

const AREA_CFG: Record<string, { color: string; bg: string; icon: string; label: string }> = {
  LC:  { color: "#6d28d9", bg: "#f5f3ff", icon: "menu_book",  label: "Lectura Crítica" },
  MAT: { color: "#1d4ed8", bg: "#eff6ff", icon: "calculate",  label: "Matemáticas" },
  SC:  { color: "#be123c", bg: "#fff1f2", icon: "public",     label: "Soc. y Ciudadanas" },
  CN:  { color: "#047857", bg: "#ecfdf5", icon: "science",    label: "C. Naturales" },
  ING: { color: "#b45309", bg: "#fffbeb", icon: "language",   label: "Inglés" },
};

function areaColor(code: string) { return AREA_CFG[code]?.color ?? "#505f76"; }
function areaBg(code: string)    { return AREA_CFG[code]?.bg    ?? "#f2f4f6"; }
function areaIcon(code: string)  { return AREA_CFG[code]?.icon  ?? "school";   }
function areaLabel(code: string) { return AREA_CFG[code]?.label ?? code;       }

const PRI_CFG: Record<string, { bg: string; text: string; label: string }> = {
  HIGH:   { bg: "#ffdad6", text: "#93000a", label: "Alta" },
  MEDIUM: { bg: "#fef3c7", text: "#b45309", label: "Media" },
  LOW:    { bg: "#d1fae5", text: "#047857", label: "Baja" },
};
function priStyle(p: string) { return PRI_CFG[p] ?? { bg: "#e6e8ea", text: "#434655", label: p }; }

// ── Helpers ───────────────────────────────────────────────────────────────────

function Icon({ name, fill = false, size = 20, className = "", style }: { name: string; fill?: boolean; size?: number; className?: string; style?: React.CSSProperties }) {
  return (
    <span
      className={`material-symbols-outlined select-none leading-none ${className}`}
      style={{
        fontSize: size,
        fontVariationSettings: fill ? `'FILL' 1,'wght' 420,'GRAD' 0,'opsz' 24` : `'FILL' 0,'wght' 420,'GRAD' 0,'opsz' 24`,
        ...style,
      }}
    >
      {name}
    </span>
  );
}

function CircularProgress({ pct, color }: { pct: number; color: string }) {
  const r = 26;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - Math.max(0, Math.min(100, pct)) / 100);
  return (
    <svg width="64" height="64" viewBox="0 0 64 64" style={{ transform: "rotate(-90deg)" }}>
      <circle cx="32" cy="32" r={r} fill="none" stroke="#e0e3e5" strokeWidth="5" />
      <circle cx="32" cy="32" r={r} fill="none" stroke={color} strokeWidth="5"
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" />
    </svg>
  );
}

function UnitRing({ pct, color }: { pct: number; color: string }) {
  const r = 18;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - Math.max(0, Math.min(100, pct)) / 100);
  return (
    <div className="relative h-[44px] w-[44px] shrink-0">
      <svg width="44" height="44" viewBox="0 0 44 44" style={{ transform: "rotate(-90deg)" }}>
        <circle cx="22" cy="22" r={r} fill="none" stroke="#e0e3e5" strokeWidth="4" />
        <circle cx="22" cy="22" r={r} fill="none" stroke={color} strokeWidth="4"
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-on-surface">
        {Math.round(pct)}%
      </div>
    </div>
  );
}

function unitAccuracy(unit: PlanUnit) {
  if (unit.questions_attempted === 0) return 0;
  return Math.round((unit.questions_correct / unit.questions_attempted) * 100);
}

function weekAccuracy(units: PlanUnit[]) {
  const total = units.reduce((s, u) => s + u.questions_attempted, 0);
  const correct = units.reduce((s, u) => s + u.questions_correct, 0);
  return total === 0 ? 0 : Math.round((correct / total) * 100);
}

function todayUnit(week: PlanWeek | null): PlanUnit | null {
  return week?.units.find((u) => !u.completed) ?? null;
}

function estimatedMinutes(q: number) {
  const lo = Math.round(q * 1.5);
  const hi = Math.round(q * 2.5);
  return `${lo}–${hi} min`;
}

// ── Views enum ────────────────────────────────────────────────────────────────

type PlanView = "hub" | "week" | "unit-detail" | "unit-session" | "unit-done" | "timeline";

// ── Session state reducer ─────────────────────────────────────────────────────

interface SessionState {
  unit: PlanUnit | null;
  questions: PracticeQuestion[];
  idx: number;
  selected: string | null;
  revealed: boolean;
  results: Array<{ questionId: string; answer: string; correct: boolean }>;
}

type SessionAction =
  | { type: "start"; unit: PlanUnit; questions: PracticeQuestion[] }
  | { type: "select"; answer: string }
  | { type: "reveal"; correct: boolean; questionId: string; answer: string }
  | { type: "next" }
  | { type: "reset" };

function sessionReducer(state: SessionState, action: SessionAction): SessionState {
  switch (action.type) {
    case "start":
      return { unit: action.unit, questions: action.questions, idx: 0, selected: null, revealed: false, results: [] };
    case "select":
      return { ...state, selected: action.answer };
    case "reveal":
      return {
        ...state,
        revealed: true,
        results: [...state.results, { questionId: action.questionId, answer: action.answer, correct: action.correct }],
      };
    case "next":
      return { ...state, idx: state.idx + 1, selected: null, revealed: false };
    case "reset":
      return { unit: null, questions: [], idx: 0, selected: null, revealed: false, results: [] };
    default:
      return state;
  }
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyPlan({ onGenerate, generating }: { onGenerate: () => void; generating: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-fixed">
        <Icon name="auto_stories" fill size={32} className="text-primary" />
      </div>
      <h2 className="text-2xl font-black tracking-tight text-on-surface">Sin plan activo</h2>
      <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-on-surface-variant">
        Todavía no tienes un plan de estudio. Asegúrate de haber completado el diagnóstico inicial para que el sistema genere tu ruta personalizada.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={onGenerate}
          disabled={generating}
          className="flex items-center gap-2 rounded-2xl bg-primary px-6 py-3 text-sm font-bold text-white shadow-[0_24px_55px_-30px_rgb(0_74_198/35%)] transition-opacity disabled:opacity-50 hover:opacity-90"
        >
          {generating
            ? <Icon name="progress_activity" size={18} className="animate-spin" />
            : <Icon name="auto_fix_high" fill size={18} />}
          {generating ? "Generando…" : "Generar plan"}
        </button>
        <Link
          to="/student/diagnostico"
          className="flex items-center gap-2 rounded-2xl border border-outline-variant bg-surface-container-lowest px-5 py-3 text-sm font-semibold text-on-surface-variant transition-colors hover:bg-surface-container-low"
        >
          <Icon name="analytics" size={18} />
          Ir al diagnóstico
        </Link>
      </div>
    </div>
  );
}

// ── Unit card (compact, for hub view) ────────────────────────────────────────

function UnitCardCompact({ unit, today, onClick }: { unit: PlanUnit; today: boolean; onClick: () => void }) {
  const pri = priStyle(unit.priority);
  const color = areaColor(unit.area_code);
  const bg = areaBg(unit.area_code);
  const icon = areaIcon(unit.area_code);
  const acc = unitAccuracy(unit);

  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full items-center gap-4 rounded-[20px] border-[1.5px] bg-white p-4 text-left shadow-[0_12px_40px_rgba(25,28,30,0.04)] transition-all hover:-translate-y-px hover:border-blue-200 hover:shadow-[0_16px_40px_rgba(0,74,198,0.08)]"
      style={{
        borderColor: today ? "rgba(0,74,198,0.2)" : "transparent",
        background: today ? "rgba(219,225,255,0.1)" : "white",
      }}
    >
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px]" style={{ background: bg }}>
        <Icon name={icon} fill size={22} style={{ color }} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[15px] font-bold text-on-surface">{unit.title}</span>
          {today && (
            <span className="rounded-full bg-primary-fixed px-2.5 py-0.5 text-[9px] font-black uppercase tracking-[0.18em] text-on-primary-fixed">
              HOY
            </span>
          )}
        </div>
        {unit.description && (
          <p className="mt-0.5 line-clamp-1 text-xs text-secondary">{unit.description}</p>
        )}
        <div className="mt-1.5 flex flex-wrap gap-3">
          <span className="flex items-center gap-1 text-[11px] font-semibold text-secondary">
            <Icon name="quiz" size={15} />
            {unit.recommended_questions} preguntas
          </span>
          <span className="flex items-center gap-1 text-[11px] font-semibold text-secondary">
            <Icon name="timer" size={15} />
            {estimatedMinutes(unit.recommended_questions)}
          </span>
          {unit.completed && (
            <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
              <Icon name="check_circle" fill size={15} className="text-emerald-700" />
              Completada · {acc}%
            </span>
          )}
        </div>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-2">
        <span
          className="rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.14em]"
          style={{ background: pri.bg, color: pri.text }}
        >
          {pri.label}
        </span>
        {unit.completed ? (
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-100">
            <Icon name="check_circle" fill size={22} className="text-emerald-700" />
          </div>
        ) : (
          <UnitRing pct={acc} color={color} />
        )}
      </div>
    </button>
  );
}

// ── Unit card (detailed, for week view) ──────────────────────────────────────

function UnitCardDetailed({ unit, today, onStart }: { unit: PlanUnit; today: boolean; onStart: () => void }) {
  const pri = priStyle(unit.priority);
  const color = areaColor(unit.area_code);
  const bg = areaBg(unit.area_code);
  const icon = areaIcon(unit.area_code);
  const acc = unitAccuracy(unit);
  const statusLabel = unit.completed ? "Completada" : today ? "En progreso" : "Pendiente";
  const statusStyle = unit.completed
    ? { bg: "#d1fae5", text: "#047857" }
    : today
    ? { bg: "#fef3c7", text: "#b45309" }
    : { bg: "#e6e8ea", text: "#434655" };

  return (
    <div
      className="overflow-hidden rounded-[22px] bg-white shadow-[0_12px_40px_rgba(25,28,30,0.05)] transition-all hover:-translate-y-0.5 hover:shadow-[0_20px_48px_rgba(0,74,198,0.1)]"
      style={{ border: today ? "1.5px solid rgba(0,74,198,0.2)" : "1.5px solid transparent" }}
    >
      <div className="flex items-start gap-3.5 p-5">
        <div className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-[16px]" style={{ background: bg }}>
          <Icon name={icon} fill size={24} style={{ color }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[16px] font-bold text-on-surface">{unit.title}</span>
            {today && (
              <span className="rounded-full bg-primary-fixed px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.18em] text-on-primary-fixed">
                HOY
              </span>
            )}
          </div>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            <span className="rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em]"
              style={{ background: statusStyle.bg, color: statusStyle.text }}>{statusLabel}</span>
            <span className="rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em]"
              style={{ background: bg, color }}>{unit.area_code}</span>
            <span className="rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em]"
              style={{ background: pri.bg, color: pri.text }}>{pri.label} prioridad</span>
          </div>
          {unit.description && (
            <p className="mt-1.5 text-[13px] leading-relaxed text-secondary">{unit.description}</p>
          )}
          <div className="mt-2.5 flex flex-wrap gap-3.5">
            <span className="flex items-center gap-1 text-xs font-semibold text-secondary">
              <Icon name="quiz" size={14} />{unit.recommended_questions} preguntas
            </span>
            <span className="flex items-center gap-1 text-xs font-semibold text-secondary">
              <Icon name="timer" size={14} />{estimatedMinutes(unit.recommended_questions)}
            </span>
            {unit.completed && (
              <span className="flex items-center gap-1 text-xs font-semibold text-emerald-700">
                <Icon name="emoji_events" fill size={14} className="text-emerald-700" />{acc}% precisión
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between border-t border-surface-container-low bg-surface-container-low px-5 py-3">
        <div className="mr-4 flex-1">
          <div className="mb-1 flex justify-between text-[10px] font-bold uppercase tracking-[0.1em] text-secondary">
            <span>{unit.completed ? `Completada${unit.completed_at ? ` el ${new Date(unit.completed_at).toLocaleDateString("es-CO", { day: "numeric", month: "short" })}` : ""}` : "Progreso"}</span>
            <span style={{ color: unit.completed ? "#047857" : color }}>{unit.completed ? "100%" : `${acc}%`}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-surface-container-highest">
            <div className="h-full rounded-full transition-all" style={{ width: `${unit.completed ? 100 : acc}%`, background: unit.completed ? "#047857" : color }} />
          </div>
        </div>
        <button
          type="button"
          onClick={onStart}
          className={`flex shrink-0 items-center gap-1.5 rounded-[12px] px-5 py-2.5 text-[13px] font-bold transition-opacity ${
            unit.completed
              ? "bg-surface-container-highest text-on-surface hover:opacity-80"
              : "text-white shadow-[0_4px_12px_rgba(0,74,198,0.22)] hover:opacity-90"
          }`}
          style={unit.completed ? {} : { background: "linear-gradient(135deg,#004ac6,#2563eb)" }}
        >
          <Icon name={unit.completed ? "replay" : "play_arrow"} size={16} />
          {unit.completed ? "Repetir" : "Comenzar"}
        </button>
      </div>
    </div>
  );
}

// ── Progress stat card ────────────────────────────────────────────────────────

function ProgCard({ label, value, helper, color, percent }: { label: string; value: string; helper: string; color?: string; percent?: number }) {
  return (
    <div className="rounded-[22px] bg-white p-4 shadow-[0_12px_40px_rgba(25,28,30,0.05)]">
      <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-secondary">{label}</div>
      <div className="mt-2 text-[28px] font-black leading-tight tracking-tight" style={{ color: color ?? "#191c1e" }}>{value}</div>
      <div className="mt-1 text-[11px] text-on-surface-variant">{helper}</div>
      {percent !== undefined && (
        <div className="mt-2.5 h-[5px] overflow-hidden rounded-full bg-surface-container-high">
          <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, percent)}%`, background: color ?? "#004ac6" }} />
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════════════════

export default function StudentPlanPage() {
  const { authFetch } = useAuth();

  // ── View state ──────────────────────────────────────────────────────────────
  const [view, setView] = useState<PlanView>("hub");
  const [prevView, setPrevView] = useState<PlanView>("hub");

  function goTo(v: PlanView) {
    setPrevView(view);
    setView(v);
  }

  // ── Data state ──────────────────────────────────────────────────────────────
  const [plan, setPlan]         = useState<ActivePlan | null>(null);
  const [progress, setProgress] = useState<PlanProgress | null>(null);
  const [currentWeek, setCurrentWeek] = useState<PlanWeek | null>(null);
  const [allWeeks, setAllWeeks] = useState<PlanWeek[]>([]);
  const [selectedUnit, setSelectedUnit] = useState<PlanUnit | null>(null);
  const [loading, setLoading]   = useState(true);
  const [generating, setGenerating] = useState(false);
  const [readjusting, setReadjusting] = useState(false);
  const [loadingSession, setLoadingSession] = useState(false);
  const [expandedWeeks, setExpandedWeeks] = useState<Set<number>>(new Set());

  // ── Session reducer ─────────────────────────────────────────────────────────
  const [session, dispatchSession] = useReducer(sessionReducer, {
    unit: null, questions: [], idx: 0, selected: null, revealed: false, results: [],
  });
  const submittingRef = useRef(false);

  // ── Load plan data ──────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    setLoading(true);
    const [activePlan, planProgress] = await Promise.all([
      fetchActivePlan(authFetch),
      fetchPlanProgress(authFetch),
    ]);
    setPlan(activePlan);
    setProgress(planProgress);

    if (activePlan && planProgress) {
      const week = await fetchPlanWeek(authFetch, planProgress.current_week);
      setCurrentWeek(week);
    }
    setLoading(false);
  }, [authFetch]);

  useEffect(() => { void loadData(); }, [loadData]);

  // ── Generate plan ───────────────────────────────────────────────────────────
  async function handleGenerate() {
    setGenerating(true);
    const newPlan = await generatePlan(authFetch);
    setGenerating(false);
    if (newPlan) { await loadData(); }
  }

  // ── Readjust plan ───────────────────────────────────────────────────────────
  async function handleReadjust() {
    setReadjusting(true);
    await readjustPlan(authFetch);
    setReadjusting(false);
    await loadData();
  }

  // ── Open week detail ────────────────────────────────────────────────────────
  async function openWeekDetail() {
    goTo("week");
  }

  // ── Open timeline ───────────────────────────────────────────────────────────
  async function openTimeline() {
    if (plan && progress) {
      const weeks = await fetchAllWeeks(authFetch, plan.total_weeks);
      setAllWeeks(weeks);
      setExpandedWeeks(new Set([progress.current_week]));
    }
    goTo("timeline");
  }

  // ── Select unit → unit-detail ───────────────────────────────────────────────
  async function openUnitDetail(unit: PlanUnit) {
    const fresh = await fetchUnitDetail(authFetch, unit.id);
    setSelectedUnit(fresh ?? unit);
    goTo("unit-detail");
  }

  // ── Start unit session ──────────────────────────────────────────────────────
  async function startSession(unit: PlanUnit) {
    setLoadingSession(true);
    const fresh = await fetchUnitDetail(authFetch, unit.id);
    const u = fresh ?? unit;
    const unanswered = u.practice_items.filter((p) => !p.completed);
    const targets = unanswered.length > 0 ? unanswered : u.practice_items;
    const questions = await Promise.all(targets.map((p) => fetchPracticeQuestion(authFetch, p.question_id)));
    const validQuestions = questions.filter((q): q is PracticeQuestion => q !== null);
    setLoadingSession(false);
    if (validQuestions.length === 0) return;
    dispatchSession({ type: "start", unit: u, questions: validQuestions });
    goTo("unit-session");
  }

  // ── Submit answer ───────────────────────────────────────────────────────────
  async function handleAnswer(answer: string) {
    if (session.revealed || submittingRef.current || !session.unit) return;
    dispatchSession({ type: "select", answer });
    submittingRef.current = true;
    const q = session.questions[session.idx];
    const result = await submitPracticeAnswer(authFetch, session.unit.id, q.id, answer);
    submittingRef.current = false;
    dispatchSession({
      type: "reveal",
      correct: result?.is_correct ?? answer === q.correct_answer,
      questionId: q.id,
      answer,
    });
  }

  // ── Next question or finish ─────────────────────────────────────────────────
  function handleNext() {
    if (session.idx + 1 >= session.questions.length) {
      goTo("unit-done");
      void loadData();
    } else {
      dispatchSession({ type: "next" });
    }
  }

  // ── Skeleton loader ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-5">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded-3xl bg-surface-container-low" />
        ))}
      </div>
    );
  }

  // ── No plan ─────────────────────────────────────────────────────────────────
  if (!plan || !progress) {
    return <EmptyPlan onGenerate={() => void handleGenerate()} generating={generating} />;
  }

  const today = todayUnit(currentWeek);
  const weekCompleted = currentWeek ? currentWeek.units.every((u) => u.completed) : false;
  const weekDone = currentWeek ? currentWeek.units.filter((u) => u.completed).length : 0;
  const weekTotal = currentWeek?.units.length ?? 0;

  // ════════════════════════════════════════════════════════════════════════════
  // VIEW: UNIT SESSION
  // ════════════════════════════════════════════════════════════════════════════
  if (view === "unit-session" && session.unit && session.questions.length > 0) {
    const q = session.questions[session.idx];
    const totalQ = session.questions.length;
    const isLast = session.idx + 1 >= totalQ;
    const opts = [
      { key: "A", text: q.option_a },
      { key: "B", text: q.option_b },
      { key: "C", text: q.option_c },
      ...(q.option_d ? [{ key: "D", text: q.option_d }] : []),
    ];

    return (
      <div className="-m-8 flex h-screen flex-col overflow-hidden bg-surface" style={{ margin: "-2rem" }}>
        {/* Session header */}
        <div className="z-20 flex h-16 shrink-0 items-center justify-between px-7 shadow-[0_4px_16px_rgba(25,28,30,0.05)]" style={{ background: "rgba(247,249,251,0.9)", backdropFilter: "blur(20px)" }}>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-[10px]" style={{ background: areaColor(session.unit.area_code) }}>
                <Icon name={areaIcon(session.unit.area_code)} fill size={16} className="text-white" />
              </div>
              <div>
                <div className="text-[13px] font-bold text-on-surface">{session.unit.title}</div>
                <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-secondary">{areaLabel(session.unit.area_code)}</div>
              </div>
            </div>
            <div className="h-6 w-px bg-outline-variant/30" />
            <div className="flex items-center gap-1.5">
              {session.questions.map((_, i) => {
                const res = session.results[i];
                const isCurrent = i === session.idx;
                const isAnswered = res !== undefined;
                return (
                  <div
                    key={i}
                    className="h-2 rounded-full transition-all"
                    style={{
                      width: isCurrent ? 20 : 8,
                      background: isAnswered
                        ? res.correct ? "#047857" : "#ba1a1a"
                        : isCurrent
                        ? "#004ac6"
                        : "#e0e3e5",
                    }}
                  />
                );
              })}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-bold text-emerald-700">
              <Icon name="school" fill size={14} className="text-emerald-700" />
              Modo estudio
            </span>
            <button
              type="button"
              onClick={() => { goTo(prevView); dispatchSession({ type: "reset" }); }}
              className="rounded-[10px] bg-surface-container-highest px-3 py-1.5 text-[13px] font-semibold text-on-surface hover:opacity-80"
            >
              Salir
            </button>
          </div>
        </div>

        {/* Session body */}
        <div className="flex min-h-0 flex-1 gap-4 p-4">
          {/* Context pane */}
          <div className="flex flex-1 flex-col overflow-hidden rounded-3xl bg-surface-container-low">
            <div className="flex shrink-0 items-end justify-between px-6 pb-3 pt-5">
              <div>
                <span className="rounded-full bg-primary-fixed px-3 py-0.5 text-[9px] font-black uppercase tracking-[0.3em] text-on-primary-fixed">
                  Texto de apoyo
                </span>
                <div className="mt-1 text-[15px] font-bold text-on-surface">Contexto</div>
              </div>
              <span className="rounded-[9px] bg-white px-2 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-secondary">
                {q.context_type.replace("_", " ")}
              </span>
            </div>
            <div className="flex-1 overflow-y-auto px-6 pb-6" style={{ scrollbarWidth: "thin" }}>
              <p className="text-[15px] leading-[1.85] text-on-surface-variant">{q.context}</p>
            </div>
          </div>

          {/* Question pane */}
          <div className="flex w-[400px] shrink-0 flex-col gap-3">
            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto rounded-3xl bg-white p-5 shadow-[0_8px_28px_rgba(25,28,30,0.04)]" style={{ scrollbarWidth: "thin" }}>
              <div className="mb-4 flex items-center gap-2.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#d0e1fb] text-xs font-black text-[#54647a]">
                  {session.idx + 1}
                </div>
                <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-secondary">
                  {areaLabel(session.unit.area_code)}
                </span>
              </div>
              <p className="mb-4 text-[15px] font-medium leading-[1.65] text-on-surface">{q.stem}</p>
              <div className="flex flex-col gap-2">
                {opts.map(({ key, text }) => {
                  const isSelected = session.selected === key;
                  const isCorrect = session.revealed && key === q.correct_answer;
                  const isWrong = session.revealed && isSelected && key !== q.correct_answer;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => !session.revealed && void handleAnswer(key)}
                      disabled={session.revealed}
                      className="flex items-start gap-2.5 rounded-[13px] border-[1.5px] p-3 text-left transition-all"
                      style={{
                        background: isCorrect ? "#d1fae5" : isWrong ? "#ffdad6" : isSelected ? "#d0e1fb" : "#f2f4f6",
                        borderColor: isCorrect ? "rgba(4,120,87,0.3)" : isWrong ? "rgba(186,26,26,0.2)" : isSelected ? "rgba(0,74,198,0.2)" : "transparent",
                        cursor: session.revealed ? "default" : "pointer",
                      }}
                    >
                      <div
                        className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-[8px] border-[1.5px] text-[11px] font-bold"
                        style={{
                          background: isCorrect ? "#047857" : isWrong ? "#ba1a1a" : isSelected ? "#004ac6" : "white",
                          borderColor: isCorrect ? "#047857" : isWrong ? "#ba1a1a" : isSelected ? "#004ac6" : "rgba(195,198,215,0.4)",
                          color: isCorrect || isWrong || isSelected ? "white" : "#505f76",
                        }}
                      >
                        {key}
                      </div>
                      <span className="text-[13px] leading-relaxed text-on-surface-variant">{text}</span>
                    </button>
                  );
                })}
              </div>

              {/* Feedback */}
              {session.revealed && (
                <div
                  className="mt-3 rounded-[14px] p-3.5"
                  style={{
                    background: session.selected === q.correct_answer ? "#ecfdf5" : "#fff1f2",
                    borderLeft: `3px solid ${session.selected === q.correct_answer ? "#047857" : "#ba1a1a"}`,
                  }}
                >
                  <div
                    className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.14em]"
                    style={{ color: session.selected === q.correct_answer ? "#047857" : "#ba1a1a" }}
                  >
                    {session.selected === q.correct_answer ? "¡Correcto!" : "Incorrecto"}
                  </div>
                  <p className="text-[13px] leading-relaxed text-on-surface-variant">{q.explanation_correct}</p>
                  {session.selected !== q.correct_answer && (
                    <p className="mt-2 text-[13px] font-semibold text-emerald-700">
                      Respuesta correcta: {q.correct_answer}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Nav buttons */}
            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={() => dispatchSession({ type: "next" })}
                disabled={!session.revealed}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-[13px] bg-surface-container-high py-3 text-[13px] font-bold text-on-surface disabled:opacity-40"
              >
                <Icon name="arrow_back" size={16} />
                Anterior
              </button>
              <button
                type="button"
                onClick={session.revealed ? handleNext : () => session.selected && void handleAnswer(session.selected)}
                disabled={!session.selected && !session.revealed}
                className="flex flex-[1.4] items-center justify-center gap-1.5 rounded-[13px] py-3 text-[13px] font-bold text-white shadow-[0_5px_18px_rgba(0,74,198,0.22)] disabled:opacity-40"
                style={{ background: isLast && session.revealed ? "linear-gradient(135deg,#047857,#059669)" : "linear-gradient(to bottom right,#004ac6,#2563eb)" }}
              >
                {session.revealed ? (isLast ? "Ver resultados" : "Siguiente") : "Confirmar"}
                <Icon name={session.revealed ? (isLast ? "check" : "arrow_forward") : "check"} size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  // VIEW: UNIT DONE
  // ════════════════════════════════════════════════════════════════════════════
  if (view === "unit-done" && session.unit) {
    const correct = session.results.filter((r) => r.correct).length;
    const total = session.results.length;
    const acc = total > 0 ? Math.round((correct / total) * 100) : 0;
    const color = areaColor(session.unit.area_code);

    return (
      <div className="flex min-h-screen items-center justify-center py-10">
        <div className="w-full max-w-[520px] overflow-hidden rounded-[32px] bg-white shadow-[0_12px_40px_rgba(25,28,30,0.05)]">
          <div className="relative overflow-hidden px-8 py-8 text-center text-white" style={{ background: "linear-gradient(to bottom right,#004ac6,#2563eb)" }}>
            <div className="absolute -left-12 -top-12 h-40 w-40 rounded-full bg-white/5" />
            <div className="absolute -bottom-8 -right-5 h-24 w-24 rounded-full bg-white/5" />
            <div className="relative z-10 mx-auto mb-3.5 flex h-[72px] w-[72px] items-center justify-center rounded-full bg-white/20">
              <Icon name="emoji_events" fill size={36} className="text-white" />
            </div>
            <div className="relative z-10 text-2xl font-black tracking-tight">¡Unidad completada!</div>
            <div className="relative z-10 mt-1.5 text-sm opacity-80">{session.unit.title}</div>
          </div>

          <div className="flex flex-col gap-4 p-7">
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-[16px] bg-surface-container-low p-3.5 text-center">
                <div className="text-[26px] font-black tracking-tight" style={{ color }}>{acc}%</div>
                <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-secondary">Precisión</div>
              </div>
              <div className="rounded-[16px] bg-surface-container-low p-3.5 text-center">
                <div className="text-[26px] font-black tracking-tight text-emerald-700">{correct}</div>
                <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-secondary">Correctas</div>
              </div>
              <div className="rounded-[16px] bg-surface-container-low p-3.5 text-center">
                <div className="text-[26px] font-black tracking-tight text-on-surface">{total}</div>
                <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-secondary">Respondidas</div>
              </div>
            </div>

            {acc >= 60 ? (
              <div className="flex items-start gap-2.5 rounded-[14px] bg-emerald-50 p-3.5">
                <Icon name="auto_fix_high" fill size={22} className="mt-0.5 shrink-0 text-emerald-700" />
                <div>
                  <div className="text-[13px] font-bold text-emerald-700">Plan adaptado</div>
                  <div className="mt-0.5 text-[12px] leading-relaxed text-emerald-900/70">
                    Tu progreso en {areaLabel(session.unit.area_code)} ha mejorado. El sistema ajustará las prioridades de las próximas unidades.
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-2.5 rounded-[14px] bg-amber-50 p-3.5">
                <Icon name="school" fill size={22} className="mt-0.5 shrink-0 text-amber-700" />
                <div>
                  <div className="text-[13px] font-bold text-amber-700">Sigue practicando</div>
                  <div className="mt-0.5 text-[12px] leading-relaxed text-amber-900/70">
                    Se recomienda reforzar {areaLabel(session.unit.area_code)}. Repite esta unidad para afianzar los conceptos.
                  </div>
                </div>
              </div>
            )}

            {today && today.id !== session.unit.id && (
              <button
                type="button"
                onClick={() => { dispatchSession({ type: "reset" }); void openUnitDetail(today); }}
                className="flex items-center gap-3 rounded-[16px] bg-surface-container-low p-3.5 text-left transition-colors hover:bg-surface-container"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] bg-primary">
                  <Icon name={areaIcon(today.area_code)} fill size={20} className="text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-secondary">Siguiente unidad</div>
                  <div className="text-[14px] font-bold text-on-surface">{today.title}</div>
                </div>
                <Icon name="chevron_right" size={20} className="text-secondary" />
              </button>
            )}
          </div>

          <div className="flex gap-2.5 px-7 pb-6">
            <button
              type="button"
              onClick={() => void startSession(session.unit!)}
              className="flex flex-[0.6] items-center justify-center gap-1.5 rounded-[14px] bg-surface-container-high py-3.5 text-[14px] font-semibold text-on-surface hover:opacity-80"
            >
              <Icon name="replay" size={16} />
              Repetir
            </button>
            <button
              type="button"
              onClick={() => { dispatchSession({ type: "reset" }); goTo("hub"); }}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-[14px] py-3.5 text-[14px] font-bold text-white shadow-[0_24px_55px_-30px_rgb(0_74_198/35%)] hover:opacity-90"
              style={{ background: "linear-gradient(135deg,#004ac6,#2563eb)" }}
            >
              Continuar plan
              <Icon name="arrow_forward" size={16} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  // VIEW: UNIT DETAIL
  // ════════════════════════════════════════════════════════════════════════════
  if (view === "unit-detail" && selectedUnit) {
    const u = selectedUnit;
    const pri = priStyle(u.priority);
    const color = areaColor(u.area_code);
    const bg = areaBg(u.area_code);
    const icon = areaIcon(u.area_code);

    return (
      <div className="flex min-h-screen items-center justify-center py-10">
        <div className="w-full max-w-[580px] overflow-hidden rounded-[32px] bg-white shadow-[0_12px_40px_rgba(25,28,30,0.05)]">
          <div className="border-b border-surface-container-low px-8 py-7">
            <div className="mb-2.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.24em] text-secondary">
              <Icon name={icon} fill size={13} style={{ color }} />
              {areaLabel(u.area_code)} · Semana {u.week_number} del plan
            </div>
            <h2 className="text-2xl font-black leading-tight tracking-tight text-on-surface">{u.title}</h2>
            {u.description && <p className="mt-2 text-[14px] leading-relaxed text-on-surface-variant">{u.description}</p>}
            <div className="mt-3.5 flex flex-wrap gap-2">
              <span className="rounded-full px-3 py-1 text-[11px] font-bold" style={{ background: pri.bg, color: pri.text }}>{pri.label} prioridad</span>
              <span className="rounded-full px-3 py-1 text-[11px] font-bold" style={{ background: bg, color }}>{u.area_code}</span>
              <span className="rounded-full bg-surface-container-high px-3 py-1 text-[11px] font-bold text-secondary">
                {u.recommended_questions} preguntas
              </span>
              <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-bold text-emerald-700">
                <Icon name="school" fill size={13} className="text-emerald-700" />
                Modo estudio con feedback
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-4 px-8 py-6">
            <div>
              <div className="mb-2.5 text-[10px] font-bold uppercase tracking-[0.2em] text-secondary">Qué practicarás</div>
              <div className="flex flex-col gap-2">
                {[
                  `Preguntas de ${areaLabel(u.area_code)} alineadas al Saber 11`,
                  "Feedback inmediato con explicación en cada respuesta",
                  "Tu progreso queda guardado automáticamente",
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-2.5 text-[14px] font-medium text-on-surface">
                    <Icon name="check_circle" fill size={18} className="shrink-0 text-primary" />
                    {item}
                  </div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2.5">
              <div className="rounded-[14px] bg-surface-container-low p-3">
                <div className="text-[18px] font-black tracking-tight text-on-surface">{u.recommended_questions}</div>
                <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-secondary">Preguntas</div>
              </div>
              <div className="rounded-[14px] bg-surface-container-low p-3">
                <div className="text-[18px] font-black tracking-tight text-on-surface">{estimatedMinutes(u.recommended_questions)}</div>
                <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-secondary">Duración</div>
              </div>
              <div className="rounded-[14px] bg-surface-container-low p-3">
                <div className="text-[18px] font-black tracking-tight" style={{ color: pri.text }}>{pri.label}</div>
                <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-secondary">Prioridad</div>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-[14px] bg-primary-fixed/40 p-3.5">
              <Icon name="trending_up" size={22} className="shrink-0 text-primary" />
              <p className="text-[13px] font-medium leading-relaxed text-on-surface-variant">
                Completar esta unidad fortalecerá tu nivel en {areaLabel(u.area_code)} y ajustará tu plan de las próximas semanas.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2.5 px-8 pb-7">
            <button
              type="button"
              onClick={() => void startSession(u)}
              disabled={loadingSession}
              className="flex w-full items-center justify-center gap-2 rounded-[14px] py-4 text-[15px] font-bold text-white shadow-[0_24px_55px_-30px_rgb(0_74_198/35%)] disabled:opacity-50 hover:opacity-90"
              style={{ background: "linear-gradient(135deg,#004ac6,#2563eb)" }}
            >
              {loadingSession
                ? <Icon name="progress_activity" size={20} className="animate-spin" />
                : <Icon name="play_arrow" size={20} />}
              {loadingSession ? "Cargando preguntas…" : "Comenzar práctica"}
            </button>
            <button
              type="button"
              onClick={() => goTo(prevView)}
              className="w-full rounded-[14px] bg-surface-container-low py-3 text-[13px] font-semibold text-secondary hover:bg-surface-container"
            >
              Volver
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  // VIEW: TIMELINE
  // ════════════════════════════════════════════════════════════════════════════
  if (view === "timeline") {
    const groupedWeeks: PlanWeek[] = allWeeks.length > 0
      ? allWeeks
      : Array.from({ length: plan.total_weeks }, (_, i) => ({ week_number: i + 1, units: plan.units.filter((u) => u.week_number === i + 1) }));

    return (
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => goTo("hub")}
            className="flex items-center gap-1.5 rounded-[10px] bg-surface-container-high px-3.5 py-2 text-[13px] font-semibold text-on-surface hover:bg-surface-container-highest"
          >
            <Icon name="arrow_back" size={16} />
            Plan
          </button>
          <h2 className="text-[17px] font-bold tracking-tight text-on-surface">Timeline completo</h2>
        </div>

        <div className="flex flex-col gap-4">
          {groupedWeeks.map((week) => {
            const isOpen = expandedWeeks.has(week.week_number);
            const isCurrent = week.week_number === progress.current_week;
            const isDone = week.week_number < progress.current_week || week.units.every((u) => u.completed);
            const completedInWeek = week.units.filter((u) => u.completed).length;
            const statusLabel = isDone && completedInWeek === week.units.length ? "Completada" : isCurrent ? "En curso" : "Próxima";
            const statusStyle = isDone && completedInWeek === week.units.length
              ? { bg: "#d1fae5", text: "#047857" }
              : isCurrent
              ? { bg: "#dbe1ff", text: "#00174b" }
              : { bg: "#e6e8ea", text: "#434655" };

            return (
              <div key={week.week_number} className="overflow-hidden rounded-[22px] bg-white shadow-[0_12px_40px_rgba(25,28,30,0.05)]">
                <button
                  type="button"
                  onClick={() => setExpandedWeeks((prev) => {
                    const next = new Set(prev);
                    isOpen ? next.delete(week.week_number) : next.add(week.week_number);
                    return next;
                  })}
                  className="flex w-full items-center gap-3.5 px-5 py-4 text-left hover:bg-surface-container-low"
                >
                  <div
                    className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-[14px]"
                    style={{ background: isCurrent ? "#004ac6" : "#f2f4f6", color: isCurrent ? "white" : "#191c1e" }}
                  >
                    <div className="text-[18px] font-black leading-none tracking-tight">{week.week_number}</div>
                    <div className="text-[8px] font-bold uppercase tracking-[0.2em] opacity-70">sem</div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[14px] font-bold text-on-surface">
                      Semana {week.week_number} de {plan.total_weeks}
                    </div>
                    <div className="mt-0.5 text-[12px] text-secondary">{week.units.length} unidades · {completedInWeek}/{week.units.length} completadas</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full px-2.5 py-0.5 text-[10px] font-bold" style={{ background: statusStyle.bg, color: statusStyle.text }}>
                      {statusLabel}
                    </span>
                    <span
                      className="material-symbols-outlined select-none leading-none text-secondary transition-transform"
                      style={{ fontSize: 20, transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }}
                    >expand_more</span>
                  </div>
                </button>
                {isOpen && (
                  <div className="border-t border-surface-container-low px-5 pb-4">
                    {week.units.map((u, i) => (
                      <div
                        key={u.id}
                        className={`flex items-center gap-2.5 py-2.5 ${i < week.units.length - 1 ? "border-b border-surface-container-low" : ""}`}
                      >
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px]" style={{ background: areaBg(u.area_code) }}>
                          <Icon name={areaIcon(u.area_code)} fill size={16} style={{ color: areaColor(u.area_code) }} />
                        </div>
                        <div className="min-w-0 flex-1 text-[13px] font-semibold text-on-surface">{u.title}</div>
                        <div className="text-[11px] text-secondary">{u.recommended_questions} preg.</div>
                        <div
                          className="h-2 w-2 rounded-full"
                          style={{ background: u.completed ? "#047857" : u.week_number === progress.current_week ? "#004ac6" : "#e0e3e5" }}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  // VIEW: WEEK DETAIL
  // ════════════════════════════════════════════════════════════════════════════
  if (view === "week") {
    const weekUnits = currentWeek?.units ?? [];
    const completedCount = weekUnits.filter((u) => u.completed).length;
    const weekPct = weekUnits.length > 0 ? Math.round((completedCount / weekUnits.length) * 100) : 0;
    const acc = weekAccuracy(weekUnits);

    return (
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => goTo("hub")}
            className="flex items-center gap-1.5 rounded-[10px] bg-surface-container-high px-3.5 py-2 text-[13px] font-semibold text-on-surface hover:bg-surface-container-highest"
          >
            <Icon name="arrow_back" size={16} />
            Plan
          </button>
          <span className="text-[15px] font-bold text-on-surface">
            Semana {progress.current_week} de {progress.total_weeks}
          </span>
        </div>

        {/* Week header card */}
        <div className="relative overflow-hidden rounded-[28px] px-8 py-7 text-white" style={{ background: "linear-gradient(to bottom right,#004ac6,#2563eb)" }}>
          <div className="absolute -right-8 -top-12 h-44 w-44 rounded-full bg-white/4" />
          <div className="relative z-10">
            <div className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.28em] opacity-70">
              Semana {progress.current_week} de {progress.total_weeks}
            </div>
            <h2 className="text-[28px] font-black tracking-tight leading-tight">
              {weekUnits.length > 0
                ? [...new Set(weekUnits.map((u) => areaLabel(u.area_code)))].slice(0, 2).join(" + ")
                : "Sin unidades"}
            </h2>
            <p className="mt-1.5 text-sm opacity-80">Áreas según tu perfil TRI. Cada unidad fortalece las competencias con menor habilidad estimada.</p>
            <div className="mt-4 flex gap-6">
              <div>
                <div className="text-2xl font-black tracking-tight leading-tight">{completedCount}/{weekUnits.length}</div>
                <div className="text-[10px] uppercase tracking-[0.1em] opacity-65">unidades</div>
              </div>
              <div>
                <div className="text-2xl font-black tracking-tight leading-tight">{weekPct}%</div>
                <div className="text-[10px] uppercase tracking-[0.1em] opacity-65">completado</div>
              </div>
              {acc > 0 && (
                <div>
                  <div className="text-2xl font-black tracking-tight leading-tight">{acc}%</div>
                  <div className="text-[10px] uppercase tracking-[0.1em] opacity-65">precisión</div>
                </div>
              )}
            </div>
            <div className="mt-4">
              <div className="mb-1.5 flex justify-between text-[11px] font-semibold opacity-75">
                <span>Progreso de la semana</span><span>{weekPct}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-white/20">
                <div className="h-full rounded-full bg-white transition-all" style={{ width: `${weekPct}%` }} />
              </div>
            </div>
          </div>
        </div>

        {/* Detailed units */}
        <div className="flex flex-col gap-3.5">
          {weekUnits.length === 0 ? (
            <p className="py-8 text-center text-sm text-secondary">No hay unidades para esta semana.</p>
          ) : (
            weekUnits.map((u) => (
              <UnitCardDetailed
                key={u.id}
                unit={u}
                today={today?.id === u.id}
                onStart={() => { setSelectedUnit(u); goTo("unit-detail"); }}
              />
            ))
          )}
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  // VIEW: HUB (default)
  // ════════════════════════════════════════════════════════════════════════════
  const byArea = progress.by_area;
  const areaEntries = Object.entries(byArea).sort((a, b) => a[0].localeCompare(b[0]));

  return (
    <div className="space-y-6">
      {/* ── Header row ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-[26px] font-extrabold tracking-tight text-on-surface">Tu plan de estudio</h2>
          <p className="mt-1 text-[15px] text-secondary">
            Semana {progress.current_week} de {progress.total_weeks}
            {today ? ` · Enfoque: ${areaLabel(today.area_code)}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-2 rounded-[14px] bg-white px-4 py-2.5 shadow-[0_12px_40px_rgba(25,28,30,0.05)]">
            <span className="text-[22px]">🔥</span>
            <div>
              <div className="text-xl font-black leading-none tracking-tight text-amber-500">{progress.completed_units}</div>
              <div className="text-[11px] text-secondary">completadas</div>
            </div>
          </div>
          <div className="flex flex-col items-center rounded-[14px] bg-primary px-4.5 py-2.5" style={{ padding: "10px 18px" }}>
            <div className="text-xl font-black leading-none tracking-tight text-white">{progress.current_week}</div>
            <div className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/70">semana</div>
          </div>
        </div>
      </div>

      {/* ── Adaptive notice ── */}
      <div className="flex items-center gap-3.5 rounded-[18px] border border-emerald-200/70 bg-gradient-to-r from-emerald-50 to-emerald-100 px-5 py-4">
        <Icon name="auto_fix" fill size={24} className="shrink-0 text-emerald-700" />
        <div>
          <div className="text-[14px] font-bold text-emerald-700">Plan adaptativo activo</div>
          <div className="mt-0.5 text-[12px] leading-relaxed text-emerald-900/70">
            Tu plan se ajusta automáticamente según tu desempeño. Las unidades con mayor prioridad están al tope de cada semana.
            <button type="button" onClick={() => void handleReadjust()} disabled={readjusting} className="ml-2 font-semibold underline hover:no-underline">
              {readjusting ? "Ajustando…" : "Reajustar ahora"}
            </button>
          </div>
        </div>
      </div>

      {/* ── Today's focus card ── */}
      {today && (
        <div className="relative overflow-hidden rounded-[28px] p-7 text-white" style={{ background: "linear-gradient(to bottom right,#004ac6,#2563eb)" }}>
          <div className="pointer-events-none absolute -right-10 -top-14 h-48 w-48 rounded-full bg-white/4" />
          <div className="pointer-events-none absolute bottom-[-30px] right-40 h-24 w-24 rounded-full bg-white/4" />
          <div className="relative z-10 flex items-stretch gap-6">
            <div className="flex-1">
              <div className="mb-2.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.24em] opacity-75">
                <Icon name="wb_sunny" fill size={14} />
                Tarea de hoy
              </div>
              <h3 className="text-2xl font-extrabold leading-tight tracking-tight">{today.title}</h3>
              {today.description && (
                <p className="mt-2 max-w-lg text-sm leading-relaxed opacity-80">{today.description}</p>
              )}
              <div className="mt-4 flex flex-wrap gap-5">
                <span className="flex items-center gap-1.5 text-[13px] font-semibold opacity-90">
                  <Icon name="quiz" size={17} />{today.recommended_questions} preguntas
                </span>
                <span className="flex items-center gap-1.5 text-[13px] font-semibold opacity-90">
                  <Icon name="timer" size={17} />{estimatedMinutes(today.recommended_questions)}
                </span>
                <span className="flex items-center gap-1.5 text-[13px] font-semibold opacity-90">
                  <Icon name="school" size={17} />{areaLabel(today.area_code)}
                </span>
                <span className="flex items-center gap-1.5 text-[13px] font-semibold" style={{ color: "#fde68a" }}>
                  <Icon name="star" fill size={17} style={{ color: "#fde68a" }} />Modo estudio con feedback
                </span>
              </div>
            </div>
            <div className="relative z-10 flex shrink-0 flex-col items-end justify-between">
              <span
                className="rounded-full px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em]"
                style={
                  today.priority === "HIGH"
                    ? { background: "rgba(239,68,68,0.25)", color: "#fecaca" }
                    : today.priority === "MEDIUM"
                    ? { background: "rgba(245,158,11,0.25)", color: "#fde68a" }
                    : { background: "rgba(52,211,153,0.2)", color: "#a7f3d0" }
                }
              >
                PRIORIDAD {priStyle(today.priority).label.toUpperCase()}
              </span>
              <button
                type="button"
                onClick={() => void openUnitDetail(today)}
                className="flex items-center gap-2 rounded-[14px] bg-white px-6 py-3 text-[14px] font-bold shadow-[0_4px_16px_rgba(0,0,0,0.1)] transition-all hover:scale-[1.02]"
                style={{ color: "#004ac6" }}
              >
                <Icon name="play_arrow" size={18} />
                Comenzar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Progress overview ── */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <ProgCard
          label="Avance general"
          value={`${Math.round(progress.progress_percent)}%`}
          helper={`${progress.completed_units} / ${progress.total_units} unidades`}
          color="#004ac6"
          percent={progress.progress_percent}
        />
        <ProgCard
          label="Esta semana"
          value={`${weekCompleted ? weekTotal : weekDone}/${weekTotal}`}
          helper="unidades completadas"
          color="#047857"
          percent={weekTotal > 0 ? (weekDone / weekTotal) * 100 : 0}
        />
        <ProgCard
          label="Semanas restantes"
          value={`${Math.max(0, progress.total_weeks - progress.current_week + 1)}`}
          helper={`de ${progress.total_weeks} en total`}
        />
        <ProgCard
          label="Precisión promedio"
          value={progress.total_units > 0 && Object.values(byArea).some((a) => a.attempted > 0)
            ? `${Math.round(Object.values(byArea).reduce((s, a) => s + a.correct, 0) / Math.max(1, Object.values(byArea).reduce((s, a) => s + a.attempted, 0)) * 100)}%`
            : "—"}
          helper="sobre todas las prácticas"
          color="#047857"
          percent={Object.values(byArea).reduce((s, a) => s + a.attempted, 0) > 0
            ? Object.values(byArea).reduce((s, a) => s + a.correct, 0) / Math.max(1, Object.values(byArea).reduce((s, a) => s + a.attempted, 0)) * 100
            : 0}
        />
      </div>

      {/* ── Current week units ── */}
      <div>
        <div className="mb-3.5 flex items-center justify-between">
          <div className="text-[17px] font-bold tracking-tight text-on-surface">
            Semana {progress.current_week} — Unidades pendientes
          </div>
          <button
            type="button"
            onClick={() => void openWeekDetail()}
            className="bg-none text-[13px] font-semibold text-primary hover:underline"
          >
            Ver semana completa →
          </button>
        </div>
        <div className="flex flex-col gap-2.5">
          {currentWeek?.units.length ? (
            currentWeek.units.map((u) => (
              <UnitCardCompact
                key={u.id}
                unit={u}
                today={today?.id === u.id}
                onClick={() => void openUnitDetail(u)}
              />
            ))
          ) : (
            <p className="rounded-2xl bg-surface-container-low py-8 text-center text-sm text-secondary">
              {progress.current_week > progress.total_weeks
                ? "¡Has completado todas las semanas del plan!"
                : "No se encontraron unidades para esta semana."}
            </p>
          )}
        </div>
      </div>

      {/* ── Area progress ── */}
      {areaEntries.length > 0 && (
        <div>
          <div className="mb-3.5 flex items-center justify-between">
            <div className="text-[17px] font-bold tracking-tight text-on-surface">Progreso por área</div>
            <button
              type="button"
              onClick={() => void openTimeline()}
              className="bg-none text-[13px] font-semibold text-primary hover:underline"
            >
              Ver timeline completo →
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
            {areaEntries.map(([code, stats]) => {
              const pct = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;
              const acc = stats.attempted > 0 ? Math.round((stats.correct / stats.attempted) * 100) : null;
              const color = areaColor(code);
              return (
                <div key={code} className="flex flex-col items-center gap-2 rounded-[18px] bg-white p-4 shadow-[0_12px_40px_rgba(25,28,30,0.05)]">
                  <div className="relative h-16 w-16">
                    <CircularProgress pct={pct} color={color} />
                    <div className="absolute inset-0 flex items-center justify-center text-[13px] font-black" style={{ color }}>
                      {pct}
                    </div>
                  </div>
                  <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-center" style={{ color }}>{code}</div>
                  <div className="text-[10px] text-secondary text-center">
                    {acc !== null ? `${acc}% prec.` : `Niv. ${Math.floor(pct / 33) + 1}`}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
