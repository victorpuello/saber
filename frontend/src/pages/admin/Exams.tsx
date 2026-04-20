import { useState } from "react";
import ConfirmModal from "../../components/ConfirmModal";
import {
  ExamsHero,
  ExamsMetricsGrid,
  ExamsFilters,
  ExamsTable,
  ExamDetailDrawer,
  CreateExamModal,
} from "./exams/components";
import { useExamsViewModel } from "./exams/useExamsViewModel";

export default function AdminExams() {
  const vm = useExamsViewModel();
  const [showCreate, setShowCreate] = useState(false);
  const [archiveId, setArchiveId] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <ExamsHero onCreateExam={() => setShowCreate(true)} />

      <ExamsMetricsGrid metrics={vm.metrics} />

      <ExamsFilters
        filters={vm.filters}
        onUpdate={vm.updateFilter}
        onClear={vm.clearFilters}
      />

      {vm.error && (
        <div className="rounded-2xl bg-error-container px-4 py-3 text-sm font-medium text-error">
          {vm.error}
        </div>
      )}

      <ExamsTable
        exams={vm.exams}
        loading={vm.loading}
        currentPage={vm.currentPage}
        totalPages={vm.totalPages}
        totalExams={vm.totalExams}
        visibleStart={vm.visibleStart}
        visibleEnd={vm.visibleEnd}
        onPageChange={vm.setCurrentPage}
        selectedExamId={vm.selectedExam?.id ?? null}
        onRowClick={vm.handleSelectExam}
        onArchive={(id) => setArchiveId(id)}
      />

      <ExamDetailDrawer
        exam={vm.selectedExam}
        questionIds={vm.selectedExamQuestionIds}
        loadingQuestionIds={vm.loadingQuestionIds}
        onClose={() => vm.setSelectedExam(null)}
        onArchive={(id) => setArchiveId(id)}
      />

      {showCreate && (
        <CreateExamModal
          onClose={() => setShowCreate(false)}
          onCreateExam={vm.handleCreateExam}
          onSuccess={() => setShowCreate(false)}
        />
      )}

      {archiveId && (
        <ConfirmModal
          icon="archive"
          title="Archivar Examen"
          message="Este examen quedará archivado y no estará disponible para nuevas sesiones."
          confirmLabel="Sí, archivar"
          destructive
          onConfirm={async () => {
            await vm.handleArchive(archiveId);
            setArchiveId(null);
          }}
          onCancel={() => setArchiveId(null)}
        />
      )}
    </div>
  );
}
