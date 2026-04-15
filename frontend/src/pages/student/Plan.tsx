import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useStudentDashboardSummary } from "./dashboard/useStudentDashboardSummary";
import { StudentPagePanel, StudentSummaryCard, moduleStatusClasses, moduleStatusText } from "./modulePageShared";

export default function StudentPlanPage() {
  const { user, authFetch } = useAuth();
  const { summary, loading, reload } = useStudentDashboardSummary({
    authFetch,
    userId: user?.id ?? null,
  });

  const status = summary?.moduleHealth.plan.status ?? "pending";
  const nextUnit = summary?.nextRecommendedUnit ?? null;
  const statusBadge = (
    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${moduleStatusClasses(status)}`}>
      {moduleStatusText(status)}
    </span>
  );

  const description = loading
    ? "Estamos reconstruyendo el plan activo y su semana recomendada."
    : status === "degraded"
      ? summary?.moduleHealth.plan.error ?? "El plan no pudo cargarse por completo en este momento."
      : summary?.activePlanWeeks
        ? "Tu plan activo ya está listo para orientarte por semana y por unidad prioritaria."
        : "Todavia no hay un plan activo. Puedes generarlo cuando el diagnostico ya tenga suficiente señal.";

  return (
    <div className="space-y-6">
      <StudentPagePanel
        eyebrow="Ruta semanal"
        title="Estado del plan"
        description={description}
        badge={statusBadge}
        footer={
          <>
            <button
              type="button"
              onClick={() => void reload()}
              className="rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white shadow-sm transition-opacity hover:opacity-90"
            >
              Actualizar plan
            </button>
            <Link
              to="/student/diagnostico"
              className="rounded-xl border border-outline-variant bg-surface-container-low px-4 py-2 text-sm font-semibold"
            >
              Revisar diagnostico
            </Link>
          </>
        }
      >
        <div className="rounded-2xl bg-surface-container-low p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-secondary">Unidad sugerida</p>
          <h3 className="mt-3 text-xl font-black tracking-tight text-on-surface">
            {loading ? "Cargando..." : nextUnit?.title ?? "Sin unidad prioritaria disponible"}
          </h3>
          <p className="mt-2 text-sm text-on-surface-variant">
            {loading
              ? "Calculando recomendación..."
              : nextUnit?.description ?? "Cuando exista un plan activo, aquí aparecerá la unidad que conviene continuar."}
          </p>
        </div>
      </StudentPagePanel>

      <section className="grid gap-4 md:grid-cols-3">
        <StudentSummaryCard
          label="Duracion"
          value={loading ? "..." : summary?.activePlanWeeks ? `${summary.activePlanWeeks} sem` : "Sin plan"}
          helper="Número de semanas del plan activo."
        />
        <StudentSummaryCard
          label="Semana actual"
          value={loading ? "..." : summary?.currentPlanWeek ? `${summary.currentPlanWeek}` : "-"}
          helper="Bloque del plan en el que deberías concentrarte ahora."
        />
        <StudentSummaryCard
          label="Avance"
          value={loading ? "..." : summary?.progressPercent !== null ? `${summary?.progressPercent ?? 0}%` : "0%"}
          helper="Porcentaje consolidado a partir de unidades completadas."
        />
      </section>

      <StudentPagePanel
        eyebrow="Lectura rapida"
        title="Como usar esta vista"
        description="Esta página será la entrada para gestionar el plan. Por ahora ya refleja el estado real del backend y permite identificar si falta generar el plan o si la carga viene parcial."
      >
        <ul className="grid gap-3 text-sm text-on-surface-variant md:grid-cols-3">
          <li className="rounded-2xl bg-surface-container-low p-4">Si no existe plan activo, el siguiente paso correcto suele ser cerrar antes el diagnóstico.</li>
          <li className="rounded-2xl bg-surface-container-low p-4">Si ya existe una unidad sugerida, este será el punto natural para abrir la práctica o el detalle semanal.</li>
          <li className="rounded-2xl bg-surface-container-low p-4">Si el módulo figura parcial, puedes reintentar y seguir usando el dashboard sin perder el contexto general.</li>
        </ul>
      </StudentPagePanel>
    </div>
  );
}