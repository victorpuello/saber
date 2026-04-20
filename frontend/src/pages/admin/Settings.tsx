import { useSettingsViewModel } from "./settings/useSettingsViewModel";
import ProviderCard from "./settings/components/ProviderCard";
import ProviderEditModal from "./settings/components/ProviderEditModal";

export default function AdminSettings() {
  const vm = useSettingsViewModel();

  const connectedCount = vm.providers.filter((p) => p.hasApiKey).length;
  const activeCount = vm.providers.filter((p) => p.isEnabled).length;

  return (
    <>
      {/* Page header — consistent with Dashboard */}
      <section className="flex flex-col gap-1">
        <h2 className="text-2xl font-bold tracking-tight text-on-surface sm:text-3xl">
          Configuración de IA
        </h2>
        <p className="text-base text-secondary">
          Conecte y administre los proveedores de inteligencia artificial para la generación de preguntas.
        </p>
      </section>

      {/* Alerts */}
      {vm.error && (
        <div className="flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3">
          <span className="material-symbols-outlined text-[20px] text-rose-500">error</span>
          <p className="flex-1 text-sm font-medium text-rose-700">{vm.error}</p>
          <button
            type="button"
            onClick={vm.dismissError}
            className="text-rose-400 transition-colors hover:text-rose-600"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>
      )}

      {vm.success && (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
          <span className="material-symbols-outlined text-[20px] text-emerald-500">check_circle</span>
          <p className="flex-1 text-sm font-medium text-emerald-700">{vm.success}</p>
          <button
            type="button"
            onClick={vm.dismissSuccess}
            className="text-emerald-400 transition-colors hover:text-emerald-600"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>
      )}

      {/* Status summary */}
      <div className="flex items-center gap-4 text-sm text-secondary">
        <span className="flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[18px]">link</span>
          {connectedCount} de {vm.providers.length} conectados
        </span>
        <span className="h-4 w-px bg-outline-variant/30" />
        <span className="flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[18px]">power</span>
          {activeCount} activo{activeCount !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Providers */}
      <section>
        <h3 className="mb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-secondary">
          Proveedores disponibles
        </h3>

        {vm.loading ? (
          <div className="grid gap-4 md:grid-cols-2">
            {[1, 2].map((i) => (
              <div key={i} className="h-32 animate-pulse rounded-2xl bg-slate-100" />
            ))}
          </div>
        ) : vm.providers.length === 0 ? (
          <div className="rounded-xl border border-outline-variant/10 bg-white p-8 text-center">
            <span className="material-symbols-outlined mb-2 text-[32px] text-secondary/40">smart_toy</span>
            <p className="text-sm font-semibold text-on-surface">No hay proveedores disponibles</p>
            <p className="mt-1 text-xs text-secondary">
              Verifique que el servicio de IA esté ejecutándose correctamente.
            </p>
          </div>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2">
              {vm.providers.map((p) => (
                <ProviderCard
                  key={p.provider}
                  provider={p}
                  onEdit={vm.setEditingProvider}
                  onToggle={vm.toggleEnabled}
                  onTest={vm.testProviderConnection}
                  testing={vm.testing === p.provider}
                  testResult={vm.testResult[p.provider] ?? null}
                />
              ))}
            </div>

            {/* Tip — only show when providers exist but none are connected */}
            {connectedCount === 0 && (
              <div className="mt-4 rounded-xl border border-primary-fixed bg-primary-fixed/30 p-4">
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined mt-0.5 text-[20px] text-primary">lightbulb</span>
                  <div className="space-y-1 text-sm text-on-surface">
                    <p className="font-semibold">Para comenzar</p>
                    <p className="text-secondary">
                      Haga clic en el botón azul de cualquier proveedor para ingresar su clave API.
                      Una vez conectado, podrá generar preguntas con inteligencia artificial.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </section>

      {/* Edit modal */}
      {vm.editingProvider && (
        <ProviderEditModal
          provider={vm.providers.find((p) => p.provider === vm.editingProvider)!}
          saving={vm.saving === vm.editingProvider}
          onSave={vm.saveProvider}
          onCancel={() => vm.setEditingProvider(null)}
        />
      )}
    </>
  );
}
