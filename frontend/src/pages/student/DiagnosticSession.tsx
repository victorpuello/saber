import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useDiagnosticSession } from "./useDiagnosticSession";

const AREA_LABELS: Record<string, string> = {
  MAT: "Matemáticas",
  LC: "Lectura Crítica",
  SC: "Sociales y Ciudadanas",
  CN: "Ciencias Naturales",
  ING: "Inglés",
};

const OPTIONS: Array<{ letter: string; key: "option_a" | "option_b" | "option_c" | "option_d" }> = [
  { letter: "A", key: "option_a" },
  { letter: "B", key: "option_b" },
  { letter: "C", key: "option_c" },
  { letter: "D", key: "option_d" },
];

function formatTime(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return [
    h.toString().padStart(2, "0"),
    m.toString().padStart(2, "0"),
    s.toString().padStart(2, "0"),
  ].join(":");
}

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

  const totalQ = questions.length;
  const answeredCount = Object.keys(answers).length;
  const progressPct = totalQ > 0 ? Math.round((answeredCount / totalQ) * 100) : 0;
  const currentQ = questions[currentIndex];
  const isLast = currentIndex === totalQ - 1;
  const selectedLetter = currentQ ? (answers[currentQ.question_id] ?? null) : null;

  const areaLabel =
    currentQ ? (AREA_LABELS[currentQ.context_type] ?? currentQ.context_type) : "Diagnóstico";

  // ── Loading ────────────────────────────────────────────────────────
  if (phase === "loading") {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center gap-4 bg-surface">
        <span className="material-symbols-outlined animate-spin text-4xl text-primary">
          progress_activity
        </span>
        <p className="text-sm font-semibold text-on-surface-variant">
          Preparando tu diagnóstico…
        </p>
      </div>
    );
  }

  // ── Error ──────────────────────────────────────────────────────────
  if (phase === "error") {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center gap-6 bg-surface px-6 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-error-container">
          <span className="material-symbols-outlined text-3xl text-error" style={{ fontVariationSettings: "'FILL' 1" }}>
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

  // ── Finished ───────────────────────────────────────────────────────
  if (phase === "finished") {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center gap-8 bg-surface px-6 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50 shadow-[0_12px_40px_rgba(0,74,198,0.12)]">
          <span className="material-symbols-outlined text-4xl text-emerald-600" style={{ fontVariationSettings: "'FILL' 1" }}>
            check_circle
          </span>
        </div>
        <div>
          <h2 className="font-headline text-2xl font-black text-on-surface">
            ¡Diagnóstico completado!
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-on-surface-variant">
            Tu perfil académico está siendo procesado. En unos momentos
            podrás ver tus resultados y el plan personalizado.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void navigate("/student/diagnostico")}
          className="flex items-center gap-2 rounded-2xl bg-primary px-7 py-4 font-bold text-white shadow-md transition-opacity hover:opacity-90"
        >
          Ver mis resultados
          <span className="material-symbols-outlined text-xl">arrow_forward</span>
        </button>
      </div>
    );
  }

  if (!currentQ) return null;

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden bg-surface">
      {/* ── Top Header ────────────────────────────────────────────── */}
      <header className="z-50 flex h-20 shrink-0 items-center justify-between bg-surface/80 px-8 shadow-[0_12px_40px_rgba(25,28,30,0.06)] backdrop-blur-xl">
        {/* Left: brand + progress */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br from-primary to-primary-container text-white shadow-sm">
              <span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                auto_stories
              </span>
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight text-primary">Saber 11 Simulator</h1>
              <p className="text-[10px] font-bold uppercase tracking-[0.32em] text-secondary">{areaLabel}</p>
            </div>
          </div>

          <div className="hidden h-8 w-px bg-outline-variant/30 sm:block" />

          <div className="hidden flex-col gap-1 sm:flex" style={{ width: "14rem" }}>
            <div className="flex justify-between text-[11px] font-bold uppercase tracking-wider text-secondary">
              <span>Progreso: {answeredCount} / {totalQ}</span>
              <span>{progressPct}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-surface-container-high">
              <div
                className="h-full rounded-full bg-[#006242] transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        </div>

        {/* Right: timer + actions */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 rounded-xl bg-surface-container-low px-4 py-2">
            <span className="material-symbols-outlined text-[18px] text-secondary">timer</span>
            <span className="font-mono text-lg font-bold tracking-tight text-on-surface">
              {formatTime(timeElapsedSeconds)}
            </span>
          </div>
          <button
            type="button"
            title="Ayuda"
            className="flex h-10 w-10 items-center justify-center rounded-xl text-secondary transition-colors hover:bg-surface-container-high"
          >
            <span className="material-symbols-outlined text-[20px]">help</span>
          </button>
          <button
            type="button"
            onClick={() => void navigate("/student/diagnostico")}
            className="rounded-xl bg-surface-container-highest px-5 py-2.5 text-sm font-bold text-on-surface transition-all active:scale-95"
          >
            Pausar
          </button>
        </div>
      </header>

      {/* ── Main Two-Pane ──────────────────────────────────────────── */}
      <main className="flex flex-1 gap-8 overflow-hidden p-8">
        {/* Left: Reading context */}
        <section className="flex flex-1 flex-col overflow-hidden rounded-4xl bg-surface-container-low">
          <div className="flex items-end justify-between px-8 pb-4 pt-8">
            <div>
              <span className="mb-3 inline-block rounded-full bg-primary-fixed px-3 py-1 text-[10px] font-black uppercase tracking-widest text-[#003ea8]">
                Material de Lectura
              </span>
              <h2 className="text-xl font-bold tracking-tight text-on-surface">
                {currentQ.context.split("\n")[0]?.slice(0, 60) || "Texto de referencia"}
              </h2>
            </div>
            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-secondary transition-colors hover:text-primary"
              >
                <span className="material-symbols-outlined text-[20px]">zoom_in</span>
              </button>
              <button
                type="button"
                className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-secondary transition-colors hover:text-primary"
              >
                <span className="material-symbols-outlined text-[20px]">format_size</span>
              </button>
            </div>
          </div>

          {/* Scrollable text */}
          <div className="flex-1 overflow-y-auto px-10 pb-12 [scrollbar-color:var(--color-surface-container-highest)_transparent] [scrollbar-width:thin]">
            <div className="mx-auto max-w-prose">
              <article className="space-y-5 text-lg leading-[1.8] text-on-surface-variant">
                {currentQ.context.split("\n\n").map((para: string, i: number) => (
                  <p key={i}>{para}</p>
                ))}
              </article>
            </div>
          </div>
        </section>

        {/* Right: Question + options + nav */}
        <section className="flex w-120 shrink-0 flex-col gap-5">
          {/* Question block */}
          <div className="flex-1 overflow-y-auto rounded-4xl bg-white p-8 shadow-[0_12px_40px_rgba(25,28,30,0.04)] [scrollbar-color:var(--color-surface-container-highest)_transparent] [scrollbar-width:thin]">
            {/* Q number + label */}
            <div className="mb-6 flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#d0e1fb] text-sm font-black text-[#54647a]">
                {currentIndex + 1}
              </span>
              <span className="text-sm font-bold uppercase tracking-widest text-secondary">
                Enunciado
              </span>
            </div>

            <h3 className="mb-10 text-xl font-semibold leading-relaxed text-on-surface">
              {currentQ.stem}
            </h3>

            {/* Options */}
            <div className="space-y-4">
              {OPTIONS.map(({ letter, key }) => {
                const text = currentQ[key];
                if (!text) return null;
                const isSelected = selectedLetter === letter;

                return (
                  <button
                    key={letter}
                    type="button"
                    onClick={() => selectAnswer(letter)}
                    className={`group flex w-full items-start gap-4 rounded-2xl p-5 text-left transition-all duration-200 ${
                      isSelected
                        ? "bg-[#d0e1fb] ring-2 ring-primary/20"
                        : "bg-surface-container-low hover:bg-white hover:ring-2 hover:ring-primary/20"
                    }`}
                  >
                    <div
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold transition-colors ${
                        isSelected
                          ? "bg-primary text-white"
                          : "border border-outline-variant/30 bg-white group-hover:bg-primary-container group-hover:text-white"
                      }`}
                    >
                      {letter}
                    </div>
                    <p
                      className={`leading-relaxed ${
                        isSelected
                          ? "font-medium text-on-surface"
                          : "text-on-surface-variant group-hover:text-on-surface"
                      }`}
                    >
                      {text}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Navigation */}
          <div className="flex gap-4">
            <button
              type="button"
              onClick={goPrev}
              disabled={currentIndex === 0}
              className="flex h-16 flex-1 items-center justify-center gap-2 rounded-2xl bg-surface-container-high font-bold text-on-surface transition-all hover:bg-surface-dim active:scale-95 disabled:opacity-40"
            >
              <span className="material-symbols-outlined">chevron_left</span>
              Anterior
            </button>

            {isLast ? (
              <button
                type="button"
                onClick={() => void finish()}
                className="flex h-16 flex-[1.5] items-center justify-center gap-2 rounded-2xl bg-linear-to-r from-primary to-primary-container font-bold text-white shadow-[0_12px_40px_rgba(0,74,198,0.25)] transition-all hover:shadow-[0_12px_40px_rgba(0,74,198,0.4)] active:scale-95"
              >
                Finalizar
                <span className="material-symbols-outlined">check</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void goNext()}
                className="flex h-16 flex-[1.5] items-center justify-center gap-2 rounded-2xl bg-linear-to-r from-primary to-primary-container font-bold text-white shadow-[0_12px_40px_rgba(0,74,198,0.25)] transition-all hover:shadow-[0_12px_40px_rgba(0,74,198,0.4)] active:scale-95"
              >
                Siguiente
                <span className="material-symbols-outlined">chevron_right</span>
              </button>
            )}
          </div>
        </section>
      </main>

      {/* Side progress marker */}
      <aside className="fixed right-4 top-1/2 flex -translate-y-1/2 flex-col gap-2">
        <div className="h-6 w-1.5 rounded-full bg-[#006242]" />
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-1.5 w-1.5 rounded-full bg-outline-variant/50" />
        ))}
      </aside>
    </div>
  );
}
