import type { ProviderCardModel, ProviderKey } from "../types";

interface Props {
  provider: ProviderCardModel;
  onEdit: (provider: ProviderKey) => void;
  onToggle: (provider: ProviderKey, enabled: boolean) => void;
  onTest: (provider: ProviderKey) => void;
  testing: boolean;
  testResult: "ok" | "error" | null;
}

export default function ProviderCard({ provider, onEdit, onToggle, onTest, testing, testResult }: Props) {
  const colorMap: Record<string, { bg: string; icon: string; dot: string }> = {
    orange: { bg: "bg-orange-50", icon: "text-orange-500", dot: "bg-orange-400" },
    blue: { bg: "bg-blue-50", icon: "text-blue-500", dot: "bg-blue-400" },
    gray: { bg: "bg-slate-50", icon: "text-slate-500", dot: "bg-slate-400" },
  };

  const colors = colorMap[provider.color] ?? colorMap.gray;
  const isConnected = provider.hasApiKey;

  return (
    <div
      className={`relative rounded-2xl border bg-white transition-shadow hover:shadow-[0_8px_24px_rgba(25,28,30,0.08)] ${
        provider.isEnabled && isConnected
          ? "border-outline-variant/15 shadow-[0_4px_16px_rgba(25,28,30,0.05)]"
          : "border-outline-variant/10 shadow-[0_2px_8px_rgba(25,28,30,0.03)]"
      }`}
    >
      {/* Header */}
      <div className="flex items-center gap-3.5 border-b border-outline-variant/10 px-5 py-4">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${colors.bg}`}>
          <span className={`material-symbols-outlined text-[22px] ${colors.icon}`}>
            {provider.icon}
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-bold text-on-surface">{provider.displayName}</h3>
          <p className="truncate text-xs text-secondary">{provider.defaultModel}</p>
        </div>

        {/* Status badge */}
        {isConnected ? (
          <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Conectado
          </span>
        ) : (
          <span className="flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
            Sin configurar
          </span>
        )}
      </div>

      {/* Body */}
      <div className="px-5 py-4">
        {isConnected ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              {/* Toggle activation */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  role="switch"
                  aria-checked={provider.isEnabled}
                  aria-label={`${provider.isEnabled ? "Desactivar" : "Activar"} ${provider.displayName}`}
                  onClick={() => onToggle(provider.provider, !provider.isEnabled)}
                  className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
                    provider.isEnabled ? "bg-primary" : "bg-slate-300"
                  }`}
                >
                  <span
                    className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                      provider.isEnabled ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
                <span className="text-sm text-secondary">
                  {provider.isEnabled ? "Activo para generación" : "Desactivado"}
                </span>
              </div>

              {/* Edit button */}
              <button
                type="button"
                onClick={() => onEdit(provider.provider)}
                className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary/[0.06]"
              >
                <span className="material-symbols-outlined text-[18px]">edit</span>
                Modificar
              </button>
            </div>

            {/* Test connection */}
            <div className="flex items-center gap-2 border-t border-outline-variant/10 pt-3">
              <button
                type="button"
                disabled={testing}
                onClick={() => onTest(provider.provider)}
                className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-secondary transition-colors hover:bg-slate-100 hover:text-on-surface disabled:opacity-50"
              >
                <span className={`material-symbols-outlined text-[16px] ${testing ? "animate-spin" : ""}`}>
                  {testing ? "progress_activity" : "network_check"}
                </span>
                {testing ? "Probando…" : "Probar conexión"}
              </button>
              {testResult === "ok" && !testing && (
                <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600">
                  <span className="material-symbols-outlined text-[14px]">check_circle</span>
                  Conexión exitosa
                </span>
              )}
              {testResult === "error" && !testing && (
                <span className="flex items-center gap-1 text-xs font-semibold text-rose-600">
                  <span className="material-symbols-outlined text-[14px]">error</span>
                  Error de conexión
                </span>
              )}
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => onEdit(provider.provider)}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white shadow-[0_4px_12px_rgba(0,74,198,0.25)] transition-opacity hover:opacity-90"
          >
            <span className="material-symbols-outlined text-[18px]">link</span>
            Conectar proveedor
          </button>
        )}
      </div>
    </div>
  );
}
