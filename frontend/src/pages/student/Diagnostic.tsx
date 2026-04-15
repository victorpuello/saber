import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useStudentDashboardSummary } from "./dashboard/useStudentDashboardSummary";
import { StudentPagePanel, StudentSummaryCard, moduleStatusClasses, moduleStatusText } from "./modulePageShared";

export default function StudentDiagnosticPage() {
  const { user, authFetch } = useAuth();
  const { summary, loading, reload } = useStudentDashboardSummary({
    authFetch,
    userId: user?.id ?? null,
  });

  const status = summary?.moduleHealth.diagnostic.status ?? "pending";
  const statusBadge = (
    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${moduleStatusClasses(status)}`}>
      {moduleStatusText(status)}
    </span>
  );

  const description = loading
    ? "Estamos consolidando el perfil diagnostico y el historial reciente."
    : status === "degraded"
      ? summary?.moduleHealth.diagnostic.error ?? "No se pudo reconstruir el diagnostico completo en este momento."
      : (summary?.diagnosticCompetencies ?? 0) > 0
        ? "Tu perfil diagnostico ya ofrece una base util para priorizar competencias y ajustar el plan."
        : "Todavia no hay un perfil consolidado. Este modulo sera el punto de partida para personalizar el plan.";

  return (
    <div className="space-y-6">
      <StudentPagePanel
        eyebrow="Perfil adaptativo"
        title="Estado del diagnostico"
        description={description}
        badge={statusBadge}
        footer={
          <>
            <button
              type="button"
              onClick={() => void reload()}
              className="rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white shadow-sm transition-opacity hover:opacity-90"
            >
              Reintentar carga
            </button>
            <Link
              to="/student/plan"
              className="rounded-xl border border-outline-variant bg-surface-container-low px-4 py-2 text-sm font-semibold"
            >
              Ver plan de estudio
            </Link>
          </>
        }
      />

      <section className="grid gap-4 md:grid-cols-3">
        <StudentSummaryCard
          label="Competencias"
          value={loading ? "..." : String(summary?.diagnosticCompetencies ?? 0)}
          helper="Competencias con señal diagnóstica consolidada."
        />
        <StudentSummaryCard
          label="Sesiones completas"
          value={loading ? "..." : String(summary?.diagnosticCompletedSessions ?? 0)}
          helper="Diagnósticos finalizados y listos para influir en tu plan."
        />
        <StudentSummaryCard
          label="Sesiones en curso"
          value={loading ? "..." : String(summary?.diagnosticInProgressSessions ?? 0)}
          helper="Evaluaciones activas que conviene retomar antes de seguir avanzando."
        />
      </section>

      <StudentPagePanel
        eyebrow="Siguiente uso"
        title="Que desbloquea este modulo"
        description="El diagnóstico define la precisión del plan semanal y ayuda a detectar áreas donde tu práctica debe cambiar de prioridad."
      >
        <ul className="grid gap-3 text-sm text-on-surface-variant md:grid-cols-3">
          <li className="rounded-2xl bg-surface-container-low p-4">Si completas el perfil, el plan puede priorizar competencias reales en lugar de una ruta genérica.</li>
          <li className="rounded-2xl bg-surface-container-low p-4">Si hay sesiones en curso, retomarlas evita que el tablero trabaje con señal incompleta.</li>
          <li className="rounded-2xl bg-surface-container-low p-4">Si el módulo falla parcialmente, el dashboard seguirá marcando el estado como parcial hasta recuperar la carga.</li>
        </ul>
      </StudentPagePanel>
    </div>
  );
}