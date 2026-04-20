import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "../../../../context/AuthContext";
import { fetchAreas, listQuestions } from "../../../../services/questions";
import type { AreaSummary, QuestionSummary } from "../../../../services/questions";

// ── Types ──────────────────────────────────────────────────────────────

export interface PickedQuestion {
  id: string;
  stem: string;
  area_code: string;
}

interface QuestionPickerPanelProps {
  selected: PickedQuestion[];
  onChange: (questions: PickedQuestion[]) => void;
}

// ── Helpers ────────────────────────────────────────────────────────────

const DIFFICULTY_LABEL: Record<number, string> = { 1: "Fácil", 2: "Media", 3: "Difícil" };

// ── Component ──────────────────────────────────────────────────────────

export default function QuestionPickerPanel({ selected, onChange }: QuestionPickerPanelProps) {
  const { authFetch } = useAuth();

  const [areas, setAreas] = useState<AreaSummary[]>([]);
  const [questions, setQuestions] = useState<QuestionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [areaFilter, setAreaFilter] = useState<string>("");   // area id
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const PAGE_SIZE = 10;
  const mountedRef = useRef(true);

  // Build a lookup: area_id → area_code
  const areaCodeMap: Record<string, string> = {};
  areas.forEach((a) => { areaCodeMap[a.id] = a.code; });

  // Fetch areas once
  useEffect(() => {
    mountedRef.current = true;
    fetchAreas(authFetch)
      .then((data) => { if (mountedRef.current) setAreas(data); })
      .catch(() => {});
    return () => { mountedRef.current = false; };
  }, [authFetch]);

  // Fetch questions when filters/page change
  const loadQuestions = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listQuestions(authFetch, {
        status: "APPROVED",
        area_id: areaFilter || undefined,
        page,
        page_size: PAGE_SIZE,
      });
      if (!mountedRef.current) return;
      setQuestions(data.items);
      setTotalPages(Math.max(1, data.pages));
    } catch {
      // non-critical
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [authFetch, areaFilter, page]);

  useEffect(() => { void loadQuestions(); }, [loadQuestions]);

  // Reset to page 1 when filters change
  function handleAreaChange(id: string) {
    setAreaFilter(id);
    setPage(1);
  }

  // Client-side search filter on stem
  const filtered = search.trim()
    ? questions.filter((q) =>
        q.stem.toLowerCase().includes(search.toLowerCase()),
      )
    : questions;

  // Toggle selection
  const selectedIds = new Set(selected.map((q) => q.id));

  function toggle(q: QuestionSummary) {
    const code = areaCodeMap[q.area_id] ?? "";
    if (selectedIds.has(q.id)) {
      onChange(selected.filter((s) => s.id !== q.id));
    } else {
      onChange([...selected, { id: q.id, stem: q.stem, area_code: code }]);
    }
  }

  function removeSelected(id: string) {
    onChange(selected.filter((s) => s.id !== id));
  }

  return (
    <div className="flex flex-col gap-3">
      {/* ── Selected chips ──────────────────────────────────────── */}
      {selected.length > 0 && (
        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-3">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-primary">
            {selected.length} pregunta{selected.length !== 1 ? "s" : ""} seleccionada{selected.length !== 1 ? "s" : ""}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {selected.map((q) => (
              <span
                key={q.id}
                className="flex max-w-[220px] items-center gap-1.5 rounded-xl bg-white px-2.5 py-1 text-xs font-medium text-on-surface shadow-sm ring-1 ring-primary/20"
              >
                {q.area_code && (
                  <span className="rounded-md bg-primary/10 px-1.5 py-0.5 text-[9px] font-bold text-primary">
                    {q.area_code}
                  </span>
                )}
                <span className="max-w-[140px] truncate">{q.stem}</span>
                <button
                  type="button"
                  onClick={() => removeSelected(q.id)}
                  className="shrink-0 text-secondary/60 transition hover:text-error"
                >
                  <span className="material-symbols-outlined text-[14px]">close</span>
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── Filters ────────────────────────────────────────────── */}
      <div className="flex gap-2">
        {/* Search */}
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-[15px] text-secondary">
            search
          </span>
          <input
            type="text"
            placeholder="Buscar en enunciado…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl bg-surface-container-lowest py-2 pl-9 pr-3 text-sm text-on-surface outline-none ring-1 ring-outline-variant/20 transition placeholder:text-secondary/50 focus:ring-2 focus:ring-primary/40"
          />
        </div>

        {/* Area filter */}
        <div className="relative">
          <select
            value={areaFilter}
            onChange={(e) => handleAreaChange(e.target.value)}
            className="h-full appearance-none rounded-xl bg-surface-container-lowest px-3 pr-7 text-sm font-medium text-on-surface outline-none ring-1 ring-outline-variant/20 transition focus:ring-2 focus:ring-primary/40"
          >
            <option value="">Todas las áreas</option>
            {areas.map((a) => (
              <option key={a.id} value={a.id}>
                {a.code} — {a.name}
              </option>
            ))}
          </select>
          <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 material-symbols-outlined text-[14px] text-secondary">
            expand_more
          </span>
        </div>
      </div>

      {/* ── Question list ──────────────────────────────────────── */}
      <div className="overflow-hidden rounded-2xl ring-1 ring-outline-variant/15">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <span className="material-symbols-outlined animate-spin text-[22px] text-secondary">
              progress_activity
            </span>
          </div>
        ) : filtered.length === 0 ? (
          <p className="py-8 text-center text-sm text-secondary/60">
            No hay preguntas aprobadas con estos filtros.
          </p>
        ) : (
          <div className="divide-y divide-outline-variant/10">
            {filtered.map((q) => {
              const isSelected = selectedIds.has(q.id);
              const areaCode = areaCodeMap[q.area_id] ?? "";
              return (
                <label
                  key={q.id}
                  className={`flex cursor-pointer items-start gap-3 p-3 transition ${
                    isSelected
                      ? "bg-primary/5"
                      : "bg-white hover:bg-surface-container-low"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggle(q)}
                    className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-sm text-on-surface">
                      {q.stem}
                    </p>
                    <div className="mt-1 flex flex-wrap gap-2">
                      {areaCode && (
                        <span className="rounded-md bg-surface-container px-1.5 py-0.5 text-[10px] font-bold text-secondary">
                          {areaCode}
                        </span>
                      )}
                      {q.difficulty_estimated != null && (
                        <span className="rounded-md bg-surface-container px-1.5 py-0.5 text-[10px] font-semibold text-secondary">
                          {DIFFICULTY_LABEL[q.difficulty_estimated] ?? `Dif. ${q.difficulty_estimated}`}
                        </span>
                      )}
                      <span className="rounded-md bg-surface-container px-1.5 py-0.5 text-[10px] text-secondary">
                        {q.source === "AI" ? "IA" : "Manual"}
                      </span>
                    </div>
                  </div>
                  {isSelected && (
                    <span
                      className="material-symbols-outlined shrink-0 text-[18px] text-primary"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      check_circle
                    </span>
                  )}
                </label>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Pagination ────────────────────────────────────────── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <button
            type="button"
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
            className="flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-semibold text-secondary transition hover:bg-surface-container disabled:opacity-40"
          >
            <span className="material-symbols-outlined text-[15px]">chevron_left</span>
            Anterior
          </button>
          <span className="text-xs text-secondary">
            Página {page} / {totalPages}
          </span>
          <button
            type="button"
            disabled={page === totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-semibold text-secondary transition hover:bg-surface-container disabled:opacity-40"
          >
            Siguiente
            <span className="material-symbols-outlined text-[15px]">chevron_right</span>
          </button>
        </div>
      )}
    </div>
  );
}
