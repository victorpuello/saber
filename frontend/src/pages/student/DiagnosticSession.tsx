import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import MathText from "../../components/MathText";
import QuestionContextMedia from "../../components/QuestionContextMedia";
import ClozeText, { isClozeContext } from "../../components/english/ClozeText";
import { isReactEnglishContext } from "../../components/english/EnglishContextBlock";
import { useDiagnosticSession } from "./useDiagnosticSession";

// ── Area metadata ────────────────────────────────────────────────────────────

interface AreaMeta {
  label: string;
  icon: string;
  color: string;
  bg: string;
  desc: string;
  comps: Array<{ code: string; name: string }>;
}

const AREA_META: Record<string, AreaMeta> = {
  LC: {
    label: "Lectura Crítica",
    icon: "menu_book",
    color: "#6d28d9",
    bg: "#f5f3ff",
    desc: "Evaluaremos tu capacidad de comprender, interpretar y reflexionar críticamente sobre textos continuos y discontinuos como artículos, cómics, infografías y caricaturas editoriales.",
    comps: [
      { code: "LC-LIT", name: "Identificación — Lectura literal" },
      { code: "LC-INF", name: "Comprensión — Lectura inferencial" },
      { code: "LC-CRI", name: "Evaluación — Lectura crítica" },
    ],
  },
  MAT: {
    label: "Matemáticas",
    icon: "calculate",
    color: "#1d4ed8",
    bg: "#eff6ff",
    desc: "Evaluaremos interpretación de datos cuantitativos, formulación de estrategias matemáticas y argumentación de procedimientos para resolver problemas.",
    comps: [
      { code: "MAT-IR", name: "Interpretación y Representación" },
      { code: "MAT-FE", name: "Formulación y Ejecución" },
      { code: "MAT-AR", name: "Argumentación matemática" },
    ],
  },
  SC: {
    label: "Sociales y Ciudadanas",
    icon: "public",
    color: "#be123c",
    bg: "#fff1f2",
    desc: "Evaluaremos tu comprensión de dinámicas sociales, históricas y ciudadanas, y tu capacidad de reflexionar sobre la convivencia y el pensamiento crítico social.",
    comps: [
      { code: "SC-COG", name: "Cognitiva — Comprensión conceptual" },
      { code: "SC-COM", name: "Comunicativa — Análisis e interpretación" },
      { code: "SC-CIU", name: "Ciudadana — Convivencia y participación" },
    ],
  },
  CN: {
    label: "Ciencias Naturales",
    icon: "science",
    color: "#047857",
    bg: "#ecfdf5",
    desc: "Evaluaremos tu comprensión de conceptos de Biología, Química y Física, así como tu capacidad de indagación científica y uso del conocimiento en contexto.",
    comps: [
      { code: "CN-USE", name: "Uso del conocimiento científico" },
      { code: "CN-EXP", name: "Explicación de fenómenos" },
      { code: "CN-INQ", name: "Indagación científica" },
    ],
  },
  ING: {
    label: "Inglés",
    icon: "translate",
    color: "#b45309",
    bg: "#fffbeb",
    desc: "Evaluaremos tu comprensión lectora en inglés, tu dominio gramatical y tu capacidad de interpretar textos en diferentes niveles de complejidad.",
    comps: [
      { code: "ING-LEC", name: "Lectura comprensiva" },
      { code: "ING-VOC", name: "Vocabulario en contexto" },
      { code: "ING-GRA", name: "Gramática y estructura" },
    ],
  },
};

const ORDERED_AREA_CODES = ["LC", "MAT", "SC", "CN", "ING"];

const BASE_OPTIONS: Array<{ letter: string; key: "option_a" | "option_b" | "option_c" | "option_d" }> = [
  { letter: "A", key: "option_a" },
  { letter: "B", key: "option_b" },
  { letter: "C", key: "option_c" },
  { letter: "D", key: "option_d" },
];

const DISPLAY_LETTERS = ["A", "B", "C", "D"];

function fisherYates(arr: number[]): number[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const PREFLIGHT_ITEMS = [
  { text: "Estoy en un lugar tranquilo", desc: "Sin ruido ni distracciones que interrumpan mi concentración" },
  { text: "Tengo al menos 45 minutos disponibles", desc: "El diagnóstico completo toma entre 45 y 60 minutos" },
  { text: "Mi dispositivo está cargado", desc: "O conectado a la corriente para evitar interrupciones" },
  { text: "Responderé lo mejor que pueda", desc: "Cuanto más honesto sea el diagnóstico, mejor será mi plan de estudio" },
];

function formatTime(secs: number): string {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  return [h, m, s].map((v) => String(v).padStart(2, "0")).join(":");
}

// ── Types ────────────────────────────────────────────────────────────────────

type UiStep = "preflight" | "area-intro" | "active" | "checkpoint" | "confirm" | "processing";

// ── Component ────────────────────────────────────────────────────────────────

export default function DiagnosticSession() {
  const { authFetch } = useAuth();
  const navigate = useNavigate();

  const {
    phase,
    questions,
    currentIndex,
    answers,
    timeElapsedSeconds,
    errorMessage,
    selectAnswer,
    goNext,
    goPrev,
    finish,
  } = useDiagnosticSession(authFetch);

  // ── Local UI state ───────────────────────────────────────────────────────
  const [uiStep, setUiStep] = useState<UiStep>("preflight");
  const [checkedItems, setCheckedItems] = useState([false, false, false, false]);
  const [startRequested, setStartRequested] = useState(false);
  const [areaIntroCode, setAreaIntroCode] = useState<string>("");
  const [flagged, setFlagged] = useState<Set<string>>(new Set());
  const [navPanelOpen, setNavPanelOpen] = useState(false);
  const [procStep, setProcStep] = useState(0);
  const procIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Derived ──────────────────────────────────────────────────────────────
  const totalQ = questions.length;
  const answeredCount = Object.keys(answers).length;
  const progressPct = totalQ > 0 ? Math.round((answeredCount / totalQ) * 100) : 0;
  const currentQ = questions[currentIndex] ?? null;
  const selectedLetter = currentQ ? (answers[currentQ.question_id] ?? null) : null;
  const isLastQ = currentIndex === totalQ - 1;

  // Shuffle option order once per question when questions first load — stable for the whole session
  const shuffledOrders = useMemo<Record<string, number[]>>(() => {
    const result: Record<string, number[]> = {};
    for (const q of questions) {
      result[q.question_id] = fisherYates([0, 1, 2, 3]);
    }
    return result;
  }, [questions]);

  // Ordered area list derived from actual questions
  const orderedAreas = useMemo(() => {
    const seen = new Set<string>();
    const result: string[] = [];
    for (const q of questions) {
      if (!seen.has(q.context_type)) {
        seen.add(q.context_type);
        result.push(q.context_type);
      }
    }
    return result;
  }, [questions]);

  const currentAreaCode = currentQ?.context_type ?? "";
  const currentAreaIndex = orderedAreas.indexOf(currentAreaCode);
  const currentAreaMeta = AREA_META[currentAreaCode] ?? null;

  const areaIntroMeta = AREA_META[areaIntroCode] ?? null;
  const areaIntroIndex = orderedAreas.indexOf(areaIntroCode);
  const areaQCount = questions.filter((q) => q.context_type === areaIntroCode).length;
  const areaTimeEst = Math.round((areaQCount * 45) / 60);

  // Area dots for session header
  const areaDotsToShow = useMemo(() => {
    if (orderedAreas.length > 0) return orderedAreas;
    return ORDERED_AREA_CODES.slice(0, 5);
  }, [orderedAreas]);

  // ── Effects ──────────────────────────────────────────────────────────────

  // When hook becomes active and user has already clicked start
  useEffect(() => {
    if (startRequested && phase === "active" && questions.length > 0) {
      setStartRequested(false);
      const firstArea = orderedAreas[0] ?? "";
      setAreaIntroCode(firstArea);
      setUiStep("area-intro");
    }
  }, [startRequested, phase, questions, orderedAreas]);

  // Navigate when session finishes
  useEffect(() => {
    if (phase === "finished") {
      void navigate("/student/diagnostico");
    }
  }, [phase, navigate]);

  // Processing step animation
  useEffect(() => {
    if (uiStep === "processing") {
      setProcStep(0);
      procIntervalRef.current = setInterval(() => {
        setProcStep((s) => Math.min(s + 1, 4));
      }, 900);
    }
    return () => {
      if (procIntervalRef.current) clearInterval(procIntervalRef.current);
    };
  }, [uiStep]);

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleStartFromPreflight = useCallback(() => {
    if (phase === "active" && questions.length > 0) {
      const firstArea = orderedAreas[0] ?? "";
      setAreaIntroCode(firstArea);
      setUiStep("area-intro");
    } else {
      setStartRequested(true);
    }
  }, [phase, questions, orderedAreas]);

  const handleAreaStart = useCallback(() => {
    setUiStep("active");
  }, []);

  const handleNext = useCallback(async () => {
    if (isLastQ) {
      setUiStep("confirm");
      return;
    }

    const nextArea = questions[currentIndex + 1]?.context_type ?? "";
    const curArea = currentQ?.context_type ?? "";

    await goNext();

    if (nextArea !== curArea) {
      setAreaIntroCode(nextArea);
      // Show checkpoint when leaving area index 1 (after 2nd area)
      if (currentAreaIndex === 1 && orderedAreas.length >= 3) {
        setUiStep("checkpoint");
      } else {
        setUiStep("area-intro");
      }
    }
  }, [isLastQ, questions, currentIndex, currentQ, goNext, currentAreaIndex, orderedAreas]);

  const handleConfirmFinish = useCallback(async () => {
    setUiStep("processing");
    await finish();
  }, [finish]);

  const toggleFlag = useCallback((qId: string) => {
    setFlagged((prev) => {
      const next = new Set(prev);
      if (next.has(qId)) next.delete(qId);
      else next.add(qId);
      return next;
    });
  }, []);

  const isFlagged = currentQ ? flagged.has(currentQ.question_id) : false;

  // ── Render guards ─────────────────────────────────────────────────────────

  if (phase === "error") {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center gap-6 bg-surface px-6 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-error-container">
          <span
            className="material-symbols-outlined text-3xl text-error"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            error
          </span>
        </div>
        <div>
          <h2 className="font-headline text-xl font-bold text-on-surface">No se pudo iniciar</h2>
          <p className="mt-1 text-sm text-on-surface-variant">{errorMessage}</p>
        </div>
        <button
          type="button"
          onClick={() => void navigate("/student/diagnostico")}
          className="rounded-2xl bg-primary px-6 py-3 font-bold text-white transition-opacity hover:opacity-90"
        >
          Volver al diagnóstico
        </button>
      </div>
    );
  }

  // ────────────────────────────────────────────────────────────────────────
  //  S2 — PREFLIGHT
  // ────────────────────────────────────────────────────────────────────────
  if (uiStep === "preflight") {
    const allChecked = checkedItems.every(Boolean);
    const checkCount = checkedItems.filter(Boolean).length;
    const isLoading = startRequested || phase === "loading";

    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-surface px-5 py-10">
        <div className="w-full max-w-[560px] rounded-[32px] bg-white p-10 shadow-[0_12px_40px_rgba(25,28,30,0.06)]">
          {/* Icon */}
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-[20px] bg-primary/8">
            <span
              className="material-symbols-outlined text-[32px] text-primary"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              checklist_rtl
            </span>
          </div>

          <h2 className="text-center text-[26px] font-black tracking-[-0.03em] text-on-surface">
            Antes de comenzar
          </h2>
          <p className="mt-2 text-center text-sm leading-relaxed text-on-surface-variant">
            Confirma que tienes todo listo para obtener resultados precisos y aprovechables.
          </p>

          {/* Checklist */}
          <div className="mt-7 flex flex-col gap-3">
            {PREFLIGHT_ITEMS.map((item, i) => {
              const checked = checkedItems[i];
              return (
                <button
                  key={item.text}
                  type="button"
                  onClick={() =>
                    setCheckedItems((prev) => {
                      const next = [...prev];
                      next[i] = !next[i];
                      return next;
                    })
                  }
                  className={`flex items-center gap-3.5 rounded-2xl px-4 py-3.5 text-left transition-colors ${
                    checked ? "bg-[#dbe1ff]/40" : "bg-surface-container-low hover:bg-surface-container"
                  }`}
                >
                  <div
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border-2 transition-all ${
                      checked
                        ? "border-primary bg-primary"
                        : "border-outline-variant bg-white"
                    }`}
                  >
                    {checked && (
                      <span
                        className="material-symbols-outlined text-[15px] text-white"
                        style={{ fontVariationSettings: "'FILL' 1" }}
                      >
                        check
                      </span>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-on-surface">{item.text}</p>
                    <p className="text-xs text-on-surface-variant">{item.desc}</p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Footer buttons */}
          <div className="mt-7 flex flex-col gap-2.5">
            <button
              type="button"
              disabled={!allChecked || isLoading}
              onClick={handleStartFromPreflight}
              className="flex w-full items-center justify-center gap-2 rounded-[14px] py-4 text-[15px] font-bold text-white shadow-[0_24px_55px_-30px_rgb(0_74_198_/_35%)] transition-all disabled:cursor-not-allowed disabled:opacity-40"
              style={{ background: "linear-gradient(135deg,#004ac6,#2563eb)" }}
            >
              {isLoading ? (
                <>
                  <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                  Preparando sesión…
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[18px]">play_arrow</span>
                  Comenzar diagnóstico
                  <span className="rounded-full bg-white/20 px-2 py-0.5 text-[11px]">
                    {checkCount}/4
                  </span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={handleStartFromPreflight}
              className="w-full rounded-xl py-2 text-sm font-semibold text-on-surface-variant transition-colors hover:bg-surface-container-low"
            >
              Saltarse la lista y comenzar igual
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ────────────────────────────────────────────────────────────────────────
  //  S3 — AREA INTRO
  // ────────────────────────────────────────────────────────────────────────
  if (uiStep === "area-intro") {
    const meta = areaIntroMeta;
    const overallPct = totalQ > 0 ? Math.round((currentIndex / totalQ) * 100) : 0;

    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-white px-5 py-10">
        <div className="w-full max-w-[520px] text-center">
          <p className="mb-2 text-[12px] font-bold uppercase tracking-[0.28em] text-on-surface-variant">
            Área {areaIntroIndex + 1} de {orderedAreas.length}
          </p>

          {/* Area icon */}
          <div
            className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-[28px]"
            style={{ backgroundColor: meta?.bg ?? "#f5f3ff" }}
          >
            <span
              className="material-symbols-outlined text-[48px]"
              style={{ fontVariationSettings: "'FILL' 1", color: meta?.color ?? "#6d28d9" }}
            >
              {meta?.icon ?? "quiz"}
            </span>
          </div>

          <h2 className="text-[36px] font-black tracking-[-0.03em] text-on-surface">
            {meta?.label ?? areaIntroCode}
          </h2>
          <p className="mx-auto mt-3 max-w-[420px] text-[15px] leading-[1.7] text-on-surface-variant">
            {meta?.desc}
          </p>

          {/* Meta chips */}
          <div className="mt-7 flex flex-wrap justify-center gap-6">
            {[
              { icon: "quiz", text: `${areaQCount} preguntas` },
              { icon: "timer", text: `~${areaTimeEst} min` },
              { icon: "bolt", text: "Adaptativo" },
            ].map(({ icon, text }) => (
              <div key={text} className="flex items-center gap-1.5 text-sm font-semibold text-on-surface-variant">
                <span className="material-symbols-outlined text-[18px]">{icon}</span>
                {text}
              </div>
            ))}
          </div>

          {/* Competency pills */}
          {meta && (
            <div className="mt-7 flex flex-col gap-2">
              {meta.comps.map((c) => (
                <div
                  key={c.code}
                  className="flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-left"
                  style={{ backgroundColor: meta.bg }}
                >
                  <span
                    className="rounded-lg px-2 py-0.5 text-[10px] font-bold"
                    style={{ backgroundColor: meta.bg, color: meta.color, border: `1px solid ${meta.color}20` }}
                  >
                    {c.code}
                  </span>
                  <span className="text-sm font-semibold text-on-surface">{c.name}</span>
                </div>
              ))}
            </div>
          )}

          {/* Overall progress */}
          <div className="mt-8">
            <div className="flex justify-between text-xs font-bold text-on-surface-variant">
              <span>Progreso general del diagnóstico</span>
              <span>{overallPct}%</span>
            </div>
            <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-surface-container-high">
              <div
                className="h-full rounded-full bg-primary transition-all duration-700"
                style={{ width: `${overallPct}%` }}
              />
            </div>
          </div>

          {/* Start button */}
          <div className="mt-7">
            <button
              type="button"
              onClick={handleAreaStart}
              className="flex w-full items-center justify-center gap-2 rounded-[14px] py-4 text-[15px] font-bold text-white shadow-[0_24px_55px_-30px_rgb(0_74_198_/_35%)] transition-transform hover:scale-[1.01]"
              style={{ background: "linear-gradient(135deg,#004ac6,#2563eb)" }}
            >
              <span className="material-symbols-outlined text-[18px]">play_arrow</span>
              Comenzar esta área
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ────────────────────────────────────────────────────────────────────────
  //  S5 — CHECKPOINT
  // ────────────────────────────────────────────────────────────────────────
  if (uiStep === "checkpoint") {
    const nextAreaLabel = AREA_META[areaIntroCode]?.label ?? areaIntroCode;
    const accuracy = totalQ > 0 ? Math.round((answeredCount / totalQ) * 100) : 0;

    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-surface px-5 py-10">
        <div className="w-full max-w-[480px] rounded-[32px] bg-white p-9 shadow-[0_12px_40px_rgba(25,28,30,0.06)] text-center">
          <div className="mb-4 text-[48px]">🎯</div>
          <h2 className="text-[26px] font-black tracking-[-0.03em] text-on-surface">
            ¡Vas a la mitad!
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-on-surface-variant">
            Has completado {currentAreaIndex} de {orderedAreas.length} áreas del diagnóstico.
            Vas muy bien. Tómate un momento si lo necesitas.
          </p>

          {/* Stats */}
          <div className="mt-6 grid grid-cols-3 gap-3">
            {[
              { val: String(answeredCount), label: "preguntas respondidas", color: "text-primary" },
              { val: `${accuracy}%`, label: "completado", color: "text-[#047857]" },
              { val: formatTime(timeElapsedSeconds), label: "tiempo transcurrido", color: "text-on-surface-variant" },
            ].map(({ val, label, color }) => (
              <div key={label} className="rounded-2xl bg-surface-container-low px-3 py-3.5">
                <p className={`text-[22px] font-black tracking-[-0.03em] ${color}`}>{val}</p>
                <p className="mt-0.5 text-[11px] text-on-surface-variant">{label}</p>
              </div>
            ))}
          </div>

          {/* Area progress bars */}
          <div className="mt-5 flex flex-col gap-2">
            {orderedAreas.map((code) => {
              const areaQ = questions.filter((q) => q.context_type === code);
              const areaAnswered = areaQ.filter((q) => answers[q.question_id]).length;
              const pct = areaQ.length > 0 ? Math.round((areaAnswered / areaQ.length) * 100) : 0;
              const meta = AREA_META[code];
              return (
                <div key={code} className="flex items-center gap-2.5">
                  <span className="w-8 text-right text-[12px] font-bold" style={{ color: meta?.color }}>
                    {code}
                  </span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-container-high">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${pct}%`, backgroundColor: meta?.color ?? "#004ac6" }}
                    />
                  </div>
                  <span className="w-7 text-left text-[11px] font-bold text-on-surface-variant">
                    {pct}%
                  </span>
                </div>
              );
            })}
          </div>

          {/* Actions */}
          <div className="mt-6 flex flex-col gap-2.5">
            <button
              type="button"
              onClick={() => setUiStep("area-intro")}
              className="flex w-full items-center justify-center gap-2 rounded-[14px] py-3.5 text-sm font-bold text-white shadow-[0_24px_55px_-30px_rgb(0_74_198_/_35%)] transition-transform hover:scale-[1.01]"
              style={{ background: "linear-gradient(135deg,#004ac6,#2563eb)" }}
            >
              <span className="material-symbols-outlined text-[18px]">play_arrow</span>
              Continuar con {nextAreaLabel}
            </button>
            <button
              type="button"
              onClick={() => void navigate("/student/diagnostico")}
              className="w-full rounded-xl py-3 text-sm font-semibold text-on-surface-variant transition-colors hover:bg-surface-container-low"
            >
              Necesito un descanso (volver más tarde)
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ────────────────────────────────────────────────────────────────────────
  //  S6 — CONFIRM FINISH
  // ────────────────────────────────────────────────────────────────────────
  if (uiStep === "confirm") {
    const unansweredCount = totalQ - answeredCount;

    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-surface px-5 py-10">
        <div className="w-full max-w-[520px] rounded-[32px] bg-white p-9 shadow-[0_12px_40px_rgba(25,28,30,0.06)]">
          {/* Header */}
          <div className="mb-6 flex items-center gap-3.5">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[18px] bg-primary/8">
              <span
                className="material-symbols-outlined text-[30px] text-primary"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                assignment_turned_in
              </span>
            </div>
            <div>
              <h2 className="text-[22px] font-extrabold tracking-[-0.02em] text-on-surface">
                ¿Finalizar diagnóstico?
              </h2>
              <p className="mt-1 text-sm leading-relaxed text-on-surface-variant">
                Revisa que hayas respondido todas las preguntas antes de enviar.
              </p>
            </div>
          </div>

          {/* Area summary */}
          <div className="mb-5 rounded-[18px] bg-surface-container-low p-5">
            <p className="mb-3.5 text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant">
              Resumen de respuestas
            </p>
            <div className="flex flex-col gap-2">
              {orderedAreas.map((code) => {
                const meta = AREA_META[code];
                const areaQ = questions.filter((q) => q.context_type === code);
                const areaAns = areaQ.filter((q) => answers[q.question_id]).length;
                const pct = areaQ.length > 0 ? Math.round((areaAns / areaQ.length) * 100) : 0;
                const missing = areaQ.length - areaAns;
                return (
                  <div key={code} className="flex items-center gap-2.5">
                    <span
                      className="flex h-5 w-9 shrink-0 items-center justify-center rounded-md text-[9px] font-bold"
                      style={{ backgroundColor: meta?.bg, color: meta?.color }}
                    >
                      {code}
                    </span>
                    <div className="flex-1">
                      <div className="flex justify-between text-[11px]">
                        <span className="font-semibold text-on-surface">{meta?.label ?? code}</span>
                        <span className={missing > 0 ? "font-bold text-amber-600" : "text-on-surface-variant"}>
                          {missing > 0 ? `${missing} sin responder` : `${areaAns}/${areaQ.length} respondidas`}
                        </span>
                      </div>
                      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-surface-container-high">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${pct}%`, backgroundColor: meta?.color ?? "#004ac6" }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Unanswered warning */}
          {unansweredCount > 0 && (
            <div className="mb-5 flex items-center gap-2.5 rounded-xl bg-amber-50 px-4 py-3">
              <span
                className="material-symbols-outlined text-xl text-amber-600"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                warning
              </span>
              <p className="text-sm font-semibold text-amber-800">
                Tienes {unansweredCount} {unansweredCount === 1 ? "pregunta" : "preguntas"} sin
                responder. Puedes volver a completarlas antes de finalizar.
              </p>
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-2.5">
            <button
              type="button"
              onClick={() => setUiStep("active")}
              className="flex flex-1 items-center justify-center gap-2 rounded-[14px] bg-surface-container-high py-3.5 text-sm font-bold text-on-surface transition-colors hover:bg-surface-container-highest"
            >
              <span className="material-symbols-outlined text-[16px]">arrow_back</span>
              Revisar respuestas
            </button>
            <button
              type="button"
              onClick={() => void handleConfirmFinish()}
              className="flex flex-1 items-center justify-center gap-2 rounded-[14px] py-3.5 text-sm font-bold text-white shadow-[0_24px_55px_-30px_rgb(0_74_198_/_35%)] transition-transform hover:scale-[1.01]"
              style={{ background: "linear-gradient(135deg,#004ac6,#2563eb)" }}
            >
              <span className="material-symbols-outlined text-[16px]">check</span>
              Finalizar y ver resultados
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ────────────────────────────────────────────────────────────────────────
  //  S7 — PROCESSING
  // ────────────────────────────────────────────────────────────────────────
  if (uiStep === "processing") {
    const PROC_STEPS = [
      { icon: "send", label: "Respuestas enviadas al servidor" },
      { icon: "psychology", label: "Calculando habilidad TRI por competencia" },
      { icon: "bar_chart", label: "Generando reporte de fortalezas y áreas débiles" },
      { icon: "auto_stories", label: "Creando tu plan de estudio personalizado" },
      { icon: "notifications", label: "Configurando notificaciones de estudio" },
    ];

    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center gap-8 bg-surface px-5">
        {/* Pulsing icon */}
        <div
          className="flex h-20 w-20 animate-pulse items-center justify-center rounded-[24px] shadow-[0_24px_55px_-30px_rgb(0_74_198_/_35%)]"
          style={{ background: "linear-gradient(to bottom right,#004ac6,#2563eb)" }}
        >
          <div className="h-5 w-5 animate-spin rounded-full border-[3px] border-white/40 border-t-white" />
        </div>

        <div className="text-center">
          <h2 className="text-[24px] font-extrabold tracking-[-0.02em] text-on-surface">
            Analizando tu perfil académico…
          </h2>
          <p className="mt-1.5 text-sm text-on-surface-variant">
            El motor de diagnóstico está procesando {answeredCount} respuestas
          </p>
        </div>

        {/* Steps */}
        <div className="flex w-full max-w-[360px] flex-col gap-2.5">
          {PROC_STEPS.map((step, i) => {
            const isDone = i < procStep;
            const isActive = i === procStep;
            return (
              <div
                key={step.label}
                className={`flex items-center gap-3 rounded-[14px] border-[1.5px] px-4 py-3.5 text-sm font-semibold transition-all duration-300 ${
                  isDone
                    ? "border-surface-container-low bg-white text-on-surface-variant"
                    : isActive
                      ? "border-primary/20 bg-[#dbe1ff]/20 text-primary"
                      : "border-transparent bg-white text-on-surface-variant/35"
                }`}
              >
                <span
                  className="material-symbols-outlined text-[20px]"
                  style={isActive ? { fontVariationSettings: "'FILL' 1" } : undefined}
                >
                  {isDone ? "check_circle" : step.icon}
                </span>
                {step.label}
              </div>
            );
          })}
        </div>

        {/* Bouncing dots */}
        <div className="flex gap-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-2 w-2 animate-bounce rounded-full bg-primary"
              style={{ animationDelay: `${i * 0.2}s` }}
            />
          ))}
        </div>
      </div>
    );
  }

  // ────────────────────────────────────────────────────────────────────────
  //  S4 — ACTIVE SESSION
  // ────────────────────────────────────────────────────────────────────────
  if (!currentQ) return null;

  const isCurrentCloze = isClozeContext(currentQ.context_type);
  const rendersInteractiveContext = isReactEnglishContext(currentQ.context_type);
  const currentOptionRows = (shuffledOrders[currentQ.question_id] ?? [0, 1, 2, 3])
    .map((origIndex, displayIndex) => {
      const { letter: originalLetter, key } = BASE_OPTIONS[origIndex];
      const text = currentQ[key];
      if (!text) return null;
      return {
        letter: originalLetter,
        displayLetter: DISPLAY_LETTERS[displayIndex],
        text,
      };
    })
    .filter((row): row is { letter: string; displayLetter: string; text: string } => row !== null);
  const contextTitle = isCurrentCloze
    ? "Texto incompleto"
    : rendersInteractiveContext
      ? "Contexto interactivo de ingles"
      : currentQ.context.split("\n")[0]?.slice(0, 80) || "Texto de referencia";
  const contextBody = currentQ.context.split("\n\n");

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden bg-surface">
      {/* ── Session Header ─────────────────────────────────────────── */}
      <header
        className="z-20 flex h-[68px] shrink-0 items-center justify-between px-7"
        style={{
          background: "rgba(247,249,251,0.9)",
          backdropFilter: "blur(20px)",
          boxShadow: "0 4px 20px rgba(25,28,30,0.05)",
        }}
      >
        {/* Left */}
        <div className="flex items-center gap-5">
          {/* Brand */}
          <div className="flex items-center gap-2.5">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-[10px]"
              style={{ background: "linear-gradient(to bottom right,#004ac6,#2563eb)" }}
            >
              <span
                className="material-symbols-outlined text-[18px] text-white"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                auto_stories
              </span>
            </div>
            <div>
              <p className="text-sm font-bold text-primary">
                Diagnóstico · {currentAreaMeta?.label ?? currentAreaCode}
              </p>
              <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-on-surface-variant">
                {currentAreaMeta?.comps[0]?.name.split(" — ")[0] ?? "Evaluación"}
              </p>
            </div>
          </div>

          <div className="h-7 w-px bg-outline-variant/30" />

          {/* Area pills */}
          <div className="flex gap-1.5">
            {areaDotsToShow.map((code) => {
              const meta = AREA_META[code];
              const areaQuestions = questions.filter((q) => q.context_type === code);
              const areaAnswered = areaQuestions.filter((q) => answers[q.question_id]).length;
              const isDone = areaQuestions.length > 0 && areaAnswered === areaQuestions.length;
              const isActive = code === currentAreaCode;
              return (
                <div
                  key={code}
                  title={meta?.label ?? code}
                  className={`flex h-7 w-7 items-center justify-center rounded-lg text-[9px] font-extrabold tracking-[0.1em] transition-all ${
                    isDone ? "opacity-50" : isActive ? "scale-110 shadow-[0_2px_8px_rgba(0,74,198,0.3)]" : "opacity-30 grayscale"
                  }`}
                  style={{
                    backgroundColor: meta?.bg ?? "#f5f3ff",
                    color: meta?.color ?? "#6d28d9",
                  }}
                >
                  {code}
                </div>
              );
            })}
          </div>

          <div className="h-7 w-px bg-outline-variant/30" />

          {/* Progress */}
          <div className="flex flex-col gap-1" style={{ width: "160px" }}>
            <div className="flex justify-between text-[10px] font-bold uppercase tracking-[0.1em] text-on-surface-variant">
              <span>Pregunta {currentIndex + 1} / {totalQ}</span>
              <span>{progressPct}%</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-container-high">
              <div
                className="h-full rounded-full bg-[#006242] transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        </div>

        {/* Right */}
        <div className="flex items-center gap-2.5">
          {/* Timer */}
          <div className="flex items-center gap-1.5 rounded-[10px] bg-surface-container-low px-3.5 py-[7px]">
            <span className="material-symbols-outlined text-[16px] text-on-surface-variant">timer</span>
            <span className="font-mono text-[17px] font-bold tracking-[-0.02em] text-on-surface">
              {formatTime(timeElapsedSeconds)}
            </span>
          </div>

          {/* Grid nav */}
          <button
            type="button"
            title="Ver todas las preguntas"
            onClick={() => setNavPanelOpen(true)}
            className="relative flex h-9 w-9 items-center justify-center rounded-[10px] text-on-surface-variant transition-colors hover:bg-surface-container-high"
          >
            <span className="material-symbols-outlined text-xl">grid_view</span>
          </button>

          {/* Flag */}
          <button
            type="button"
            title="Marcar para revisar"
            onClick={() => toggleFlag(currentQ.question_id)}
            className={`relative flex h-9 w-9 items-center justify-center rounded-[10px] transition-all ${
              isFlagged
                ? "bg-amber-50 text-amber-600"
                : "text-on-surface-variant hover:bg-surface-container-high"
            }`}
          >
            <span className="material-symbols-outlined text-xl">flag</span>
            {flagged.size > 0 && (
              <span className="absolute right-1 top-1 h-2 w-2 rounded-full border-2 border-surface bg-amber-400" />
            )}
          </button>

          {/* Pause */}
          <button
            type="button"
            onClick={() => void navigate("/student/diagnostico")}
            className="rounded-[10px] bg-surface-container-highest px-4 py-2 text-sm font-bold text-on-surface transition-colors hover:bg-surface-container-high"
          >
            Pausar
          </button>
        </div>
      </header>

      {/* ── Body: Context + Question ──────────────────────────────── */}
      <main className="flex flex-1 gap-4 overflow-hidden px-5 py-4">
        {/* Context pane */}
        <section className="flex flex-1 flex-col overflow-hidden rounded-[24px] bg-surface-container-low">
          <div className="flex shrink-0 items-end justify-between px-7 pb-3 pt-5">
            <div>
              <span className="mb-1.5 inline-block rounded-full bg-[#dbe1ff] px-3 py-0.5 text-[9px] font-black uppercase tracking-[0.3em] text-[#003ea8]">
                Material de Lectura
              </span>
              <h2 className="text-[15px] font-bold text-on-surface">{contextTitle}</h2>
            </div>
            <div className="flex shrink-0 gap-1.5">
              {["text_increase", "zoom_in"].map((icon) => (
                <button
                  key={icon}
                  type="button"
                  className="flex h-[34px] w-[34px] items-center justify-center rounded-[9px] bg-white text-on-surface-variant transition-colors hover:text-primary"
                >
                  <span className="material-symbols-outlined text-[18px]">{icon}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto px-7 pb-7 [scrollbar-color:var(--color-surface-container-highest)_transparent] [scrollbar-width:thin]">
            <div className="space-y-4">
              {((currentQ.media?.length ?? 0) > 0 || rendersInteractiveContext) && (
                <QuestionContextMedia
                  media={currentQ.media ?? []}
                  context={currentQ.context}
                  contextType={currentQ.context_type}
                  componentName={currentQ.component_name}
                  compact
                />
              )}
              {isCurrentCloze ? (
                <ClozeText
                  text={currentQ.context}
                  options={currentOptionRows}
                  selectedLetter={selectedLetter}
                  onSelect={selectAnswer}
                  compact
                />
              ) : !rendersInteractiveContext ? (
                <div className="space-y-[14px] text-[15px] leading-[1.85] text-on-surface-variant">
                  {contextBody.map((para, i) => (
                    <MathText key={i} as="p">{para}</MathText>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </section>

        {/* Question pane */}
        <section className="flex w-[400px] shrink-0 flex-col gap-3">
          {/* Q card */}
          <div className="min-h-0 flex-1 overflow-y-auto rounded-[24px] bg-white p-[22px] shadow-[0_8px_28px_rgba(25,28,30,0.04)] [scrollbar-color:var(--color-surface-container-highest)_transparent] [scrollbar-width:thin]">
            {/* Q number */}
            <div className="mb-4 flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#d0e1fb] text-[12px] font-black text-[#54647a]">
                {currentIndex + 1}
              </span>
              {currentAreaMeta && (
                <span
                  className="rounded-lg px-2 py-0.5 text-[10px] font-bold"
                  style={{ backgroundColor: currentAreaMeta.bg, color: currentAreaMeta.color }}
                >
                  {currentAreaCode}
                </span>
              )}
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant">
                Enunciado
              </span>
            </div>

            <MathText as="p" className="mb-4.5 text-[15px] font-medium leading-[1.65] text-on-surface">
              {currentQ.stem.replace(/\[BLANK\]/gi, '[_________________]')}
            </MathText>

            {/* Options */}
            {isCurrentCloze ? (
              <div className="rounded-[16px] bg-surface-container-low p-3.5 text-[13px] leading-relaxed text-on-surface-variant">
                Selecciona la opcion directamente en el espacio resaltado del texto.
                <span className="ml-2 font-black text-primary">
                  {selectedLetter ? `Respuesta ${selectedLetter}` : "Sin responder"}
                </span>
              </div>
            ) : (
              <div className="flex flex-col gap-2.5">
                {currentOptionRows.map(({ letter: originalLetter, displayLetter, text }) => {
                  const isSelected = selectedLetter === originalLetter;
                  return (
                  <button
                    key={originalLetter}
                    type="button"
                    onClick={() => selectAnswer(originalLetter)}
                    className={`flex w-full items-start gap-[11px] rounded-[13px] border-2 px-3.5 py-3 text-left transition-all duration-150 ${
                      isFlagged
                        ? "bg-amber-50/80 border-amber-300/30"
                        : isSelected
                          ? "border-primary/20 bg-[#d0e1fb]"
                          : "border-transparent bg-surface-container-low hover:border-primary/15 hover:bg-white"
                    } ${isSelected && !isFlagged ? "border-primary/20" : ""}`}
                  >
                    <span
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border-[1.5px] text-[12px] font-bold transition-all ${
                        isSelected
                          ? "border-primary bg-primary text-white"
                          : "border-outline-variant/35 bg-white"
                      }`}
                    >
                      {displayLetter}
                    </span>
                    <MathText
                      className={`text-[13px] leading-relaxed ${
                        isSelected ? "font-medium text-on-surface" : "text-on-surface-variant"
                      }`}
                    >
                      {text}
                    </MathText>
                  </button>
                  );
                })}
              </div>
            )}

            {/* Confidence bar */}
            {selectedLetter && (
              <div className="mt-3 flex items-center gap-2 rounded-xl bg-surface-container-low px-3 py-2.5">
                <span className="shrink-0 text-[11px] font-semibold text-on-surface-variant">
                  Confianza:
                </span>
                <div className="flex flex-1 gap-1.5">
                  {["Poco", "Regular", "Seguro"].map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      className="flex-1 rounded-lg border-[1.5px] border-transparent bg-white py-1 text-[11px] font-bold text-on-surface-variant transition-all hover:border-outline-variant"
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Nav row */}
          <div className="flex gap-2.5">
            <button
              type="button"
              onClick={goPrev}
              disabled={currentIndex === 0}
              className="flex h-[52px] flex-1 items-center justify-center gap-1.5 rounded-[13px] bg-surface-container-high text-sm font-bold text-on-surface transition-colors hover:bg-surface-container-highest disabled:opacity-40"
            >
              <span className="material-symbols-outlined text-xl">chevron_left</span>
              Anterior
            </button>

            {/* Flag btn */}
            <button
              type="button"
              onClick={() => toggleFlag(currentQ.question_id)}
              className={`flex h-[52px] w-[52px] items-center justify-center rounded-[13px] text-[22px] transition-all ${
                isFlagged
                  ? "bg-amber-50 text-amber-600"
                  : "bg-surface-container-high text-on-surface-variant hover:bg-amber-50 hover:text-amber-600"
              }`}
            >
              <span className="material-symbols-outlined">flag</span>
            </button>

            <button
              type="button"
              onClick={() => void handleNext()}
              className="flex h-[52px] flex-[1.4] items-center justify-center gap-1.5 rounded-[13px] text-sm font-bold text-white shadow-[0_6px_20px_rgba(0,74,198,0.22)] transition-opacity hover:opacity-90"
              style={{ background: "linear-gradient(to bottom right,#004ac6,#2563eb)" }}
            >
              {isLastQ ? (
                <>Finalizar<span className="material-symbols-outlined text-xl">check</span></>
              ) : (
                <>Siguiente<span className="material-symbols-outlined text-xl">chevron_right</span></>
              )}
            </button>
          </div>
        </section>
      </main>

      {/* ── Question Navigator Panel ──────────────────────────────── */}
      <>
        {/* Backdrop */}
        {navPanelOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/20"
            onClick={() => setNavPanelOpen(false)}
          />
        )}

        <div
          className={`fixed bottom-0 right-0 top-0 z-50 flex w-[280px] flex-col bg-white shadow-[-12px_0_40px_rgba(0,0,0,0.1)] transition-transform duration-300 ${
            navPanelOpen ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <div className="flex items-center justify-between border-b border-surface-container-low px-5 py-5">
            <h3 className="text-sm font-bold text-on-surface">Navegador de preguntas</h3>
            <button
              type="button"
              onClick={() => setNavPanelOpen(false)}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-container-high"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {orderedAreas.map((code) => {
              const meta = AREA_META[code];
              const areaQs = questions.filter((q) => q.context_type === code);
              const areaAns = areaQs.filter((q) => answers[q.question_id]).length;
              return (
                <div key={code} className="mb-5">
                  <p className="mb-2.5 text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant">
                    {meta?.label ?? code} ({areaAns}/{areaQs.length})
                  </p>
                  <div className="grid grid-cols-6 gap-1.5">
                    {areaQs.map((q) => {
                      const idx = questions.indexOf(q);
                      const isCurrent = idx === currentIndex;
                      const isAnswered = !!answers[q.question_id];
                      const isQFlagged = flagged.has(q.question_id);
                      return (
                        <button
                          key={q.question_id}
                          type="button"
                          onClick={() => {
                            // Navigate to this question index
                            const diff = idx - currentIndex;
                            if (diff > 0) {
                              for (let i = 0; i < diff; i++) void goNext();
                            } else if (diff < 0) {
                              for (let i = 0; i < -diff; i++) goPrev();
                            }
                            setNavPanelOpen(false);
                          }}
                          className={`aspect-square w-full rounded-lg text-[11px] font-bold transition-all ${
                            isCurrent
                              ? "bg-primary text-white"
                              : isQFlagged
                                ? "border-[1.5px] border-amber-400/40 bg-amber-50 text-amber-600"
                                : isAnswered
                                  ? "bg-emerald-100 text-emerald-700"
                                  : "bg-surface-container-high text-on-surface-variant"
                          }`}
                        >
                          {idx + 1}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex flex-col gap-2 border-t border-surface-container-low p-4">
            {[
              { color: "bg-emerald-100", label: "Respondida" },
              { color: "bg-primary", label: "Actual" },
              { color: "bg-amber-50 border border-amber-400/40", label: "Marcada" },
              { color: "bg-surface-container-high", label: "Sin responder" },
            ].map(({ color, label }) => (
              <div key={label} className="flex items-center gap-2 text-xs text-on-surface-variant">
                <div className={`h-4 w-4 rounded-md ${color}`} />
                {label}
              </div>
            ))}
          </div>
        </div>
      </>
    </div>
  );
}
