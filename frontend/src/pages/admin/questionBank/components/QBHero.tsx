interface QBHeroProps {
  onNewManual: () => void;
  onGenerateAI: () => void;
}

export default function QBHero({ onNewManual, onGenerateAI }: QBHeroProps) {
  return (
    <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
      {/* Left — breadcrumb + title */}
      <div>
        <nav className="mb-3 flex items-center gap-1 text-xs text-secondary">
          <span>Dashboard</span>
          <span className="material-symbols-outlined text-[13px] leading-none">chevron_right</span>
          <span className="font-semibold text-primary">Banco de Preguntas</span>
        </nav>

        <h1 className="font-headline text-4xl font-black tracking-tight text-on-surface sm:text-5xl">
          Banco de Preguntas
        </h1>

        <p className="mt-2 max-w-lg text-sm leading-relaxed text-secondary">
          Gestiona, revisa y crea contenido académico de alta calidad para simulacros Saber&nbsp;11.
        </p>
      </div>

      {/* Right — action buttons */}
      <div className="flex shrink-0 flex-wrap items-center gap-3 sm:mt-1">
        <button
          type="button"
          onClick={onGenerateAI}
          className="flex items-center gap-2 rounded-2xl bg-surface-container-high px-5 py-2.5 text-sm font-semibold text-on-surface shadow-sm transition hover:bg-surface-container-highest"
        >
          <span
            className="material-symbols-outlined text-[18px] text-primary"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            auto_awesome
          </span>
          Generar con IA
        </button>

        <button
          type="button"
          onClick={onNewManual}
          className="flex items-center gap-2 rounded-2xl bg-linear-to-br from-primary to-primary-container px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-primary/20 transition hover:opacity-90"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          Nueva Pregunta Manual
        </button>
      </div>
    </div>
  );
}
