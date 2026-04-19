import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const NAV_ITEMS = [
  { to: "/admin", label: "Dashboard", icon: "dashboard", end: true },
  { to: "/admin/preguntas", label: "Banco de Preguntas", icon: "quiz", end: false },
  { to: "/admin/analytics", label: "Analytics", icon: "analytics", end: false },
  { to: "/admin/estudiantes", label: "Estudiantes", icon: "group", end: false },
  { to: "/admin/notificaciones", label: "Notificaciones", icon: "notifications", end: false },
];

const PAGE_TITLES: Record<string, string> = {
  "/admin": "Panel de Administración",
  "/admin/preguntas": "Banco de Preguntas",
  "/admin/analytics": "Analytics Institucional",
  "/admin/estudiantes": "Gestión de Estudiantes",
  "/admin/notificaciones": "Notificaciones",
};

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const pageTitle = PAGE_TITLES[location.pathname] ?? "Administración";
  const adminName = user?.name ?? "Administrador";
  const initial = adminName.trim().slice(0, 1).toUpperCase();

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="fixed left-0 top-0 hidden h-screen w-64 flex-col bg-slate-50 px-4 py-6 md:flex">
        <div className="mb-9 flex items-center gap-3 px-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary shadow-[0_4px_10px_rgba(0,74,198,0.25)]">
            <span
              className="material-symbols-outlined text-2xl text-white"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              admin_panel_settings
            </span>
          </div>
          <div>
            <h1 className="font-headline text-xl font-black tracking-tight text-on-surface">Saber 11</h1>
            <p className="text-[9px] font-bold uppercase tracking-[0.32em] text-secondary">Administración</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-2.5 rounded-none px-3.5 py-2.5 text-sm font-semibold transition-colors border-r-4 ${
                  isActive
                    ? "border-primary bg-primary/[0.04] font-bold text-primary"
                    : "border-transparent text-secondary hover:bg-slate-200/50 hover:text-primary"
                }`
              }
            >
              <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto border-t border-outline-variant/30 px-4 pt-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">
              {initial}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-on-surface">{adminName}</p>
              <p className="text-xs text-secondary">Administrador</p>
            </div>
            <button
              type="button"
              title="Cerrar sesión"
              onClick={handleLogout}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-secondary transition-colors hover:bg-slate-200 hover:text-error"
            >
              <span className="material-symbols-outlined text-[20px]">logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Fixed top header */}
      <header className="fixed left-0 right-0 top-0 z-40 flex h-16 items-center justify-between bg-white/82 px-4 shadow-[0_1px_3px_rgba(148,163,184,0.25)] backdrop-blur-xl sm:px-6 md:left-64 md:px-9">
        <span className="font-headline text-[15px] font-bold text-on-surface">{pageTitle}</span>
        <div className="flex items-center gap-4">
          <span className="material-symbols-outlined cursor-pointer text-[22px] text-secondary transition-opacity hover:opacity-70">
            notifications
          </span>
          <span className="material-symbols-outlined cursor-pointer text-[22px] text-secondary transition-opacity hover:opacity-70">
            settings
          </span>
          <button
            type="button"
            title="Cerrar sesión"
            onClick={handleLogout}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-white md:hidden"
          >
            {initial}
          </button>
        </div>
      </header>

      {/* Main content */}
      <main className="min-h-screen bg-surface pb-24 pt-16 text-on-surface md:ml-64 md:pb-10">
        <div className="mx-auto max-w-[1400px] space-y-7 px-6 py-9 md:px-9">
          <Outlet />
        </div>
      </main>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 flex h-16 items-center justify-around bg-white/90 px-3 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] backdrop-blur-md md:hidden">
        {NAV_ITEMS.slice(0, 4).map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `flex min-w-0 flex-col items-center justify-center gap-1 ${isActive ? "text-primary" : "text-secondary opacity-60"}`
            }
          >
            <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
            <span className="mt-0.5 text-[10px] font-bold">{item.label.split(" ")[0]}</span>
          </NavLink>
        ))}
      </nav>
    </>
  );
}
