import type { AdminHeroModel } from "../types";

interface AdminHeroProps {
  model: AdminHeroModel;
  loading: boolean;
}

function Stat({ label, value, loading }: { label: string; value: string; loading: boolean }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-widest opacity-70">{label}</p>
      {loading ? (
        <div className="mt-2 h-9 w-24 animate-pulse rounded-lg bg-white/30" />
      ) : (
        <p className="mt-1 text-3xl font-black tracking-tighter sm:text-4xl">{value}</p>
      )}
    </div>
  );
}

export default function AdminHero({ model, loading }: AdminHeroProps) {
  const avgScore = model.institutionAvgScore !== null ? `${model.institutionAvgScore} pts` : "—";
  const accuracy = model.avgAccuracyPercent !== null ? `${model.avgAccuracyPercent}%` : "—";
  const hasPending = model.pendingCount > 0;

  return (
    <article className="relative flex h-full min-h-56 flex-col justify-between overflow-hidden rounded-4xl bg-linear-to-br from-primary to-primary-container p-6 text-white shadow-lg shadow-primary/20 sm:p-8">
      {/* Background accent */}
      <div className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/5" />
      <div className="pointer-events-none absolute -bottom-10 right-10 h-28 w-28 rounded-full bg-white/5" />

      <div>
        <div className="flex items-center gap-2">
          <span
            className="material-symbols-outlined text-[18px] opacity-80"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            admin_panel_settings
          </span>
          <span className="text-xs font-bold uppercase tracking-widest opacity-80">Institución</span>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-3">
          <Stat
            label="Estudiantes"
            value={model.institutionStudents !== null ? String(model.institutionStudents) : "—"}
            loading={loading}
          />
          <Stat label="Puntaje promedio" value={avgScore} loading={loading} />
          <Stat label="Precisión banco" value={accuracy} loading={loading} />
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5">
          <span
            className="material-symbols-outlined text-[14px]"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            quiz
          </span>
          <span className="text-xs font-bold">
            {loading ? "..." : `${model.questionBankTotal} preguntas`}
          </span>
        </div>

        {hasPending && !loading && (
          <div className="flex items-center gap-1.5 rounded-full bg-amber-400/20 px-3 py-1.5 text-amber-200">
            <span
              className="material-symbols-outlined text-[14px]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              pending_actions
            </span>
            <span className="text-xs font-bold">{model.pendingCount} pendientes</span>
          </div>
        )}
      </div>
    </article>
  );
}
