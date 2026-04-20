import { Link } from "react-router-dom";
import { useDocumentTitle } from "../hooks/useDocumentTitle";

export default function LegalTerms() {
  useDocumentTitle("Términos de Servicio");
  return (
    <main className="flex min-h-screen items-center justify-center bg-surface px-6 py-12 text-on-surface">
      <article className="glass-panel w-full max-w-3xl rounded-2xl border border-outline-variant p-8 md:p-10">
        <h1 className="font-headline text-2xl font-bold tracking-tight">Términos de Servicio</h1>
        <p className="mt-4 text-sm leading-relaxed text-secondary md:text-base">
          Al utilizar el Simulador Saber 11, aceptas usar la plataforma con fines académicos, respetar las políticas de
          tu institución y proteger tus credenciales de acceso. El uso indebido de la plataforma puede implicar la
          suspensión temporal o definitiva de la cuenta según lineamientos institucionales.
        </p>
        <p className="mt-4 text-sm leading-relaxed text-secondary md:text-base">
          El servicio puede incluir integraciones de terceros para autenticación y contenido. Al continuar, aceptas que
          dichas integraciones operen bajo sus propias políticas y estándares de seguridad.
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
