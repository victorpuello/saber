import type { ExamRow, ExamType } from "../types";

// ── Type badge (exported so student pages can reuse it) ───────────────

const TYPE_BADGE_CLASSES: Record<ExamType, string> = {
  FULL_SIMULATION: "bg-blue-100 text-blue-700",
  AREA_PRACTICE:   "bg-violet-100 text-violet-700",
  CUSTOM:          "bg-amber-100 text-amber-700",
  DIAGNOSTIC:      "bg-emerald-100 text-emerald-700",
};

const TYPE_LABELS: Record<ExamType, string> = {
  FULL_SIMULATION: "Simulacro",
  AREA_PRACTICE:   "Por Área",
  CUSTOM:          "Personalizado",
  DIAGNOSTIC:      "Diagnóstico",
};

export function ExamTypeBadge({ type }: { type: ExamType | string }) {
  const cls = TYPE_BADGE_CLASSES[type as ExamType] ?? "bg-slate-100 text-slate-600";
  const label = TYPE_LABELS[type as ExamType] ?? type;
  return (
    <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${cls}`}>
      {label}
    </span>
  );
}

// ── Pagination helpers ────────────────────────────────────────────────

function buildPageNumbers(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 4) return [1, 2, 3, 4, 5, "…", total];
  if (current >= total - 3) return [1, "…", total - 4, total - 3, total - 2, total - 1, total];
  return [1, "…", current - 1, current, current + 1, "…", total];
}

function PageBtn({
  active,
  disabled,
  onClick,
  children,
}: {
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`flex h-8 min-w-[32px] items-center justify-center rounded-xl px-2 text-sm font-semibold transition ${
        active
          ? "bg-primary text-white shadow"
          : disabled
            ? "cursor-not-allowed text-secondary/40"
            : "text-secondary hover:bg-surface-container"
      }`}
    >
      {children}
    </button>
  );
}

// ── Main component ────────────────────────────────────────────────────

interface ExamsTableProps {
  exams: ExamRow[];
  loading?: boolean;
  currentPage: number;
  totalPages: number;
  totalExams: number;
  visibleStart: number;
  visibleEnd: number;
  onPageChange: (page: number) => void;
  selectedExamId?: string | null;
  onRowClick?: (exam: ExamRow) => void;
  onArchive?: (examId: string) => void;
}

export default function ExamsTable({
  exams,
  loading,
  currentPage,
  totalPages,
  totalExams,
  visibleStart,
  visibleEnd,
  onPageChange,
  selectedExamId,
  onRowClick,
  onArchive,
}: ExamsTableProps) {
  const pages = buildPageNumbers(currentPage, totalPages);

  return (
    <section className="overflow-hidden rounded-3xl bg-surface-container-lowest shadow-[0_12px_40px_rgba(25,28,30,0.05)]">
      {/* Table header */}
      <div className="flex items-center justify-between border-b border-outline-variant/10 px-6 py-4">
        <p className="text-sm font-bold text-on-surface">
          {loading ? "Cargando…" : `${totalExams} examen${totalExams !== 1 ? "es" : ""}`}
        </p>
        {totalExams > 0 && !loading && (
          <p className="text-xs text-secondary">
            Mostrando {visibleStart}–{visibleEnd}
          </p>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[780px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-outline-variant/10">
              {["Título", "Tipo", "Área", "Preguntas", "Tiempo", "Estado", "Creado", "Acciones"].map(
                (h) => (
                  <th
                    key={h}
                    className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-secondary"
                  >
                    {h}
                  </th>
                ),
              )}
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="px-5 py-12 text-center text-sm text-secondary">
                  <span className="material-symbols-outlined animate-spin text-[24px]">
                    progress_activity
                  </span>
                </td>
              </tr>
            ) : exams.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-5 py-12 text-center text-sm text-secondary">
                  No hay exámenes que coincidan con los filtros.
                </td>
              </tr>
            ) : (
              exams.map((exam) => {
                const isSelected = selectedExamId === exam.id;
                return (
                  <tr
                    key={exam.id}
                    onClick={() => onRowClick?.(exam)}
                    className={`cursor-pointer border-b border-outline-variant/5 transition last:border-0 hover:bg-surface-container-low ${
                      isSelected ? "bg-primary/5" : ""
                    }`}
                  >
                    {/* Título */}
                    <td className="px-5 py-3.5">
                      <span className="max-w-[220px] truncate font-semibold text-on-surface block">
                        {exam.title}
                      </span>
                    </td>

                    {/* Tipo */}
                    <td className="px-5 py-3.5">
                      <ExamTypeBadge type={exam.exam_type} />
                    </td>

                    {/* Área */}
                    <td className="px-5 py-3.5 text-secondary">
                      {exam.area_code ?? "—"}
                    </td>

                    {/* Preguntas */}
                    <td className="px-5 py-3.5 tabular-nums text-on-surface">
                      {exam.total_questions}
                    </td>

                    {/* Tiempo */}
                    <td className="px-5 py-3.5 text-secondary">
                      {exam.time_limit_minutes
                        ? `${exam.time_limit_minutes} min`
                        : "Sin límite"}
                    </td>

                    {/* Estado */}
                    <td className="px-5 py-3.5">
                      <span
                        className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
                          exam.status === "ACTIVE"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {exam.status === "ACTIVE" ? "Activo" : "Archivado"}
                      </span>
                    </td>

                    {/* Creado */}
                    <td className="px-5 py-3.5 text-secondary">
                      {new Date(exam.created_at).toLocaleDateString("es-CO", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>

                    {/* Acciones */}
                    <td className="px-5 py-3.5">
                      {exam.status === "ACTIVE" && (
                        <button
                          type="button"
                          title="Archivar examen"
                          onClick={(e) => {
                            e.stopPropagation();
                            onArchive?.(exam.id);
                          }}
                          className="flex items-center gap-1 rounded-xl bg-rose-50 px-2.5 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-100"
                        >
                          <span className="material-symbols-outlined text-[14px]">archive</span>
                          Archivar
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-outline-variant/10 px-6 py-4">
          <PageBtn
            disabled={currentPage === 1}
            onClick={() => onPageChange(currentPage - 1)}
          >
            <span className="material-symbols-outlined text-[18px]">chevron_left</span>
          </PageBtn>

          <div className="flex items-center gap-1">
            {pages.map((p, i) =>
              p === "…" ? (
                <span key={`ellipsis-${i}`} className="px-1 text-secondary">
                  …
                </span>
              ) : (
                <PageBtn
                  key={p}
                  active={p === currentPage}
                  onClick={() => onPageChange(p as number)}
                >
                  {p}
                </PageBtn>
              ),
            )}
          </div>

          <PageBtn
            disabled={currentPage === totalPages}
            onClick={() => onPageChange(currentPage + 1)}
          >
            <span className="material-symbols-outlined text-[18px]">chevron_right</span>
          </PageBtn>
        </div>
      )}
    </section>
  );
}
