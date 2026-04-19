import { useEffect } from "react";
import type { QuestionRow, AreaCode, QuestionStatus, Difficulty } from "../types";
import ConfirmModal from "../../../../components/ConfirmModal";
import { useState } from "react";

// ── Area color tokens ──────────────────────────────────────────────────────
const AREA_COLORS: Record<AreaCode, { bg: string; text: string }> = {
  MAT: { bg: "bg-blue-50",    text: "text-blue-700" },
  LEC: { bg: "bg-violet-50",  text: "text-violet-700" },
  ING: { bg: "bg-amber-50",   text: "text-amber-700" },
  NAT: { bg: "bg-emerald-50", text: "text-emerald-700" },
  SOC: { bg: "bg-rose-50",    text: "text-rose-700" },
};

const STATUS_CLASSES: Record<QuestionStatus, string> = {
  APROBADO:  "bg-emerald-100 text-emerald-700",
  PENDIENTE: "bg-amber-100 text-amber-700",
  BORRADOR:  "bg-slate-100 text-slate-600",
};

const DIFF_COLOR: Record<Difficulty, string> = {
  Baja:  "bg-emerald-400",
  Media: "bg-amber-400",
  Alta:  "bg-rose-400",
};

const DIFF_WIDTH: Record<Difficulty, string> = {
  Baja:  "33%",
  Media: "66%",
  Alta:  "100%",
};

// ── Component ──────────────────────────────────────────────────────────────
interface QuestionDetailDrawerProps {
  question: QuestionRow | null;
  onClose: () => void;
  onEdit?: (questionId: string) => void;
  onReview?: (questionId: string, action: "APPROVE" | "REJECT", notes?: string) => Promise<void>;
  onSubmitForReview?: (questionId: string) => Promise<void>;
}

export default function QuestionDetailDrawer({ question, onClose, onEdit, onReview, onSubmitForReview }: QuestionDetailDrawerProps) {
  const isOpen = question !== null;
  const [confirmAction, setConfirmAction] = useState<"approve" | "reject" | "submit" | null>(null);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  const perfColor = (v: number | null) =>
    v === null ? "" : v >= 70 ? "bg-emerald-400" : v >= 45 ? "bg-amber-400" : "bg-rose-400";

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-[90] transition-opacity duration-300 ${
          isOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={onClose}
      />

      {/* Drawer panel */}
      <aside
        className={`fixed top-0 right-0 bottom-0 z-[95] flex w-[480px] flex-col overflow-y-auto bg-white shadow-[-20px_0_60px_rgba(0,0,0,0.12)] transition-transform duration-300 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {question && (
          <>
            {/* Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-surface-container-low bg-white px-6 pb-4 pt-6">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-secondary">
                  {question.code}
                </p>
                <h2 className="text-base font-bold text-on-surface">Detalle de Pregunta</h2>
              </div>
              <div className="flex gap-2">
                {question.status === "BORRADOR" && (
                  <>
                    <button
                      className="rounded-[10px] bg-surface-container-high px-4 py-2 text-[13px] font-semibold text-on-surface transition hover:bg-surface-container-highest"
                      onClick={() => onEdit?.(question.id)}
                    >
                      <span className="material-symbols-outlined mr-1 align-middle text-[14px]">edit</span>
                      Editar
                    </button>
                    <button
                      className="rounded-[10px] bg-primary/10 px-4 py-2 text-[13px] font-semibold text-primary"
                      onClick={() => setConfirmAction("submit")}
                    >
                      <span className="material-symbols-outlined mr-1 align-middle text-[14px]">send</span>
                      Enviar a revisión
                    </button>
                  </>
                )}
                {question.status === "PENDIENTE" && (
                  <>
                    <button
                      className="rounded-[10px] bg-amber-100 px-4 py-2 text-[13px] font-semibold text-amber-700"
                      onClick={() => setConfirmAction("reject")}
                    >
                      Rechazar
                    </button>
                    <button
                      className="rounded-[10px] bg-emerald-100 px-4 py-2 text-[13px] font-semibold text-emerald-700"
                      onClick={() => setConfirmAction("approve")}
                    >
                      Aprobar
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Body */}
            <div className="flex flex-1 flex-col gap-5 p-6">
              {/* Meta badges */}
              <div className="flex flex-wrap gap-2">
                <span className={`rounded-full px-3 py-1 text-[11px] font-bold ${AREA_COLORS[question.areaCode].bg} ${AREA_COLORS[question.areaCode].text}`}>
                  {question.area}
                </span>
                <span className={`rounded-full px-3 py-1 text-[11px] font-bold ${STATUS_CLASSES[question.status]}`}>
                  {question.status}
                </span>
                <span className="rounded-full bg-surface-container-high px-3 py-1 text-[11px] font-bold text-secondary">
                  {question.difficulty}
                </span>
                {question.authorName === "ScholarAI" && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-3 py-1 text-[11px] font-bold text-violet-700">
                    <span className="material-symbols-outlined text-[13px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                      auto_awesome
                    </span>
                    ScholarAI
                  </span>
                )}
              </div>

              {/* Contexto */}
              <div>
                <h3 className="mb-2.5 text-[10px] font-bold uppercase tracking-[0.2em] text-secondary">
                  Contexto
                </h3>
                <p className="rounded-xl bg-surface-container-low p-3.5 text-sm leading-relaxed text-on-surface-variant">
                  {question.context}
                </p>
              </div>

              {/* Enunciado */}
              <div>
                <h3 className="mb-2.5 text-[10px] font-bold uppercase tracking-[0.2em] text-secondary">
                  Enunciado
                </h3>
                <p className="rounded-xl bg-surface-container-low p-3.5 text-sm leading-relaxed text-on-surface-variant">
                  {question.stem}
                </p>
              </div>

              {/* Opciones */}
              <div>
                <h3 className="mb-2.5 text-[10px] font-bold uppercase tracking-[0.2em] text-secondary">
                  Opciones de Respuesta
                </h3>
                <div className="flex flex-col gap-2">
                  {question.options.map((opt) => (
                    <div
                      key={opt.letter}
                      className={`flex items-start gap-2.5 rounded-xl p-3 ${
                        opt.correct ? "bg-emerald-100" : "bg-surface-container-low"
                      }`}
                    >
                      <div
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                          opt.correct
                            ? "bg-emerald-700 text-white"
                            : "bg-white text-on-surface"
                        }`}
                      >
                        {opt.letter}
                      </div>
                      <p className="text-[13px] leading-relaxed text-on-surface">{opt.text}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Metadatos */}
              <div>
                <h3 className="mb-2.5 text-[10px] font-bold uppercase tracking-[0.2em] text-secondary">
                  Metadatos
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {/* Competencia */}
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-secondary">Competencia</p>
                    <p className="mt-1 text-[13px] font-semibold text-on-surface">{question.competencia}</p>
                  </div>
                  {/* Autor */}
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-secondary">Autor</p>
                    <p className="mt-1 text-[13px] font-semibold text-on-surface">{question.authorName}</p>
                  </div>
                  {/* Dificultad */}
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-secondary">Dificultad</p>
                    <p className="mt-1 text-[13px] font-semibold text-on-surface">{question.difficulty}</p>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-container-high">
                      <div
                        className={`h-full rounded-full ${DIFF_COLOR[question.difficulty]}`}
                        style={{ width: DIFF_WIDTH[question.difficulty] }}
                      />
                    </div>
                  </div>
                  {/* Desempeño */}
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-secondary">Desempeño</p>
                    <p className="mt-1 text-[13px] font-semibold text-on-surface">
                      {question.performance === null ? "—" : `${question.performance}%`}
                    </p>
                    {question.performance !== null && (
                      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-container-high">
                        <div
                          className={`h-full rounded-full ${perfColor(question.performance)}`}
                          style={{ width: `${question.performance}%` }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </aside>

      {/* Confirm modals */}
      {confirmAction === "submit" && question && (
        <ConfirmModal
          icon="send"
          title="Enviar a revisión"
          message="La pregunta será enviada para revisión por un administrador."
          confirmLabel="Sí, enviar"
          onConfirm={async () => {
            setConfirmAction(null);
            await onSubmitForReview?.(question.id);
            onClose();
          }}
          onCancel={() => setConfirmAction(null)}
        />
      )}
      {confirmAction === "approve" && question && (
        <ConfirmModal
          icon="check_circle"
          title="Aprobar pregunta"
          message="La pregunta estará disponible en los simulacros. Puedes cambiar el estado manualmente más adelante."
          confirmLabel="Sí, aprobar"
          onConfirm={async () => {
            setConfirmAction(null);
            await onReview?.(question.id, "APPROVE");
            onClose();
          }}
          onCancel={() => setConfirmAction(null)}
        />
      )}
      {confirmAction === "reject" && question && (
        <ConfirmModal
          icon="block"
          title="Rechazar pregunta"
          message="La pregunta quedará como pendiente y el autor será notificado."
          confirmLabel="Rechazar"
          destructive
          onConfirm={async () => {
            setConfirmAction(null);
            await onReview?.(question.id, "REJECT");
            onClose();
          }}
          onCancel={() => setConfirmAction(null)}
        />
      )}
    </>
  );
}
