import { useState, useEffect, useCallback, useMemo } from "react";
import type { QuestionBlockOut, QuestionOut, QuestionFormData, QuestionBlockFormItem } from "../questionFormTypes";
import { CONTEXT_TYPE_OPTIONS } from "../questionFormTypes";
import { useNewQuestionFormViewModel } from "../useNewQuestionFormViewModel";
import ConfirmModal from "../../../../components/ConfirmModal";
import { API_BASE } from "../../../../services/api";

interface NewManualQuestionModalProps {
  onClose: () => void;
  onSuccess: (q: QuestionOut | QuestionBlockOut) => void;
  editQuestionId?: string;
  editBlockId?: string;
}

const LETTERS = ["A", "B", "C", "D"] as const;

const MEDIA_MODE_OPTIONS = [
  { value: "NONE", label: "Sin recurso" },
  { value: "UPLOAD", label: "Subir archivo" },
  { value: "ASSET_LIBRARY", label: "Banco de assets" },
  { value: "PROGRAMMATIC", label: "Programático" },
] as const;

const MEDIA_TYPE_OPTIONS = [
  { value: "chart", label: "Gráfica" },
  { value: "table", label: "Tabla" },
  { value: "diagram", label: "Diagrama" },
  { value: "map", label: "Mapa" },
  { value: "infographic", label: "Infografía" },
  { value: "comic", label: "Cómic" },
  { value: "public_sign", label: "Aviso público" },
  { value: "photograph", label: "Fotografía" },
  { value: "timeline", label: "Línea de tiempo" },
  { value: "state_structure", label: "Estructura organizacional" },
  { value: "geometric_figure", label: "Figura geométrica" },
  { value: "probability_diagram", label: "Diagrama de probabilidad" },
] as const;

const DISPLAY_MODE_OPTIONS = [
  { value: "INLINE", label: "Dentro del contexto" },
  { value: "ABOVE_STEM", label: "Antes del enunciado" },
  { value: "FULL_WIDTH", label: "Ancho completo" },
  { value: "SIDE_BY_SIDE", label: "Lado a lado" },
] as const;

const RENDER_ENGINE_OPTIONS = [
  { value: "chart_js", label: "Chart.js" },
  { value: "svg_template", label: "SVG Template" },
  { value: "html_template", label: "HTML Template" },
  { value: "map_renderer", label: "Map Renderer" },
  { value: "timeline_renderer", label: "Timeline Renderer" },
] as const;

type OptionField = "option_a" | "option_b" | "option_c" | "option_d";

interface OptionEditorProps {
  value: string;
  letter: typeof LETTERS[number];
  isCorrect: boolean;
  placeholder: string;
  onSelectCorrect: () => void;
  onChange: (value: string) => void;
  onBlur: () => void;
}

function OptionEditor({ value, letter, isCorrect, placeholder, onSelectCorrect, onChange, onBlur }: OptionEditorProps) {
  return (
    <div className="flex items-center gap-2.5">
      <button
        type="button"
        onClick={onSelectCorrect}
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[13px] font-bold transition ${
          isCorrect
            ? "bg-emerald-100 text-emerald-700"
            : "bg-surface-container-high text-secondary hover:bg-surface-container-highest"
        }`}
      >
        {isCorrect ? `${letter} ✓` : letter}
      </button>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        placeholder={placeholder}
        className="flex-1 rounded-xl border border-outline-variant/20 bg-surface-container-highest px-3.5 py-3 text-sm text-on-surface outline-none transition focus:border-transparent focus:bg-white focus:ring-2 focus:ring-primary/30"
      />
    </div>
  );
}

function getOptionField(letter: typeof LETTERS[number]): OptionField {
  return `option_${letter.toLowerCase()}` as OptionField;
}

function getModalTitle(isEditMode: boolean, isBlockMode: boolean) {
  if (isEditMode && isBlockMode) return "Editar Bloque de Preguntas";
  if (isEditMode) return "Editar Pregunta";
  if (isBlockMode) return "Crear Bloque de Preguntas";
  return "Crear Pregunta Manual";
}

export default function NewManualQuestionModal({
  onClose,
  onSuccess,
  editQuestionId,
  editBlockId,
}: NewManualQuestionModalProps) {
  const vm = useNewQuestionFormViewModel({
    onSuccess: (q) => {
      onSuccess(q);
    },
    editQuestionId,
    editBlockId,
  });

  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [uploadPreviewUrl, setUploadPreviewUrl] = useState<string | null>(null);

  const selectedAsset = useMemo(
    () => vm.assetResults.find((asset) => asset.id === vm.contextMedia.asset_id) ?? null,
    [vm.assetResults, vm.contextMedia.asset_id],
  );

  useEffect(() => {
    if (!vm.contextMedia.upload_file || vm.contextMedia.mode !== "UPLOAD") {
      setUploadPreviewUrl(null);
      return;
    }
    const objectUrl = URL.createObjectURL(vm.contextMedia.upload_file);
    setUploadPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [vm.contextMedia.mode, vm.contextMedia.upload_file]);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") handleClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  });

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const handleClose = useCallback(() => {
    if (vm.isDirty) {
      setShowDiscardConfirm(true);
      return;
    }
    onClose();
  }, [onClose, vm.isDirty]);

  const handleSubmitSimple = useCallback(() => {
    void vm.handleSubmit();
  }, [vm]);

  const renderSharedOptionEditors = (
    values: Pick<QuestionFormData, OptionField | "correct_answer">,
    onSelect: (letter: typeof LETTERS[number]) => void,
    onChange: (field: OptionField, value: string) => void,
    onBlur: (field: OptionField) => void,
  ) => (
    <div className="flex flex-col gap-2">
      {LETTERS.map((letter) => {
        const field = getOptionField(letter);
        const isCorrect = values.correct_answer === letter;
        return (
          <OptionEditor
            key={letter}
            letter={letter}
            value={values[field]}
            isCorrect={isCorrect}
            placeholder={isCorrect ? `Opción ${letter} (correcta)…` : `Opción ${letter} (distractor)…`}
            onSelectCorrect={() => onSelect(letter)}
            onChange={(value) => onChange(field, value)}
            onBlur={() => onBlur(field)}
          />
        );
      })}
    </div>
  );

  const renderBlockOptionEditors = (
    item: QuestionBlockFormItem,
    itemIndex: number,
  ) => (
    <div className="flex flex-col gap-2">
      {LETTERS.map((letter) => {
        const field = getOptionField(letter);
        const isCorrect = item.correct_answer === letter;
        return (
          <OptionEditor
            key={`${itemIndex}-${letter}`}
            letter={letter}
            value={item[field]}
            isCorrect={isCorrect}
            placeholder={isCorrect ? `Opción ${letter} (correcta)…` : `Opción ${letter} (distractor)…`}
            onSelectCorrect={() => vm.updateBlockItem(itemIndex, "correct_answer", letter)}
            onChange={(value) => vm.updateBlockItem(itemIndex, field, value)}
            onBlur={() => vm.handleBlockItemBlur(itemIndex)}
          />
        );
      })}
    </div>
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-on-surface/40 p-5 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div className="relative flex max-h-[92vh] w-full max-w-215 flex-col overflow-hidden rounded-3xl bg-white shadow-xl shadow-on-surface/15">
        <header className="flex items-center justify-between px-7 pt-6">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-secondary">
              {vm.isBlockMode ? "Nuevo bloque" : "Nueva pregunta"}
            </p>
            <h2 className="mt-1 text-[22px] font-extrabold tracking-tight text-on-surface">
              {getModalTitle(vm.isEditMode, vm.isBlockMode)}
            </h2>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-surface-container-high text-on-surface transition hover:bg-surface-container-highest"
            aria-label="Cerrar"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </header>

        <div className="flex-1 space-y-5 overflow-y-auto px-7 pb-7 pt-6">
          {vm.errors.form && (
            <div className="flex items-center gap-2 rounded-2xl bg-error-container px-4 py-3 text-sm font-semibold text-on-error-container">
              <span className="material-symbols-outlined text-[18px]">error</span>
              {vm.errors.form}
            </div>
          )}

          <section className="rounded-[24px] border border-outline-variant/15 bg-surface-container-low px-5 py-4">
            <div className="grid grid-cols-1 gap-3.5 md:grid-cols-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-[0.14em] text-secondary">
                  Estructura
                </label>
                <div className="relative">
                  <select
                    value={vm.formData.structure_type}
                    onChange={(e) => vm.updateStructureType(e.target.value as "INDIVIDUAL" | "QUESTION_BLOCK")}
                    className="w-full appearance-none rounded-xl border border-outline-variant/20 bg-white py-3 pl-3.5 pr-9 text-sm font-medium text-on-surface outline-none transition focus:border-transparent focus:ring-2 focus:ring-primary/30"
                  >
                    <option value="INDIVIDUAL">Individual</option>
                    <option value="QUESTION_BLOCK">Bloque de preguntas</option>
                  </select>
                  <span className="material-symbols-outlined pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[16px] text-secondary">
                    expand_more
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-1.5 md:col-span-2">
                <label className="text-[10px] font-bold uppercase tracking-[0.14em] text-secondary">
                  Tipo de contexto
                </label>
                <div className="relative">
                  <select
                    value={vm.formData.context_type}
                    onChange={(e) => vm.updateField("context_type", e.target.value as QuestionFormData["context_type"])}
                    onBlur={() => vm.handleBlur("context_type")}
                    className="w-full appearance-none rounded-xl border border-outline-variant/20 bg-white py-3 pl-3.5 pr-9 text-sm font-medium text-on-surface outline-none transition focus:border-transparent focus:ring-2 focus:ring-primary/30"
                  >
                    <option value="">Seleccionar</option>
                    {CONTEXT_TYPE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                  <span className="material-symbols-outlined pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[16px] text-secondary">
                    expand_more
                  </span>
                </div>
                {vm.errors.context_type && <p className="text-xs text-error">{vm.errors.context_type}</p>}
              </div>
            </div>
            <p className="mt-3 text-[12px] leading-relaxed text-secondary">
              {vm.isBlockMode
                ? "Un bloque comparte un mismo contexto y permite entre 2 y 3 subpreguntas derivadas."
                : "La estructura individual crea una sola pregunta evaluable con cualquiera de los 8 contextos disponibles."}
            </p>
          </section>

          <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-[0.14em] text-secondary">
                Área
              </label>
              <div className="relative">
                <select
                  value={vm.formData.area_id}
                  onChange={(e) => vm.updateField("area_id", e.target.value)}
                  onBlur={() => vm.handleBlur("area_id")}
                  disabled={vm.loadingAreas}
                  className="w-full appearance-none rounded-xl border border-outline-variant/20 bg-surface-container-highest py-3 pl-3.5 pr-9 text-sm font-medium text-on-surface outline-none transition focus:border-transparent focus:ring-2 focus:ring-primary/30 disabled:opacity-50"
                >
                  <option value="">{vm.loadingAreas ? "Cargando…" : "Seleccionar"}</option>
                  {vm.areas.map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
                <span className="material-symbols-outlined pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[16px] text-secondary">
                  expand_more
                </span>
              </div>
              {vm.errors.area_id && <p className="text-xs text-error">{vm.errors.area_id}</p>}
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-[0.14em] text-secondary">
                Competencia
              </label>
              <div className="relative">
                <select
                  value={vm.formData.competency_id}
                  onChange={(e) => vm.updateField("competency_id", e.target.value)}
                  onBlur={() => vm.handleBlur("competency_id")}
                  disabled={vm.loadingDetail || !vm.formData.area_id}
                  className="w-full appearance-none rounded-xl border border-outline-variant/20 bg-surface-container-highest py-3 pl-3.5 pr-9 text-sm font-medium text-on-surface outline-none transition focus:border-transparent focus:ring-2 focus:ring-primary/30 disabled:opacity-50"
                >
                  <option value="">{vm.loadingDetail ? "Cargando…" : "Seleccionar"}</option>
                  {vm.competencies.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <span className="material-symbols-outlined pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[16px] text-secondary">
                  expand_more
                </span>
              </div>
              {vm.errors.competency_id && <p className="text-xs text-error">{vm.errors.competency_id}</p>}
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-[0.14em] text-secondary">
                Afirmación
              </label>
              <div className="relative">
                <select
                  value={vm.formData.assertion_id}
                  onChange={(e) => vm.updateField("assertion_id", e.target.value)}
                  onBlur={() => vm.handleBlur("assertion_id")}
                  disabled={vm.loadingDetail || !vm.formData.competency_id}
                  className="w-full appearance-none rounded-xl border border-outline-variant/20 bg-surface-container-highest py-3 pl-3.5 pr-9 text-sm font-medium text-on-surface outline-none transition focus:border-transparent focus:ring-2 focus:ring-primary/30 disabled:opacity-50"
                >
                  <option value="">{vm.loadingDetail ? "Cargando…" : "Seleccionar"}</option>
                  {vm.assertions.map((a) => (
                    <option key={a.id} value={a.id}>{a.statement}</option>
                  ))}
                </select>
                <span className="material-symbols-outlined pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[16px] text-secondary">
                  expand_more
                </span>
              </div>
              {vm.errors.assertion_id && <p className="text-xs text-error">{vm.errors.assertion_id}</p>}
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-[0.14em] text-secondary">
                Evidencia
              </label>
              <div className="relative">
                <select
                  value={vm.formData.evidence_id}
                  onChange={(e) => vm.updateField("evidence_id", e.target.value)}
                  disabled={vm.loadingDetail || !vm.formData.assertion_id}
                  className="w-full appearance-none rounded-xl border border-outline-variant/20 bg-surface-container-highest py-3 pl-3.5 pr-9 text-sm font-medium text-on-surface outline-none transition focus:border-transparent focus:ring-2 focus:ring-primary/30 disabled:opacity-50"
                >
                  <option value="">Opcional</option>
                  {vm.evidences.map((evidence) => (
                    <option key={evidence.id} value={evidence.id}>{evidence.observable_behavior}</option>
                  ))}
                </select>
                <span className="material-symbols-outlined pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[16px] text-secondary">
                  expand_more
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold uppercase tracking-[0.14em] text-secondary">
              Contexto / Texto base compartido
            </label>
            <textarea
              value={vm.formData.context}
              onChange={(e) => vm.updateField("context", e.target.value)}
              onBlur={() => vm.handleBlur("context")}
              placeholder="Escribe el texto, la descripción de la tabla, el aviso, el diálogo o el estímulo compartido…"
              rows={vm.isBlockMode ? 5 : 3}
              className="w-full resize-vertical rounded-xl border border-outline-variant/20 bg-surface-container-highest px-3.5 py-3 text-sm text-on-surface outline-none transition focus:border-transparent focus:bg-white focus:ring-2 focus:ring-primary/30"
            />
            <span className="text-[11px] text-secondary">
              {vm.isBlockMode
                ? "Este contexto se reutilizará para todas las subpreguntas del bloque."
                : "El contexto es el material que el estudiante debe leer o interpretar antes de responder."}
            </span>
            {vm.errors.context && <p className="text-xs text-error">{vm.errors.context}</p>}
          </div>

          <section className="space-y-4 rounded-[24px] border border-outline-variant/15 bg-surface-container-low px-5 py-5">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-secondary">
                  Recurso visual del contexto
                </p>
                <h3 className="mt-1 text-[18px] font-bold text-on-surface">
                  Imagen, asset o gráfico programático
                </h3>
              </div>
              {(vm.contextMedia.mode !== "NONE" || vm.mediaMarkedForRemoval) && (
                <button
                  type="button"
                  onClick={vm.resetContextMedia}
                  className="rounded-xl bg-surface-container-high px-4 py-2 text-[13px] font-semibold text-on-surface transition hover:bg-surface-container-highest"
                >
                  Limpiar borrador
                </button>
              )}
            </div>

            <p className="text-[12px] leading-relaxed text-secondary">
              Usa esta sección cuando el contexto requiera una imagen subida manualmente, un asset reutilizable o un recurso programático basado en datos estructurados.
            </p>

            {vm.existingMedia.length > 0 && !vm.mediaMarkedForRemoval && (
              <div className="space-y-3 rounded-[20px] bg-white p-4 shadow-[0_8px_24px_rgba(25,28,30,0.04)]">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-secondary">
                      Recurso actual
                    </p>
                    <p className="mt-1 text-sm font-semibold text-on-surface">
                      {vm.existingMedia.length} recurso(s) asociado(s) al contexto
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={vm.markExistingMediaForRemoval}
                    className="rounded-xl bg-error-container px-3 py-2 text-[13px] font-semibold text-on-error-container transition hover:opacity-90"
                  >
                    Quitar recurso actual
                  </button>
                </div>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {vm.existingMedia.map((media) => (
                    <div key={media.id} className="rounded-2xl border border-outline-variant/15 bg-surface-container-lowest p-3">
                      {media.thumbnail_url || media.storage_url ? (
                        <img
                          src={`${API_BASE}${media.thumbnail_url ?? media.storage_url ?? ""}`}
                          alt={media.alt_text}
                          className="mb-3 h-32 w-full rounded-xl object-cover"
                        />
                      ) : (
                        <div className="mb-3 flex h-32 w-full items-center justify-center rounded-xl bg-surface-container-high text-center text-xs text-secondary">
                          Recurso {media.source.toLowerCase()} sin preview estático
                        </div>
                      )}
                      <div className="space-y-1.5 text-xs text-secondary">
                        <p className="font-semibold uppercase tracking-[0.12em] text-on-surface">
                          {media.media_type}
                        </p>
                        <p><span className="font-semibold text-on-surface">Origen:</span> {media.source}</p>
                        <p><span className="font-semibold text-on-surface">Alt:</span> {media.alt_text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {vm.mediaMarkedForRemoval && (
              <div className="rounded-2xl bg-error-container px-4 py-3 text-sm font-medium text-on-error-container">
                El recurso visual actual se eliminará cuando guardes esta unidad.
              </div>
            )}

            <div className="grid grid-cols-1 gap-2 md:grid-cols-4">
              {MEDIA_MODE_OPTIONS.map((option) => {
                const isSelected = vm.contextMedia.mode === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => vm.updateContextMediaMode(option.value)}
                    className={`rounded-xl px-4 py-3 text-sm font-semibold transition ${
                      isSelected
                        ? "bg-primary text-white shadow-md shadow-primary/20"
                        : "bg-white text-on-surface ring-1 ring-outline-variant/20 hover:bg-surface-container-highest"
                    }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>

            {vm.contextMedia.mode !== "NONE" && (
              <div className="space-y-4 rounded-[20px] bg-white p-4 shadow-[0_8px_24px_rgba(25,28,30,0.04)]">
                <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-[0.14em] text-secondary">
                      Tipo de recurso
                    </label>
                    <div className="relative">
                      <select
                        value={vm.contextMedia.media_type}
                        onChange={(e) => vm.updateContextMediaField("media_type", e.target.value as typeof vm.contextMedia.media_type)}
                        className="w-full appearance-none rounded-xl border border-outline-variant/20 bg-surface-container-highest py-3 pl-3.5 pr-9 text-sm font-medium text-on-surface outline-none transition focus:border-transparent focus:ring-2 focus:ring-primary/30"
                      >
                        <option value="">Seleccionar</option>
                        {MEDIA_TYPE_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                      <span className="material-symbols-outlined pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[16px] text-secondary">
                        expand_more
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-[0.14em] text-secondary">
                      Modo de display
                    </label>
                    <div className="relative">
                      <select
                        value={vm.contextMedia.display_mode}
                        onChange={(e) => vm.updateContextMediaField("display_mode", e.target.value as typeof vm.contextMedia.display_mode)}
                        className="w-full appearance-none rounded-xl border border-outline-variant/20 bg-surface-container-highest py-3 pl-3.5 pr-9 text-sm font-medium text-on-surface outline-none transition focus:border-transparent focus:ring-2 focus:ring-primary/30"
                      >
                        {DISPLAY_MODE_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                      <span className="material-symbols-outlined pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[16px] text-secondary">
                        expand_more
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2">
                  <div className="flex flex-col gap-1.5 md:col-span-2">
                    <label className="text-[10px] font-bold uppercase tracking-[0.14em] text-secondary">
                      Texto alternativo
                    </label>
                    <textarea
                      value={vm.contextMedia.alt_text}
                      onChange={(e) => vm.updateContextMediaField("alt_text", e.target.value)}
                      placeholder="Describe lo que muestra el recurso visual y la información que el estudiante debe interpretar…"
                      rows={2}
                      className="w-full resize-vertical rounded-xl border border-outline-variant/20 bg-surface-container-highest px-3.5 py-3 text-sm text-on-surface outline-none transition focus:border-transparent focus:bg-white focus:ring-2 focus:ring-primary/30"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5 md:col-span-2">
                    <label className="text-[10px] font-bold uppercase tracking-[0.14em] text-secondary">
                      Descripción extendida
                    </label>
                    <textarea
                      value={vm.contextMedia.alt_text_detailed}
                      onChange={(e) => vm.updateContextMediaField("alt_text_detailed", e.target.value)}
                      placeholder="Opcional. Incluye datos, relaciones o patrones que deban estar disponibles para accesibilidad o revisión detallada."
                      rows={3}
                      className="w-full resize-vertical rounded-xl border border-outline-variant/20 bg-surface-container-highest px-3.5 py-3 text-sm text-on-surface outline-none transition focus:border-transparent focus:bg-white focus:ring-2 focus:ring-primary/30"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5 md:col-span-2">
                    <label className="text-[10px] font-bold uppercase tracking-[0.14em] text-secondary">
                      Caption / Fuente
                    </label>
                    <input
                      type="text"
                      value={vm.contextMedia.caption}
                      onChange={(e) => vm.updateContextMediaField("caption", e.target.value)}
                      placeholder="Opcional. Fuente, aclaración o pie del recurso visual."
                      className="w-full rounded-xl border border-outline-variant/20 bg-surface-container-highest px-3.5 py-3 text-sm text-on-surface outline-none transition focus:border-transparent focus:bg-white focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                </div>

                <label className="flex items-center gap-3 rounded-xl bg-surface-container-low px-4 py-3 text-sm text-on-surface">
                  <input
                    type="checkbox"
                    checked={vm.contextMedia.is_essential}
                    onChange={(e) => vm.updateContextMediaField("is_essential", e.target.checked)}
                    className="h-4 w-4 rounded border-outline-variant/40 text-primary focus:ring-primary/30"
                  />
                  El recurso visual es indispensable para resolver la pregunta.
                </label>

                {vm.contextMedia.mode === "UPLOAD" && (
                  <div className="space-y-3">
                    <div className="rounded-2xl border border-dashed border-outline-variant/30 bg-surface-container-low px-4 py-4">
                      <label className="flex cursor-pointer flex-col items-center gap-2 text-center text-sm text-secondary">
                        <span className="material-symbols-outlined text-[28px] text-primary">upload</span>
                        <span className="font-semibold text-on-surface">Haz clic para seleccionar un archivo</span>
                        <span>PNG, JPG, WebP o SVG. Máximo 5 MB.</span>
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp,image/svg+xml"
                          className="hidden"
                          onChange={(e) => vm.setContextMediaFile(e.target.files?.[0] ?? null)}
                        />
                      </label>
                    </div>
                    {vm.contextMedia.upload_file && (
                      <div className="rounded-2xl bg-surface-container-low p-4">
                        <p className="text-sm font-semibold text-on-surface">{vm.contextMedia.upload_file.name}</p>
                        <p className="mt-1 text-xs text-secondary">
                          {(vm.contextMedia.upload_file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                        {uploadPreviewUrl && (
                          <img
                            src={uploadPreviewUrl}
                            alt="Preview del recurso visual"
                            className="mt-3 max-h-52 w-full rounded-xl object-contain bg-white"
                          />
                        )}
                      </div>
                    )}
                  </div>
                )}

                {vm.contextMedia.mode === "ASSET_LIBRARY" && (
                  <div className="space-y-3">
                    <div className="flex flex-col gap-2 md:flex-row">
                      <input
                        type="text"
                        value={vm.assetSearchQuery}
                        onChange={(e) => vm.setAssetSearchQuery(e.target.value)}
                        placeholder="Buscar por título, descripción o tag…"
                        className="flex-1 rounded-xl border border-outline-variant/20 bg-surface-container-highest px-3.5 py-3 text-sm text-on-surface outline-none transition focus:border-transparent focus:bg-white focus:ring-2 focus:ring-primary/30"
                      />
                      <button
                        type="button"
                        onClick={() => void vm.searchAssets()}
                        className="rounded-xl bg-primary px-4 py-3 text-sm font-bold text-white transition hover:opacity-90"
                      >
                        {vm.loadingAssets ? "Buscando…" : "Buscar"}
                      </button>
                    </div>
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      {vm.assetResults.map((asset) => {
                        const isSelected = vm.contextMedia.asset_id === asset.id;
                        return (
                          <button
                            key={asset.id}
                            type="button"
                            onClick={() => vm.selectAsset(asset)}
                            className={`rounded-2xl border p-3 text-left transition ${
                              isSelected
                                ? "border-primary bg-primary/5"
                                : "border-outline-variant/15 bg-surface-container-lowest hover:border-primary/30"
                            }`}
                          >
                            {asset.thumbnail_url ? (
                              <img
                                src={`${API_BASE}${asset.thumbnail_url}`}
                                alt={asset.alt_text}
                                className="mb-3 h-28 w-full rounded-xl object-cover"
                              />
                            ) : (
                              <div className="mb-3 flex h-28 w-full items-center justify-center rounded-xl bg-surface-container-high text-xs text-secondary">
                                Sin thumbnail
                              </div>
                            )}
                            <p className="text-sm font-semibold text-on-surface">{asset.title}</p>
                            <p className="mt-1 text-xs text-secondary">{asset.alt_text}</p>
                          </button>
                        );
                      })}
                    </div>
                    {selectedAsset && (
                      <div className="rounded-2xl bg-surface-container-low px-4 py-3 text-sm text-on-surface">
                        Asset seleccionado: <span className="font-semibold">{selectedAsset.title}</span>
                      </div>
                    )}

                    <div className="rounded-2xl border border-outline-variant/15 bg-surface-container-low p-4">
                      <div className="mb-4 flex items-center justify-between gap-3">
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-secondary">
                            Crear asset nuevo
                          </p>
                          <p className="mt-1 text-sm text-on-surface-variant">
                            Sube el archivo al banco y selecciónalo sin salir del modal.
                          </p>
                        </div>
                        <span className="rounded-full bg-white px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-secondary">
                          Banco reutilizable
                        </span>
                      </div>

                      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        <div className="md:col-span-2 rounded-2xl border border-dashed border-outline-variant/30 bg-white px-4 py-4">
                          <label className="flex cursor-pointer flex-col items-center gap-2 text-center text-sm text-secondary">
                            <span className="material-symbols-outlined text-[28px] text-primary">drive_folder_upload</span>
                            <span className="font-semibold text-on-surface">Selecciona el archivo del asset</span>
                            <span>Se guardará usando el tipo de recurso y alt text definidos arriba.</span>
                            <input
                              type="file"
                              accept="image/png,image/jpeg,image/webp,image/svg+xml"
                              className="hidden"
                              onChange={(e) => vm.setAssetUploadFile(e.target.files?.[0] ?? null)}
                            />
                          </label>
                        </div>

                        {vm.assetUploadDraft.file && (
                          <div className="md:col-span-2 rounded-2xl bg-white px-4 py-3 text-sm text-on-surface">
                            Archivo listo: <span className="font-semibold">{vm.assetUploadDraft.file.name}</span>
                          </div>
                        )}

                        <div className="flex flex-col gap-1.5 md:col-span-2">
                          <label className="text-[10px] font-bold uppercase tracking-[0.14em] text-secondary">
                            Título del asset
                          </label>
                          <input
                            type="text"
                            value={vm.assetUploadDraft.title}
                            onChange={(e) => vm.updateAssetUploadField("title", e.target.value)}
                            placeholder="Ej. Gráfico de variación térmica por mes"
                            className="w-full rounded-xl border border-outline-variant/20 bg-white px-3.5 py-3 text-sm text-on-surface outline-none transition focus:border-transparent focus:ring-2 focus:ring-primary/30"
                          />
                        </div>

                        <div className="flex flex-col gap-1.5 md:col-span-2">
                          <label className="text-[10px] font-bold uppercase tracking-[0.14em] text-secondary">
                            Descripción
                          </label>
                          <textarea
                            value={vm.assetUploadDraft.description}
                            onChange={(e) => vm.updateAssetUploadField("description", e.target.value)}
                            rows={2}
                            placeholder="Opcional. Describe el contexto pedagógico o el uso previsto del asset."
                            className="w-full resize-vertical rounded-xl border border-outline-variant/20 bg-white px-3.5 py-3 text-sm text-on-surface outline-none transition focus:border-transparent focus:ring-2 focus:ring-primary/30"
                          />
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] font-bold uppercase tracking-[0.14em] text-secondary">
                            Tags
                          </label>
                          <input
                            type="text"
                            value={vm.assetUploadDraft.tags}
                            onChange={(e) => vm.updateAssetUploadField("tags", e.target.value)}
                            placeholder="clima, temperatura, línea de tiempo"
                            className="w-full rounded-xl border border-outline-variant/20 bg-white px-3.5 py-3 text-sm text-on-surface outline-none transition focus:border-transparent focus:ring-2 focus:ring-primary/30"
                          />
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] font-bold uppercase tracking-[0.14em] text-secondary">
                            Licencia
                          </label>
                          <div className="relative">
                            <select
                              value={vm.assetUploadDraft.license_type}
                              onChange={(e) => vm.updateAssetUploadField("license_type", e.target.value)}
                              className="w-full appearance-none rounded-xl border border-outline-variant/20 bg-white py-3 pl-3.5 pr-9 text-sm font-medium text-on-surface outline-none transition focus:border-transparent focus:ring-2 focus:ring-primary/30"
                            >
                              {[
                                { value: "OWN", label: "Propio" },
                                { value: "CC0", label: "CC0" },
                                { value: "CC_BY", label: "CC BY" },
                                { value: "CC_BY_SA", label: "CC BY-SA" },
                                { value: "CC_BY_NC", label: "CC BY-NC" },
                                { value: "PUBLIC_DOMAIN", label: "Dominio público" },
                                { value: "EDUCATIONAL_USE", label: "Uso educativo" },
                              ].map((option) => (
                                <option key={option.value} value={option.value}>{option.label}</option>
                              ))}
                            </select>
                            <span className="material-symbols-outlined pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[16px] text-secondary">
                              expand_more
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-col gap-1.5 md:col-span-2">
                          <label className="text-[10px] font-bold uppercase tracking-[0.14em] text-secondary">
                            Atribución
                          </label>
                          <input
                            type="text"
                            value={vm.assetUploadDraft.attribution}
                            onChange={(e) => vm.updateAssetUploadField("attribution", e.target.value)}
                            placeholder="Opcional. Fuente o autor original si aplica."
                            className="w-full rounded-xl border border-outline-variant/20 bg-white px-3.5 py-3 text-sm text-on-surface outline-none transition focus:border-transparent focus:ring-2 focus:ring-primary/30"
                          />
                        </div>
                      </div>

                      <div className="mt-4 flex justify-end">
                        <button
                          type="button"
                          onClick={() => void vm.uploadAssetAndSelect()}
                          disabled={vm.uploadingAsset}
                          className="rounded-xl bg-primary px-4 py-3 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-50"
                        >
                          {vm.uploadingAsset ? "Subiendo asset…" : "Subir al banco y seleccionar"}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {vm.contextMedia.mode === "PROGRAMMATIC" && (
                  <div className="space-y-3">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-[0.14em] text-secondary">
                        Render engine
                      </label>
                      <div className="relative">
                        <select
                          value={vm.contextMedia.render_engine}
                          onChange={(e) => vm.updateContextMediaField("render_engine", e.target.value as typeof vm.contextMedia.render_engine)}
                          className="w-full appearance-none rounded-xl border border-outline-variant/20 bg-surface-container-highest py-3 pl-3.5 pr-9 text-sm font-medium text-on-surface outline-none transition focus:border-transparent focus:ring-2 focus:ring-primary/30"
                        >
                          <option value="">Seleccionar</option>
                          {RENDER_ENGINE_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                          ))}
                        </select>
                        <span className="material-symbols-outlined pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[16px] text-secondary">
                          expand_more
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-[0.14em] text-secondary">
                        Visual data
                      </label>
                      <textarea
                        value={vm.contextMedia.visual_data}
                        onChange={(e) => vm.updateContextMediaField("visual_data", e.target.value)}
                        placeholder='Pega aquí el JSON o payload estructurado del recurso programático.'
                        rows={8}
                        className="w-full resize-y rounded-xl border border-outline-variant/20 bg-surface-container-highest px-3.5 py-3 font-mono text-[12px] text-on-surface outline-none transition focus:border-transparent focus:bg-white focus:ring-2 focus:ring-primary/30"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {vm.mediaError && (
              <div className="rounded-2xl bg-error-container px-4 py-3 text-sm font-medium text-on-error-container">
                {vm.mediaError}
              </div>
            )}
          </section>

          {vm.isBlockMode ? (
            <section className="space-y-4 rounded-[28px] bg-surface-container-low px-5 py-5">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-secondary">
                    Subpreguntas del bloque
                  </p>
                  <h3 className="mt-1 text-[18px] font-bold text-on-surface">
                    {vm.blockItems.length} / 3 subpreguntas
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={vm.addBlockItem}
                  disabled={!vm.canAddBlockItem}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-40"
                >
                  <span className="material-symbols-outlined text-[18px]">add</span>
                  Agregar subpregunta
                </button>
              </div>

              {vm.blockItems.map((item, index) => (
                <article key={index} className="rounded-[24px] bg-white p-5 shadow-[0_8px_24px_rgba(25,28,30,0.04)]">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-secondary">
                        Pregunta derivada {index + 1}
                      </p>
                      <h4 className="mt-1 text-[16px] font-bold text-on-surface">
                        Subpregunta {index + 1}
                      </h4>
                    </div>
                    <button
                      type="button"
                      onClick={() => vm.removeBlockItem(index)}
                      disabled={!vm.canRemoveBlockItem}
                      className="rounded-xl bg-surface-container-high px-3 py-2 text-[13px] font-semibold text-on-surface transition hover:bg-surface-container-highest disabled:opacity-40"
                    >
                      Eliminar
                    </button>
                  </div>

                  <div className="mt-4 space-y-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-[0.14em] text-secondary">
                        Enunciado
                      </label>
                      <textarea
                        value={item.stem}
                        onChange={(e) => vm.updateBlockItem(index, "stem", e.target.value)}
                        onBlur={() => vm.handleBlockItemBlur(index)}
                        placeholder="Escribe el enunciado de esta subpregunta…"
                        rows={3}
                        className="w-full resize-vertical rounded-xl border border-outline-variant/20 bg-surface-container-highest px-3.5 py-3 text-sm text-on-surface outline-none transition focus:border-transparent focus:bg-white focus:ring-2 focus:ring-primary/30"
                      />
                      {vm.blockErrors[index]?.stem && <p className="text-xs text-error">{vm.blockErrors[index]?.stem}</p>}
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-[0.14em] text-secondary">
                        Opciones de respuesta
                      </label>
                      {renderBlockOptionEditors(item, index)}
                      {(vm.blockErrors[index]?.option_a || vm.blockErrors[index]?.option_b || vm.blockErrors[index]?.option_c) && (
                        <p className="text-xs text-error">Todas las opciones A, B y C son requeridas.</p>
                      )}
                      {vm.blockErrors[index]?.correct_answer && <p className="text-xs text-error">{vm.blockErrors[index]?.correct_answer}</p>}
                      {vm.blockErrors[index]?.option_d && <p className="text-xs text-error">{vm.blockErrors[index]?.option_d}</p>}
                    </div>

                    <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-[0.14em] text-secondary">
                          Dificultad
                        </label>
                        <div className="relative">
                          <select
                            value={item.difficulty_estimated}
                            onChange={(e) => vm.updateBlockItem(index, "difficulty_estimated", e.target.value)}
                            onBlur={() => vm.handleBlockItemBlur(index)}
                            className="w-full appearance-none rounded-xl border border-outline-variant/20 bg-surface-container-highest py-3 pl-3.5 pr-9 text-sm font-medium text-on-surface outline-none transition focus:border-transparent focus:ring-2 focus:ring-primary/30"
                          >
                            <option value="">Sin especificar</option>
                            <option value="0.3">Baja</option>
                            <option value="0.5">Media</option>
                            <option value="0.8">Alta</option>
                          </select>
                          <span className="material-symbols-outlined pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[16px] text-secondary">
                            expand_more
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-[0.14em] text-secondary">
                          Explicación correcta
                        </label>
                        <textarea
                          value={item.explanation_correct}
                          onChange={(e) => vm.updateBlockItem(index, "explanation_correct", e.target.value)}
                          onBlur={() => vm.handleBlockItemBlur(index)}
                          placeholder="¿Por qué es correcta esta opción?"
                          rows={2}
                          className="w-full resize-vertical rounded-xl border border-outline-variant/20 bg-surface-container-highest px-3.5 py-3 text-sm text-on-surface outline-none transition focus:border-transparent focus:bg-white focus:ring-2 focus:ring-primary/30"
                        />
                        {vm.blockErrors[index]?.explanation_correct && (
                          <p className="text-xs text-error">{vm.blockErrors[index]?.explanation_correct}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </section>
          ) : (
            <>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-[0.14em] text-secondary">
                  Enunciado (stem)
                </label>
                <textarea
                  value={vm.formData.stem}
                  onChange={(e) => vm.updateField("stem", e.target.value)}
                  onBlur={() => vm.handleBlur("stem")}
                  placeholder="Escribe el enunciado de la pregunta…"
                  rows={3}
                  className="w-full resize-vertical rounded-xl border border-outline-variant/20 bg-surface-container-highest px-3.5 py-3 text-sm text-on-surface outline-none transition focus:border-transparent focus:bg-white focus:ring-2 focus:ring-primary/30"
                />
                {vm.errors.stem && <p className="text-xs text-error">{vm.errors.stem}</p>}
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-[0.14em] text-secondary">
                  Opciones de respuesta
                </label>
                {renderSharedOptionEditors(
                  {
                    option_a: vm.formData.option_a,
                    option_b: vm.formData.option_b,
                    option_c: vm.formData.option_c,
                    option_d: vm.formData.option_d,
                    correct_answer: vm.formData.correct_answer,
                  },
                  (letter) => vm.updateField("correct_answer", letter),
                  (field, value) => vm.updateField(field, value),
                  (field) => vm.handleBlur(field),
                )}
                <span className="text-[11px] text-secondary">
                  Haz clic en la letra para marcar la opción correcta.
                </span>
                {vm.errors.correct_answer && <p className="text-xs text-error">{vm.errors.correct_answer}</p>}
                {(vm.errors.option_a || vm.errors.option_b || vm.errors.option_c) && (
                  <p className="text-xs text-error">Todas las opciones A, B y C son requeridas.</p>
                )}
                {vm.errors.option_d && <p className="text-xs text-error">{vm.errors.option_d}</p>}
              </div>

              <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-[0.14em] text-secondary">
                    Dificultad
                  </label>
                  <div className="relative">
                    <select
                      value={vm.formData.difficulty_estimated}
                      onChange={(e) => vm.updateField("difficulty_estimated", e.target.value)}
                      className="w-full appearance-none rounded-xl border border-outline-variant/20 bg-surface-container-highest py-3 pl-3.5 pr-9 text-sm font-medium text-on-surface outline-none transition focus:border-transparent focus:ring-2 focus:ring-primary/30"
                    >
                      <option value="">Sin especificar</option>
                      <option value="0.3">Baja</option>
                      <option value="0.5">Media</option>
                      <option value="0.8">Alta</option>
                    </select>
                    <span className="material-symbols-outlined pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[16px] text-secondary">
                      expand_more
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-[0.14em] text-secondary">
                    Explicación correcta
                  </label>
                  <textarea
                    value={vm.formData.explanation_correct}
                    onChange={(e) => vm.updateField("explanation_correct", e.target.value)}
                    onBlur={() => vm.handleBlur("explanation_correct")}
                    placeholder="¿Por qué es correcta?"
                    rows={2}
                    className="w-full resize-vertical rounded-xl border border-outline-variant/20 bg-surface-container-highest px-3.5 py-3 text-sm text-on-surface outline-none transition focus:border-transparent focus:bg-white focus:ring-2 focus:ring-primary/30"
                  />
                  {vm.errors.explanation_correct && (
                    <p className="text-xs text-error">{vm.errors.explanation_correct}</p>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        <footer className="flex items-center justify-end gap-2.5 border-t border-outline-variant/10 px-7 py-5">
          <button
            type="button"
            onClick={handleClose}
            className="rounded-xl bg-surface-container-high px-5 py-2.5 text-sm font-semibold text-on-surface transition hover:bg-surface-container-highest"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmitSimple}
            disabled={vm.submitting}
            className="flex items-center gap-2 rounded-xl bg-linear-to-br from-primary to-primary-container px-6 py-2.5 text-sm font-bold text-white shadow-md shadow-primary/20 transition hover:opacity-90 disabled:opacity-50"
          >
            {vm.submitting ? (
              <>
                <span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>
                Guardando…
              </>
            ) : vm.isBlockMode ? (
              vm.isEditMode ? "Guardar bloque" : "Crear bloque"
            ) : (
              "Guardar pregunta"
            )}
          </button>
          {vm.isEditMode && (
            <p className="text-[11px] text-secondary">
              Solo se pueden editar unidades en estado Borrador.
            </p>
          )}
        </footer>
      </div>

      {showDiscardConfirm && (
        <ConfirmModal
          title="Descartar cambios"
          message="Tienes cambios sin guardar. ¿Deseas descartarlos?"
          confirmLabel="Sí, descartar"
          cancelLabel="Seguir editando"
          icon="delete"
          destructive
          onConfirm={onClose}
          onCancel={() => setShowDiscardConfirm(false)}
        />
      )}
    </div>
  );
}
