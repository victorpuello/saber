interface DashboardErrorBannerProps {
  errors: string[];
  onRetry: () => void;
}

export default function DashboardErrorBanner({ errors, onRetry }: DashboardErrorBannerProps) {
  if (errors.length === 0) {
    return null;
  }

  return (
    <section className="mb-5 rounded-xl border border-error/30 bg-error-container px-4 py-3 text-sm text-on-error-container">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p>Algunos modulos no pudieron cargarse: {errors.join(" | ")}</p>
        <button
          type="button"
          className="rounded-lg border border-error/35 bg-white/60 px-3 py-1 text-xs font-semibold text-on-error-container"
          onClick={onRetry}
        >
          Reintentar
        </button>
      </div>
    </section>
  );
}
