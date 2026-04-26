import { useEffect, useState } from "react";
import type { QuestionRow, AreaCode, QuestionStatus, Difficulty } from "../types";
import type { QuestionBlockOut, QuestionMediaOut } from "../questionFormTypes";
import ConfirmModal from "../../../../components/ConfirmModal";
import QuestionContextMedia from "../../../../components/QuestionContextMedia";
import QuestionPreviewModal from "./QuestionPreviewModal";

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
  block?: QuestionBlockOut | null;
  media?: QuestionMediaOut[];
  loading?: boolean;
  onClose: () => void;
  onEdit?: (target: { type: "question" | "block"; id: string }) => void | Promise<void>;
  onReview?: (target: { type: "question" | "block"; id: string }, action: "APPROVE" | "REJECT", notes?: string) => Promise<void>;
  onSubmitForReview?: (target: { type: "question" | "block"; id: string }) => Promise<void>;
  onDelete?: (questionId: string) => Promise<void>;
  onIrtUpdate?: (
    questionId: string,
    values: { irt_difficulty: number; irt_discrimination: number; irt_guessing: number },
  ) => Promise<void>;
}

export default function QuestionDetailDrawer({ question, block = null, media = [], loading = false, onClose, onEdit, onReview, onSubmitForReview, onDelete, onIrtUpdate }: QuestionDetailDrawerProps) {
  const isOpen = question !== null || block !== null;
  const [confirmAction, setConfirmAction] = useState<"approve" | "reject" | "submit" | "delete" | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [irtDraft, setIrtDraft] = useState({ difficulty: "0", discrimination: "1", guessing: "0.25" });
  const [irtSaving, setIrtSaving] = useState(false);
  const [irtError, setIrtError] = useState<string | null>(null);
  const status = question?.status ?? null;
  const isBlock = block !== null;
  const context = block?.context ?? question?.context ?? "";
  const contextType = block?.context_type ?? question?.contextType ?? null;
  const componentName = block?.items[0]?.component_name ?? question?.componentName ?? null;
  const rendersEnglishContext = contextType === "react_component";
  const canReview = !!status && !loading && status === "PENDIENTE";
  const canEditDraft = !!status && !loading && status === "BORRADOR";
  const detailTarget = block
    ? { type: "block" as const, id: block.block_id }
    : question
      ? { type: "question" as const, id: question.id }
      : null;

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

  useEffect(() => {
    if (!question) return;
    setIrtDraft({
      difficulty: String(question.irtDifficulty ?? 0),
      discrimination: String(question.irtDiscrimination ?? 1),
      guessing: String(question.irtGuessing ?? 0.25),
    });
    setIrtError(null);
  }, [question?.id, question?.irtDifficulty, question?.irtDiscrimination, question?.irtGuessing]);

  const perfColor = (v: number | null) =>
    v === null ? "" : v >= 70 ? "bg-emerald-400" : v >= 45 ? "bg-amber-400" : "bg-rose-400";

  const saveIrt = async () => {
    if (!question || !onIrtUpdate) return;
    const irt_difficulty = Number(irtDraft.difficulty);
    const irt_discrimination = Number(irtDraft.discrimination);
    const irt_guessing = Number(irtDraft.guessing);
    if (![irt_difficulty, irt_discrimination, irt_guessing].every(Number.isFinite)) {
      setIrtError("Los parametros IRT deben ser numericos.");
      return;
    }
    setIrtError(null);
    setIrtSaving(true);
    try {
      await onIrtUpdate(question.id, { irt_difficulty, irt_discrimination, irt_guessing });
    } catch (err) {
      setIrtError(err instanceof Error ? err.message : "No se pudieron actualizar los parametros IRT.");
    } finally {
      setIrtSaving(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-90 transition-opacity duration-300 ${
          isOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={onClose}
      />

      {/* Drawer panel */}
      <aside
        className={`fixed top-0 right-0 bottom-0 z-95 flex w-120 flex-col overflow-y-auto bg-white shadow-[-20px_0_60px_rgba(0,0,0,0.12)] transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {(question || block) && (
          <>
            {/* Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-surface-container-low bg-white px-6 pb-4 pt-6">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-secondary">
                  {question?.code ?? "BLOQUE"}
                </p>
                <h2 className="text-base font-bold text-on-surface">
                  {isBlock ? "Detalle de Bloque" : "Detalle de Pregunta"}
                </h2>
              </div>
              <div className="flex gap-2">
                <button
                  className="rounded-[10px] bg-surface-container-high px-4 py-2 text-[13px] font-semibold text-on-surface transition hover:bg-surface-container-highest"
                  onClick={() => setShowPreview(true)}
                >
                  <span className="material-symbols-outlined mr-1 align-middle text-[14px]">preview</span>
                  Vista previa
                </button>
                {canEditDraft && (
                  <>
                    {!isBlock && (
                      <button
                        className="rounded-[10px] bg-rose-50 px-3 py-2 text-[13px] font-semibold text-rose-600 transition hover:bg-rose-100"
                        onClick={() => setConfirmAction("delete")}
                        title="Eliminar pregunta"
                      >
                        <span className="material-symbols-outlined align-middle text-[14px]">delete</span>
                      </button>
                    )}
                    <button
                      className="rounded-[10px] bg-surface-container-high px-4 py-2 text-[13px] font-semibold text-on-surface transition hover:bg-surface-container-highest"
                      onClick={() => detailTarget && onEdit?.(detailTarget)}
                    >
                      <span className="material-symbols-outlined mr-1 align-middle text-[14px]">edit</span>
                      {isBlock ? "Editar bloque" : "Editar"}
                    </button>
                    <button
                      className="rounded-[10px] bg-primary/10 px-4 py-2 text-[13px] font-semibold text-primary"
                      onClick={() => setConfirmAction("submit")}
                    >
                      <span className="material-symbols-outlined mr-1 align-middle text-[14px]">send</span>
                      {isBlock ? "Enviar bloque a revisión" : "Enviar a revisión"}
                    </button>
                  </>
                )}
                {canReview && (
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
              {loading ? (
                <div className="flex items-center gap-2 rounded-xl bg-surface-container-low p-4 text-sm text-secondary">
                  <span className="material-symbols-outlined animate-spin text-[16px] text-primary">
                    progress_activity
                  </span>
                  Cargando detalle...
                </div>
              ) : (
                <>
              {/* Meta badges */}
              <div className="flex flex-wrap gap-2">
                {question && (
                  <span className={`rounded-full px-3 py-1 text-[11px] font-bold ${AREA_COLORS[question.areaCode].bg} ${AREA_COLORS[question.areaCode].text}`}>
                    {question.area}
                  </span>
                )}
                {status && question && (
                  <span className={`rounded-full px-3 py-1 text-[11px] font-bold ${STATUS_CLASSES[question.status]}`}>
                    {question.status}
                  </span>
                )}
                {question && (
                  <span className="rounded-full bg-surface-container-high px-3 py-1 text-[11px] font-bold text-secondary">
                    {question.difficulty}
                  </span>
                )}
                {isBlock && block && (
                  <span className="rounded-full bg-primary/10 px-3 py-1 text-[11px] font-bold text-primary">
                    Bloque · {block.block_size} preguntas
                  </span>
                )}
                {question?.authorName === "ScholarAI" && (
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
                {media.length > 0 && (
                  <div className="mb-3.5">
                    <QuestionContextMedia
                      media={media}
                      context={context}
                      contextType={contextType}
                      componentName={componentName}
                      compact
                    />
                  </div>
                )}
                {media.length === 0 && rendersEnglishContext && (
                  <QuestionContextMedia
                    media={[]}
                    context={context}
                    contextType={contextType}
                    componentName={componentName}
                    compact
                  />
                )}
                {!rendersEnglishContext && (
                  <p className="rounded-xl bg-surface-container-low p-3.5 text-sm leading-relaxed text-on-surface-variant">
                    {context}
                  </p>
                )}
              </div>

              {block ? (
                <div>
                  <h3 className="mb-2.5 text-[10px] font-bold uppercase tracking-[0.2em] text-secondary">
                    Subpreguntas del bloque
                  </h3>
                  <div className="flex flex-col gap-4">
                    {block.items.map((item, index) => (
                      <div key={item.id} className="rounded-2xl bg-surface-container-low p-4">
                        <div className="mb-3 flex items-center justify-between gap-3">
                          <span className="rounded-full bg-white px-3 py-1 text-[11px] font-bold text-primary">
                            Pregunta {index + 1} de {block.block_size}
                          </span>
                          <span className="text-[11px] font-semibold text-secondary">
                            Respuesta correcta: {item.correct_answer}
                          </span>
                        </div>
                        <p className="text-sm leading-relaxed text-on-surface">{item.stem.replace(/\[BLANK\]/gi, '[_________________]')}</p>
                        <div className="mt-3 flex flex-col gap-2">
                          {[
                            { letter: "A", text: item.option_a },
                            { letter: "B", text: item.option_b },
                            { letter: "C", text: item.option_c },
                            ...(item.option_d ? [{ letter: "D", text: item.option_d }] : []),
                          ].map((opt) => (
                            <div
                              key={opt.letter}
                              className={`flex items-start gap-2.5 rounded-xl p-3 ${
                                item.correct_answer === opt.letter ? "bg-emerald-100" : "bg-white"
                              }`}
                            >
                              <div
                                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                                  item.correct_answer === opt.letter
                                    ? "bg-emerald-700 text-white"
                                    : "bg-surface-container-high text-on-surface"
                                }`}
                              >
                                {opt.letter}
                              </div>
                              <p className="text-[13px] leading-relaxed text-on-surface">{opt.text}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : question ? (
                <>
                  {/* Enunciado */}
                  <div>
                    <h3 className="mb-2.5 text-[10px] font-bold uppercase tracking-[0.2em] text-secondary">
                      Enunciado
                    </h3>
                    <p className="rounded-xl bg-surface-container-low p-3.5 text-sm leading-relaxed text-on-surface-variant">
                      {question.stem.replace(/\[BLANK\]/gi, '[_________________]')}
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
                </>
              ) : null}

              {/* Tags */}
              {question && question.tags && question.tags.length > 0 && (
                <div>
                  <h3 className="mb-2.5 text-[10px] font-bold uppercase tracking-[0.2em] text-secondary">
                    Etiquetas
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {question.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-primary/10 px-3 py-1 text-[11px] font-semibold text-primary"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Metadatos */}
              {question && (
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
                  {question.contextCategory && (
                    <div className="col-span-2">
                      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-secondary">Categoria de contexto</p>
                      <p className="mt-1 text-[13px] font-semibold text-on-surface">{question.contextCategory}</p>
                    </div>
                  )}
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
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-secondary">IRT b</p>
                    <p className="mt-1 text-[13px] font-semibold text-on-surface">
                      {(question.irtDifficulty ?? 0).toFixed(3)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-secondary">IRT a / c</p>
                    <p className="mt-1 text-[13px] font-semibold text-on-surface">
                      {(question.irtDiscrimination ?? 1).toFixed(2)} / {(question.irtGuessing ?? 0.25).toFixed(2)}
                    </p>
                  </div>
                  {onIrtUpdate && (
                    <div className="col-span-2 rounded-2xl bg-surface-container-low p-3">
                      <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-secondary">
                        Calibracion IRT
                      </p>
                      <div className="grid grid-cols-3 gap-2">
                        <label className="text-[10px] font-semibold uppercase tracking-[0.1em] text-secondary">
                          b
                          <input
                            type="number"
                            step="0.001"
                            min="-4"
                            max="4"
                            value={irtDraft.difficulty}
                            onChange={(event) => setIrtDraft((draft) => ({ ...draft, difficulty: event.target.value }))}
                            className="mt-1 w-full rounded-lg border border-outline-variant/30 bg-white px-2 py-1.5 text-[13px] font-semibold text-on-surface"
                          />
                        </label>
                        <label className="text-[10px] font-semibold uppercase tracking-[0.1em] text-secondary">
                          a
                          <input
                            type="number"
                            step="0.001"
                            min="0.1"
                            max="3"
                            value={irtDraft.discrimination}
                            onChange={(event) => setIrtDraft((draft) => ({ ...draft, discrimination: event.target.value }))}
                            className="mt-1 w-full rounded-lg border border-outline-variant/30 bg-white px-2 py-1.5 text-[13px] font-semibold text-on-surface"
                          />
                        </label>
                        <label className="text-[10px] font-semibold uppercase tracking-[0.1em] text-secondary">
                          c
                          <input
                            type="number"
                            step="0.001"
                            min="0"
                            max="0.5"
                            value={irtDraft.guessing}
                            onChange={(event) => setIrtDraft((draft) => ({ ...draft, guessing: event.target.value }))}
                            className="mt-1 w-full rounded-lg border border-outline-variant/30 bg-white px-2 py-1.5 text-[13px] font-semibold text-on-surface"
                          />
                        </label>
                      </div>
                      {irtError && <p className="mt-2 text-xs font-semibold text-rose-600">{irtError}</p>}
                      <button
                        type="button"
                        disabled={irtSaving}
                        onClick={() => { void saveIrt(); }}
                        className="mt-3 rounded-lg bg-primary px-3 py-2 text-xs font-bold text-white transition hover:bg-primary/90 disabled:opacity-60"
                      >
                        {irtSaving ? "Guardando..." : "Guardar IRT"}
                      </button>
                    </div>
                  )}
                </div>
              </div>
              )}
                </>
              )}
            </div>
          </>
        )}
      </aside>

      {/* Confirm modals */}
      {confirmAction === "delete" && question && (
        <div
          className="fixed inset-0 z-200 flex items-center justify-center bg-on-surface/45 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget && !deleting) setConfirmAction(null); }}
        >
          <div className="w-full max-w-95 rounded-3xl bg-white p-7 text-center shadow-xl shadow-on-surface/15">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-rose-100">
              <span className="material-symbols-outlined text-[28px] text-rose-600" style={{ fontVariationSettings: "'FILL' 1" }}>
                delete
              </span>
            </div>
            <h3 className="text-xl font-extrabold tracking-tight text-on-surface">Eliminar pregunta</h3>
            <p className="mt-2 text-sm leading-relaxed text-secondary">
              Esta acción es permanente. La pregunta será eliminada del banco y no podrá recuperarse.
            </p>
            {deleteError && (
              <p className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-600">{deleteError}</p>
            )}
            <div className="mt-6 flex gap-2.5">
              <button
                type="button"
                disabled={deleting}
                onClick={() => { setConfirmAction(null); setDeleteError(null); }}
                className="flex-1 rounded-xl bg-surface-container-high py-3 text-sm font-bold text-on-surface transition hover:bg-surface-container-highest disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={async () => {
                  setDeleteError(null);
                  setDeleting(true);
                  try {
                    await onDelete?.(question.id);
                    setConfirmAction(null);
                    onClose();
                  } catch (err) {
                    setDeleteError(err instanceof Error ? err.message : "No se pudo eliminar la pregunta.");
                  } finally {
                    setDeleting(false);
                  }
                }}
                className="flex-1 rounded-xl bg-rose-500 py-3 text-sm font-bold text-white transition hover:bg-rose-600 disabled:opacity-60"
              >
                {deleting ? "Eliminando…" : "Sí, eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}
      {confirmAction === "submit" && detailTarget && (
        <ConfirmModal
          icon="send"
          title={detailTarget.type === "block" ? "Enviar bloque a revisión" : "Enviar a revisión"}
          message={detailTarget.type === "block" ? "El bloque completo será enviado para revisión por un administrador." : "La pregunta será enviada para revisión por un administrador."}
          confirmLabel="Sí, enviar"
          onConfirm={async () => {
            setConfirmAction(null);
            await onSubmitForReview?.(detailTarget);
            onClose();
          }}
          onCancel={() => setConfirmAction(null)}
        />
      )}
      {confirmAction === "approve" && detailTarget && (
        <ConfirmModal
          icon="check_circle"
          title={detailTarget.type === "block" ? "Aprobar bloque" : "Aprobar pregunta"}
          message={detailTarget.type === "block" ? "Las subpreguntas del bloque quedarán disponibles en los simulacros." : "La pregunta estará disponible en los simulacros. Puedes cambiar el estado manualmente más adelante."}
          confirmLabel="Sí, aprobar"
          onConfirm={async () => {
            setConfirmAction(null);
            await onReview?.(detailTarget, "APPROVE");
            onClose();
          }}
          onCancel={() => setConfirmAction(null)}
        />
      )}
      {confirmAction === "reject" && detailTarget && (
        <ConfirmModal
          icon="block"
          title={detailTarget.type === "block" ? "Rechazar bloque" : "Rechazar pregunta"}
          message={detailTarget.type === "block" ? "El bloque completo quedará en borrador para ser ajustado." : "La pregunta quedará como pendiente y el autor será notificado."}
          confirmLabel="Rechazar"
          destructive
          onConfirm={async () => {
            setConfirmAction(null);
            await onReview?.(detailTarget, "REJECT");
            onClose();
          }}
          onCancel={() => setConfirmAction(null)}
        />
      )}

      {showPreview && (question || block) && (
        <QuestionPreviewModal
          question={question}
          block={block}
          media={media}
          onClose={() => setShowPreview(false)}
        />
      )}
    </>
  );
}
