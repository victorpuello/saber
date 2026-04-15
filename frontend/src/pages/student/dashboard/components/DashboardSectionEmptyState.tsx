interface DashboardSectionEmptyStateProps {
  title: string;
  description: string;
}

export default function DashboardSectionEmptyState({ title, description }: DashboardSectionEmptyStateProps) {
  return (
    <div className="rounded-xl border border-dashed border-outline-variant bg-surface-container-low px-4 py-5 text-center">
      <p className="text-sm font-semibold text-on-surface">{title}</p>
      <p className="mt-1 text-xs text-on-surface-variant">{description}</p>
    </div>
  );
}
