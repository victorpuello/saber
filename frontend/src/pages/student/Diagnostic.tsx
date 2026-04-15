import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useStudentDashboardSummary } from "./dashboard/useStudentDashboardSummary";
import DiagnosticResults from "./DiagnosticResults";

const SUBJECTS = [
  { num: "01", name: "Lectura Crítica", sub: "Comprensión y análisis" },
  { num: "02", name: "Matemáticas", sub: "Razonamiento cuantitativo" },
  { num: "03", name: "C. Naturales", sub: "Física, Química, Biología" },
];

export default function StudentDiagnosticPage() {
  const { user, authFetch } = useAuth();
  const navigate = useNavigate();
  const { summary, loading } = useStudentDashboardSummary({
    authFetch,
    userId: user?.id ?? null,
  });

  const firstName = (user?.name ?? "Estudiante").split(" ")[0];
  const hasResults =
    !loading &&
    summary !== null &&
    (summary.diagnosticCompletedSessions > 0 || summary.diagnosticCompetencies > 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-sm text-on-surface-variant">
        <span className="material-symbols-outlined animate-spin text-[28px] text-primary">
          progress_activity
        </span>
      </div>
    );
  }

  if (hasResults && summary) {
    return <DiagnosticResults summary={summary} studentName={user?.name ?? "Estudiante"} />;
  }

  return (
    <div className="space-y-6">
      {/* Badge */}
      <div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-emerald-700">
          <span
            className="material-symbols-outlined text-[14px]"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            verified
          </span>
          Validación Académica
        </span>
      </div>

      {/* Hero */}
      <div className="space-y-3">
        <h1 className="font-headline text-4xl font-black leading-tight tracking-tight text-on-surface">
          Hola, {firstName}.
        </h1>
        <h2 className="font-headline text-4xl font-black leading-tight tracking-tight text-on-surface">
          Descubramos tu{" "}
          <span className="text-primary">potencial académico.</span>
        </h2>
        <p className="max-w-xl text-base leading-relaxed text-on-surface-variant">
          Antes de comenzar tu plan de estudio personalizado, realizaremos una
          evaluación diagnóstica para identificar tus fortalezas y áreas de
          oportunidad.
        </p>
      </div>

      {/* Main cards */}
      <div className="grid gap-5 md:grid-cols-2">
        {/* Adaptive algorithm — white card */}
        <div className="relative overflow-hidden rounded-3xl bg-white p-8 shadow-sm">
          {/* Decorative background circle */}
          <div className="pointer-events-none absolute -right-10 -top-10 h-52 w-52 rounded-full bg-surface-container-low" />

          <div className="relative space-y-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
              <span
                className="material-symbols-outlined text-2xl text-primary"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                psychology
              </span>
            </div>

            <div>
              <h3 className="font-headline text-xl font-bold text-on-surface">
                Algoritmo Adaptativo
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-on-surface-variant">
                Nuestro sistema ajusta la dificultad de las preguntas en tiempo
                real basándose en tu desempeño. Esto nos permite mapear con
                precisión quirúrgica tu nivel actual sin hacerte perder tiempo
                en lo que ya dominas.
              </p>
            </div>

            <ul className="space-y-2.5">
              {[
                "Evaluación dinámica por competencia",
                "Basado en el marco oficial Saber 11",
              ].map((item) => (
                <li key={item} className="flex items-center gap-2 text-sm font-medium text-on-surface">
                  <span
                    className="material-symbols-outlined text-[18px] text-emerald-600"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    check_circle
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Time estimate — blue card */}
        <div className="flex flex-col justify-between rounded-3xl bg-primary p-8 text-white">
          <div className="space-y-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20">
              <span
                className="material-symbols-outlined text-2xl text-white"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                timer
              </span>
            </div>
            <h3 className="font-headline text-xl font-bold">Tiempo Estimado</h3>
            <p className="text-sm leading-relaxed text-white/70">
              Recomendamos un espacio tranquilo y sin distracciones para obtener
              resultados precisos.
            </p>
          </div>

          <div className="mt-8 flex items-end gap-2">
            <span className="font-headline text-8xl font-black leading-none">45</span>
            <span className="mb-3 text-2xl font-semibold text-white/80">min</span>
          </div>
        </div>
      </div>

      {/* Bottom CTA row */}
      <div className="rounded-3xl bg-white p-8 shadow-sm">
        <div className="grid gap-8 md:grid-cols-[1fr_1fr_auto] md:items-center">
          {/* Subject list */}
          <div className="space-y-5">
            {SUBJECTS.map((s) => (
              <div key={s.num} className="flex items-start gap-4">
                <span className="font-headline text-sm font-black text-outline/40 tabular-nums">
                  {s.num}
                </span>
                <div>
                  <p className="text-sm font-bold text-on-surface">{s.name}</p>
                  <p className="text-xs text-on-surface-variant">{s.sub}</p>
                </div>
              </div>
            ))}
          </div>

          {/* CTA text */}
          <div>
            <h4 className="font-headline text-lg font-bold text-on-surface">
              ¿Estás listo para comenzar?
            </h4>
            <p className="mt-1.5 text-sm leading-relaxed text-on-surface-variant">
              Tu progreso se guardará automáticamente. Podrás ver tu plan de
              estudio personalizado inmediatamente después de finalizar.
            </p>
          </div>

          {/* Button */}
          <div>
            <button
              type="button"
              onClick={() => void navigate("/student/diagnostico/iniciar")}
              className="flex items-center gap-2 rounded-2xl bg-primary px-7 py-4 font-bold text-white shadow-md transition-all hover:opacity-90 active:scale-95"
            >
              <span>Iniciar<br />Diagnóstico</span>
              <span className="material-symbols-outlined text-xl">arrow_forward</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}