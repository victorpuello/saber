interface AdminErrorBannerProps {
  errors: string[];
  onRetry: () => void;
}

export default function AdminErrorBanner({ errors, onRetry }: AdminErrorBannerProps) {
  if (errors.length === 0) return null;

  return (
    <section className="rounded-2xl border border-error/20 bg-error-container px-5 py-4">
      <div className="flex items-start gap-3">
        <span
          className="material-symbols-outlined mt-0.5 shrink-0 text-[20px] text-on-error-container"
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          error
        </span>
        <div className="flex-1">
          <p className="text-sm font-semibold text-on-error-container">
            Algunos módulos no pudieron cargarse
          </p>
          <ul className="mt-1 space-y-0.5">
            {errors.map((error, i) => (
              <li key={i} className="text-xs text-on-error-container/80">
                {error}
              </li>
            ))}
          </ul>
        </div>
        <button
          type="button"
          onClick={onRetry}
          className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-bold text-on-error-container transition-opacity hover:opacity-80"
        >
          Reintentar
        </button>
      </div>
    </section>
  );
}
