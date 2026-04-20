import { useEffect, useState } from "react";
import type { ProviderCardModel, ProviderFormState, ProviderKey } from "../types";
import { PROVIDER_META } from "../types";

interface Props {
  provider: ProviderCardModel;
  saving: boolean;
  onSave: (provider: ProviderKey, form: ProviderFormState) => void;
  onCancel: () => void;
}

export default function ProviderEditModal({ provider, saving, onSave, onCancel }: Props) {
  const meta = PROVIDER_META[provider.provider];
  const models = meta?.models ?? [];
  const isNewSetup = !provider.hasApiKey;

  const [form, setForm] = useState<ProviderFormState>({
    apiKey: "",
    defaultModel: provider.defaultModel,
    maxTokens: provider.maxTokens,
    temperature: provider.temperature,
    isEnabled: provider.isEnabled,
  });

  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onCancel]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSave(provider.provider, form);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} />

      <div className="relative z-10 mx-4 w-full max-w-lg rounded-2xl bg-white shadow-[0_24px_80px_rgba(0,0,0,0.18)]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-outline-variant/15 px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-[22px] text-primary">
              {provider.icon}
            </span>
            <div>
              <h2 className="font-headline text-lg font-bold text-on-surface">
                {isNewSetup ? "Conectar" : "Modificar"} {provider.displayName}
              </h2>
              <p className="text-xs text-secondary">
                {isNewSetup
                  ? "Ingrese su clave API para activar este proveedor."
                  : "Ajuste la configuración de este proveedor."}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-secondary transition-colors hover:bg-slate-100 hover:text-on-surface"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 px-6 py-5">
          {/* API Key */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold uppercase tracking-[0.14em] text-secondary">
              Clave API
            </label>
            <div className="relative">
              <input
                type="password"
                value={form.apiKey}
                onChange={(e) => setForm((f) => ({ ...f, apiKey: e.target.value }))}
                placeholder={
                  provider.hasApiKey
                    ? "Dejar vacío para mantener la clave actual"
                    : "Pegue su clave API aquí"
                }
                className="w-full rounded-xl border border-outline-variant/20 px-3.5 py-3 pr-10 text-sm text-on-surface transition-colors placeholder:text-secondary/50 focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-[18px] text-secondary/40">
                key
              </span>
            </div>
            {isNewSetup && (
              <p className="text-[11px] text-amber-600">
                <span className="material-symbols-outlined mr-0.5 align-middle text-[13px]">info</span>
                Requerida para habilitar este proveedor.
              </p>
            )}
            {provider.hasApiKey && (
              <p className="text-[11px] text-emerald-600">
                <span className="material-symbols-outlined mr-0.5 align-middle text-[13px]">check_circle</span>
                Clave configurada. La información se almacena de forma segura.
              </p>
            )}
          </div>

          {/* Model */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold uppercase tracking-[0.14em] text-secondary">
              Modelo
            </label>
            <select
              value={form.defaultModel}
              onChange={(e) => setForm((f) => ({ ...f, defaultModel: e.target.value }))}
              className="w-full appearance-none rounded-xl border border-outline-variant/20 bg-white px-3.5 py-3 text-sm text-on-surface transition-colors focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              {models.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
            <p className="text-[10px] text-secondary">
              Modelo de IA que se usará para generar preguntas.
            </p>
          </div>

          {/* Enabled toggle */}
          <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-on-surface">Proveedor activo</p>
              <p className="text-[11px] text-secondary">
                Disponible al generar preguntas.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={form.isEnabled}
              onClick={() => setForm((f) => ({ ...f, isEnabled: !f.isEnabled }))}
              className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
                form.isEnabled ? "bg-primary" : "bg-slate-300"
              }`}
            >
              <span
                className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                  form.isEnabled ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* Advanced toggle */}
          <button
            type="button"
            onClick={() => setShowAdvanced((v) => !v)}
            className="flex items-center gap-1.5 text-xs font-semibold text-secondary transition-colors hover:text-on-surface"
          >
            <span className="material-symbols-outlined text-[16px]">
              {showAdvanced ? "expand_less" : "expand_more"}
            </span>
            Configuración avanzada
          </button>

          {showAdvanced && (
            <div className="grid grid-cols-2 gap-4 rounded-xl border border-outline-variant/10 bg-slate-50/50 p-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-[0.14em] text-secondary">
                  Creatividad
                </label>
                <input
                  type="number"
                  min="0"
                  max="2"
                  step="0.1"
                  value={form.temperature}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, temperature: parseFloat(e.target.value) || 0 }))
                  }
                  className="w-full rounded-xl border border-outline-variant/20 bg-white px-3.5 py-2.5 text-sm text-on-surface transition-colors focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
                <p className="text-[10px] text-secondary">
                  0 = preciso, 2 = creativo
                </p>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-[0.14em] text-secondary">
                  Longitud máxima
                </label>
                <input
                  type="number"
                  min="256"
                  max="16384"
                  step="256"
                  value={form.maxTokens}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, maxTokens: parseInt(e.target.value) || 4096 }))
                  }
                  className="w-full rounded-xl border border-outline-variant/20 bg-white px-3.5 py-2.5 text-sm text-on-surface transition-colors focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
                <p className="text-[10px] text-secondary">
                  Largo máximo de respuesta
                </p>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 border-t border-outline-variant/15 pt-4">
            <button
              type="button"
              onClick={onCancel}
              disabled={saving}
              className="rounded-xl px-5 py-2.5 text-sm font-semibold text-secondary transition-colors hover:bg-slate-100 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-bold text-white shadow-[0_4px_12px_rgba(0,74,198,0.3)] transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {saving ? (
                <>
                  <span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>
                  Guardando…
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[16px]">
                    {isNewSetup ? "link" : "save"}
                  </span>
                  {isNewSetup ? "Conectar" : "Guardar"}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
