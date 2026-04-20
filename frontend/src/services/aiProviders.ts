import type { AuthFetch } from "./dashboard";

// ── Tipos ────────────────────────────────────────────────────────────

export interface ProviderInfo {
  provider: string;
  display_name: string;
  default_model: string;
  is_enabled: boolean;
  max_tokens: number;
  temperature: number;
  has_api_key: boolean;
}

export interface ProviderSetupPayload {
  provider: "anthropic" | "gemini";
  display_name?: string;
  default_model?: string;
  api_key: string;
  is_enabled?: boolean;
  max_tokens?: number;
  temperature?: number;
}

export interface ProviderUpdatePayload {
  display_name?: string;
  default_model?: string;
  api_key?: string;
  is_enabled?: boolean;
  max_tokens?: number;
  temperature?: number;
}

export interface GenerationStats {
  total_generated: number;
  total_approved: number;
  total_rejected: number;
  approval_rate: number;
  by_area: Record<string, number>;
  by_model: Record<string, number>;
}

// ── Servicios ────────────────────────────────────────────────────────

export async function fetchProviders(authFetch: AuthFetch): Promise<ProviderInfo[]> {
  return authFetch<ProviderInfo[]>("/api/ai/providers");
}

export async function setupProvider(
  authFetch: AuthFetch,
  data: ProviderSetupPayload,
): Promise<ProviderInfo> {
  return authFetch<ProviderInfo>("/api/ai/providers", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateProvider(
  authFetch: AuthFetch,
  provider: string,
  data: ProviderUpdatePayload,
): Promise<ProviderInfo> {
  return authFetch<ProviderInfo>(`/api/ai/providers/${provider}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function fetchGenerationStats(authFetch: AuthFetch): Promise<GenerationStats> {
  return authFetch<GenerationStats>("/api/ai/stats");
}

export async function invalidateTaxonomyCache(authFetch: AuthFetch): Promise<void> {
  await authFetch<{ status: string }>("/api/ai/cache/invalidate", {
    method: "POST",
  });
}

export interface ProviderTestResult {
  status: "ok" | "error";
  model?: string;
  message?: string;
}

export async function testProvider(
  authFetch: AuthFetch,
  provider: string,
): Promise<ProviderTestResult> {
  return authFetch<ProviderTestResult>(`/api/ai/providers/${provider}/test`, {
    method: "POST",
  });
}
