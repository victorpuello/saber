import { Link } from "react-router-dom";
import { useDocumentTitle } from "../hooks/useDocumentTitle";

const kampusRecoveryUrl =
  import.meta.env.VITE_KAMPUS_FORGOT_PASSWORD_URL || "https://kampus.ieplayasdelviento.edu.co/";

export default function ForgotPassword() {
  useDocumentTitle("Recuperar Contraseña");
  return (
    <main className="flex min-h-screen items-center justify-center bg-surface px-6 py-12 text-on-surface">
      <section className="glass-panel w-full max-w-2xl rounded-2xl border border-outline-variant p-8 md:p-10">
        <div className="mb-6 flex items-center gap-3">
          <span className="material-symbols-outlined text-primary">lock_reset</span>
          <h1 className="font-headline text-2xl font-bold tracking-tight">Recuperar contraseña</h1>
        </div>

        <p className="text-sm leading-relaxed text-secondary md:text-base">
          El restablecimiento de contraseña se gestiona desde Kampus para mantener una autenticación federada y segura.
          Usa el portal institucional y vuelve al simulador cuando termines el proceso.
        </p>

        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          <a
            href={kampusRecoveryUrl}
            target="_blank"
            rel="noreferrer"
            className="scholar-gradient inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-white"
          >
            <span>Ir a Kampus</span>
            <span className="material-symbols-outlined text-base">open_in_new</span>
          </a>

          <Link
            to="/login"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-outline-variant bg-surface-container-low px-4 py-3 text-sm font-semibold text-on-surface transition-colors hover:bg-surface-container"
          >
            <span className="material-symbols-outlined text-base">arrow_back</span>
            <span>Volver al login</span>
          </Link>
        </div>
      </section>
    </main>
  );
}
