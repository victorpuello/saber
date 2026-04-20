interface StudentsHeroProps {
  onSync: () => void;
  syncing: boolean;
}

export default function StudentsHero({ onSync, syncing }: StudentsHeroProps) {
  return (
    <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
      {/* Left — breadcrumb + title */}
      <div>
        <nav className="mb-3 flex items-center gap-1 text-xs text-secondary">
          <span>Dashboard</span>
          <span className="material-symbols-outlined text-[13px] leading-none">chevron_right</span>
          <span className="font-semibold text-primary">Estudiantes</span>
        </nav>

        <h1 className="font-headline text-4xl font-black tracking-tight text-on-surface sm:text-5xl">
          Gestión de Estudiantes
        </h1>

        <p className="mt-2 max-w-lg text-sm leading-relaxed text-secondary">
          Estudiantes activos de grados 9, 10 y 11 sincronizados con Kampus. Revoca o
          restaura credenciales según su estado de matrícula.
        </p>
      </div>

      {/* Right — sync button */}
      <div className="flex shrink-0 flex-wrap items-center gap-3 sm:mt-1">
        <button
          type="button"
          onClick={onSync}
          disabled={syncing}
          className="flex items-center gap-2 rounded-2xl bg-linear-to-br from-primary to-primary-container px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-primary/20 transition hover:opacity-90 disabled:opacity-50"
        >
          <span
            className={`material-symbols-outlined text-[18px] ${syncing ? "animate-spin" : ""}`}
          >
            sync
          </span>
          {syncing ? "Sincronizando…" : "Sincronizar con Kampus"}
        </button>
      </div>
    </div>
  );
}
