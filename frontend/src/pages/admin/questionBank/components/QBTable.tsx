import type { QuestionRow, AreaCode, QuestionStatus } from "../types";

// ── Area color tokens ──────────────────────────────────────────────────────
const AREA_COLORS: Record<AreaCode, { bg: string; text: string; dot: string }> = {
  MAT: { bg: "bg-blue-50",   text: "text-blue-700",   dot: "bg-blue-400" },
  LEC: { bg: "bg-violet-50", text: "text-violet-700", dot: "bg-violet-400" },
  ING: { bg: "bg-amber-50",  text: "text-amber-700",  dot: "bg-amber-400" },
  NAT: { bg: "bg-emerald-50",text: "text-emerald-700",dot: "bg-emerald-400" },
  SOC: { bg: "bg-rose-50",   text: "text-rose-700",   dot: "bg-rose-400" },
};

// ── Status badge ───────────────────────────────────────────────────────────
const STATUS_CLASSES: Record<QuestionStatus, string> = {
  APROBADO: "bg-emerald-100 text-emerald-700",
  PENDIENTE: "bg-amber-100 text-amber-700",
  BORRADOR:  "bg-slate-100 text-slate-600",
};

function StatusBadge({ status }: { status: QuestionStatus }) {
  return (
    <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${STATUS_CLASSES[status]}`}>
      {status}
    </span>
  );
}

// ── Performance bar ────────────────────────────────────────────────────────
function PerformanceBar({ value }: { value: number | null }) {
  if (value === null) {
    return <span className="text-xs text-secondary/50">—</span>;
  }

  const color =
    value >= 70 ? "bg-emerald-400" : value >= 45 ? "bg-amber-400" : "bg-rose-400";

  return (
    <div className="flex min-w-[60px] items-center gap-2">
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-container-high">
        <div
          className={`h-full rounded-full transition-all ${color}`}
          style={{ width: `${value}%` }}
        />
      </div>
      <span className="text-[11px] font-semibold tabular-nums text-secondary">{value}%</span>
    </div>
  );
}

// ── Author avatar ──────────────────────────────────────────────────────────
function AuthorAvatar({ initial, name, isAI }: { initial: string; name: string; isAI: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
          isAI ? "bg-violet-100 text-violet-700" : "bg-primary/10 text-primary"
        }`}
      >
        {isAI ? (
          <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>
            auto_awesome
          </span>
        ) : (
          initial
        )}
      </div>
      <span className="text-sm text-on-surface">{name}</span>
    </div>
  );
}

// ── Pagination ─────────────────────────────────────────────────────────────
interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalQuestions: number;
  visibleStart: number;
  visibleEnd: number;
  onPageChange: (page: number) => void;
}

function Pagination({ currentPage, totalPages, totalQuestions, visibleStart, visibleEnd, onPageChange }: PaginationProps) {
  const pages = buildPageNumbers(currentPage, totalPages);

  return (
    <div className="flex flex-col items-center justify-between gap-3 px-5 py-4 sm:flex-row">
      <p className="text-xs text-secondary">
        Mostrando {visibleStart}–{visibleEnd} de {totalQuestions.toLocaleString("es-CO")} preguntas
      </p>

      <div className="flex items-center gap-1">
        <PageBtn
          label="chevron_left"
          isIcon
          disabled={currentPage === 1}
          onClick={() => onPageChange(currentPage - 1)}
        />

        {pages.map((p, i) =>
          p === "…" ? (
            <span key={`ellipsis-${i}`} className="px-2 text-xs text-secondary">
              …
            </span>
          ) : (
            <PageBtn
              key={p}
              label={String(p)}
              active={p === currentPage}
              onClick={() => onPageChange(p as number)}
            />
          )
        )}

        <PageBtn
          label="chevron_right"
          isIcon
          disabled={currentPage === totalPages}
          onClick={() => onPageChange(currentPage + 1)}
        />
      </div>
    </div>
  );
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

function buildPageNumbers(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const pages: (number | "…")[] = [1];
  if (current > 3) pages.push("…");
  for (let p = Math.max(2, current - 1); p <= Math.min(total - 1, current + 1); p++) pages.push(p);
  if (current < total - 2) pages.push("…");
  pages.push(total);
  return pages;
}

// ── Main table ─────────────────────────────────────────────────────────────
interface QBTableProps {
  questions: QuestionRow[];
  currentPage: number;
  totalPages: number;
  totalQuestions: number;
  visibleStart: number;
  visibleEnd: number;
  onPageChange: (page: number) => void;
  selectedQuestionId?: string | null;
  onRowClick?: (question: QuestionRow) => void;
}

const COL_HEADERS = ["Código", "Área / Competencia", "Enunciado", "Autor", "Estado", "Desempeño"];

export default function QBTable({
  questions,
  currentPage,
  totalPages,
  totalQuestions,
  visibleStart,
  visibleEnd,
  onPageChange,
  selectedQuestionId,
  onRowClick,
}: QBTableProps) {
  return (
    <section className="overflow-hidden rounded-3xl bg-surface-container-lowest shadow-[0_12px_40px_rgba(25,28,30,0.05)]">
      {/* Scrollable table wrapper */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-outline-variant/10 bg-surface-container-low">
              {COL_HEADERS.map((h) => (
                <th
                  key={h}
                  className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-secondary"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {questions.map((row, idx) => {
              const areaColors = AREA_COLORS[row.areaCode];
              const isAI = row.authorName === "ScholarAI";
              const isLast = idx === questions.length - 1;

              return (
                <tr
                  key={row.id}
                  onClick={() => onRowClick?.(row)}
                  className={`group cursor-pointer transition hover:bg-surface-container-low ${
                    selectedQuestionId === row.id ? "bg-primary/5" : ""
                  } ${!isLast ? "border-b border-outline-variant/8" : ""}`}
                >
                  {/* Code */}
                  <td className="px-5 py-4">
                    <span
                      className={`rounded-lg px-2.5 py-1 text-xs font-bold tabular-nums ${areaColors.bg} ${areaColors.text}`}
                    >
                      {row.code}
                    </span>
                  </td>

                  {/* Area / Competencia */}
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <div className={`h-1.5 w-1.5 shrink-0 rounded-full ${areaColors.dot}`} />
                      <div className="min-w-0">
                        <p className="font-semibold text-on-surface">{row.area}</p>
                        <p className="text-xs text-secondary">{row.competencia}</p>
                      </div>
                    </div>
                  </td>

                  {/* Enunciado */}
                  <td className="max-w-[260px] px-5 py-4">
                    <p className="truncate text-on-surface/80">{row.enunciado}</p>
                  </td>

                  {/* Author */}
                  <td className="px-5 py-4">
                    <AuthorAvatar initial={row.authorInitial} name={row.authorName} isAI={isAI} />
                  </td>

                  {/* Status */}
                  <td className="px-5 py-4">
                    <StatusBadge status={row.status} />
                  </td>

                  {/* Performance */}
                  <td className="px-5 py-4">
                    <PerformanceBar value={row.performance} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="border-t border-outline-variant/10">
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalQuestions={totalQuestions}
          visibleStart={visibleStart}
          visibleEnd={visibleEnd}
          onPageChange={onPageChange}
        />
      </div>
    </section>
  );
}
