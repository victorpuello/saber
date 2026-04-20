import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useStudentDashboardSummary } from "./dashboard/useStudentDashboardSummary";
import { StudentPagePanel, StudentSummaryCard, moduleStatusClasses, moduleStatusText } from "./modulePageShared";

export default function StudentResultsPage() {
  const { user, authFetch } = useAuth();
  const { summary, loading, reload } = useStudentDashboardSummary({
    authFetch,
    userId: user?.id ?? null,
  });

  const status = summary?.moduleHealth.sessions.status ?? "pending";
  const statusBadge = (
    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${moduleStatusClasses(status)}`}>
      {moduleStatusText(status)}
    </span>
  );

  const description = loading
    ? "Estamos reuniendo el historial reciente de simulacros y el promedio consolidado."
    : status === "degraded"
      ? summary?.moduleHealth.sessions.error ?? "No se pudo reconstruir completo el módulo de resultados."
      : (summary?.examCount ?? 0) > 0
        ? "Tus últimos resultados ya están disponibles para identificar tendencia y consistencia."
        : "Todavia no hay simulacros registrados. Cuando completes sesiones, esta vista mostrará tu tendencia real.";

  return (
    <div className="space-y-6">
      <StudentPagePanel
        eyebrow="Rendimiento"
        title="Estado de resultados"
        description={description}
        badge={statusBadge}
        footer={
          <>
            <button
              type="button"
              onClick={() => void reload()}
              className="rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white shadow-sm transition-opacity hover:opacity-90"
            >
              Actualizar resultados
            </button>
            <Link
              to="/student/plan"
              className="rounded-xl border border-outline-variant bg-surface-container-low px-4 py-2 text-sm font-semibold"
            >
              Volver al plan
            </Link>
          </>
        }
      >
        <div className="grid gap-3">
          {(summary?.recentExams ?? []).slice(0, 3).map((exam) => (
            <article key={exam.id} className="rounded-2xl bg-surface-container-low p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm font-bold text-on-surface">
                  {exam.exam_type}{exam.area_code ? ` · ${exam.area_code}` : ""}
                </p>
                <span className="text-xs font-semibold text-secondary">{exam.completed_at.replace("T", " ").slice(0, 16)}</span>
              </div>
              <p className="mt-2 text-sm text-on-surface-variant">
                {exam.score_global !== null ? `Puntaje ${Math.round(exam.score_global)}/100` : "Puntaje no disponible"}
                {exam.accuracy !== null ? ` · ${Math.round(exam.accuracy)}% de precision` : ""}
              </p>
            </article>
          ))}
          {!loading && (summary?.recentExams.length ?? 0) === 0 ? (
            <article className="rounded-2xl bg-surface-container-low p-4 text-sm text-on-surface-variant">
              Aun no hay sesiones cerradas para mostrar aqui.
            </article>
          ) : null}
        </div>
      </StudentPagePanel>

      <section className="grid gap-4 md:grid-cols-3">
        <StudentSummaryCard
          label="Simulacros"
          value={loading ? "..." : String(summary?.examCount ?? 0)}
          helper="Número de sesiones con señal analítica consolidada."
        />
        <StudentSummaryCard
          label="Promedio"
          value={loading ? "..." : summary?.avgExamScore != null ? `${summary.avgExamScore}` : "-"}
          helper="Promedio reciente en escala global del simulador."
        />
        <StudentSummaryCard
          label="Precision"
          value={loading ? "..." : summary?.avgAccuracy != null ? `${summary.avgAccuracy}%` : "-"}
          helper="Porcentaje promedio de aciertos sobre historial reciente."
        />
      </section>
    </div>
  );
}