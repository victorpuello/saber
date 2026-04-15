import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { fetchTeacherDashboardSummary, type TeacherDashboardSummary } from "../../services/dashboard";

export default function TeacherDashboard() {
  const { user, logout, authFetch } = useAuth();
  const navigate = useNavigate();
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [summary, setSummary] = useState<TeacherDashboardSummary | null>(null);

  useEffect(() => {
    let active = true;

    async function loadSummary() {
      setLoadingSummary(true);
      const nextSummary = await fetchTeacherDashboardSummary(authFetch, user?.grade ?? "11");
      if (!active) {
        return;
      }
      setSummary(nextSummary);
      setLoadingSummary(false);
    }

    loadSummary();

    return () => {
      active = false;
    };
  }, [authFetch, user?.grade]);

  const hasErrors = (summary?.errors.length ?? 0) > 0;

  return (
    <main className="min-h-screen bg-surface p-6 text-on-surface md:p-10">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-headline text-3xl font-bold tracking-tight">Panel del Docente</h1>
          <p className="text-sm text-secondary">Sesión activa: {user?.name}</p>
        </div>
        <button
          className="rounded-xl border border-outline-variant bg-surface-container-low px-4 py-2 text-sm font-semibold"
          onClick={() => {
            logout();
            navigate("/login");
          }}
        >
          Salir
        </button>
      </header>

      {hasErrors && (
        <section className="mb-5 rounded-xl border border-error/30 bg-error-container px-4 py-3 text-sm text-on-error-container">
          Algunos módulos no pudieron cargarse: {summary?.errors.join(" | ")}
        </section>
      )}

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <article className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-4">
          <p className="text-xs font-semibold tracking-wide text-secondary uppercase">Banco de preguntas</p>
          <p className="mt-2 text-2xl font-bold">{loadingSummary ? "..." : summary?.questionBankTotal ?? 0}</p>
        </article>

        <article className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-4">
          <p className="text-xs font-semibold tracking-wide text-secondary uppercase">Pendientes revisión</p>
          <p className="mt-2 text-2xl font-bold">{loadingSummary ? "..." : summary?.pendingReviewQuestions ?? 0}</p>
        </article>

        <article className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-4">
          <p className="text-xs font-semibold tracking-wide text-secondary uppercase">Exámenes activos</p>
          <p className="mt-2 text-2xl font-bold">{loadingSummary ? "..." : summary?.examsAvailable ?? 0}</p>
        </article>

        <article className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-4">
          <p className="text-xs font-semibold tracking-wide text-secondary uppercase">Notificaciones</p>
          <p className="mt-2 text-2xl font-bold">{loadingSummary ? "..." : summary?.unreadNotifications ?? 0}</p>
        </article>
      </section>

      <nav className="mt-8 rounded-2xl border border-outline-variant bg-surface-container-lowest p-4">
        <h2 className="mb-3 text-sm font-semibold text-secondary uppercase tracking-wide">Módulos conectados</h2>
        <ul className="space-y-2 text-sm">
          <li>Banco de preguntas: endpoint /api/questions/stats/summary</li>
          <li>Exámenes: endpoint /api/exams/</li>
          <li>
            Analíticas de estudiantes: {loadingSummary ? "..." : `${summary?.classroomStudents ?? 0} estudiantes, promedio ${summary?.classroomAvgScore ?? "-"}`}
          </li>
          <li>Notificaciones: endpoint /api/notifications/unread-count</li>
        </ul>
      </nav>
    </main>
  );
}
