import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import type { QBMetric, QuestionRow, QBFiltersState, AreaCode, Difficulty } from "./types";
import type { QuestionStatusBackend, AreaSummary } from "./questionFormTypes";
import type { QuestionOut } from "./questionFormTypes";
import { useAuth } from "../../../context/AuthContext";
import {
  listQuestions,
  getQuestion,
  fetchQuestionStats,
  fetchAreas,
  reviewQuestion,
  submitForReview,
  type QuestionStats,
} from "../../../services/questions";

// ── Mapeo de status backend → frontend ────────────────────────────────
const STATUS_MAP: Record<string, QuestionRow["status"]> = {
  DRAFT: "BORRADOR",
  PENDING_REVIEW: "PENDIENTE",
  APPROVED: "APROBADO",
  REJECTED: "BORRADOR",   // show rejected as BORRADOR in UI
  ARCHIVED: "BORRADOR",
};

const STATUS_REVERSE: Record<string, QuestionStatusBackend> = {
  APROBADO: "APPROVED",
  PENDIENTE: "PENDING_REVIEW",
  BORRADOR: "DRAFT",
};

// ── Mapeo de area_code → frontend metadata ────────────────────────────
const AREA_CODE_MAP: Record<string, { name: string; code: AreaCode }> = {
  LC:  { name: "Lectura Crítica", code: "LEC" },
  MAT: { name: "Matemáticas", code: "MAT" },
  SC:  { name: "Sociales y Ciudadanas", code: "SOC" },
  CN:  { name: "Ciencias Naturales", code: "NAT" },
  ING: { name: "Inglés", code: "ING" },
};

function difficultyFromEstimated(d: number | null): Difficulty {
  if (d === null) return "Media";
  if (d <= 0.3) return "Baja";
  if (d <= 0.7) return "Media";
  return "Alta";
}

function mapQuestionOutToRow(q: QuestionOut, areaLookup: Map<string, AreaSummary>): QuestionRow {
  const areaSummary = areaLookup.get(q.area_id);
  const areaInfo = areaSummary
    ? (AREA_CODE_MAP[areaSummary.code] ?? { name: areaSummary.name, code: "MAT" as AreaCode })
    : { name: "—", code: "MAT" as AreaCode };

  const areaCode = areaSummary?.code ?? "MAT";
  const seqNum = String(q.times_used || 1).padStart(4, "0");
  const code = `${areaCode}-${seqNum}`;

  const isAI = q.source === "AI";

  return {
    id: q.id,
    code,
    area: areaInfo.name,
    areaCode: areaInfo.code,
    competencia: q.cognitive_process ?? "—",
    enunciado: q.stem.length > 80 ? q.stem.slice(0, 80) + "…" : q.stem,
    authorName: isAI ? "ScholarAI" : "Manual",
    authorInitial: isAI ? "AI" : "M",
    status: STATUS_MAP[q.status] ?? "BORRADOR",
    performance: q.discrimination_index != null ? Math.round(Number(q.discrimination_index) * 100) : null,
    difficulty: difficultyFromEstimated(q.difficulty_estimated != null ? Number(q.difficulty_estimated) : null),
    context: q.context,
    stem: q.stem,
    options: [
      { letter: "A", text: q.option_a, correct: q.correct_answer === "A" },
      { letter: "B", text: q.option_b, correct: q.correct_answer === "B" },
      { letter: "C", text: q.option_c, correct: q.correct_answer === "C" },
      ...(q.option_d ? [{ letter: "D", text: q.option_d, correct: q.correct_answer === "D" }] : []),
    ],
  };
}

// ── Options dropdown ──────────────────────────────────────────────────
const ESTADO_OPTIONS = ["Cualquier Estado", "APROBADO", "PENDIENTE", "BORRADOR"];
const DIFICULTAD_OPTIONS = ["Todas", "Baja (0–0.3)", "Media (0.3–0.7)", "Alta (0.7–1)"];

const ITEMS_PER_PAGE = 10;

// ── Metrics builder ───────────────────────────────────────────────────
function buildMetrics(stats: QuestionStats | null): QBMetric[] {
  if (!stats) {
    return [
      { id: "total", label: "Total Preguntas", value: "—", icon: "quiz", variant: "default" },
      { id: "pending", label: "Pendiente Revisión", value: "—", icon: "pending_actions", variant: "warning" },
      { id: "approved", label: "Aprobadas", value: "—", icon: "check_circle", variant: "success" },
      { id: "ai", label: "Generadas con IA", value: "—", icon: "auto_awesome", variant: "ai" },
    ];
  }

  const total = stats.total;
  const pending = stats.by_status["PENDING_REVIEW"] ?? 0;
  const approved = stats.by_status["APPROVED"] ?? 0;
  const ai = stats.by_source["AI"] ?? 0;
  const aiPct = total > 0 ? Math.round((ai / total) * 100) : 0;

  return [
    {
      id: "total",
      label: "Total Preguntas",
      value: total.toLocaleString("es-CO"),
      icon: "quiz",
      variant: "default",
      helper: "banco completo",
    },
    {
      id: "pending",
      label: "Pendientes",
      value: String(pending),
      icon: "pending_actions",
      variant: "warning",
      helper: "requieren revisión",
    },
    {
      id: "approved",
      label: "Aprobadas",
      value: approved.toLocaleString("es-CO"),
      icon: "check_circle",
      variant: "success",
    },
    {
      id: "ai",
      label: "Generadas por IA",
      value: ai.toLocaleString("es-CO"),
      icon: "auto_awesome",
      variant: "ai",
      helper: `${aiPct}% del banco`,
    },
  ];
}

// ══════════════════════════════════════════════════════════════════════
export function useQuestionBankViewModel() {
  const { authFetch } = useAuth();

  // Areas for filter dropdown
  const [areas, setAreas] = useState<AreaSummary[]>([]);
  const areaLookup = useMemo(() => new Map(areas.map((a) => [a.id, a])), [areas]);

  // Questions data
  const [questions, setQuestions] = useState<QuestionRow[]>([]);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  // Stats
  const [stats, setStats] = useState<QuestionStats | null>(null);

  // Filters
  const areaOptions = useMemo(
    () => ["Todas las Áreas", ...areas.map((a) => a.name)],
    [areas],
  );
  const [filters, setFilters] = useState<QBFiltersState>({
    area: "Todas las Áreas",
    competencia: "",
    dificultad: DIFICULTAD_OPTIONS[0],
    estado: ESTADO_OPTIONS[0],
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");

  // Loading guard
  const loadingRef = useRef(false);

  // ── Load areas + stats on mount ────────────────────────────────────
  useEffect(() => {
    fetchAreas(authFetch).then(setAreas).catch(() => {});
    fetchQuestionStats(authFetch).then(setStats).catch(() => {});
  }, [authFetch]);

  // ── Load questions when filters/page change ────────────────────────
  useEffect(() => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);

    // Resolve area_id from filter name
    const selectedArea =
      filters.area !== "Todas las Áreas"
        ? areas.find((a) => a.name === filters.area)
        : undefined;

    // Map frontend status to backend
    const statusBE =
      filters.estado !== ESTADO_OPTIONS[0]
        ? STATUS_REVERSE[filters.estado]
        : undefined;

    listQuestions(authFetch, {
      area_id: selectedArea?.id,
      status: statusBE,
      page: currentPage,
      page_size: ITEMS_PER_PAGE,
    })
      .then((res) => {
        // For each summary we need full question data; load details concurrently
        return Promise.all(
          res.items.map((s) => getQuestion(authFetch, s.id))
        ).then((fullQuestions) => ({
          rows: fullQuestions.map((q) => mapQuestionOutToRow(q, areaLookup)),
          total: res.total,
          pages: res.pages,
        }));
      })
      .then(({ rows, total, pages }) => {
        setQuestions(rows);
        setTotalQuestions(total);
        setTotalPages(Math.max(1, pages));
      })
      .catch(() => {
        // API down — keep existing data
      })
      .finally(() => {
        setLoading(false);
        loadingRef.current = false;
      });
  }, [authFetch, filters.area, filters.estado, currentPage, areas, areaLookup]);

  // ── Client-side search on loaded questions ─────────────────────────
  const displayedQuestions = useMemo(() => {
    if (!searchQuery.trim()) return questions;
    const q = searchQuery.trim().toLowerCase();
    return questions.filter(
      (r) =>
        r.code.toLowerCase().includes(q) ||
        r.enunciado.toLowerCase().includes(q) ||
        r.stem.toLowerCase().includes(q),
    );
  }, [questions, searchQuery]);

  const visibleStart = totalQuestions === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1;
  const visibleEnd = Math.min(currentPage * ITEMS_PER_PAGE, totalQuestions);

  // ── Filter helpers ─────────────────────────────────────────────────
  const updateFilter = useCallback(<K extends keyof QBFiltersState>(key: K, value: QBFiltersState[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({
      area: "Todas las Áreas",
      competencia: "",
      dificultad: DIFICULTAD_OPTIONS[0],
      estado: ESTADO_OPTIONS[0],
    });
    setSearchQuery("");
    setCurrentPage(1);
  }, []);

  // ── Actions ────────────────────────────────────────────────────────
  const refreshData = useCallback(() => {
    // Force re-fetch by toggling a dummy state
    setCurrentPage((p) => p);
    fetchQuestionStats(authFetch).then(setStats).catch(() => {});
    // Re-trigger question load
    loadingRef.current = false;
    const selectedArea =
      filters.area !== "Todas las Áreas"
        ? areas.find((a) => a.name === filters.area)
        : undefined;
    const statusBE =
      filters.estado !== ESTADO_OPTIONS[0]
        ? STATUS_REVERSE[filters.estado]
        : undefined;

    setLoading(true);
    listQuestions(authFetch, {
      area_id: selectedArea?.id,
      status: statusBE,
      page: currentPage,
      page_size: ITEMS_PER_PAGE,
    })
      .then((res) =>
        Promise.all(res.items.map((s) => getQuestion(authFetch, s.id))).then((full) => ({
          rows: full.map((q) => mapQuestionOutToRow(q, areaLookup)),
          total: res.total,
          pages: res.pages,
        })),
      )
      .then(({ rows, total, pages }) => {
        setQuestions(rows);
        setTotalQuestions(total);
        setTotalPages(Math.max(1, pages));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [authFetch, filters.area, filters.estado, currentPage, areas, areaLookup]);

  const handleReview = useCallback(
    async (questionId: string, action: "APPROVE" | "REJECT", notes?: string) => {
      await reviewQuestion(authFetch, questionId, action, notes);
      refreshData();
    },
    [authFetch, refreshData],
  );

  const handleSubmitForReview = useCallback(
    async (questionId: string) => {
      await submitForReview(authFetch, questionId);
      refreshData();
    },
    [authFetch, refreshData],
  );

  return {
    metrics: buildMetrics(stats),
    questions: displayedQuestions,
    loading,
    filters,
    updateFilter,
    clearFilters,
    areaOptions,
    competenciaOptions: [] as string[],
    dificultadOptions: DIFICULTAD_OPTIONS,
    estadoOptions: ESTADO_OPTIONS,
    currentPage,
    totalPages,
    totalQuestions,
    visibleStart,
    visibleEnd,
    setCurrentPage,
    searchQuery,
    setSearchQuery,
    refreshData,
    handleReview,
    handleSubmitForReview,
  };
}
