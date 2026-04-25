import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import type { QBMetric, QuestionRow, QBFiltersState, AreaCode, Difficulty } from "./types";
import type { QuestionStatusBackend, AreaSummary } from "./questionFormTypes";
import { useAuth } from "../../../context/AuthContext";
import {
  listQuestions,
  fetchQuestionStats,
  fetchAreas,
  reviewQuestion,
  reviewQuestionBlock,
  submitForReview,
  submitBlockForReview,
  deleteQuestion,
  fetchEnglishAudit,
  type EnglishAudit,
  type QuestionSummary,
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

function mapQuestionSummaryToRow(
  question: QuestionSummary,
  areaLookup: Map<string, AreaSummary>,
  globalIndex: number,
): QuestionRow {
  const areaSummary = areaLookup.get(question.area_id);
  const areaInfo = areaSummary
    ? (AREA_CODE_MAP[areaSummary.code] ?? { name: areaSummary.name, code: "MAT" as AreaCode })
    : { name: "—", code: "MAT" as AreaCode };

  const areaCode = areaSummary?.code ?? "MAT";
  const unitPrefix = question.structure_type === "QUESTION_BLOCK" ? "B" : "Q";
  const code = `${areaCode}-${unitPrefix}${String(globalIndex).padStart(4, "0")}`;

  const isAI = question.source === "AI";
  const stem = question.stem;
  const isBlock = question.structure_type === "QUESTION_BLOCK";
  const summaryStem = isBlock
    ? `Bloque de ${question.block_size ?? 0} preguntas · ${stem}`
    : stem;

  return {
    id: question.id,
    code,
    area: areaInfo.name,
    areaCode: areaInfo.code,
    structureType: question.structure_type,
    blockId: question.block_id,
    blockSize: question.block_size,
    blockItemOrder: question.block_item_order,
    competencia: question.cognitive_process ?? "—",
    enunciado: summaryStem.length > 96 ? summaryStem.slice(0, 96) + "…" : summaryStem,
    authorName: isAI ? "ScholarAI" : "Manual",
    authorInitial: isAI ? "AI" : "M",
    status: STATUS_MAP[question.status] ?? "BORRADOR",
    performance:
      question.discrimination_index != null
        ? Math.round(Number(question.discrimination_index) * 100)
        : null,
    difficulty: difficultyFromEstimated(
      question.difficulty_estimated != null ? Number(question.difficulty_estimated) : null,
    ),
    context: "",
    stem,
    options: [],
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
  const [englishAudit, setEnglishAudit] = useState<EnglishAudit | null>(null);

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
    fetchEnglishAudit(authFetch).then(setEnglishAudit).catch(() => {});
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
      group_units: true,
      page: currentPage,
      page_size: ITEMS_PER_PAGE,
    })
      .then((res) => {
        setQuestions(
          res.items.map((question, idx) =>
            mapQuestionSummaryToRow(question, areaLookup, (currentPage - 1) * ITEMS_PER_PAGE + idx + 1),
          ),
        );
        setTotalQuestions(res.total);
        setTotalPages(Math.max(1, res.pages));
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
    fetchEnglishAudit(authFetch).then(setEnglishAudit).catch(() => {});
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
    return listQuestions(authFetch, {
      area_id: selectedArea?.id,
      status: statusBE,
      group_units: true,
      page: currentPage,
      page_size: ITEMS_PER_PAGE,
    })
      .then((res) => {
        setQuestions(
          res.items.map((question, idx) =>
            mapQuestionSummaryToRow(question, areaLookup, (currentPage - 1) * ITEMS_PER_PAGE + idx + 1),
          ),
        );
        setTotalQuestions(res.total);
        setTotalPages(Math.max(1, res.pages));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [authFetch, filters.area, filters.estado, currentPage, areas, areaLookup]);

  const handleReview = useCallback(
    async (questionId: string, action: "APPROVE" | "REJECT", notes?: string) => {
      await reviewQuestion(authFetch, questionId, action, notes);
      await refreshData();
    },
    [authFetch, refreshData],
  );

  const handleSubmitForReview = useCallback(
    async (questionId: string) => {
      await submitForReview(authFetch, questionId);
      await refreshData();
    },
    [authFetch, refreshData],
  );

  const handleReviewBlock = useCallback(
    async (blockId: string, action: "APPROVE" | "REJECT", notes?: string) => {
      await reviewQuestionBlock(authFetch, blockId, action, notes);
      await refreshData();
    },
    [authFetch, refreshData],
  );

  const handleSubmitBlockForReview = useCallback(
    async (blockId: string) => {
      await submitBlockForReview(authFetch, blockId);
      await refreshData();
    },
    [authFetch, refreshData],
  );

  const handleDelete = useCallback(
    async (questionId: string) => {
      await deleteQuestion(authFetch, questionId);
      await refreshData();
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
    englishAudit,
    handleReview,
    handleSubmitForReview,
    handleReviewBlock,
    handleSubmitBlockForReview,
    handleDelete,
  };
}
