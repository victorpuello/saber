import type { StudentListItem } from "../../../../services/students";

// ── Status badge ───────────────────────────────────────────────────────
const STATUS_CLASSES: Record<string, string> = {
  ACTIVE: "bg-emerald-100 text-emerald-700",
  WITHDRAWN: "bg-rose-100 text-rose-700",
  INACTIVE: "bg-slate-100 text-slate-600",
};

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Activo",
  WITHDRAWN: "Retirado",
  INACTIVE: "Inactivo",
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${STATUS_CLASSES[status] ?? "bg-slate-100 text-slate-600"}`}
    >
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

// ── Diagnostic level badge ─────────────────────────────────────────────
const LEVEL_COLORS: Record<number, string> = {
  1: "bg-rose-100 text-rose-700",
  2: "bg-amber-100 text-amber-700",
  3: "bg-blue-100 text-blue-700",
  4: "bg-emerald-100 text-emerald-700",
};

const LEVEL_LABELS: Record<number, string> = {
  1: "Básico",
  2: "Intermedio",
  3: "Satisfactorio",
  4: "Avanzado",
};

function DiagnosticBadge({ level }: { level: number | null }) {
  if (level === null) return <span className="text-xs text-secondary/50">—</span>;
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${LEVEL_COLORS[level] ?? "bg-slate-100 text-slate-600"}`}
    >
      {LEVEL_LABELS[level] ?? `Nivel ${level}`}
    </span>
  );
}

// ── Plan progress bar ──────────────────────────────────────────────────
function PlanProgress({
  status,
  current,
  total,
}: {
  status: string | null;
  current: number | null;
  total: number | null;
}) {
  if (!status || !current || !total) {
    return <span className="text-xs text-secondary/50">Sin plan</span>;
  }

  const pct = Math.round((current / total) * 100);
  const color = pct >= 70 ? "bg-emerald-400" : pct >= 40 ? "bg-amber-400" : "bg-rose-400";

  return (
    <div className="flex min-w-[80px] items-center gap-2">
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-container-high">
        <div
          className={`h-full rounded-full transition-all ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-[11px] font-semibold tabular-nums text-secondary">
        S{current}/{total}
      </span>
    </div>
  );
}

// ── Score display ──────────────────────────────────────────────────────
function ScoreDisplay({ value }: { value: number | null }) {
  if (value === null) return <span className="text-xs text-secondary/50">—</span>;
  const color =
    value >= 300 ? "text-emerald-700" : value >= 200 ? "text-amber-700" : "text-rose-700";
  return <span className={`text-sm font-semibold tabular-nums ${color}`}>{value}</span>;
}

// ── Pagination ─────────────────────────────────────────────────────────
function buildPageNumbers(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | "…")[] = [1];
  if (current > 3) pages.push("…");
  for (let p = Math.max(2, current - 1); p <= Math.min(total - 1, current + 1); p++) pages.push(p);
  if (current < total - 2) pages.push("…");
  pages.push(total);
  return pages;
}

function PageBtn({
  label,
  active = false,
  disabled = false,
  isIcon = false,
  onClick,
}: {
  label: string;
  active?: boolean;
  disabled?: boolean;
  isIcon?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex h-8 min-w-[2rem] items-center justify-center rounded-xl px-2 text-xs font-semibold transition
        ${active ? "bg-primary text-white shadow-sm" : "text-secondary hover:bg-surface-container-high"}
        ${disabled ? "cursor-not-allowed opacity-30" : ""}
      `}
    >
      {isIcon ? (
        <span className="material-symbols-outlined text-[16px]">{label}</span>
      ) : (
        label
      )}
    </button>
  );
}

// ── Sort header ────────────────────────────────────────────────────────
function SortHeader({
  label,
  sortKey,
  currentSort,
  currentOrder,
  onSort,
}: {
  label: string;
  sortKey: string;
  currentSort: string;
  currentOrder: string;
  onSort: (key: string) => void;
}) {
  const isActive = currentSort === sortKey;
  return (
    <button
      type="button"
      onClick={() => onSort(sortKey)}
      className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-secondary transition hover:text-primary"
    >
      {label}
      {isActive && (
        <span className="material-symbols-outlined text-[14px] text-primary">
          {currentOrder === "asc" ? "arrow_upward" : "arrow_downward"}
        </span>
      )}
    </button>
  );
}

// ── Mobile card (used below lg breakpoint) ─────────────────────────────
function StudentCard({
  student: s,
  isSelected,
  onRowClick,
  onRevoke,
  onRestore,
}: {
  student: StudentListItem;
  isSelected: boolean;
  onRowClick?: (student: StudentListItem) => void;
  onRevoke?: (id: string) => void;
  onRestore?: (id: string) => void;
}) {
  const initial = (s.first_name[0] ?? "").toUpperCase();
  return (
    <div
      onClick={() => onRowClick?.(s)}
      className={`cursor-pointer rounded-2xl border border-outline-variant/10 bg-surface-container-lowest p-4 transition hover:shadow-md ${
        isSelected ? "ring-2 ring-primary/30" : ""
      } ${s.credentials_revoked ? "opacity-60" : ""}`}
    >
      {/* Header: avatar + name + status */}
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
          {initial}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-on-surface">
            {s.last_name}, {s.first_name}
          </p>
          <p className="truncate text-xs text-secondary">{s.email ?? "—"}</p>
        </div>
        <StatusBadge status={s.enrollment_status} />
      </div>

      {/* Stats grid */}
      <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
        <div className="flex items-center justify-between">
          <span className="text-secondary">Grado</span>
          <span className="rounded-lg bg-surface-container-high px-2 py-0.5 font-bold text-on-surface">
            {s.grade}°
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-secondary">Exámenes</span>
          <span className="font-semibold tabular-nums text-on-surface">{s.exam_count || "—"}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-secondary">Puntaje</span>
          <ScoreDisplay value={s.avg_score} />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-secondary">Diagnóstico</span>
          <DiagnosticBadge level={s.diagnostic_level} />
        </div>
      </div>

      {/* Plan + actions */}
      <div className="mt-3 flex items-center justify-between border-t border-outline-variant/10 pt-3">
        <PlanProgress
          status={s.active_plan_status}
          current={s.plan_current_week}
          total={s.plan_total_weeks}
        />
        {s.credentials_revoked ? (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onRestore?.(s.id); }}
            className="inline-flex items-center gap-1 rounded-xl bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100"
          >
            <span className="material-symbols-outlined text-[14px]">lock_open</span>
            Restaurar
          </button>
        ) : (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onRevoke?.(s.id); }}
            className="inline-flex items-center gap-1 rounded-xl bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-100"
          >
            <span className="material-symbols-outlined text-[14px]">block</span>
            Revocar
          </button>
        )}
      </div>
    </div>
  );
}

// ── Main table ─────────────────────────────────────────────────────────
interface StudentsTableProps {
  students: StudentListItem[];
  currentPage: number;
  totalPages: number;
  totalStudents: number;
  visibleStart: number;
  visibleEnd: number;
  onPageChange: (page: number) => void;
  sortBy: string;
  sortOrder: string;
  onSort: (col: string) => void;
  onRowClick?: (student: StudentListItem) => void;
  onRevoke?: (id: string) => void;
  onRestore?: (id: string) => void;
  selectedStudentId?: string | null;
}

export default function StudentsTable({
  students,
  currentPage,
  totalPages,
  totalStudents,
  visibleStart,
  visibleEnd,
  onPageChange,
  sortBy,
  sortOrder,
  onSort,
  onRowClick,
  onRevoke,
  onRestore,
  selectedStudentId,
}: StudentsTableProps) {
  return (
    <section>
      {/* ── Desktop table (lg+) ─────────────────────────────────── */}
      <div className="hidden overflow-hidden rounded-3xl bg-surface-container-lowest shadow-[0_12px_40px_rgba(25,28,30,0.05)] lg:block">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm whitespace-nowrap">
            <thead>
              <tr className="border-b border-outline-variant/10 bg-surface-container-low">
                <th className="px-3 py-3 text-left">
                  <SortHeader label="Nombre" sortKey="last_name" currentSort={sortBy} currentOrder={sortOrder} onSort={onSort} />
                </th>
                <th className="hidden px-3 py-3 text-left 2xl:table-cell">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-secondary">Email</span>
                </th>
                <th className="px-3 py-3 text-left">
                  <SortHeader label="Grado" sortKey="grade" currentSort={sortBy} currentOrder={sortOrder} onSort={onSort} />
                </th>
                <th className="px-3 py-3 text-left">
                  <SortHeader label="Estado" sortKey="enrollment_status" currentSort={sortBy} currentOrder={sortOrder} onSort={onSort} />
                </th>
                <th className="px-3 py-3 text-left">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-secondary">Exámenes</span>
                </th>
                <th className="px-3 py-3 text-left">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-secondary">Puntaje</span>
                </th>
                <th className="hidden px-3 py-3 text-left xl:table-cell">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-secondary">Diagnóstico</span>
                </th>
                <th className="hidden px-3 py-3 text-left xl:table-cell">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-secondary">Plan</span>
                </th>
                <th className="px-3 py-3 text-right">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-secondary">Acciones</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {students.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center">
                    <span className="material-symbols-outlined mb-2 block text-4xl text-secondary/30">
                      people
                    </span>
                    <p className="text-sm text-secondary">No se encontraron estudiantes</p>
                  </td>
                </tr>
              ) : (
                students.map((s) => {
                  const isSelected = selectedStudentId === s.id;
                  const initial = (s.first_name[0] ?? "").toUpperCase();
                  return (
                    <tr
                      key={s.id}
                      onClick={() => onRowClick?.(s)}
                      className={`cursor-pointer border-b border-outline-variant/5 transition hover:bg-surface-container-low/50 ${
                        isSelected ? "bg-primary/[0.04]" : ""
                      } ${s.credentials_revoked ? "opacity-60" : ""}`}
                    >
                      {/* Name */}
                      <td className="max-w-[220px] px-3 py-2.5">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                            {initial}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-on-surface">
                              {s.last_name}, {s.first_name}
                            </p>
                            {s.last_login_at && (
                              <p className="whitespace-normal text-[11px] text-secondary/70">
                                Último acceso: {new Date(s.last_login_at).toLocaleDateString("es-CO")}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Email — hidden below 2xl */}
                      <td className="hidden max-w-[180px] truncate px-3 py-2.5 text-secondary 2xl:table-cell">{s.email ?? "—"}</td>

                      {/* Grade */}
                      <td className="px-3 py-2.5">
                        <span className="rounded-lg bg-surface-container-high px-2 py-0.5 text-xs font-bold text-on-surface">
                          {s.grade}°
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-3 py-2.5">
                        <StatusBadge status={s.enrollment_status} />
                      </td>

                      {/* Exams */}
                      <td className="px-3 py-2.5 tabular-nums text-on-surface">
                        {s.exam_count || "—"}
                      </td>

                      {/* Avg Score */}
                      <td className="px-3 py-2.5">
                        <ScoreDisplay value={s.avg_score} />
                      </td>

                      {/* Diagnostic — hidden below xl */}
                      <td className="hidden px-3 py-2.5 xl:table-cell">
                        <DiagnosticBadge level={s.diagnostic_level} />
                      </td>

                      {/* Plan — hidden below xl */}
                      <td className="hidden px-3 py-2.5 xl:table-cell">
                        <PlanProgress
                          status={s.active_plan_status}
                          current={s.plan_current_week}
                          total={s.plan_total_weeks}
                        />
                      </td>

                      {/* Actions */}
                      <td className="px-3 py-2.5 text-right">
                        {s.credentials_revoked ? (
                          <button
                            type="button"
                            title="Restaurar acceso"
                            onClick={(e) => {
                              e.stopPropagation();
                              onRestore?.(s.id);
                            }}
                            className="inline-flex items-center gap-1 rounded-xl bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100"
                          >
                            <span className="material-symbols-outlined text-[14px]">
                              lock_open
                            </span>
                            <span className="hidden xl:inline">Restaurar</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            title="Revocar acceso"
                            onClick={(e) => {
                              e.stopPropagation();
                              onRevoke?.(s.id);
                            }}
                            className="inline-flex items-center gap-1 rounded-xl bg-rose-50 px-2.5 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-100"
                          >
                            <span className="material-symbols-outlined text-[14px]">
                              block
                            </span>
                            <span className="hidden xl:inline">Revocar</span>
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

        {/* Desktop pagination */}
        {totalPages > 0 && (
          <div className="flex items-center justify-between border-t border-outline-variant/10 px-5 py-4">
            <p className="text-xs text-secondary">
              Mostrando {visibleStart}–{visibleEnd} de {totalStudents.toLocaleString("es-CO")} estudiantes
            </p>
            <div className="flex items-center gap-1">
              <PageBtn
                label="chevron_left"
                isIcon
                disabled={currentPage === 1}
                onClick={() => onPageChange(currentPage - 1)}
              />
              {buildPageNumbers(currentPage, totalPages).map((p, i) =>
                p === "…" ? (
                  <span key={`ellipsis-${i}`} className="px-2 text-xs text-secondary">…</span>
                ) : (
                  <PageBtn
                    key={p}
                    label={String(p)}
                    active={p === currentPage}
                    onClick={() => onPageChange(p as number)}
                  />
                ),
              )}
              <PageBtn
                label="chevron_right"
                isIcon
                disabled={currentPage === totalPages}
                onClick={() => onPageChange(currentPage + 1)}
              />
            </div>
          </div>
        )}
      </div>

      {/* ── Mobile card list (below lg) ─────────────────────────── */}
      <div className="space-y-3 lg:hidden">
        {students.length === 0 ? (
          <div className="rounded-2xl bg-surface-container-lowest py-16 text-center shadow-[0_12px_40px_rgba(25,28,30,0.05)]">
            <span className="material-symbols-outlined mb-2 block text-4xl text-secondary/30">
              people
            </span>
            <p className="text-sm text-secondary">No se encontraron estudiantes</p>
          </div>
        ) : (
          <>
            {/* Mobile sort pills */}
            <div className="flex flex-wrap items-center gap-2 px-1">
              <span className="text-[10px] font-bold uppercase tracking-widest text-secondary">Ordenar:</span>
              {(["last_name", "grade", "enrollment_status"] as const).map((key) => {
                const labels: Record<string, string> = { last_name: "Nombre", grade: "Grado", enrollment_status: "Estado" };
                const isActive = sortBy === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => onSort(key)}
                    className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-semibold transition ${
                      isActive ? "bg-primary text-white" : "bg-surface-container-high text-secondary hover:bg-surface-container-highest"
                    }`}
                  >
                    {labels[key]}
                    {isActive && (
                      <span className="material-symbols-outlined text-[12px]">
                        {sortOrder === "asc" ? "arrow_upward" : "arrow_downward"}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {students.map((s) => (
              <StudentCard
                key={s.id}
                student={s}
                isSelected={selectedStudentId === s.id}
                onRowClick={onRowClick}
                onRevoke={onRevoke}
                onRestore={onRestore}
              />
            ))}
          </>
        )}

        {/* Mobile pagination */}
        {totalPages > 0 && (
          <div className="flex flex-col items-center gap-3 rounded-2xl bg-surface-container-lowest px-4 py-4 shadow-[0_12px_40px_rgba(25,28,30,0.05)]">
            <p className="text-xs text-secondary">
              {visibleStart}–{visibleEnd} de {totalStudents.toLocaleString("es-CO")}
            </p>
            <div className="flex items-center gap-1">
              <PageBtn
                label="chevron_left"
                isIcon
                disabled={currentPage === 1}
                onClick={() => onPageChange(currentPage - 1)}
              />
              {buildPageNumbers(currentPage, totalPages).map((p, i) =>
                p === "…" ? (
                  <span key={`ellipsis-${i}`} className="px-2 text-xs text-secondary">…</span>
                ) : (
                  <PageBtn
                    key={p}
                    label={String(p)}
                    active={p === currentPage}
                    onClick={() => onPageChange(p as number)}
                  />
                ),
              )}
              <PageBtn
                label="chevron_right"
                isIcon
                disabled={currentPage === totalPages}
                onClick={() => onPageChange(currentPage + 1)}
              />
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
