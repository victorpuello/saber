import { useCallback, useEffect, useRef, useState } from "react";
import type { AuthFetch } from "../services/dashboard";
import { isApiError } from "../services/api";
import type { ExamQuestionSafe, SessionOut } from "../services/examSession";
import {
  fetchSessionQuestions,
  finishExamSession,
  startExamSession,
  submitAnswer,
} from "../services/examSession";

type SessionPhase = "loading" | "active" | "finished" | "error";

export interface ExamSessionMeta {
  title: string;
  exam_type: string;
  time_limit_minutes: number | null;
}

export interface UseExamSessionResult {
  phase: SessionPhase;
  session: SessionOut | null;
  questions: ExamQuestionSafe[];
  currentIndex: number;
  answers: Record<string, string>; // question_id → selected letter
  timeElapsedSeconds: number;
  timeRemainingSeconds: number | null; // null if no time limit
  errorMessage: string | null;
  errorTitle: string;
  selectAnswer: (letter: string) => void;
  goNext: () => Promise<void>;
  goPrev: () => void;
  goToIndex: (index: number) => Promise<void>;
  finish: () => Promise<void>;
}

export function useExamSession(
  authFetch: AuthFetch,
  examId: string,
  examMeta: ExamSessionMeta,
): UseExamSessionResult {
  const [phase, setPhase] = useState<SessionPhase>("loading");
  const [session, setSession] = useState<SessionOut | null>(null);
  const [questions, setQuestions] = useState<ExamQuestionSafe[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorTitle, setErrorTitle] = useState("No se pudo iniciar");
  const [timeElapsedSeconds, setTimeElapsedSeconds] = useState(0);

  const timeLimitSeconds = examMeta.time_limit_minutes !== null
    ? examMeta.time_limit_minutes * 60
    : null;

  // Track when each question started (for time_spent_seconds)
  const questionStartRef = useRef<number>(Date.now());
  // submittedRef: successfully posted to backend (or 409 = already there)
  const submittedRef = useRef<Set<string>>(new Set());
  // submittingRef: in-flight request guard (prevents concurrent double-POSTs)
  const submittingRef = useRef<Set<string>>(new Set());
  const isFinishingRef = useRef(false);
  const sessionTimedOutRef = useRef(false);

  // ── Boot: start session directly with given examId ──────────────
  useEffect(() => {
    let cancelled = false;

    async function boot() {
      try {
        const newSession = await startExamSession(authFetch, examId);
        if (cancelled) return;

        const qs = await fetchSessionQuestions(authFetch, newSession.id);
        if (cancelled) return;

        setSession(newSession);
        setQuestions(qs);
        questionStartRef.current = Date.now();
        setPhase("active");
      } catch (err) {
        if (!cancelled) {
          setErrorTitle("No se pudo iniciar");
          setErrorMessage(
            err instanceof Error ? err.message : "No se pudo iniciar el examen.",
          );
          setPhase("error");
        }
      }
    }

    void boot();
    return () => { cancelled = true; };
  }, [authFetch, examId]);

  // ── Timer ────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== "active") return;
    const id = setInterval(() => setTimeElapsedSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [phase]);

  // ── Auto-finish when time limit reached ──────────────────────────
  useEffect(() => {
    if (timeLimitSeconds === null || phase !== "active") return;
    if (timeElapsedSeconds >= timeLimitSeconds) {
      void finish();
    }
  // finish is stable (useCallback with stable deps), but including it in
  // the dep array would cause infinite loops — eslint-disable is intentional
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeElapsedSeconds, timeLimitSeconds, phase]);

  const timeRemainingSeconds =
    timeLimitSeconds !== null
      ? Math.max(0, timeLimitSeconds - timeElapsedSeconds)
      : null;

  // ── Select answer for current question ──────────────────────────
  const selectAnswer = useCallback(
    (letter: string) => {
      const q = questions[currentIndex];
      if (!q) return;
      setAnswers((prev) => ({ ...prev, [q.question_id]: letter }));
    },
    [questions, currentIndex],
  );

  // ── Submit a single question answer to backend ───────────────────
  const submitOne = useCallback(async (
    sessionId: string,
    questionId: string,
    letter: string,
    elapsed: number,
  ) => {
    if (sessionTimedOutRef.current) return;
    if (submittedRef.current.has(questionId)) return;
    if (submittingRef.current.has(questionId)) return;

    submittingRef.current.add(questionId);
    try {
      await submitAnswer(authFetch, sessionId, questionId, letter, elapsed);
      submittedRef.current.add(questionId);
    } catch (err: unknown) {
      if (isApiError(err) && err.status === 409) {
        // Duplicate — already in backend, treat as success
        submittedRef.current.add(questionId);
      } else if (isApiError(err) && err.status === 410) {
        // Session timed out server-side — stop retrying all pending answers
        sessionTimedOutRef.current = true;
        submittedRef.current.add(questionId);
      }
      // Other errors: do NOT mark submitted — finish() will retry
    } finally {
      submittingRef.current.delete(questionId);
    }
  }, [authFetch]);

  // ── Submit current answer to backend silently ────────────────────
  const submitCurrent = useCallback(async () => {
    if (!session) return;
    const q = questions[currentIndex];
    if (!q) return;
    const letter = answers[q.question_id];
    if (!letter) return;
    const elapsed = Math.round((Date.now() - questionStartRef.current) / 1000);
    await submitOne(session.id, q.question_id, letter, elapsed);
  }, [session, questions, currentIndex, answers, submitOne]);

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

  const goToIndex = useCallback(async (index: number) => {
    const nextIndex = Math.max(0, Math.min(index, questions.length - 1));
    if (nextIndex === currentIndex) {
      return;
    }
    await submitCurrent();
    setCurrentIndex(nextIndex);
    questionStartRef.current = Date.now();
  }, [currentIndex, questions.length, submitCurrent]);

  // ── Finish session ───────────────────────────────────────────────
  const finish = useCallback(async () => {
    if (!session || isFinishingRef.current) return;
    isFinishingRef.current = true;

    // Skip pending submits if session already timed out server-side (all would 410)
    if (!sessionTimedOutRef.current) {
      const pendingSubmits = questions
        .filter((q) => answers[q.question_id] && !submittedRef.current.has(q.question_id))
        .map((q) => submitOne(session.id, q.question_id, answers[q.question_id], 0));
      await Promise.allSettled(pendingSubmits);
    }

    try {
      const finished = await finishExamSession(authFetch, session.id);
      setSession(finished);
      setPhase("finished");
    } catch (err) {
      setErrorTitle("No se pudo finalizar");
      setErrorMessage(
        err instanceof Error ? err.message : "No se pudo finalizar la sesión.",
      );
      isFinishingRef.current = false;
      setPhase("error");
    }
  }, [authFetch, session, questions, answers, submitOne]);

  return {
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
  };
}
