import type { DashboardAreaPerformanceModel } from "../types";
import DashboardSectionEmptyState from "./DashboardSectionEmptyState";

interface DashboardAreaPerformanceProps {
  items: DashboardAreaPerformanceModel[];
  loading: boolean;
}

const CIRCUMFERENCE = 2 * Math.PI * 34; // ≈ 213.6

export default function DashboardAreaPerformance({ items, loading }: DashboardAreaPerformanceProps) {
  return (
    <section className="flex h-full flex-col rounded-4xl border border-outline-variant/10 bg-surface-container-lowest py-7 px-8 shadow-[0_12px_40px_rgba(25,28,30,0.05)]">
      <div className="mb-7 flex items-center justify-between">
        <h2 className="text-lg font-bold tracking-tight">Rendimiento por área</h2>
        <button type="button" className="text-[13px] font-semibold text-primary hover:underline">
          Análisis completo
        </button>
      </div>

      {items.length === 0 && !loading ? (
        <DashboardSectionEmptyState
          title="Aun no hay progreso por área"
          description="Completa el diagnóstico o activa tu plan para ver la distribución académica por área."
        />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-3 md:grid-cols-5">
          {(loading
            ? [
                { id: "l1", label: "Matemáticas", progressPercent: 0 },
                { id: "l2", label: "Lectura crítica", progressPercent: 0 },
                { id: "l3", label: "Ciencias", progressPercent: 0 },
                { id: "l4", label: "Sociales", progressPercent: 0 },
                { id: "l5", label: "Inglés", progressPercent: 0 },
              ]
            : items
          ).map((item) => {
            const offset = loading
              ? CIRCUMFERENCE
              : CIRCUMFERENCE * (1 - Math.min(item.progressPercent, 100) / 100);

            return (
              <div key={item.id} className="flex flex-col items-center gap-2.5">
                <div className="relative mx-auto aspect-square w-20">
                  <svg className="h-full w-full -rotate-90" viewBox="0 0 80 80">
                    <circle
                      className="text-surface-container-high"
                      cx="40"
                      cy="40"
                      r="34"
                      fill="transparent"
                      stroke="currentColor"
                      strokeWidth="6"
                    />
                    <circle
                      className={loading ? "text-surface-container-high animate-pulse" : "text-primary"}
                      cx="40"
                      cy="40"
                      r="34"
                      fill="transparent"
                      stroke="currentColor"
                      strokeWidth="6"
                      strokeLinecap="round"
                      strokeDasharray={CIRCUMFERENCE}
                      strokeDashoffset={offset}
                      style={{ transition: "stroke-dashoffset 0.6s ease" }}
                    />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-sm font-black">
                    {loading ? "" : `${Math.round(item.progressPercent)}`}
                  </span>
                </div>
                <span className="text-center text-[10px] font-bold uppercase tracking-[0.2em] text-secondary">
                  {item.label}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
