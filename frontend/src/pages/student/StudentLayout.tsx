import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { DashboardNavigation } from "./dashboard/components";

const PAGE_TITLES: Record<string, string> = {
  "/student": "Dashboard",
  "/student/diagnostico": "Diagnóstico Inicial",
  "/student/plan": "Plan de Estudio",
  "/student/resultados": "Mis Resultados",
};

export default function StudentLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const pageTitle = PAGE_TITLES[location.pathname] ?? "Saber 11";

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
      <header className="fixed left-0 right-0 top-0 z-40 flex h-16 items-center justify-between bg-white/80 px-4 shadow-sm shadow-slate-200/50 backdrop-blur-xl sm:px-6 md:left-64 md:px-8">
        <span className="font-headline text-base font-bold text-on-surface">{pageTitle}</span>
        <div className="flex items-center gap-6">
          <div className="flex gap-4">
            <span className="material-symbols-outlined cursor-pointer text-secondary hover:opacity-80">
              notifications
            </span>
            <span className="material-symbols-outlined cursor-pointer text-secondary hover:opacity-80">
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

      <main className="min-h-screen bg-surface pb-24 pt-16 text-on-surface md:ml-64 md:pb-10">
        <div className="mx-auto max-w-full space-y-8 px-6 py-8 md:px-8">
          <Outlet />
        </div>
      </main>
    </>
  );
}
