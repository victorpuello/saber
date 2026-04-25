import type { ClozeOption } from "./types";

const BLANK_PATTERN = /\[BLANK\]/i;

export function isClozeContext(contextType: string | null | undefined): boolean {
  return contextType === "cloze_text";
}

export default function ClozeText({
  text,
  options,
  selectedLetter,
  onSelect,
  compact = false,
}: {
  text: string;
  options: ClozeOption[];
  selectedLetter: string | null;
  onSelect: (letter: string) => void;
  compact?: boolean;
}) {
  const selected = options.find((option) => option.letter === selectedLetter) ?? null;
  const parts = text.split(BLANK_PATTERN);
  const hasBlank = BLANK_PATTERN.test(text);

  return (
    <article className={`rounded-[18px] border border-outline-variant/20 bg-white ${compact ? "p-4" : "p-5"}`}>
      <p className="text-[15px] leading-[1.9] text-on-surface-variant">
        {hasBlank ? (
          <>
            {parts[0]}
            <span
              className="mx-1 inline-flex min-w-28 items-center justify-center rounded-lg border border-primary/25 bg-primary-fixed px-2.5 py-1 align-baseline text-sm font-black text-on-primary-fixed"
              aria-label="Blank to complete"
            >
              {selected ? selected.text : "_____"}
            </span>
            {parts.slice(1).join("[BLANK]")}
          </>
        ) : (
          text
        )}
      </p>

      <div className="mt-4" role="radiogroup" aria-label="Options to complete the blank">
        <div className="flex flex-wrap gap-2">
          {options.map((option) => {
            const isSelected = option.letter === selectedLetter;
            return (
              <button
                key={option.letter}
                type="button"
                role="radio"
                aria-checked={isSelected}
                onClick={() => onSelect(option.letter)}
                className={`inline-flex max-w-full items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm font-semibold transition-colors ${
                  isSelected
                    ? "border-primary/30 bg-primary text-white"
                    : "border-outline-variant/30 bg-surface-container-low text-on-surface-variant hover:border-primary/25 hover:bg-white"
                }`}
              >
                <span className={`shrink-0 rounded-md px-2 py-0.5 text-xs font-black ${isSelected ? "bg-white/18" : "bg-white"}`}>
                  {option.displayLetter}
                </span>
                <span className="min-w-0 break-words">{option.text}</span>
              </button>
            );
          })}
        </div>
      </div>
    </article>
  );
}

