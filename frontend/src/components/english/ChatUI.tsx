import type { ChatUIData } from "./types";

export default function ChatUI({ data, compact = false }: { data: ChatUIData; compact?: boolean }) {
  const speakerAName = data.speakerA?.name ?? data.speaker_a_name ?? "Speaker A";
  const speakerAMessage = data.speakerA?.message ?? data.speaker_a_message ?? "";
  const placeholder = data.speaker_b_placeholder ?? "[__?__]";

  return (
    <section
      role="log"
      aria-label="Short English dialogue"
      className={`mx-auto w-full max-w-2xl rounded-[20px] border border-outline-variant/25 bg-[#eef3f7] ${
        compact ? "p-4" : "p-5"
      }`}
    >
      <div className="mb-4 flex items-center gap-2 border-b border-white/70 pb-3">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-primary">
          <span className="material-symbols-outlined text-[18px]" aria-hidden="true">chat</span>
        </span>
        <div>
          <p className="text-sm font-black text-on-surface">Conversation</p>
          <p className="text-xs font-semibold text-secondary">Choose the natural response for Speaker B</p>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex justify-end">
          <div className="max-w-[82%]">
            <p className="mb-1 text-right text-xs font-bold text-secondary">{speakerAName}</p>
            <div className="rounded-2xl rounded-tr-md bg-primary px-4 py-3 text-sm font-semibold leading-relaxed text-white shadow-[0_8px_22px_rgba(0,74,198,0.16)]">
              {speakerAMessage || "Hello!"}
            </div>
          </div>
        </div>

        <div className="flex justify-start">
          <div className="max-w-[82%]">
            <p className="mb-1 text-xs font-bold text-secondary">Speaker B</p>
            <div className="rounded-2xl rounded-tl-md border-2 border-dashed border-outline-variant/60 bg-white px-4 py-3 text-sm font-black text-on-surface-variant">
              {placeholder}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

