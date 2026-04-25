import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useStudentDashboardSummary } from "./dashboard/useStudentDashboardSummary";
import DiagnosticResults from "./DiagnosticResults";

const SUBJECTS = [
  { num: "01", name: "Lectura Crítica", sub: "Comprensión y análisis textual", color: "#6d28d9" },
  { num: "02", name: "Matemáticas", sub: "Razonamiento cuantitativo", color: "#1d4ed8" },
  { num: "03", name: "Sociales y Ciudadanas", sub: "Pensamiento social y reflexivo", color: "#be123c" },
  { num: "04", name: "Ciencias Naturales", sub: "Física, Química, Biología", color: "#047857" },
  { num: "05", name: "Inglés", sub: "Comprensión lectora y gramatical", color: "#b45309" },
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
      <div className="flex items-center justify-center py-20">
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
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.2em] text-emerald-700">
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
        <h1 className="font-headline text-[48px] font-black leading-[1.05] tracking-[-0.04em] text-on-surface">
          Hola, {firstName}.<br />
          Descubramos tu{" "}
          <span className="text-primary">potencial académico.</span>
        </h1>
        <p className="max-w-xl text-[17px] font-normal leading-[1.7] text-on-surface-variant">
          Antes de comenzar tu plan de estudio personalizado, realizaremos una evaluación
          diagnóstica para identificar tus fortalezas y áreas de oportunidad en cada componente
          del Saber 11.
        </p>
      </div>

      {/* Info cards */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* White card — Algoritmo Adaptativo */}
        <div className="relative overflow-hidden rounded-[28px] bg-white p-8 shadow-[0_12px_40px_rgba(25,28,30,0.06)]">
          <div className="pointer-events-none absolute -right-14 -top-14 h-44 w-44 rounded-full bg-surface-container-low" />
          <div className="relative space-y-4">
            <div className="flex h-13 w-13 items-center justify-center rounded-2xl bg-primary/10">
              <span
                className="material-symbols-outlined text-[26px] text-primary"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                psychology
              </span>
            </div>
            <div>
              <h3 className="text-xl font-extrabold tracking-[-0.02em] text-on-surface">
                Algoritmo Adaptativo
              </h3>
              <p className="mt-2 text-sm leading-[1.65] text-on-surface-variant">
                Nuestro sistema ajusta la dificultad de cada pregunta en tiempo real basándose en
                tu desempeño. Esto nos permite mapear con precisión quirúrgica tu nivel en cada
                competencia.
              </p>
            </div>
            <ul className="space-y-2.5">
              {[
                "Evaluación dinámica por competencia DCE",
                "Basado en Teoría de Respuesta al Ítem (TRI)",
                "Sin retroceso — cada respuesta refina el perfil",
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

        {/* Blue card — Tiempo */}
        <div className="flex flex-col justify-between rounded-[28px] bg-primary p-8 text-white">
          <div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20">
              <span
                className="material-symbols-outlined text-[26px] text-white"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                timer
              </span>
            </div>
            <h3 className="mt-3 text-xl font-extrabold tracking-[-0.02em]">Tiempo Estimado</h3>
            <p className="mt-2 text-sm leading-[1.6] text-white/70">
              Recomendamos un espacio tranquilo y sin distracciones. Puedes pausar entre áreas
              pero no dentro de una sesión.
            </p>
          </div>
          <div className="mt-auto flex items-end gap-2 pt-6">
            <span className="text-[80px] font-black leading-none tracking-[-0.05em]">45</span>
            <span className="mb-2.5 text-2xl font-medium text-white/65">min</span>
          </div>
        </div>
      </div>

      {/* CTA section */}
      <div className="rounded-[28px] bg-white p-8 shadow-[0_12px_40px_rgba(25,28,30,0.06)]">
        <div className="grid gap-8 md:grid-cols-[1fr_1fr_auto] md:items-center">
          {/* Subject list */}
          <div className="space-y-3.5">
            {SUBJECTS.map((s) => (
              <div key={s.num} className="flex items-center gap-3.5">
                <span className="w-5 text-[12px] font-black tabular-nums text-outline/40">
                  {s.num}
                </span>
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: s.color }}
                />
                <div>
                  <p className="text-sm font-bold text-on-surface">{s.name}</p>
                  <p className="text-xs text-on-surface-variant">{s.sub}</p>
                </div>
              </div>
            ))}
          </div>

          {/* CTA text */}
          <div>
            <h4 className="text-lg font-extrabold tracking-[-0.02em] text-on-surface">
              ¿Estás listo para comenzar?
            </h4>
            <p className="mt-1 text-sm leading-relaxed text-on-surface-variant">
              Tu progreso se guarda automáticamente. Verás tu plan de estudio personalizado justo
              al finalizar.
            </p>
          </div>

          {/* Button */}
          <div>
            <button
              type="button"
              onClick={() => void navigate("/student/diagnostico/iniciar")}
              className="flex items-center gap-2.5 rounded-2xl bg-linear-to-br from-primary to-primary-container px-7 py-4 font-bold text-white shadow-scholar-card transition-all hover:scale-[1.02] hover:opacity-95 active:scale-95"
              style={{ background: "linear-gradient(135deg,#004ac6,#2563eb)" }}
            >
              <span className="text-[15px]">
                Iniciar<br />Diagnóstico
              </span>
              <span className="material-symbols-outlined text-xl">arrow_forward</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
