import type { AdminHeroModel } from "../types";

interface AdminHeroProps {
  model: AdminHeroModel;
  loading: boolean;
}

function Stat({ label, value, loading }: { label: string; value: string; loading: boolean }) {
  return (
    <div>
      <p className="text-[9px] font-bold uppercase tracking-[0.2em] opacity-70">{label}</p>
      {loading ? (
        <div className="mt-2 h-9 w-24 animate-pulse rounded-lg bg-white/30" />
      ) : (
        <p className="mt-1.5 text-[30px] font-black leading-none tracking-tighter">{value}</p>
      )}
    </div>
  );
}

export default function AdminHero({ model, loading }: AdminHeroProps) {
  const avgScore = model.institutionAvgScore !== null ? `${model.institutionAvgScore} pts` : "—";
  const accuracy = model.avgAccuracyPercent !== null ? `${model.avgAccuracyPercent}%` : "—";
  const hasPending = model.pendingCount > 0;

  return (
    <article className="relative flex h-full min-h-56 flex-col justify-between overflow-hidden rounded-4xl bg-linear-to-br from-primary to-primary-container p-7 text-white shadow-[0_8px_24px_rgba(0,74,198,0.18)]">
      {/* Background accent */}
      <div className="pointer-events-none absolute -right-8 -top-10 h-40 w-40 rounded-full bg-white/5" />
      <div className="pointer-events-none absolute -bottom-6 right-20 h-24 w-24 rounded-full bg-white/5" />

      <div>
        <div className="mb-5 flex items-center gap-2">
          <span
            className="material-symbols-outlined text-[18px] opacity-80"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            admin_panel_settings
          </span>
          <span className="text-[10px] font-bold uppercase tracking-[0.32em] opacity-80">Institución</span>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-4">
          <Stat
            label="Estudiantes"
            value={model.institutionStudents !== null ? String(model.institutionStudents) : "—"}
            loading={loading}
          />
          <Stat label="Puntaje promedio" value={avgScore} loading={loading} />
          <Stat label="Precisión banco" value={accuracy} loading={loading} />
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2.5">
        <div className="flex items-center gap-1.5 rounded-full bg-white/15 px-3.5 py-1.5">
          <span
            className="material-symbols-outlined text-[14px]"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            quiz
          </span>
          <span className="text-[11px] font-bold">
            {loading ? "..." : `${model.questionBankTotal.toLocaleString()} preguntas`}
          </span>
        </div>

        {hasPending && !loading && (
          <div className="flex items-center gap-1.5 rounded-full bg-amber-400/20 px-3.5 py-1.5 text-amber-200">
            <span
              className="material-symbols-outlined text-[14px]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              pending_actions
            </span>
            <span className="text-[11px] font-bold">{model.pendingCount} pendientes</span>
          </div>
        )}

        {!loading && (
          <div className="flex items-center gap-1.5 rounded-full bg-emerald-400/20 px-3.5 py-1.5 text-emerald-200">
            <span
              className="material-symbols-outlined text-[14px]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              trending_up
            </span>
            <span className="text-[11px] font-bold">+0% este mes</span>
          </div>
        )}
      </div>
    </article>
  );
}
