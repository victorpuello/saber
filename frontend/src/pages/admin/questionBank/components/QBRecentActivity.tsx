import type { ActivityItem } from "../types";

interface QBRecentActivityProps {
  items: ActivityItem[];
}

const ICON_VARIANT: Record<ActivityItem["iconVariant"], { bg: string; icon: string; color: string }> = {
  success: { bg: "bg-emerald-100", icon: "check_circle", color: "text-emerald-600" },
  warning: { bg: "bg-amber-100",   icon: "pending",      color: "text-amber-600"   },
  info:    { bg: "bg-primary/10",  icon: "edit_note",    color: "text-primary"     },
};

export default function QBRecentActivity({ items }: QBRecentActivityProps) {
  return (
    <section className="flex flex-col rounded-3xl bg-surface-container-lowest p-6 shadow-[0_12px_40px_rgba(25,28,30,0.05)]">
      {/* Header */}
      <div className="mb-5 flex items-center gap-2">
        <span
          className="material-symbols-outlined text-[18px] text-secondary"
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          history
        </span>
        <h2 className="text-xs font-bold uppercase tracking-widest text-secondary">
          Actividad Reciente
        </h2>
      </div>

      {/* Timeline */}
      <ol className="relative flex flex-col gap-0">
        {items.map((item, idx) => {
          const v = ICON_VARIANT[item.iconVariant];
          const isLast = idx === items.length - 1;

          return (
            <li key={item.id} className="relative flex gap-4">
              {/* Vertical connector */}
              {!isLast && (
                <div className="absolute left-[17px] top-8 bottom-0 w-px bg-outline-variant/15" />
              )}

              {/* Icon */}
              <div className={`relative z-10 mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${v.bg}`}>
                <span
                  className={`material-symbols-outlined text-[16px] ${v.color}`}
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  {v.icon}
                </span>
              </div>

              {/* Content */}
              <div className={`min-w-0 flex-1 ${!isLast ? "pb-5" : ""}`}>
                <p className="text-sm font-medium leading-snug text-on-surface">{item.text}</p>
                <div className="mt-1 flex items-center gap-2">
                  <span className="text-xs text-secondary">{item.timeAgo}</span>
                  <span className="h-1 w-1 rounded-full bg-secondary/30" />
                  <span className="text-xs text-secondary">{item.category}</span>
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
