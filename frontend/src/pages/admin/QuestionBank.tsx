import { useState } from "react";
import { useQuestionBankViewModel } from "./questionBank/useQuestionBankViewModel";
import type { QuestionRow } from "./questionBank/types";
import {
  QBHero,
  QBMetricsGrid,
  QBFilters,
  QBTable,
  NewManualQuestionModal,
  GenerateAIModal,
  QuestionDetailDrawer,
} from "./questionBank/components";

export default function QuestionBank() {
  const vm = useQuestionBankViewModel();
  const [showNewManual, setShowNewManual] = useState(false);
  const [showAIGenerator, setShowAIGenerator] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState<QuestionRow | null>(null);
  const [editQuestionId, setEditQuestionId] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      {/* Hero — breadcrumb, title, action buttons */}
      <QBHero
        onNewManual={() => setShowNewManual(true)}
        onGenerateAI={() => setShowAIGenerator(true)}
      />

      {/* Stats cards */}
      <QBMetricsGrid metrics={vm.metrics} />

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
          }}
        />
      )}
    </div>
  );
}
