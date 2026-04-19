interface AdminQuestionBankCardProps {
  total: number;
  pendingReview: number;
  avgAccuracyPercent: number | null;
  loading: boolean;
  onNavigate: () => void;
}

export default function AdminQuestionBankCard({
  total,
  pendingReview,
  avgAccuracyPercent,
  loading,
  onNavigate,
}: AdminQuestionBankCardProps) {
  const reviewPercent = total > 0 ? Math.round((pendingReview / total) * 100) : 0;

  return (
    <section className="rounded-4xl border border-outline-variant/10 bg-surface-container-lowest p-7 shadow-[0_12px_40px_rgba(25,28,30,0.05)]">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold tracking-tight">Banco de preguntas</h2>
        <div className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-primary/8 text-primary">
          <span className="material-symbols-outlined text-[20px]">quiz</span>
        </div>
      </div>

      {/* Big total */}
      <div className="mb-5">
        {loading ? (
          <div className="h-14 w-28 animate-pulse rounded-lg bg-surface-container-high" />
        ) : (
          <p className="text-[56px] font-black leading-none tracking-tighter text-on-surface">{total}</p>
        )}
          <p className="text-sm text-secondary">preguntas en el banco</p>
      </div>

      {/* Stats row */}
      <div className="mb-5 grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-surface-container-low p-3.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-secondary">Pendientes</p>
          {loading ? (
            <div className="mt-2 h-7 w-14 animate-pulse rounded bg-surface-container-high" />
          ) : (
            <p className={`mt-1 text-[22px] font-black ${pendingReview > 0 ? "text-amber-600" : "text-emerald-600"}`}>
              {pendingReview}
            </p>
          )}
          <p className="mt-0.5 text-xs text-on-surface-variant">sin revisar</p>
        </div>

        <div className="rounded-2xl bg-surface-container-low p-3.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-secondary">Precisión media</p>
          {loading ? (
            <div className="mt-2 h-7 w-14 animate-pulse rounded bg-surface-container-high" />
          ) : (
            <p className="mt-1 text-[22px] font-black text-primary">
              {avgAccuracyPercent !== null ? `${avgAccuracyPercent}%` : "—"}
            </p>
          )}
          <p className="mt-0.5 text-xs text-on-surface-variant">de acierto</p>
        </div>
      </div>

      {/* Pending bar */}
      {!loading && pendingReview > 0 && (
        <div className="mb-5">
          <div className="mb-1.5 flex justify-between text-xs text-secondary">
            <span>Pendientes de revisión</span>
            <span className="font-bold text-amber-600">{reviewPercent}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-surface-container-high">
            <div
              className="h-full rounded-full bg-amber-400 transition-all duration-700"
              style={{ width: `${reviewPercent}%` }}
            />
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={onNavigate}
        className="w-full rounded-2xl bg-primary px-4 py-3.5 text-sm font-bold text-white shadow-[0_4px_14px_rgba(0,74,198,0.22)] transition-all hover:opacity-[0.92] hover:scale-[1.01] active:scale-[0.98]"
      >
        Gestionar banco de preguntas
      </button>
    </section>
  );
}
