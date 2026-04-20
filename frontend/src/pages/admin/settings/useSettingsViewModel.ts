import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "../../../context/AuthContext";
import {
  fetchProviders,
  setupProvider,
  updateProvider,
  fetchGenerationStats,
  testProvider,
  type ProviderInfo,
  type GenerationStats,
} from "../../../services/aiProviders";
import type { ProviderCardModel, ProviderFormState, ProviderKey } from "./types";
import { PROVIDER_META } from "./types";

function toCardModel(p: ProviderInfo): ProviderCardModel {
  const meta = PROVIDER_META[p.provider as ProviderKey] ?? { icon: "smart_toy", color: "gray" };
  return {
    provider: p.provider as ProviderKey,
    displayName: p.display_name,
    defaultModel: p.default_model,
    isEnabled: p.is_enabled,
    maxTokens: p.max_tokens,
    temperature: p.temperature,
    hasApiKey: p.has_api_key,
    icon: meta.icon,
    color: meta.color,
  };
}

export function useSettingsViewModel() {
  const { authFetch } = useAuth();
  const loadedRef = useRef(false);

  const [providers, setProviders] = useState<ProviderCardModel[]>([]);
  const [stats, setStats] = useState<GenerationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Provider being edited (null = none)
  const [editingProvider, setEditingProvider] = useState<ProviderKey | null>(null);
  const [testing, setTesting] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<Record<string, "ok" | "error" | null>>({});

  const load = useCallback(async () => {
    if (!authFetch) return;
    setLoading(true);
    setError(null);
    try {
      const [providersList, genStats] = await Promise.all([
        fetchProviders(authFetch),
        fetchGenerationStats(authFetch).catch(() => null),
      ]);
      setProviders(providersList.map(toCardModel));
      setStats(genStats);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error cargando configuración");
    } finally {
      setLoading(false);
    }
  }, [authFetch]);

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    load();
  }, [load]);

  const saveProvider = useCallback(
    async (provider: ProviderKey, form: ProviderFormState) => {
      if (!authFetch) return;
      setSaving(provider);
      setError(null);
      setSuccess(null);
      try {
        const existing = providers.find((p) => p.provider === provider);
        let updated: ProviderInfo;

        if (existing?.hasApiKey && !form.apiKey) {
          // Update without changing key
          updated = await updateProvider(authFetch, provider, {
            default_model: form.defaultModel,
            max_tokens: form.maxTokens,
            temperature: form.temperature,
            is_enabled: form.isEnabled,
          });
        } else if (form.apiKey) {
          // Setup or update with new key
          updated = await setupProvider(authFetch, {
            provider,
            api_key: form.apiKey,
            default_model: form.defaultModel,
            max_tokens: form.maxTokens,
            temperature: form.temperature,
            is_enabled: form.isEnabled,
          });
        } else {
          setError("Debes ingresar la API key para configurar este proveedor.");
          setSaving(null);
          return;
        }

        setProviders((prev) =>
          prev.map((p) => (p.provider === provider ? toCardModel(updated) : p)),
        );
        setSuccess(`${updated.display_name} guardado correctamente.`);
        setEditingProvider(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error guardando proveedor");
      } finally {
        setSaving(null);
      }
    },
    [authFetch, providers],
  );

  const toggleEnabled = useCallback(
    async (provider: ProviderKey, enabled: boolean) => {
      if (!authFetch) return;
      setError(null);
      try {
        const updated = await updateProvider(authFetch, provider, { is_enabled: enabled });
        setProviders((prev) =>
          prev.map((p) => (p.provider === provider ? toCardModel(updated) : p)),
        );
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error actualizando proveedor");
      }
    },
    [authFetch],
  );

  const testProviderConnection = useCallback(
    async (provider: ProviderKey) => {
      if (!authFetch) return;
      setTesting(provider);
      setTestResult((prev) => ({ ...prev, [provider]: null }));
      setError(null);
      try {
        const result = await testProvider(authFetch, provider);
        setTestResult((prev) => ({ ...prev, [provider]: result.status }));
        if (result.status === "ok") {
          setSuccess(`${provider}: conexión exitosa (modelo ${result.model}).`);
        } else {
          setError(`${provider}: ${result.message ?? "Error desconocido"}`);
        }
      } catch (e) {
        setTestResult((prev) => ({ ...prev, [provider]: "error" }));
        setError(e instanceof Error ? e.message : "Error probando conexión");
      } finally {
        setTesting(null);
      }
    },
    [authFetch],
  );

  return {
    providers,
    stats,
    loading,
    saving,
    error,
    success,
    editingProvider,
    setEditingProvider,
    saveProvider,
    toggleEnabled,
    testing,
    testResult,
    testProviderConnection,
    dismissSuccess: () => setSuccess(null),
    dismissError: () => setError(null),
  };
}
