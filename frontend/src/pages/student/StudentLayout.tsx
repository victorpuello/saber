import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { DashboardNavigation } from "./dashboard/components";

const PAGE_TITLES: Record<string, string> = {
  "/student": "Dashboard",
  "/student/diagnostico": "Diagnóstico Inicial",
  "/student/plan": "Plan de Estudio",
  "/student/resultados": "Mis Resultados",
  "/student/examenes": "Simulacros y Práctica",
};

export default function StudentLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const pageTitle =
    PAGE_TITLES[location.pathname] ??
    (location.pathname.startsWith("/student/examenes/resultados")
      ? "Resultados del Examen"
      : location.pathname.startsWith("/student/examenes/sesion")
        ? "Presentando Examen"
        : "Saber 11");
  useDocumentTitle(pageTitle);

  function handleLogout() {
    logout();
    navigate("/login");
  }

  const studentName = user?.name ?? "Estudiante";
  const initial = studentName.trim().slice(0, 1).toUpperCase();

  return (
    <>
      <DashboardNavigation studentName={studentName} />

      {/* Fixed top header */}
      <header className="fixed left-0 right-0 top-0 z-40 flex h-16 items-center justify-between bg-white/82 px-4 shadow-[0_1px_3px_rgba(148,163,184,0.25)] backdrop-blur-xl sm:px-6 md:left-[220px] md:px-9">
        <span className="font-headline text-[15px] font-bold text-on-surface">{pageTitle}</span>
        <div className="flex items-center gap-5">
          <div className="flex gap-4">
            <span className="material-symbols-outlined cursor-pointer text-[22px] text-secondary transition-opacity hover:opacity-70">
              notifications
            </span>
            <span className="material-symbols-outlined cursor-pointer text-[22px] text-secondary transition-opacity hover:opacity-70">
              settings
            </span>
          </div>
          <button
            type="button"
            title="Cerrar sesión"
            onClick={handleLogout}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-white"
          >
            {initial}
          </button>
        </div>
      </header>

      <main className="min-h-screen bg-surface pb-24 pt-16 text-on-surface md:ml-[220px] md:pb-10">
        <div className="mx-auto max-w-[1400px] space-y-6 px-6 py-9 md:px-9">
          <Outlet />
        </div>
      </main>
    </>
  );
}
