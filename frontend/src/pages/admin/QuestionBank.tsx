import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import {
  cancelGenerationJob,
  deleteGenerationJob,
  listGenerationJobs,
  retryGenerationJob,
  type GenerationJob,
} from "../../services/aiJobs";
import { useQuestionBankViewModel } from "./questionBank/useQuestionBankViewModel";
import type { QuestionRow } from "./questionBank/types";
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

export default function QuestionBank() {
  const { authFetch } = useAuth();
  const vm = useQuestionBankViewModel();

  const [showNewManual, setShowNewManual] = useState(false);
  const [showAIGenerator, setShowAIGenerator] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState<QuestionRow | null>(null);
  const [editQuestionId, setEditQuestionId] = useState<string | null>(null);
  const [isTrayOpen, setIsTrayOpen] = useState(false);

  const [jobs, setJobs] = useState<GenerationJob[]>([]);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [jobsError, setJobsError] = useState("");
  const [actionLoadingJobId, setActionLoadingJobId] = useState<string | null>(null);

  const loadJobs = useCallback(async () => {
    setJobsLoading(true);
    try {
      const nextJobs = await listGenerationJobs(authFetch, { mineOnly: true, limit: 8 });
      setJobs(nextJobs);
      setJobsError("");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "No se pudieron cargar los jobs de IA";
      setJobsError(msg);
    } finally {
      setJobsLoading(false);
    }
  }, [authFetch]);

  useEffect(() => {
    let active = true;

    const refresh = async () => {
      if (!active) {
        return;
      }
      await loadJobs();
    };

    void refresh();
    const id = window.setInterval(() => {
      void refresh();
    }, 5000);

    return () => {
      active = false;
      window.clearInterval(id);
    };
  }, [loadJobs]);

  const handleCancelJob = useCallback(
    async (jobId: string) => {
      setActionLoadingJobId(jobId);
      try {
        await cancelGenerationJob(authFetch, jobId);
        await loadJobs();
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
        await loadJobs();
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
        areaOptions={vm.areaOptions}
        dificultadOptions={vm.dificultadOptions}
        estadoOptions={vm.estadoOptions}
        onUpdate={vm.updateFilter}
        onSearchChange={vm.setSearchQuery}
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
        selectedQuestionId={selectedQuestion?.id ?? null}
        onRowClick={(q) => setSelectedQuestion(q)}
      />

      {/* Drawer de detalle de pregunta */}
      <QuestionDetailDrawer
        question={selectedQuestion}
        onClose={() => setSelectedQuestion(null)}
        onEdit={(questionId) => {
          setSelectedQuestion(null);
          setEditQuestionId(questionId);
        }}
        onReview={async (id, action, notes) => {
          await vm.handleReview(id, action, notes);
          setSelectedQuestion(null);
        }}
        onSubmitForReview={async (id) => {
          await vm.handleSubmitForReview(id);
          setSelectedQuestion(null);
        }}
      />

      {/* Modal de nueva pregunta manual */}
      {showNewManual && (
        <NewManualQuestionModal
          onClose={() => setShowNewManual(false)}
          onSuccess={() => {
            setShowNewManual(false);
            vm.refreshData();
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
            vm.refreshData();
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
            void loadJobs();
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
        onRefresh={() => { void loadJobs(); }}
        onCancel={(jobId) => { void handleCancelJob(jobId); }}
        onRetry={(jobId) => { void handleRetryJob(jobId); }}
        onDelete={(jobId) => { void handleDeleteJob(jobId); }}
        actionLoadingJobId={actionLoadingJobId}
      />
    </div>
  );
}
