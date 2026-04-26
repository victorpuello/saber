import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useAdminDashboardViewModel } from "./dashboard/useAdminDashboardViewModel";
import type { AdminQuickActionModel } from "./dashboard/types";
import {
  AdminErrorBanner,
  AdminHero,
  AdminInstitutionStats,
  AdminMathAnalyticsCard,
  AdminMetricsGrid,
  AdminModulesStatus,
  AdminQuestionBankCard,
  AdminQuickActions,
} from "./dashboard/components";

export default function AdminDashboard() {
  const { user, authFetch } = useAuth();
  const navigate = useNavigate();

  const { loading, errors, adminName, hero, areaPerformance, metrics, matAnalytics, modules, quickActions, reload } =
    useAdminDashboardViewModel({
      authFetch,
      adminName: user?.name ?? "Administrador",
    });

  function handleQuickAction(action: AdminQuickActionModel) {
    if (action.targetPath) navigate(action.targetPath);
  }

  function handleNavigateQuestions() {
    navigate("/admin/preguntas");
  }

  return (
    <>
      <AdminErrorBanner errors={errors} onRetry={reload} />

      {/* Welcome row */}
      <section className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-on-surface sm:text-3xl">
            Bienvenido, {adminName}
          </h2>
          <p className="mt-1 text-base text-secondary sm:text-lg">
            Panel de control institucional de Saber 11.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="material-symbols-outlined text-[14px] text-secondary opacity-60"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            fiber_manual_record
          </span>
          <span className="text-xs font-bold uppercase tracking-widest text-secondary opacity-60">
            Rol: Administrador
          </span>
        </div>
      </section>

      {/* Row 1: Hero (col-5) + Metrics (col-7) */}
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <AdminHero model={hero} loading={loading} />
        </div>
        <div className="lg:col-span-7">
          <AdminMetricsGrid metrics={metrics} loading={loading} />
        </div>
      </div>

      {/* Row 2: Institution Stats (col-7) + Quick Actions (col-5) */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <AdminInstitutionStats model={hero} areas={areaPerformance} loading={loading} />
        </div>
        <div className="lg:col-span-5">
          <AdminQuickActions
            actions={quickActions}
            loading={loading}
            onAction={handleQuickAction}
          />
        </div>
      </div>

      {/* Row 3: Question Bank Card (col-5) + placeholder (col-7) */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <AdminQuestionBankCard
            total={hero.questionBankTotal}
            pendingReview={hero.pendingCount}
            avgAccuracyPercent={hero.avgAccuracyPercent}
            loading={loading}
            onNavigate={handleNavigateQuestions}
          />
        </div>
        <div className="lg:col-span-7">
          <AdminMathAnalyticsCard
            competencies={matAnalytics.competencies}
            strugglingComponents={matAnalytics.strugglingComponents}
            hardestQuestions={matAnalytics.hardestQuestions}
            loading={loading}
          />
          {false && <section className="flex h-full flex-col items-center justify-center rounded-4xl border border-dashed border-outline-variant/40 bg-surface-container-lowest p-8 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/8 text-primary">
              <span className="material-symbols-outlined text-[28px]">bar_chart</span>
            </div>
            <p className="mt-4 text-base font-bold text-on-surface">Analytics detallado</p>
            <p className="mt-2 max-w-xs text-sm text-on-surface-variant">
              Los reportes de rendimiento por área y grado estarán disponibles en el módulo de
              Analytics Institucional.
            </p>
            <button
              type="button"
              onClick={() => navigate("/admin/analytics")}
              className="mt-5 rounded-xl border border-primary/20 bg-primary/5 px-4 py-2.5 text-sm font-bold text-primary transition-colors hover:bg-primary/10 active:scale-[0.98]"
            >
              Ver Analytics
            </button>
          </section>}
        </div>
      </div>

      {/* Row 4: Modules status (full width) */}
      <AdminModulesStatus modules={modules} />
    </>
  );
}
