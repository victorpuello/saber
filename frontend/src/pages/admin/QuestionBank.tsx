import { useQuestionBankViewModel } from "./questionBank/useQuestionBankViewModel";
import {
  QBHero,
  QBMetricsGrid,
  QBFilters,
  QBTable,
  QBRecentActivity,
  QBScholarAIPromo,
} from "./questionBank/components";

export default function QuestionBank() {
  const vm = useQuestionBankViewModel();

  return (
    <div className="space-y-6">
      {/* Hero — breadcrumb, title, action buttons */}
      <QBHero
        onNewManual={() => {/* TODO: open modal */}}
        onGenerateAI={() => {/* TODO: open AI generator */}}
      />

      {/* Stats cards */}
      <QBMetricsGrid metrics={vm.metrics} />

      {/* Filters bar */}
      <QBFilters
        filters={vm.filters}
        areaOptions={vm.areaOptions}
        competenciaOptions={vm.competenciaOptions}
        dificultadOptions={vm.dificultadOptions}
        estadoOptions={vm.estadoOptions}
        onUpdate={vm.updateFilter}
        onClear={vm.clearFilters}
        onApply={() => {/* filters already live-bound */}}
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
      />

      {/* Bottom two-column: activity + ScholarAI promo */}
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <QBRecentActivity items={vm.activity} />
        <QBScholarAIPromo onExplore={() => {/* TODO: navigate to ScholarAI */}} />
      </div>
    </div>
  );
}
