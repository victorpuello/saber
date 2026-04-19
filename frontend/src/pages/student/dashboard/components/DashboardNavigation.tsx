import { NavLink } from "react-router-dom";

interface DashboardNavigationProps {
  studentName: string;
}

const NAV_ITEMS = [
  { to: "/student", label: "Dashboard", icon: "dashboard" },
  { to: "/student/diagnostico", label: "Diagnóstico", icon: "analytics" },
  { to: "/student/plan", label: "Plan de estudio", icon: "auto_stories" },
  { to: "/student/resultados", label: "Resultados", icon: "military_tech" },
];

export default function DashboardNavigation({ studentName: _studentName }: DashboardNavigationProps) {
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
              auto_stories
            </span>
          </div>
          <div>
            <h1 className="font-headline text-xl font-black tracking-tight text-on-surface">Saber 11</h1>
            <p className="text-[9px] font-bold uppercase tracking-[0.32em] text-secondary">Simulador</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/student"}
              className={({ isActive }) =>
                `flex items-center gap-2.5 rounded-none px-3.5 py-[11px] text-sm font-semibold transition-colors border-r-4 ${
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

        <div className="mt-auto px-1">
          <button
            type="button"
            className="w-full rounded-xl bg-primary p-[13px] text-sm font-bold text-white shadow-[0_4px_12px_rgba(0,74,198,0.22)] transition-opacity hover:opacity-90 active:scale-95"
          >
            Iniciar práctica
          </button>
        </div>
      </aside>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 flex h-16 items-center justify-around bg-white/90 px-3 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] backdrop-blur-md md:hidden">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/student"}
            className={({ isActive }) =>
              `flex min-w-0 flex-col items-center justify-center gap-1 ${isActive ? "text-primary" : "text-secondary opacity-60"}`
            }
          >
            <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
            <span className="mt-0.5 text-[10px] font-bold">{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </>
  );
}
