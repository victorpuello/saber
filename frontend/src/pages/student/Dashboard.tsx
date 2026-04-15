import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { markNotificationsAsRead } from "../../services/dashboard";
import {
  DashboardAreaPerformance,
  DashboardErrorBanner,
  DashboardHero,
  DashboardMetricsGrid,
  DashboardModulesStatus,
  DashboardNextTask,
  DashboardNotificationsPreview,
  DashboardQuickActions,
  DashboardRecentActivity,
} from "./dashboard/components";
import { useStudentDashboardViewModel } from "./dashboard/useStudentDashboardViewModel";
import type { DashboardQuickActionModel } from "./dashboard/types";

export default function StudentDashboard() {
  const { user, authFetch } = useAuth();
  const navigate = useNavigate();
  const [markingNotifications, setMarkingNotifications] = useState(false);
  const { viewModel, reload } = useStudentDashboardViewModel({
    authFetch,
    userId: user?.id ?? null,
    studentName: user?.name ?? "Estudiante",
    grade: user?.grade ?? null,
  });

  function handleNextTaskAction() {
    if (viewModel.nextTask.targetPath) {
      navigate(viewModel.nextTask.targetPath);
      return;
    }
    void reload();
  }

  function handleQuickAction(action: DashboardQuickActionModel) {
    if (!action.targetPath) return;
    navigate(action.targetPath);
  }

  async function handleMarkVisibleNotificationsRead() {
    const unreadIds = viewModel.notifications.filter((item) => item.unread).map((item) => item.id);
    if (unreadIds.length === 0) return;
    setMarkingNotifications(true);
    try {
      await markNotificationsAsRead(authFetch, unreadIds);
      await reload();
    } finally {
      setMarkingNotifications(false);
    }
  }

  return (
    <>
      <DashboardErrorBanner errors={viewModel.errors} onRetry={reload} />

      {/* Welcome row */}
      <section className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-on-surface">
            Bienvenido, {viewModel.studentName}
          </h2>
          <p className="mt-1 text-lg text-secondary">
            Tu camino hacia la excelencia académica continúa aquí.
          </p>
        </div>
        <div className="text-xs font-bold uppercase tracking-widest text-secondary opacity-60">
          Período actual: {viewModel.periodLabel}
        </div>
      </section>

      {/* Row 1: Hero (col-4) + Area Performance (col-8) */}
      <div className="grid grid-cols-1 items-stretch gap-6 md:grid-cols-12">
        <div className="md:col-span-4">
          <DashboardHero model={viewModel.hero} loading={viewModel.loading} />
        </div>
        <div className="md:col-span-8">
          <DashboardAreaPerformance items={viewModel.areaPerformance} loading={viewModel.loading} />
        </div>
      </div>

      {/* Row 2: Next Task + Recent Activity */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-12">
        <div className="md:col-span-7">
          <DashboardNextTask
            model={viewModel.nextTask}
            loading={viewModel.loading}
            onAction={handleNextTaskAction}
          />
        </div>
        <div className="md:col-span-5">
          <DashboardRecentActivity items={viewModel.activities} loading={viewModel.loading} />
        </div>
      </div>

      {/* Secondary: KPI metrics */}
      <DashboardMetricsGrid metrics={viewModel.metrics} loading={viewModel.loading} />

      {/* Secondary: Notifications + Quick Actions */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-12">
        <div className="md:col-span-7">
          <DashboardNotificationsPreview
            items={viewModel.notifications}
            loading={viewModel.loading}
            markingRead={markingNotifications}
            onMarkAllRead={handleMarkVisibleNotificationsRead}
          />
        </div>
        <div className="md:col-span-5">
          <DashboardQuickActions
            actions={viewModel.quickActions}
            loading={viewModel.loading}
            onAction={handleQuickAction}
          />
        </div>
      </div>

      {/* Module health status */}
      <DashboardModulesStatus modules={viewModel.modules} />
    </>
  );
}
