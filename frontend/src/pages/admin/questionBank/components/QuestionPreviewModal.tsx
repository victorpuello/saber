import { useState, useEffect, useCallback } from "react";
import type { QuestionRow } from "../types";
import type { QuestionBlockOut, QuestionMediaOut } from "../questionFormTypes";
import QuestionContextMedia from "../../../../components/QuestionContextMedia";

interface PreviewItem {
  stem: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string | null;
}

interface QuestionPreviewModalProps {
  question: QuestionRow | null;
  block: QuestionBlockOut | null;
  media: QuestionMediaOut[];
  onClose: () => void;
}

const OPTIONS: Array<{ letter: string; key: keyof PreviewItem }> = [
  { letter: "A", key: "option_a" },
  { letter: "B", key: "option_b" },
  { letter: "C", key: "option_c" },
  { letter: "D", key: "option_d" },
];

export default function QuestionPreviewModal({ question, block, media, onClose }: QuestionPreviewModalProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [blockIndex, setBlockIndex] = useState(0);

  const isBlock = block !== null;
  const items: PreviewItem[] = isBlock
    ? block.items.map((item) => ({
        stem: item.stem,
        option_a: item.option_a,
        option_b: item.option_b,
        option_c: item.option_c,
        option_d: item.option_d ?? null,
      }))
    : question
      ? [
          {
            stem: question.stem,
            option_a: question.options[0]?.text ?? "",
            option_b: question.options[1]?.text ?? "",
            option_c: question.options[2]?.text ?? "",
            option_d: question.options[3]?.text ?? null,
          },
        ]
      : [];

  const context = block?.context ?? question?.context ?? "";
  const currentItem = items[blockIndex] ?? null;
  const blockSize = items.length;

  useEffect(() => {
    setSelected(null);
  }, [blockIndex]);

  const handleClose = useCallback(() => {
    setSelected(null);
    setBlockIndex(0);
    onClose();
  }, [onClose]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [handleClose]);

  if (!currentItem) return null;

  return (
    <div className="fixed inset-0 z-[200] flex flex-col overflow-hidden bg-surface">
      {/* Header */}
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-outline-variant/15 bg-white px-6 shadow-[0_2px_12px_rgba(25,28,30,0.06)]">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
            <span className="material-symbols-outlined text-[18px] text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>
              preview
            </span>
          </div>
          <div>
            <p className="text-[13px] font-bold text-on-surface">Vista previa del estudiante</p>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-secondary">
              {isBlock ? `Bloque · ${blockSize} subpreguntas` : "Pregunta individual"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-amber-50 px-3 py-1.5 text-[11px] font-semibold text-amber-700 ring-1 ring-amber-200">
            <span className="material-symbols-outlined mr-1 align-middle text-[13px]">visibility</span>
            Modo vista previa — sin respuestas correctas
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="flex h-9 w-9 items-center justify-center rounded-[10px] text-secondary transition hover:bg-surface-container-high"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>
      </header>

      {/* Body: two-panel layout like ExamSession */}
      <div className="flex flex-1 gap-5 overflow-hidden p-5">

        {/* Left — context + media */}
        <div className="flex flex-1 flex-col overflow-hidden rounded-[28px] bg-surface-container-low">
          <div className="shrink-0 px-7 pb-3.5 pt-5.5">
            <span className="mb-1.5 inline-block rounded-full bg-primary-fixed px-3 py-0.75 text-[9px] font-black uppercase tracking-[0.28em] text-[#003ea8]">
              {isBlock ? "Contexto compartido" : "Material de lectura"}
            </span>
            <h2 className="text-[16px] font-bold text-on-surface">
              {context.split("\n")[0]?.slice(0, 72) || "Contexto"}
            </h2>
            {isBlock && (
              <p className="mt-1 text-[12px] text-secondary">
                Este contexto alimenta {blockSize} subpreguntas dentro del mismo bloque.
              </p>
            )}
          </div>

          <div className="flex-1 overflow-y-auto px-8.5 pb-8 [scrollbar-color:var(--color-surface-container-highest)_transparent] [scrollbar-width:thin]">
            <div className="space-y-6">
              {media.length > 0 && (
                <QuestionContextMedia media={media} />
              )}
              <article className="space-y-4 text-[16px] leading-[1.85] text-on-surface-variant">
                {context.split("\n\n").map((para, i) => (
                  <p key={i}>{para}</p>
                ))}
              </article>
            </div>
          </div>
        </div>

        {/* Right — stem + options */}
        <div className="flex w-105 shrink-0 flex-col gap-3.5">
          <div className="flex-1 overflow-y-auto rounded-[28px] bg-white p-6 shadow-[0_12px_40px_rgba(25,28,30,0.04)] [scrollbar-color:var(--color-surface-container-highest)_transparent] [scrollbar-width:thin]">
            {/* Question number / block progress */}
            <div className="mb-4.5 flex items-center gap-2.5">
              <div className="flex h-9.5 w-9.5 shrink-0 items-center justify-center rounded-full bg-[#d0e1fb] text-[13px] font-black text-[#54647a]">
                {isBlock ? blockIndex + 1 : 1}
              </div>
              <span className="text-[11px] font-bold uppercase tracking-[0.28em] text-secondary">
                Enunciado
              </span>
            </div>

            {/* Block sub-nav */}
            {isBlock && (
              <div className="mb-5 rounded-[20px] bg-surface-container-low p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-secondary">
                      Bloque de preguntas
                    </p>
                    <p className="mt-1 text-sm font-semibold text-on-surface">
                      Subpregunta {blockIndex + 1} de {blockSize}
                    </p>
                  </div>
                  <p className="text-[12px] font-semibold text-secondary">
                    {Math.round(((blockIndex + 1) / blockSize) * 100)}% del bloque
                  </p>
                </div>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-300"
                    style={{ width: `${Math.round(((blockIndex + 1) / blockSize) * 100)}%` }}
                  />
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {items.map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setBlockIndex(i)}
                      className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-[12px] font-bold transition ${
                        i === blockIndex
                          ? "bg-primary text-white"
                          : "bg-white text-secondary hover:bg-surface-container-high"
                      }`}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <p className="mb-5 text-[16px] font-medium leading-[1.65] text-on-surface">
              {currentItem.stem}
            </p>

            <div className="flex flex-col gap-2.5">
              {OPTIONS.map(({ letter, key }) => {
                const text = currentItem[key] as string | null;
                if (!text) return null;
                const isSelected = selected === letter;
                return (
                  <button
                    key={letter}
                    type="button"
                    onClick={() => setSelected(isSelected ? null : letter)}
                    className={`flex w-full items-start gap-3 rounded-[14px] border-2 px-4 py-3 text-left transition-all duration-150 ${
                      isSelected
                        ? "border-primary/20 bg-[#d0e1fb]"
                        : "border-transparent bg-surface-container-low hover:border-primary/15 hover:bg-white"
                    }`}
                  >
                    <div
                      className={`flex h-7.5 w-7.5 shrink-0 items-center justify-center rounded-[9px] border text-[12px] font-bold transition ${
                        isSelected
                          ? "border-primary bg-primary text-white"
                          : "border-outline-variant/35 bg-white"
                      }`}
                    >
                      {letter}
                    </div>
                    <p className={`text-[14px] leading-relaxed ${isSelected ? "font-medium text-on-surface" : "text-on-surface-variant"}`}>
                      {text}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Navigation */}
          <div className="flex gap-3">
            {isBlock ? (
              <>
                <button
                  type="button"
                  disabled={blockIndex === 0}
                  onClick={() => setBlockIndex((i) => i - 1)}
                  className="flex h-14 flex-1 items-center justify-center gap-1.5 rounded-[14px] bg-surface-container-high text-[14px] font-bold text-on-surface transition hover:bg-surface-container-highest disabled:opacity-40"
                >
                  <span className="material-symbols-outlined">chevron_left</span>
                  Anterior
                </button>
                <button
                  type="button"
                  disabled={blockIndex === blockSize - 1}
                  onClick={() => setBlockIndex((i) => i + 1)}
                  className="flex h-14 flex-[1.4] items-center justify-center gap-1.5 rounded-[14px] bg-primary text-[14px] font-bold text-white transition hover:opacity-90 disabled:opacity-40"
                >
                  Siguiente
                  <span className="material-symbols-outlined">chevron_right</span>
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={handleClose}
                className="flex h-14 flex-1 items-center justify-center gap-2 rounded-[14px] bg-surface-container-high text-[14px] font-bold text-on-surface transition hover:bg-surface-container-highest"
              >
                <span className="material-symbols-outlined">close</span>
                Cerrar vista previa
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
