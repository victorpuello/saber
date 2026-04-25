import type { NoticeSignData, NoticeSignType } from "./types";

const NOTICE_STYLES: Record<NoticeSignType, { className: string; icon: string; label: string }> = {
  danger: {
    className: "bg-[#b91c1c] text-white ring-[#7f1d1d]/20",
    icon: "dangerous",
    label: "Danger sign",
  },
  warning: {
    className: "bg-[#f59e0b] text-[#241100] ring-[#92400e]/20",
    icon: "warning",
    label: "Warning sign",
  },
  info: {
    className: "bg-[#047857] text-white ring-[#064e3b]/20",
    icon: "info",
    label: "Information sign",
  },
  prohibition: {
    className: "bg-[#991b1b] text-white ring-[#450a0a]/20",
    icon: "block",
    label: "Prohibition sign",
  },
  instruction: {
    className: "bg-[#1d4ed8] text-white ring-[#1e3a8a]/20",
    icon: "directions",
    label: "Instruction sign",
  },
};

function isNoticeType(value: string): value is NoticeSignType {
  return value in NOTICE_STYLES;
}

export default function NoticeSign({ data, compact = false }: { data: NoticeSignData; compact?: boolean }) {
  const type = isNoticeType(data.type) ? data.type : "info";
  const style = NOTICE_STYLES[type];
  const location = data.location ?? data.location_hint;
  const text = data.text || "Public notice";

  return (
    <section
      aria-label={`${style.label}: ${text}${location ? `, ${location}` : ""}`}
      className={`mx-auto flex w-full max-w-xl flex-col items-center justify-center rounded-[18px] px-5 text-center ring-8 ${style.className} ${
        compact ? "min-h-36 py-7" : "min-h-52 py-10"
      }`}
    >
      <span
        className={`material-symbols-outlined ${compact ? "text-[38px]" : "text-[52px]"}`}
        aria-hidden="true"
        style={{ fontVariationSettings: "'FILL' 1" }}
      >
        {data.icon ?? style.icon}
      </span>
      <p className={`mt-3 font-black uppercase leading-tight tracking-[0.06em] ${compact ? "text-2xl" : "text-4xl"}`}>
        {text}
      </p>
      {location && (
        <p className="mt-4 rounded-full bg-white/18 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em]">
          {location}
        </p>
      )}
    </section>
  );
}

