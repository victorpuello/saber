import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import {
  cancelGenerationJob,
  deleteGenerationJob,
  listGenerationJobs,
  retryGenerationJob,
  type GenerationJob,
} from "../../services/aiJobs";
import { isApiError } from "../../services/api";
import { getQuestion, getQuestionBlock, listQuestionMedia } from "../../services/questions";
import { useQuestionBankViewModel } from "./questionBank/useQuestionBankViewModel";
import type { QuestionRow } from "./questionBank/types";
import type { QuestionBlockOut, QuestionMediaOut, QuestionOut } from "./questionBank/questionFormTypes";
import {
  QBHero,
  QBMetricsGrid,
  QBFilters,
  QBTable,
  QBJobsStatusBar,
  QBJobsTray,
  NewManualQuestionModal,
  GenerateAIModal,
  QuestionDetailDrawer,
} from "./questionBank/components";

const JOB_RATE_LIMIT_COOLDOWN_MS = 30_000;

function mapBackendStatusToRowStatus(status: QuestionOut["status"]): QuestionRow["status"] {
  if (status === "APPROVED") {
    return "APROBADO";
  }
  if (status === "PENDING_REVIEW") {
    return "PENDIENTE";
  }
  return "BORRADOR";
}

function isActiveJob(job: GenerationJob): boolean {
  return job.status === "QUEUED" || job.status === "RUNNING";
}

function difficultyFromEstimated(value: number | null): QuestionRow["difficulty"] {
  if (value === null) {
    return "Media";
  }
  if (value <= 0.3) {
    return "Baja";
  }
  if (value <= 0.7) {
    return "Media";
  }
  return "Alta";
}

function hydrateQuestionRow(question: QuestionRow, detail: QuestionOut): QuestionRow {
  const isAI = detail.source === "AI";

  return {
    ...question,
    competencia: detail.cognitive_process ?? question.competencia,
    enunciado: detail.stem.length > 80 ? detail.stem.slice(0, 80) + "…" : detail.stem,
    authorName: isAI ? "ScholarAI" : "Manual",
    authorInitial: isAI ? "AI" : "M",
    status: mapBackendStatusToRowStatus(detail.status),
    performance:
      detail.discrimination_index != null ? Math.round(Number(detail.discrimination_index) * 100) : null,
    difficulty: difficultyFromEstimated(
      detail.difficulty_estimated != null ? Number(detail.difficulty_estimated) : null,
    ),
    context: detail.context,
    contextType: detail.context_type,
    componentName: detail.component_name ?? null,
    tags: detail.tags ?? null,
    stem: detail.stem,
    options: [
      { letter: "A", text: detail.option_a, correct: detail.correct_answer === "A" },
      { letter: "B", text: detail.option_b, correct: detail.correct_answer === "B" },
      { letter: "C", text: detail.option_c, correct: detail.correct_answer === "C" },
      ...(detail.option_d
        ? [{ letter: "D", text: detail.option_d, correct: detail.correct_answer === "D" }]
        : []),
    ],
  };
}

export default function QuestionBank() {
  const { authFetch } = useAuth();
  const vm = useQuestionBankViewModel();

  const [showNewManual, setShowNewManual] = useState(false);
  const [showAIGenerator, setShowAIGenerator] = useState(false);
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [selectedQuestion, setSelectedQuestion] = useState<QuestionRow | null>(null);
  const [selectedBlock, setSelectedBlock] = useState<QuestionBlockOut | null>(null);
  const [selectedQuestionMedia, setSelectedQuestionMedia] = useState<QuestionMediaOut[]>([]);
  const [selectedQuestionLoading, setSelectedQuestionLoading] = useState(false);
  const [editQuestionId, setEditQuestionId] = useState<string | null>(null);
  const [editBlockId, setEditBlockId] = useState<string | null>(null);
  const [isTrayOpen, setIsTrayOpen] = useState(false);

  const [jobs, setJobs] = useState<GenerationJob[]>([]);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [jobsError, setJobsError] = useState("");
  const [actionLoadingJobId, setActionLoadingJobId] = useState<string | null>(null);
  const jobsRequestInFlightRef = useRef(false);
  const jobsRateLimitedUntilRef = useRef(0);
  const hasActiveJobs = jobs.some(isActiveJob);
  const shouldPollJobs = showAIGenerator || isTrayOpen || hasActiveJobs;

  const loadJobs = useCallback(async ({ force = false }: { force?: boolean } = {}) => {
    if (jobsRequestInFlightRef.current) {
      return;
    }

    if (!force && Date.now() < jobsRateLimitedUntilRef.current) {
      return;
    }

    jobsRequestInFlightRef.current = true;
    setJobsLoading(true);
    try {
      const nextJobs = await listGenerationJobs(authFetch, { mineOnly: true, limit: 8 });
      setJobs(nextJobs);
      setJobsError("");
      jobsRateLimitedUntilRef.current = 0;
    } catch (err) {
      if (isApiError(err) && err.status === 429) {
        jobsRateLimitedUntilRef.current = Date.now() + JOB_RATE_LIMIT_COOLDOWN_MS;
        setJobsError("Se pausó temporalmente la actualización automática de jobs por rate limiting.");
        return;
      }

      const msg = err instanceof Error ? err.message : "No se pudieron cargar los jobs de IA";
      setJobsError(msg);
    } finally {
      jobsRequestInFlightRef.current = false;
      setJobsLoading(false);
    }
  }, [authFetch]);

  useEffect(() => {
    void loadJobs({ force: true });
  }, [loadJobs]);

  useEffect(() => {
    if (!shouldPollJobs) {
      return;
    }

    let active = true;
    const intervalMs = hasActiveJobs || showAIGenerator ? 5000 : 15000;

    const refresh = async (force = false) => {
      if (!active || document.visibilityState !== "visible") {
        return;
      }
      await loadJobs({ force });
    };

    void refresh();

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void refresh(true);
      }
    };

    const id = window.setInterval(() => {
      void refresh();
    }, intervalMs);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      active = false;
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [hasActiveJobs, loadJobs, shouldPollJobs, showAIGenerator]);

  const handleSelectQuestion = useCallback(
    async (question: QuestionRow) => {
      setSelectedRowId(question.id);
      setSelectedQuestion(question);
      setSelectedBlock(null);
      setSelectedQuestionMedia([]);
      setSelectedQuestionLoading(true);

      if (question.structureType === "QUESTION_BLOCK" && question.blockId) {
        try {
          const detail = await getQuestionBlock(authFetch, question.blockId);
          setSelectedBlock(detail);
          const ownerQuestionId = detail.items[0]?.id;
          if (ownerQuestionId) {
            const media = await listQuestionMedia(authFetch, ownerQuestionId);
            setSelectedQuestionMedia(media);
          }
        } finally {
          setSelectedQuestionLoading(false);
        }
        return;
      }

      try {
        const [detail, media] = await Promise.all([
          getQuestion(authFetch, question.id),
          listQuestionMedia(authFetch, question.id),
        ]);
        setSelectedQuestion((current) => {
          if (!current || current.id !== question.id) {
            return current;
          }
          return hydrateQuestionRow(current, detail);
        });
        setSelectedQuestionMedia(media);
      } finally {
        setSelectedQuestionLoading(false);
      }
    },
    [authFetch],
  );

  const handleCancelJob = useCallback(
    async (jobId: string) => {
      setActionLoadingJobId(jobId);
      try {
        await cancelGenerationJob(authFetch, jobId);
        await loadJobs({ force: true });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "No se pudo cancelar el job";
        setJobsError(msg);
      } finally {
        setActionLoadingJobId(null);
      }
    },
    [authFetch, loadJobs],
  );

  const handleRetryJob = useCallback(
    async (jobId: string) => {
      setActionLoadingJobId(jobId);
      try {
        await retryGenerationJob(authFetch, jobId);
        await loadJobs({ force: true });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "No se pudo reintentar el job";
        setJobsError(msg);
      } finally {
        setActionLoadingJobId(null);
      }
    },
    [authFetch, loadJobs],
  );

  const handleDeleteJob = useCallback(
    async (jobId: string) => {
      setActionLoadingJobId(jobId);
      try {
        await deleteGenerationJob(authFetch, jobId);
        setJobs((prev) => prev.filter((j) => j.id !== jobId));
      } catch (err) {
        const msg = err instanceof Error ? err.message : "No se pudo eliminar el job";
        setJobsError(msg);
      } finally {
        setActionLoadingJobId(null);
      }
    },
    [authFetch],
  );

  return (
    <div className="space-y-6">
      {/* Hero — breadcrumb, title, action buttons */}
      <QBHero
        onNewManual={() => setShowNewManual(true)}
        onGenerateAI={() => setShowAIGenerator(true)}
      />

      {/* Stats cards */}
      <QBMetricsGrid metrics={vm.metrics} />

      {/* Jobs IA — barra de estado compacta (solo visible si hay jobs) */}
      <QBJobsStatusBar
        jobs={jobs}
        loading={jobsLoading}
        onOpenTray={() => setIsTrayOpen(true)}
      />

      {/* Filters bar */}
      <QBFilters
        filters={vm.filters}
        searchQuery={vm.searchQuery}
        tagFilter={vm.tagFilter}
        areaOptions={vm.areaOptions}
        dificultadOptions={vm.dificultadOptions}
        estadoOptions={vm.estadoOptions}
        onUpdate={vm.updateFilter}
        onSearchChange={vm.setSearchQuery}
        onTagFilterChange={vm.setTagFilter}
        onClear={vm.clearFilters}
      />

      {/* Questions table */}
      <QBTable
        questions={vm.questions}
        currentPage={vm.currentPage}
        totalPages={vm.totalPages}
        totalQuestions={vm.totalQuestions}
        visibleStart={vm.visibleStart}
        visibleEnd={vm.visibleEnd}
        onPageChange={vm.setCurrentPage}
        selectedQuestionId={selectedRowId}
        onRowClick={(q) => { void handleSelectQuestion(q); }}
      />

      {/* Drawer de detalle de pregunta */}
      <QuestionDetailDrawer
        question={selectedQuestion}
        block={selectedBlock}
        loading={selectedQuestionLoading}
        onClose={() => {
          setSelectedQuestion(null);
          setSelectedBlock(null);
          setSelectedQuestionMedia([]);
          setSelectedRowId(null);
        }}
        media={selectedQuestionMedia}
        onEdit={async (target) => {
          setSelectedQuestion(null);
          setSelectedBlock(null);
          setSelectedQuestionMedia([]);
          setSelectedRowId(null);
          if (target.type === "question") {
            setEditQuestionId(target.id);
            return;
          }
          setEditBlockId(target.id);
        }}
        onReview={async (target, action, notes) => {
          if (target.type === "question") {
            await vm.handleReview(target.id, action, notes);
          } else {
            await vm.handleReviewBlock(target.id, action, notes);
          }
          setSelectedQuestion(null);
          setSelectedBlock(null);
          setSelectedRowId(null);
        }}
        onSubmitForReview={async (target) => {
          if (target.type === "question") {
            await vm.handleSubmitForReview(target.id);
          } else {
            await vm.handleSubmitBlockForReview(target.id);
          }
          setSelectedQuestion(null);
          setSelectedBlock(null);
          setSelectedRowId(null);
        }}
        onDelete={async (questionId) => {
          await vm.handleDelete(questionId);
          setSelectedQuestion(null);
          setSelectedBlock(null);
          setSelectedRowId(null);
        }}
      />

      {/* Modal de nueva pregunta manual */}
      {showNewManual && (
        <NewManualQuestionModal
          onClose={() => setShowNewManual(false)}
          onSuccess={() => {
            setShowNewManual(false);
            void vm.refreshData();
          }}
        />
      )}

      {/* Modal de edición de pregunta */}
      {editQuestionId && (
        <NewManualQuestionModal
          editQuestionId={editQuestionId}
          onClose={() => setEditQuestionId(null)}
          onSuccess={() => {
            setEditQuestionId(null);
            void vm.refreshData();
          }}
        />
      )}

      {/* Modal de edición de bloque */}
      {editBlockId && (
        <NewManualQuestionModal
          editBlockId={editBlockId}
          onClose={() => setEditBlockId(null)}
          onSuccess={() => {
            setEditBlockId(null);
            void vm.refreshData();
          }}
        />
      )}

      {/* Modal de generación con IA */}
      {showAIGenerator && (
        <GenerateAIModal
          onClose={() => setShowAIGenerator(false)}
          onSuccess={() => {
            setShowAIGenerator(false);
            vm.refreshData();
            void loadJobs({ force: true });
            setIsTrayOpen(true);
          }}
        />
      )}

      {/* Bandeja flotante de jobs IA (esquina inferior derecha) */}
      <QBJobsTray
        isOpen={isTrayOpen}
        onToggle={() => setIsTrayOpen((v) => !v)}
        jobs={jobs}
        loading={jobsLoading}
        error={jobsError}
        onRefresh={() => { void loadJobs({ force: true }); }}
        onCancel={(jobId) => { void handleCancelJob(jobId); }}
        onRetry={(jobId) => { void handleRetryJob(jobId); }}
        onDelete={(jobId) => { void handleDeleteJob(jobId); }}
        actionLoadingJobId={actionLoadingJobId}
      />
    </div>
  );
}
