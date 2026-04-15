interface DashboardHeaderProps {
  studentName: string;
  periodLabel: string;
  onLogout: () => void;
  title?: string;
  subtitle?: string;
}

export default function DashboardHeader({ studentName, periodLabel, onLogout, title, subtitle }: DashboardHeaderProps) {
  return (
    <header className="mb-8 flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 className="font-headline text-3xl font-bold tracking-tight">{title ?? "Panel del Estudiante"}</h1>
        <p className="text-sm text-secondary">{subtitle ?? `Bienvenido, ${studentName}`}</p>
      </div>

      <div className="flex items-center gap-3">
        <span className="rounded-full bg-surface-container-high px-3 py-1 text-xs font-semibold text-on-surface-variant">
          {periodLabel}
        </span>
        <button
          className="rounded-xl border border-outline-variant bg-surface-container-low px-4 py-2 text-sm font-semibold"
          onClick={onLogout}
          type="button"
        >
          Salir
        </button>
      </div>
    </header>
  );
}
