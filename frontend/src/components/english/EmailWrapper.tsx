import type { EmailWrapperData } from "./types";

export default function EmailWrapper({ data, compact = false }: { data: EmailWrapperData; compact?: boolean }) {
  const rows = [
    ["From", data.from ?? "sender@example.com"],
    ["To", data.to ?? "student@example.com"],
    ["Date", data.date ?? "Not specified"],
    ["Subject", data.subject ?? "No subject"],
  ];

  return (
    <article
      aria-label={`Email: ${data.subject ?? "No subject"}`}
      className={`mx-auto w-full max-w-3xl overflow-hidden rounded-[18px] border border-outline-variant/25 bg-white ${
        compact ? "text-sm" : ""
      }`}
    >
      <header className="border-b border-outline-variant/20 bg-surface-container-low px-5 py-4">
        <div className="mb-3 flex items-center gap-2">
          <span className="material-symbols-outlined text-[19px] text-primary" aria-hidden="true">mail</span>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-secondary">Email</p>
        </div>
        <dl className="grid gap-2 sm:grid-cols-2">
          {rows.map(([label, value]) => (
            <div key={label} className="min-w-0 rounded-xl bg-white px-3 py-2">
              <dt className="text-[10px] font-black uppercase tracking-[0.16em] text-secondary">{label}</dt>
              <dd className="mt-0.5 truncate text-sm font-semibold text-on-surface">{value}</dd>
            </div>
          ))}
        </dl>
      </header>
      <main className="whitespace-pre-wrap px-5 py-5 font-mono text-[14px] leading-[1.8] text-on-surface-variant">
        {data.body ?? "Email body unavailable."}
      </main>
    </article>
  );
}

