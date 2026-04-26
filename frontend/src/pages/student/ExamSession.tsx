import { useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import MathText from "../../components/MathText";
import QuestionContextMedia from "../../components/QuestionContextMedia";
import ClozeText, { isClozeContext } from "../../components/english/ClozeText";
import { isReactEnglishContext } from "../../components/english/EnglishContextBlock";
import { useExamSession, type ExamSessionMeta } from "../../hooks/useExamSession";
import type { ExamQuestionSafe } from "../../services/examSession";

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

interface ExamUnit {
  key: string;
  type: "INDIVIDUAL" | "QUESTION_BLOCK";
  indices: number[];
}

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

function buildExamUnits(questions: ExamQuestionSafe[]): ExamUnit[] {
  const units: ExamUnit[] = [];
  const seenBlocks = new Set<string>();

  questions.forEach((question, index) => {
    if (question.structure_type === "QUESTION_BLOCK" && question.block_id) {
      if (seenBlocks.has(question.block_id)) {
        return;
      }
      seenBlocks.add(question.block_id);
      const indices = questions
        .map((item, itemIndex) => ({ item, itemIndex }))
        .filter(({ item }) => item.block_id === question.block_id)
        .sort((left, right) => (left.item.block_item_order ?? 0) - (right.item.block_item_order ?? 0))
        .map(({ itemIndex }) => itemIndex);
      units.push({
        key: question.block_id,
        type: "QUESTION_BLOCK",
        indices,
      });
      return;
    }

    units.push({
      key: question.question_id,
      type: "INDIVIDUAL",
      indices: [index],
    });
  });

  return units;
}

export default function ExamSession() {
  const { examId } = useParams<{ examId: string }>();
  const { authFetch } = useAuth();
  const navigate = useNavigate();

  const metaRaw = examId ? sessionStorage.getItem(`exam_meta_${examId}`) : null;
  const examMeta: ExamSessionMeta = metaRaw
    ? (JSON.parse(metaRaw) as ExamSessionMeta)
    : { title: "Examen", exam_type: "CUSTOM", time_limit_minutes: null };

  const {
    phase,
    session,
    questions,
    currentIndex,
    answers,
    timeElapsedSeconds,
    timeRemainingSeconds,
    errorMessage,
    errorTitle,
    selectAnswer,
    goNext,
    goPrev,
    goToIndex,
    finish,
  } = useExamSession(authFetch, examId ?? "", examMeta);

  useEffect(() => {
    if (phase === "finished" && session) {
      const timer = setTimeout(() => {
        navigate(`/student/examenes/resultados/${session.id}`, { replace: true });
      }, 2200);
      return () => clearTimeout(timer);
    }
  }, [phase, session, navigate]);

  const totalQ = questions.length;
  const answeredCount = Object.keys(answers).length;
  const globalProgressPct = totalQ > 0 ? Math.round(((currentIndex + 1) / totalQ) * 100) : 0;
  const currentQ = questions[currentIndex];
  const isLast = currentIndex === totalQ - 1;
  const selectedLetter = currentQ ? (answers[currentQ.question_id] ?? null) : null;

  const timerValue = timeRemainingSeconds !== null ? timeRemainingSeconds : timeElapsedSeconds;
  const timerUrgent = timeRemainingSeconds !== null && timeRemainingSeconds < 60;

  const units = useMemo(() => buildExamUnits(questions), [questions]);

  // Shuffle option order once per question when questions first load — stable for the whole session
  const shuffledOrders = useMemo<Record<string, number[]>>(() => {
    const result: Record<string, number[]> = {};
    for (const q of questions) {
      result[q.question_id] = fisherYates([0, 1, 2, 3]);
    }
    return result;
  }, [questions]);
  const currentUnit = useMemo(
    () => units.find((unit) => unit.indices.includes(currentIndex)) ?? null,
    [currentIndex, units],
  );
  const isBlock = currentUnit?.type === "QUESTION_BLOCK";
  const blockPosition = currentUnit ? currentUnit.indices.indexOf(currentIndex) + 1 : 1;
  const blockSize = currentUnit?.indices.length ?? 1;
  const blockProgressPct = isBlock ? Math.round((blockPosition / blockSize) * 100) : 100;
  const currentUnitIndex = currentUnit ? units.findIndex((unit) => unit.key === currentUnit.key) + 1 : currentIndex + 1;
  const nextButtonLabel = isLast
    ? "Finalizar"
    : isBlock && blockPosition < blockSize
      ? "Siguiente subpregunta"
      : "Siguiente";
  const prevButtonLabel = isBlock && blockPosition > 1 ? "Subpregunta anterior" : "Anterior";
  const contextQuestion = isBlock && currentUnit
    ? (questions[currentUnit.indices[0]] ?? currentQ)
    : currentQ;
  const currentContextMedia = contextQuestion.media;

  if (phase === "loading") {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center gap-4 bg-surface">
        <span className="material-symbols-outlined animate-spin text-4xl text-primary">
          progress_activity
        </span>
        <p className="text-sm font-semibold text-on-surface-variant">
          Preparando tu examen…
        </p>
      </div>
    );
  }

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
          <h2 className="font-headline text-xl font-bold text-on-surface">{errorTitle}</h2>
          <p className="mt-1 text-sm text-on-surface-variant">{errorMessage}</p>
        </div>
        <button
          type="button"
          onClick={() => navigate("/student/examenes")}
          className="rounded-2xl bg-primary px-6 py-3 font-bold text-white transition-opacity hover:opacity-90"
        >
          Volver a Simulacros
        </button>
      </div>
    );
  }

  if (phase === "finished") {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center gap-7 bg-surface px-10 text-center">
        <div className="h-16 w-16 animate-spin rounded-full border-4 border-primary-fixed border-t-primary" />

        <div>
          <p className="text-[22px] font-extrabold tracking-tight text-on-surface">
            Procesando resultados…
          </p>
          <p className="mt-1.5 text-sm text-secondary">
            El motor de diagnóstico está analizando tus respuestas
          </p>
        </div>

        <div className="flex w-full max-w-sm flex-col gap-2.5">
          {[
            { icon: "check_circle", label: "Respuestas enviadas al servidor", state: "done" },
            { icon: "psychology", label: "Calculando puntaje por competencia", state: "active" },
            { icon: "bar_chart", label: "Generando reporte por áreas", state: "pending" },
            { icon: "auto_stories", label: "Preparando retroalimentación", state: "pending" },
          ].map(({ icon, label, state }) => (
            <div
              key={label}
              className={`flex items-center gap-3 rounded-2xl bg-white px-4 py-3 text-[13px] font-semibold ${
                state === "done"
                  ? "text-secondary"
                  : state === "active"
                    ? "text-primary"
                    : "text-on-surface/30"
              }`}
            >
              <span
                className={`material-symbols-outlined text-[18px] ${
                  state === "done"
                    ? "text-[#047857]"
                    : state === "active"
                      ? "text-primary"
                      : "text-on-surface/20"
                }`}
                style={{ fontVariationSettings: state === "done" ? "'FILL' 1" : "'FILL' 0" }}
              >
                {icon}
              </span>
              {label}
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-1.75 w-1.75 animate-bounce rounded-full bg-primary"
              style={{ animationDelay: `${i * 0.2}s` }}
            />
          ))}
        </div>
      </div>
    );
  }

  if (!currentQ) return null;

  const isCurrentCloze = isClozeContext(currentQ.context_type);
  const rendersInteractiveContext = isReactEnglishContext(contextQuestion.context_type);
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
  const contextHeading = isCurrentCloze
    ? "Texto incompleto"
    : rendersInteractiveContext
      ? "Contexto interactivo de ingles"
      : contextQuestion.context.split("\n")[0]?.slice(0, 72) || "Texto de referencia";

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden bg-surface">
      <header className="z-20 flex h-18 shrink-0 items-center justify-between bg-surface/88 px-8 shadow-[0_8px_28px_rgba(25,28,30,0.05)] backdrop-blur-xl">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br from-primary to-primary-container text-white">
              <span
                className="material-symbols-outlined text-xl"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                auto_stories
              </span>
            </div>
            <div>
              <div className="max-w-50 truncate text-[15px] font-bold tracking-tight text-primary">
                {examMeta.title}
              </div>
              <div className="text-[10px] font-bold uppercase tracking-[0.28em] text-secondary">
                {examMeta.exam_type.replace(/_/g, " ")}
              </div>
            </div>
          </div>

          <div className="mx-1 h-7.5 w-px bg-outline-variant/30" />

          <div className="hidden flex-col gap-1 sm:flex" style={{ width: "13rem" }}>
            <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-secondary">
              <span>Pregunta {currentIndex + 1} / {totalQ}</span>
              <span>{globalProgressPct}%</span>
            </div>
            <div className="h-1.75 w-full overflow-hidden rounded-full bg-surface-container-high">
              <div
                className="h-full rounded-full bg-[#006242] transition-all duration-500"
                style={{ width: `${globalProgressPct}%` }}
              />
            </div>
            <p className="text-[11px] text-secondary">
              {answeredCount} respondidas · Unidad {currentUnitIndex} de {units.length}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div
            className={`flex items-center gap-1.5 rounded-xl px-4 py-2 ${
              timerUrgent ? "bg-amber-50 ring-1 ring-amber-200" : "bg-surface-container-low"
            }`}
          >
            <span className={`material-symbols-outlined text-[17px] ${timerUrgent ? "text-amber-600" : "text-secondary"}`}>
              {timeRemainingSeconds !== null ? "timer" : "schedule"}
            </span>
            <span
              className={`font-mono text-[18px] font-bold tracking-tight ${
                timerUrgent ? "text-amber-700" : "text-on-surface"
              }`}
            >
              {formatTime(timerValue)}
            </span>
          </div>

          <button
            type="button"
            className="flex h-9.5 w-9.5 items-center justify-center rounded-[10px] text-secondary transition hover:bg-surface-container-high"
          >
            <span className="material-symbols-outlined text-[20px]">help</span>
          </button>
          <button
            type="button"
            className="flex h-9.5 w-9.5 items-center justify-center rounded-[10px] text-secondary transition hover:bg-surface-container-high"
          >
            <span className="material-symbols-outlined text-[20px]">flag</span>
          </button>

          <button
            type="button"
            onClick={() => navigate("/student/examenes")}
            className="rounded-xl bg-surface-container-highest px-4.5 py-2.25 text-[13px] font-bold text-on-surface transition"
          >
            Pausar
          </button>
        </div>
      </header>

      <div className="flex flex-1 gap-5 overflow-hidden p-5">
        <div className="flex flex-1 flex-col overflow-hidden rounded-[28px] bg-surface-container-low">
          <div className="flex shrink-0 items-end justify-between px-7 pb-3.5 pt-5.5">
            <div>
              <span className="mb-1.5 inline-block rounded-full bg-primary-fixed px-3 py-0.75 text-[9px] font-black uppercase tracking-[0.28em] text-[#003ea8]">
                {isBlock ? "Contexto compartido" : "Material de Lectura"}
              </span>
              <h2 className="text-[16px] font-bold text-on-surface">
                {contextHeading}
              </h2>
              {isBlock && (
                <p className="mt-1 text-[12px] text-secondary">
                  Este contexto alimenta {blockSize} subpreguntas dentro del mismo bloque.
                </p>
              )}
            </div>
            <div className="flex shrink-0 gap-1.5">
              <button
                type="button"
                className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-white text-secondary transition hover:text-primary"
              >
                <span className="material-symbols-outlined text-[20px]">zoom_in</span>
              </button>
              <button
                type="button"
                className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-white text-secondary transition hover:text-primary"
              >
                <span className="material-symbols-outlined text-[20px]">format_size</span>
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-8.5 pb-8 [scrollbar-color:var(--color-surface-container-highest)_transparent] [scrollbar-width:thin]">
            <div className="space-y-6">
              {((currentContextMedia?.length ?? 0) > 0 || rendersInteractiveContext) && (
                <QuestionContextMedia
                  media={currentContextMedia ?? []}
                  context={contextQuestion.context}
                  contextType={contextQuestion.context_type}
                  componentName={contextQuestion.component_name}
                />
              )}
              {isCurrentCloze ? (
                <ClozeText
                  text={currentQ.context}
                  options={currentOptionRows}
                  selectedLetter={selectedLetter}
                  onSelect={selectAnswer}
                />
              ) : !rendersInteractiveContext ? (
                <article className="space-y-4 text-[16px] leading-[1.85] text-on-surface-variant">
                  {contextQuestion.context.split("\n\n").map((para, i) => (
                    <MathText key={i} as="p">{para}</MathText>
                  ))}
                </article>
              ) : null}
            </div>
          </div>
        </div>

        <div className="flex w-105 shrink-0 flex-col gap-3.5">
          <div className="flex-1 overflow-y-auto rounded-[28px] bg-white p-6 shadow-[0_12px_40px_rgba(25,28,30,0.04)] [scrollbar-color:var(--color-surface-container-highest)_transparent] [scrollbar-width:thin]">
            <div className="mb-4.5 flex items-center gap-2.5">
              <div className="flex h-9.5 w-9.5 shrink-0 items-center justify-center rounded-full bg-[#d0e1fb] text-[13px] font-black text-[#54647a]">
                {currentIndex + 1}
              </div>
              <span className="text-[11px] font-bold uppercase tracking-[0.28em] text-secondary">
                Enunciado
              </span>
            </div>

            {isBlock && currentUnit && (
              <div className="mb-5 rounded-[20px] bg-surface-container-low p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-secondary">
                      Bloque de preguntas
                    </p>
                    <p className="mt-1 text-sm font-semibold text-on-surface">
                      Subpregunta {blockPosition} de {blockSize}
                    </p>
                  </div>
                  <p className="text-[12px] font-semibold text-secondary">{blockProgressPct}% del bloque</p>
                </div>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-300"
                    style={{ width: `${blockProgressPct}%` }}
                  />
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {currentUnit.indices.map((questionIndex, chipIndex) => {
                    const chipQuestion = questions[questionIndex];
                    const answered = Boolean(answers[chipQuestion.question_id]);
                    const active = questionIndex === currentIndex;
                    return (
                      <button
                        key={chipQuestion.question_id}
                        type="button"
                        onClick={() => {
                          void goToIndex(questionIndex);
                        }}
                        className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-[12px] font-bold transition ${
                          active
                            ? "bg-primary text-white"
                            : answered
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-white text-secondary hover:bg-surface-container-high"
                        }`}
                      >
                        {chipIndex + 1}
                        {answered && !active && (
                          <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                            check
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <MathText as="p" className="mb-5 text-[16px] font-medium leading-[1.65] text-on-surface">
              {currentQ.stem.replace(/\[BLANK\]/gi, '[_________________]')}
            </MathText>

            {isCurrentCloze ? (
              <div className="rounded-[18px] bg-surface-container-low p-4 text-sm leading-relaxed text-on-surface-variant">
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
                    className={`flex w-full items-start gap-3 rounded-[14px] border-2 px-4 py-3 text-left transition-all duration-150 ${
                      isSelected
                        ? "border-primary/20 bg-[#d0e1fb]"
                        : "border-transparent bg-surface-container-low hover:border-primary/15 hover:bg-white"
                    }`}
                  >
                    <div
                      className={`flex h-7.5 w-7.5 shrink-0 items-center justify-center rounded-[9px] border text-[12px] font-bold transition ${
                        isSelected
                          ? "border-primary bg-primary text-white"
                          : "border-outline-variant/35 bg-white"
                      }`}
                    >
                      {displayLetter}
                    </div>
                    <MathText
                      as="p"
                      className={`text-[14px] leading-relaxed ${
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
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={goPrev}
              disabled={currentIndex === 0}
              className="flex h-14 flex-1 items-center justify-center gap-1.5 rounded-[14px] bg-surface-container-high text-[14px] font-bold text-on-surface transition hover:bg-surface-container-highest disabled:opacity-40"
            >
              <span className="material-symbols-outlined">chevron_left</span>
              {prevButtonLabel}
            </button>

            {isLast ? (
              <button
                type="button"
                onClick={() => void finish()}
                className="flex h-14 flex-[1.4] items-center justify-center gap-2 rounded-[14px] bg-linear-to-br from-[#047857] to-[#059669] text-[14px] font-bold text-white shadow-[0_8px_24px_rgba(0,74,198,0.25)] transition hover:opacity-92"
              >
                Finalizar
                <span className="material-symbols-outlined">check</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void goNext()}
                className="flex h-14 flex-[1.4] items-center justify-center gap-2 rounded-[14px] bg-linear-to-br from-primary to-primary-container text-[14px] font-bold text-white shadow-[0_8px_24px_rgba(0,74,198,0.25)] transition hover:opacity-92"
              >
                {nextButtonLabel}
                <span className="material-symbols-outlined">chevron_right</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
