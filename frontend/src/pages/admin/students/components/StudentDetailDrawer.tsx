import type { StudentListItem } from "../../../../services/students";

interface StudentDetailDrawerProps {
  student: StudentListItem | null;
  onClose: () => void;
  onRevoke: (id: string) => void;
  onRestore: (id: string) => void;
}

const LEVEL_LABELS: Record<number, string> = {
  1: "Básico",
  2: "Intermedio",
  3: "Satisfactorio",
  4: "Avanzado",
};

const LEVEL_COLORS: Record<number, string> = {
  1: "bg-rose-100 text-rose-700",
  2: "bg-amber-100 text-amber-700",
  3: "bg-blue-100 text-blue-700",
  4: "bg-emerald-100 text-emerald-700",
};

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-outline-variant/10 py-2.5">
      <dt className="text-xs font-semibold text-secondary">{label}</dt>
      <dd className="text-right text-sm font-medium text-on-surface">{value}</dd>
    </div>
  );
}

export default function StudentDetailDrawer({
  student,
  onClose,
  onRevoke,
  onRestore,
}: StudentDetailDrawerProps) {
  if (!student) return null;

  const fullName = `${student.first_name} ${student.last_name}`;
  const initial = (student.first_name[0] ?? "").toUpperCase();
  const statusLabel =
    student.enrollment_status === "ACTIVE"
      ? "Activo"
      : student.enrollment_status === "WITHDRAWN"
        ? "Retirado"
        : "Inactivo";

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Drawer */}
      <aside className="fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col bg-surface-container-lowest shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-outline-variant/10 px-6 py-4">
          <h2 className="text-lg font-bold text-on-surface">Detalle del Estudiante</h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-secondary transition hover:bg-surface-container-high"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {/* Profile header */}
          <div className="mb-6 flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-xl font-bold text-primary">
              {initial}
            </div>
            <div>
              <p className="text-lg font-bold text-on-surface">{fullName}</p>
              <p className="text-xs text-secondary">
                Grado {student.grade}° {student.section ? `— Sección ${student.section}` : ""}
              </p>
            </div>
          </div>

          {/* Info section */}
          <dl className="mb-6">
            <InfoRow label="Kampus ID" value={String(student.kampus_user_id)} />
            <InfoRow label="Email" value={student.email ?? "No registrado"} />
            <InfoRow label="Estado" value={statusLabel} />
            <InfoRow
              label="Credenciales"
              value={student.credentials_revoked ? "Revocadas ❌" : "Activas ✅"}
            />
            <InfoRow
              label="Último acceso"
              value={
                student.last_login_at
                  ? new Date(student.last_login_at).toLocaleDateString("es-CO")
                  : "Nunca"
              }
            />
          </dl>

          {/* Stats section */}
          <h3 className="mb-3 text-xs font-bold uppercase tracking-widest text-secondary">
            Estadísticas
          </h3>
          <dl className="mb-6">
            <InfoRow label="Exámenes completados" value={String(student.exam_count)} />
            <InfoRow label="Puntaje promedio" value={student.avg_score != null ? String(student.avg_score) : "—"} />
            <InfoRow label="Precisión promedio" value={student.avg_accuracy != null ? `${student.avg_accuracy}%` : "—"} />

            <div className="flex items-center justify-between gap-4 border-b border-outline-variant/10 py-2.5">
              <dt className="text-xs font-semibold text-secondary">Nivel diagnóstico</dt>
              <dd>
                {student.diagnostic_level != null ? (
                  <span
                    className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${LEVEL_COLORS[student.diagnostic_level] ?? "bg-slate-100 text-slate-600"}`}
                  >
                    {LEVEL_LABELS[student.diagnostic_level] ?? `Nivel ${student.diagnostic_level}`}
                  </span>
                ) : (
                  <span className="text-sm text-secondary/50">Sin diagnóstico</span>
                )}
              </dd>
            </div>

            <InfoRow
              label="Plan de estudio"
              value={
                student.active_plan_status
                  ? `Semana ${student.plan_current_week}/${student.plan_total_weeks}`
                  : "Sin plan activo"
              }
            />
          </dl>
        </div>

        {/* Footer actions */}
        <div className="border-t border-outline-variant/10 px-6 py-4">
          {student.credentials_revoked ? (
            <button
              type="button"
              onClick={() => onRestore(student.id)}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-emerald-700"
            >
              <span className="material-symbols-outlined text-[18px]">lock_open</span>
              Restaurar Credenciales
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onRevoke(student.id)}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-rose-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-rose-700"
            >
              <span className="material-symbols-outlined text-[18px]">block</span>
              Revocar Credenciales
            </button>
          )}
        </div>
      </aside>
    </>
  );
}
