import { useCallback, useEffect, useRef, useState } from "react";
import type { AuthFetch } from "../../services/dashboard";
import type { ExamQuestionSafe, SessionOut } from "../../services/examSession";
import {
  fetchDiagnosticExams,
  fetchSessionQuestions,
  finishExamSession,
  startExamSession,
  submitAnswer,
} from "../../services/examSession";

type SessionPhase = "loading" | "active" | "finished" | "error";

export interface UseDiagnosticSessionResult {
  phase: SessionPhase;
  session: SessionOut | null;
  questions: ExamQuestionSafe[];
  currentIndex: number;
  answers: Record<string, string>; // question_id → selected letter
  timeElapsedSeconds: number;
  errorMessage: string | null;
  selectAnswer: (letter: string) => void;
  goNext: () => Promise<void>;
  goPrev: () => void;
  finish: () => Promise<void>;
}

export function useDiagnosticSession(
  authFetch: AuthFetch,
): UseDiagnosticSessionResult {
  const [phase, setPhase] = useState<SessionPhase>("loading");
  const [session, setSession] = useState<SessionOut | null>(null);
  const [questions, setQuestions] = useState<ExamQuestionSafe[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [timeElapsedSeconds, setTimeElapsedSeconds] = useState(0);

  // Track when each question started (for time_spent_seconds)
  const questionStartRef = useRef<number>(Date.now());
  // Submitted set to avoid double-posting
  const submittedRef = useRef<Set<string>>(new Set());
  const isFinishingRef = useRef(false);

  // ── Boot: find a DIAGNOSTIC exam and start session ──────────────
  useEffect(() => {
    let cancelled = false;

    async function boot() {
      try {
        const exams = await fetchDiagnosticExams(authFetch);
        if (cancelled) return;

        const target = exams[0];
        if (!target) {
          setErrorMessage("No hay exámenes diagnósticos disponibles en este momento.");
          setPhase("error");
          return;
        }

        const newSession = await startExamSession(authFetch, target.id);
        if (cancelled) return;

        const qs = await fetchSessionQuestions(authFetch, newSession.id);
        if (cancelled) return;

        setSession(newSession);
        setQuestions(qs);
        questionStartRef.current = Date.now();
        setPhase("active");
      } catch (err) {
        if (!cancelled) {
          setErrorMessage(
            err instanceof Error ? err.message : "No se pudo iniciar el diagnóstico.",
          );
          setPhase("error");
        }
      }
    }

    void boot();
    return () => { cancelled = true; };
  }, [authFetch]);

  // ── Timer ────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== "active") return;
    const id = setInterval(() => setTimeElapsedSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [phase]);

  // ── Select answer for current question ──────────────────────────
  const selectAnswer = useCallback(
    (letter: string) => {
      const q = questions[currentIndex];
      if (!q) return;
      setAnswers((prev) => ({ ...prev, [q.question_id]: letter }));
    },
    [questions, currentIndex],
  );

  // ── Submit current answer to backend silently ────────────────────
  const submitCurrent = useCallback(async () => {
    if (!session) return;
    const q = questions[currentIndex];
    if (!q) return;
    const letter = answers[q.question_id];
    if (!letter) return;
    if (submittedRef.current.has(q.question_id)) return;

    const elapsed = Math.round((Date.now() - questionStartRef.current) / 1000);
    submittedRef.current.add(q.question_id);

    try {
      await submitAnswer(authFetch, session.id, q.question_id, letter, elapsed);
    } catch {
      // Already answered (409) or other — we keep the local state
    }
  }, [authFetch, session, questions, currentIndex, answers]);

  // ── Navigate ─────────────────────────────────────────────────────
  const goNext = useCallback(async () => {
    await submitCurrent();
    setCurrentIndex((i) => Math.min(i + 1, questions.length - 1));
    questionStartRef.current = Date.now();
  }, [submitCurrent, questions.length]);

  const goPrev = useCallback(() => {
    setCurrentIndex((i) => Math.max(i - 1, 0));
    questionStartRef.current = Date.now();
  }, []);

  // ── Finish session ───────────────────────────────────────────────
  const finish = useCallback(async () => {
    if (!session || isFinishingRef.current) return;
    isFinishingRef.current = true;

    await submitCurrent();
    try {
      const finished = await finishExamSession(authFetch, session.id);
      setSession(finished);
      setPhase("finished");
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "No se pudo finalizar la sesión.",
      );
      setPhase("error");
    }
  }, [authFetch, session, submitCurrent]);

  return {
    phase,
    session,
    questions,
    currentIndex,
    answers,
    timeElapsedSeconds,
    errorMessage,
    selectAnswer,
    goNext,
    finish,
    goPrev,
  };
}
