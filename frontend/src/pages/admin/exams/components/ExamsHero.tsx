interface ExamsHeroProps {
  onCreateExam: () => void;
}

export default function ExamsHero({ onCreateExam }: ExamsHeroProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      {/* Left — breadcrumb + title */}
      <div>
        <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-secondary">
          Dashboard &rsaquo; Exámenes
        </p>
        <h1 className="font-headline text-4xl font-black tracking-tight text-on-surface">
          Gestión de Exámenes
        </h1>
        <p className="mt-2 text-sm text-secondary">
          Crea y administra simulacros, prácticas por área y exámenes personalizados.
        </p>
      </div>

      {/* Right — CTA */}
      <div className="flex shrink-0 items-center gap-3">
        <button
          type="button"
          onClick={onCreateExam}
          className="flex items-center gap-2 rounded-2xl bg-linear-to-br from-primary to-primary-container px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-primary/20 transition hover:opacity-90 active:scale-95"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          Crear Examen
        </button>
      </div>
    </div>
  );
}
