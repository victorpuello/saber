interface QBScholarAIPromoProps {
  onExplore: () => void;
}

export default function QBScholarAIPromo({ onExplore }: QBScholarAIPromoProps) {
  return (
    <section className="relative flex flex-col justify-between overflow-hidden rounded-3xl bg-linear-to-br from-primary to-primary-container p-6 text-white shadow-lg shadow-primary/20">
      {/* Background accents */}
      <div className="pointer-events-none absolute -right-6 -top-6 h-32 w-32 rounded-full bg-white/5" />
      <div className="pointer-events-none absolute -bottom-8 right-12 h-24 w-24 rounded-full bg-white/5" />

      {/* Icon badge */}
      <div className="relative z-10 mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-sm">
        <span
          className="material-symbols-outlined text-[24px]"
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          lightbulb
        </span>
      </div>

      {/* Copy */}
      <div className="relative z-10 flex-1">
        <h3 className="text-xl font-black tracking-tight leading-snug">
          Potencia tu flujo<br />de trabajo
        </h3>
        <p className="mt-2.5 text-sm leading-relaxed opacity-80">
          ¿Sabías que nuestra IA puede generar distractores basados en los errores más comunes de los estudiantes colombianos en el Saber 11?
        </p>
      </div>

      {/* CTA */}
      <button
        type="button"
        onClick={onExplore}
        className="relative z-10 mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-white/15 py-2.5 text-sm font-bold backdrop-blur-sm transition hover:bg-white/25"
      >
        Explorar ScholarAI
        <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
      </button>
    </section>
  );
}
