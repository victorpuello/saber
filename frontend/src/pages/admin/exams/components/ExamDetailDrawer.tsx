import { useEffect, useState } from "react";
import ConfirmModal from "../../../../components/ConfirmModal";
import { ExamTypeBadge } from "./ExamsTable";
import type { ExamRow } from "../types";

interface ExamDetailDrawerProps {
  exam: ExamRow | null;
  questionIds: Array<{ question_id: string; position: number }> | null;
  loadingQuestionIds: boolean;
  onClose: () => void;
  onArchive?: (examId: string) => void;
}

function MetaRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-outline-variant/10 py-3 last:border-0">
      <span className="text-[10px] font-bold uppercase tracking-widest text-secondary">{label}</span>
      <span className="text-sm font-medium text-on-surface">{children}</span>
    </div>
  );
}

export default function ExamDetailDrawer({
  exam,
  questionIds,
  loadingQuestionIds,
  onClose,
  onArchive,
}: ExamDetailDrawerProps) {
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);

  // Close on Escape
  useEffect(() => {
    if (!exam) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [exam, onClose]);

  // Lock body scroll when open
  useEffect(() => {
    if (exam) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [exam]);

  const isOpen = exam !== null;

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-[90] bg-on-surface/20 backdrop-blur-[2px] transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={onClose}
      />

      {/* Drawer panel */}
      <aside
        className={`fixed right-0 top-0 bottom-0 z-[95] w-[480px] max-w-[100vw] flex flex-col bg-white shadow-[-20px_0_60px_rgba(0,0,0,0.12)] transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {exam && (
          <>
            {/* Sticky header */}
            <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-outline-variant/10 bg-white px-6 py-5">
              <div className="min-w-0 flex-1">
                <ExamTypeBadge type={exam.exam_type} />
                <h2 className="mt-2 text-lg font-black text-on-surface leading-tight">
                  {exam.title}
                </h2>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                {exam.status === "ACTIVE" && (
                  <button
                    type="button"
                    onClick={() => setShowArchiveConfirm(true)}
                    className="flex items-center gap-1.5 rounded-xl bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-100"
                  >
                    <span className="material-symbols-outlined text-[14px]">archive</span>
                    Archivar
                  </button>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-secondary transition hover:bg-slate-100"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {/* Meta section */}
              <div className="mb-6">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-secondary">
                  Información del Examen
                </p>
                <div className="grid grid-cols-2 gap-x-6">
                  <MetaRow label="Tipo">
                    <ExamTypeBadge type={exam.exam_type} />
                  </MetaRow>
                  <MetaRow label="Área">{exam.area_code ?? "Todas"}</MetaRow>
                  <MetaRow label="Preguntas">{exam.total_questions}</MetaRow>
                  <MetaRow label="Tiempo límite">
                    {exam.time_limit_minutes ? `${exam.time_limit_minutes} min` : "Sin límite"}
                  </MetaRow>
                  <MetaRow label="Estado">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                        exam.status === "ACTIVE"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {exam.status === "ACTIVE" ? "Activo" : "Archivado"}
                    </span>
                  </MetaRow>
                  <MetaRow label="Adaptativo">{exam.is_adaptive ? "Sí" : "No"}</MetaRow>
                </div>
                <div className="border-b border-outline-variant/10 py-3">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-secondary">
                    Creado
                  </span>
                  <p className="mt-0.5 text-sm font-medium text-on-surface">
                    {new Date(exam.created_at).toLocaleDateString("es-CO", {
                      weekday: "long", day: "numeric", month: "long", year: "numeric",
                    })}
                  </p>
                </div>
              </div>

              {/* Question IDs section */}
              <div>
                <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-secondary">
                  IDs de Preguntas ({exam.total_questions})
                </p>

                {loadingQuestionIds ? (
                  <div className="flex items-center gap-2 text-sm text-secondary">
                    <span className="material-symbols-outlined animate-spin text-[18px]">
                      progress_activity
                    </span>
                    Cargando…
                  </div>
                ) : questionIds === null ? null : questionIds.length === 0 ? (
                  <p className="text-sm text-secondary/60">Sin preguntas asignadas.</p>
                ) : (
                  <div className="max-h-52 overflow-y-auto rounded-2xl bg-surface-container-low p-3">
                    <div className="flex flex-wrap gap-1.5">
                      {questionIds
                        .sort((a, b) => a.position - b.position)
                        .map(({ question_id, position }) => (
                          <code
                            key={question_id}
                            title={`Posición ${position}`}
                            className="rounded-lg bg-white px-2 py-0.5 font-mono text-[11px] text-on-surface shadow-sm ring-1 ring-outline-variant/10"
                          >
                            {question_id.slice(0, 8)}…
                          </code>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </aside>

      {/* Archive confirmation */}
      {showArchiveConfirm && exam && (
        <ConfirmModal
          icon="archive"
          title="Archivar Examen"
          message={`"${exam.title}" quedará archivado y no estará disponible para nuevas sesiones.`}
          confirmLabel="Sí, archivar"
          destructive
          onConfirm={() => {
            setShowArchiveConfirm(false);
            onArchive?.(exam.id);
          }}
          onCancel={() => setShowArchiveConfirm(false)}
        />
      )}
    </>
  );
}
