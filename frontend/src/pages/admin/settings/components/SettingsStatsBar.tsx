interface Props {
  totalGenerated: number;
  totalApproved: number;
  totalRejected: number;
  approvalRate: number;
  byModel: Record<string, number>;
}

export default function SettingsStatsBar({
  totalGenerated,
  totalApproved,
  totalRejected,
  approvalRate,
  byModel,
}: Props) {
  const cards = [
    { label: "Total generadas", value: totalGenerated, icon: "auto_awesome", variant: "default" },
    { label: "Aprobadas", value: totalApproved, icon: "check_circle", variant: "success" },
    { label: "Rechazadas", value: totalRejected, icon: "cancel", variant: "error" },
    {
      label: "Tasa aprobación",
      value: `${Math.round(approvalRate * 100)}%`,
      icon: "percent",
      variant: approvalRate >= 0.7 ? "success" : approvalRate >= 0.4 ? "warning" : "error",
    },
  ];

  const variantStyles: Record<string, string> = {
    default: "bg-slate-100 text-slate-600",
    success: "bg-emerald-50 text-emerald-600",
    warning: "bg-amber-50 text-amber-600",
    error: "bg-rose-50 text-rose-600",
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {cards.map((c) => (
          <div
            key={c.label}
            className="flex items-center gap-3 rounded-xl border border-outline-variant/10 bg-white p-4 shadow-[0_2px_8px_rgba(25,28,30,0.04)]"
          >
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${variantStyles[c.variant]}`}>
              <span className="material-symbols-outlined text-[20px]">{c.icon}</span>
            </div>
            <div className="min-w-0">
              <p className="text-xl font-bold text-on-surface">{c.value}</p>
              <p className="truncate text-[11px] font-medium text-secondary">{c.label}</p>
            </div>
          </div>
        ))}
      </div>

      {Object.keys(byModel).length > 0 && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(byModel).map(([model, count]) => (
            <span
              key={model}
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-secondary"
            >
              <span className="material-symbols-outlined text-[14px]">smart_toy</span>
              {model}: {count}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
