import type { DashboardNotificationModel } from "../types";
import DashboardSectionEmptyState from "./DashboardSectionEmptyState";

interface DashboardNotificationsPreviewProps {
  items: DashboardNotificationModel[];
  loading: boolean;
  markingRead?: boolean;
  onMarkAllRead?: () => void;
}

export default function DashboardNotificationsPreview({
  items,
  loading,
  markingRead = false,
  onMarkAllRead,
}: DashboardNotificationsPreviewProps) {
  const unreadCount = items.filter((item) => item.unread).length;

  return (
    <section className="rounded-4xl border border-outline-variant/10 bg-surface-container-lowest py-7 px-8 shadow-[0_12px_40px_rgba(25,28,30,0.05)]">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold tracking-tight">Notificaciones recientes</h2>
          <p className="mt-1 text-[13px] text-secondary">Eventos académicos y recordatorios más cercanos.</p>
        </div>
        <button
          type="button"
          className="min-h-9 shrink-0 rounded-xl bg-surface-container px-3.5 py-2 text-xs font-semibold text-on-surface-variant transition-colors hover:bg-surface-container-high disabled:opacity-40"
          disabled={loading || markingRead || unreadCount === 0}
          onClick={onMarkAllRead}
        >
          {markingRead ? "Marcando..." : "Marcar visibles"}
        </button>
      </div>

      {items.length === 0 ? (
        <DashboardSectionEmptyState
          title="No hay notificaciones recientes"
          description="Cuando existan hitos o recordatorios apareceran en esta bandeja."
        />
      ) : (
        <div className="space-y-2.5">
          {items.map((item) => (
            <article key={item.id} className={`rounded-[14px] py-3.5 px-4 ${item.unread ? "bg-primary-fixed/55" : "bg-surface-container-low"}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[13px] font-semibold">{item.title}</p>
                  {loading ? (
                    <div className="mt-2 h-3.5 w-40 animate-pulse rounded bg-surface-container-high" />
                  ) : (
                    <p className="mt-1 text-xs text-on-surface-variant leading-normal">{item.detail}</p>
                  )}
                </div>
                {item.unread && <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-primary" />}
              </div>
              <p className="mt-2.5 text-[10px] font-bold uppercase tracking-[0.14em] text-secondary">{item.meta}</p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
