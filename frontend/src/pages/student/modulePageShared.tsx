import type { ReactNode } from "react";
import type { DashboardDataStatus } from "../../services/dashboard";

export function moduleStatusClasses(status: DashboardDataStatus): string {
  if (status === "connected") {
    return "bg-emerald-50 text-emerald-700";
  }

  if (status === "degraded") {
    return "bg-rose-50 text-rose-700";
  }

  return "bg-amber-50 text-amber-700";
}

export function moduleStatusText(status: DashboardDataStatus): string {
  if (status === "connected") {
    return "Conectado";
  }

  if (status === "degraded") {
    return "Parcial";
  }

  return "Pendiente";
}

interface StudentSummaryCardProps {
  label: string;
  value: string;
  helper: string;
}

export function StudentSummaryCard({ label, value, helper }: StudentSummaryCardProps) {
  return (
    <article className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-secondary">{label}</p>
      <p className="mt-3 text-3xl font-black tracking-tight text-on-surface">{value}</p>
      <p className="mt-2 text-sm text-on-surface-variant">{helper}</p>
    </article>
  );
}

interface StudentPagePanelProps {
  eyebrow: string;
  title: string;
  description: string;
  badge?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
}

export function StudentPagePanel({ eyebrow, title, description, badge, children, footer }: StudentPagePanelProps) {
  return (
    <section className="rounded-3xl border border-outline-variant bg-surface-container-lowest p-6 md:p-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-secondary">{eyebrow}</p>
          <h2 className="mt-2 text-2xl font-black tracking-tight text-on-surface">{title}</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-on-surface-variant">{description}</p>
        </div>
        {badge}
      </div>
      {children ? <div className="mt-6">{children}</div> : null}
      {footer ? <div className="mt-6 flex flex-wrap gap-3">{footer}</div> : null}
    </section>
  );
}