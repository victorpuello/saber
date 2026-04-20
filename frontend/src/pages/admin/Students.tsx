import { useState } from "react";
import { useStudentsViewModel } from "./students/useStudentsViewModel";
import {
  StudentsHero,
  StudentsMetricsGrid,
  StudentsFilters,
  StudentsTable,
  StudentDetailDrawer,
  SyncStatusBar,
} from "./students/components";
import ConfirmModal from "../../components/ConfirmModal";
import type { StudentListItem } from "../../services/students";

export default function Students() {
  const vm = useStudentsViewModel();
  const [selectedStudent, setSelectedStudent] = useState<StudentListItem | null>(null);
  const [confirmRevoke, setConfirmRevoke] = useState<string | null>(null);
  const [confirmRestore, setConfirmRestore] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      {/* Hero — breadcrumb, title, sync button */}
      <StudentsHero onSync={vm.handleSync} syncing={vm.syncing} />

      {/* Sync status bar */}
      <SyncStatusBar syncStatus={vm.syncStatus} />

      {/* Stats cards */}
      <StudentsMetricsGrid stats={vm.stats} />

      {/* Filters bar */}
      <StudentsFilters
        filters={vm.filters}
        searchQuery={vm.searchQuery}
        onUpdate={vm.updateFilter}
        onSearchChange={vm.handleSearch}
        onClear={vm.clearFilters}
      />

      {/* Error banner */}
      {vm.error && (
        <div className="flex items-center gap-3 rounded-2xl bg-rose-50 px-5 py-3">
          <span className="material-symbols-outlined text-[18px] text-rose-600">error</span>
          <p className="text-sm text-rose-700">{vm.error}</p>
        </div>
      )}

      {/* Loading skeleton */}
      {vm.loading ? (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-14 animate-pulse rounded-2xl bg-surface-container-low" />
          ))}
        </div>
      ) : (
        <StudentsTable
          students={vm.students}
          currentPage={vm.currentPage}
          totalPages={vm.totalPages}
          totalStudents={vm.totalStudents}
          visibleStart={vm.visibleStart}
          visibleEnd={vm.visibleEnd}
          onPageChange={vm.setCurrentPage}
          sortBy={vm.sortBy}
          sortOrder={vm.sortOrder}
          onSort={vm.handleSort}
          selectedStudentId={selectedStudent?.id ?? null}
          onRowClick={(s) => setSelectedStudent(s)}
          onRevoke={(id) => setConfirmRevoke(id)}
          onRestore={(id) => setConfirmRestore(id)}
        />
      )}

      {/* Detail drawer */}
      <StudentDetailDrawer
        student={selectedStudent}
        onClose={() => setSelectedStudent(null)}
        onRevoke={(id) => {
          setSelectedStudent(null);
          setConfirmRevoke(id);
        }}
        onRestore={(id) => {
          setSelectedStudent(null);
          setConfirmRestore(id);
        }}
      />

      {/* Confirm revoke modal */}
      {confirmRevoke && (
        <ConfirmModal
          title="Revocar Credenciales"
          message="El estudiante perderá acceso inmediato al simulador. ¿Está seguro?"
          confirmLabel="Revocar"
          cancelLabel="Cancelar"
          icon="block"
          destructive
          onConfirm={async () => {
            await vm.handleRevoke(confirmRevoke);
            setConfirmRevoke(null);
          }}
          onCancel={() => setConfirmRevoke(null)}
        />
      )}

      {/* Confirm restore modal */}
      {confirmRestore && (
        <ConfirmModal
          title="Restaurar Credenciales"
          message="El estudiante recuperará acceso al simulador. ¿Está seguro?"
          confirmLabel="Restaurar"
          cancelLabel="Cancelar"
          icon="lock_open"
          onConfirm={async () => {
            await vm.handleRestore(confirmRestore);
            setConfirmRestore(null);
          }}
          onCancel={() => setConfirmRestore(null)}
        />
      )}
    </div>
  );
}
