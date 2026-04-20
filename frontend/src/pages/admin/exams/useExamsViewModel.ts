import { useState, useCallback, useEffect, useRef } from "react";
import { useAuth } from "../../../context/AuthContext";
import {
  listExams,
  createExam,
  archiveExam,
  getExamQuestionIds,
  type ExamOut,
  type CreateExamPayload,
} from "../../../services/examSession";
import type { ExamRow, ExamMetric, ExamsFiltersState } from "./types";

const PAGE_SIZE = 15;

function mapExamOutToRow(exam: ExamOut): ExamRow {
  return {
    id: exam.id,
    title: exam.title,
    exam_type: exam.exam_type,
    area_code: exam.area_code,
    total_questions: exam.total_questions,
    time_limit_minutes: exam.time_limit_minutes,
    status: exam.status,
    is_adaptive: exam.is_adaptive,
    created_at: exam.created_at,
  };
}

function buildMetrics(all: number, sims: number, area: number, custom: number): ExamMetric[] {
  return [
    { id: "total", label: "Total Activos",         value: String(all),    icon: "quiz",       variant: "default" },
    { id: "sims",  label: "Simulacros Completos",   value: String(sims),   icon: "assessment", variant: "success" },
    { id: "area",  label: "Práctica por Área",      value: String(area),   icon: "category",   variant: "warning" },
    { id: "custom",label: "Personalizados",          value: String(custom), icon: "tune",       variant: "ai" },
  ];
}

export function useExamsViewModel() {
  const { authFetch } = useAuth();

  // Data
  const [exams, setExams] = useState<ExamRow[]>([]);
  const [totalExams, setTotalExams] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [metrics, setMetrics] = useState<ExamMetric[]>(buildMetrics(0, 0, 0, 0));

  // UI state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);

  // Filters
  const [filters, setFilters] = useState<ExamsFiltersState>({
    exam_type: "",
    area_code: "",
    status: "ACTIVE",
    search: "",
  });

  // Selected exam for drawer
  const [selectedExam, setSelectedExam] = useState<ExamRow | null>(null);
  const [selectedExamQuestionIds, setSelectedExamQuestionIds] = useState<
    Array<{ question_id: string; position: number }> | null
  >(null);
  const [loadingQuestionIds, setLoadingQuestionIds] = useState(false);

  const mountedRef = useRef(true);

  // ── Load exams ────────────────────────────────────────────────────

  const loadExams = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listExams(authFetch, {
        exam_type: filters.exam_type || undefined,
        area_code: filters.area_code || undefined,
        status:    filters.status    || undefined,
        page:      currentPage,
        page_size: PAGE_SIZE,
      });
      if (!mountedRef.current) return;

      // Client-side search filter on title
      const rows = data.items
        .map(mapExamOutToRow)
        .filter((r) =>
          filters.search.trim() === "" ||
          r.title.toLowerCase().includes(filters.search.toLowerCase()),
        );

      setExams(rows);
      setTotalExams(data.total);
      setTotalPages(Math.max(1, data.pages));
    } catch (e: unknown) {
      if (!mountedRef.current) return;
      setError(e instanceof Error ? e.message : "Error al cargar exámenes");
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [authFetch, filters, currentPage]);

  // ── Load metrics ──────────────────────────────────────────────────

  const loadMetrics = useCallback(async () => {
    try {
      const [all, sims, area, custom] = await Promise.all([
        listExams(authFetch, { status: "ACTIVE", page_size: 1 }),
        listExams(authFetch, { status: "ACTIVE", exam_type: "FULL_SIMULATION", page_size: 1 }),
        listExams(authFetch, { status: "ACTIVE", exam_type: "AREA_PRACTICE",   page_size: 1 }),
        listExams(authFetch, { status: "ACTIVE", exam_type: "CUSTOM",          page_size: 1 }),
      ]);
      if (mountedRef.current) {
        setMetrics(buildMetrics(all.total, sims.total, area.total, custom.total));
      }
    } catch {
      // metrics are non-critical
    }
  }, [authFetch]);

  useEffect(() => {
    mountedRef.current = true;
    loadExams();
    loadMetrics();
    return () => {
      mountedRef.current = false;
    };
  }, [loadExams, loadMetrics]);

  // ── Filter actions ────────────────────────────────────────────────

  const updateFilter = useCallback(
    (key: keyof ExamsFiltersState, value: string) => {
      setFilters((prev) => ({ ...prev, [key]: value }));
      setCurrentPage(1);
    },
    [],
  );

  const clearFilters = useCallback(() => {
    setFilters({ exam_type: "", area_code: "", status: "ACTIVE", search: "" });
    setCurrentPage(1);
  }, []);

  // ── Select exam (opens drawer + loads question IDs) ──────────────

  const handleSelectExam = useCallback(
    async (exam: ExamRow) => {
      setSelectedExam(exam);
      setSelectedExamQuestionIds(null);
      setLoadingQuestionIds(true);
      try {
        const ids = await getExamQuestionIds(authFetch, exam.id);
        if (mountedRef.current) setSelectedExamQuestionIds(ids);
      } catch {
        if (mountedRef.current) setSelectedExamQuestionIds([]);
      } finally {
        if (mountedRef.current) setLoadingQuestionIds(false);
      }
    },
    [authFetch],
  );

  // ── Archive exam ──────────────────────────────────────────────────

  const handleArchive = useCallback(
    async (examId: string) => {
      try {
        await archiveExam(authFetch, examId);
        if (mountedRef.current) {
          setSelectedExam(null);
          setSelectedExamQuestionIds(null);
          await loadExams();
          await loadMetrics();
        }
      } catch (e: unknown) {
        if (mountedRef.current) {
          setError(e instanceof Error ? e.message : "Error al archivar");
        }
      }
    },
    [authFetch, loadExams, loadMetrics],
  );

  // ── Create exam ───────────────────────────────────────────────────

  const handleCreateExam = useCallback(
    async (payload: CreateExamPayload) => {
      await createExam(authFetch, payload);
      await loadExams();
      await loadMetrics();
    },
    [authFetch, loadExams, loadMetrics],
  );

  // ── Computed ──────────────────────────────────────────────────────

  const visibleStart = totalExams === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const visibleEnd   = Math.min(currentPage * PAGE_SIZE, totalExams);

  return {
    // Data
    exams,
    totalExams,
    totalPages,
    metrics,

    // UI state
    loading,
    error,

    // Pagination
    currentPage,
    setCurrentPage,
    visibleStart,
    visibleEnd,

    // Filters
    filters,
    updateFilter,
    clearFilters,

    // Selected exam
    selectedExam,
    setSelectedExam,
    selectedExamQuestionIds,
    loadingQuestionIds,

    // Actions
    handleSelectExam,
    handleArchive,
    handleCreateExam,
    refresh: loadExams,
  };
}
