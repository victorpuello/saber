import { Link } from "react-router-dom";
import { useDocumentTitle } from "../hooks/useDocumentTitle";

export default function LegalPrivacy() {
  useDocumentTitle("Política de Privacidad");
  return (
    <main className="flex min-h-screen items-center justify-center bg-surface px-6 py-12 text-on-surface">
      <article className="glass-panel w-full max-w-3xl rounded-2xl border border-outline-variant p-8 md:p-10">
        <h1 className="font-headline text-2xl font-bold tracking-tight">Política de Privacidad</h1>
        <p className="mt-4 text-sm leading-relaxed text-secondary md:text-base">
          El Simulador Saber 11 procesa datos académicos y de autenticación estrictamente para habilitar el acceso,
          personalizar la experiencia y mostrar resultados de aprendizaje. Los datos se tratan bajo principios de
          minimización, trazabilidad y seguridad operativa.
        </p>
        <p className="mt-4 text-sm leading-relaxed text-secondary md:text-base">
          Puedes solicitar revisión o actualización de tus datos a través de los canales institucionales definidos por
          Kampus y tu institución educativa. La retención de datos se rige por políticas académicas vigentes.
        </p>

        <Link
          to="/login"
          className="mt-8 inline-flex items-center gap-2 rounded-xl border border-outline-variant bg-surface-container-low px-4 py-3 text-sm font-semibold text-on-surface hover:bg-surface-container"
        >
          <span className="material-symbols-outlined text-base">arrow_back</span>
          <span>Volver al login</span>
        </Link>
      </article>
    </main>
  );
}
