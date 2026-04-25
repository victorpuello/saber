const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000";
export { API_BASE };
const API_TIMEOUT_MS = Number(import.meta.env.VITE_API_TIMEOUT_MS ?? 10_000);
const API_AI_GENERATE_TIMEOUT_MS = Number(import.meta.env.VITE_API_AI_GENERATE_TIMEOUT_MS ?? 60_000);

function getRequestTimeoutMs(path: string): number {
  if (path.startsWith("/api/ai/generate")) {
    return API_AI_GENERATE_TIMEOUT_MS;
  }
  return API_TIMEOUT_MS;
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  user: { id: number; name: string; role: string; grade: string | null };
}

export interface MeResponse {
  id: number;
  kampus_user_id?: number;
  name: string;
  role: string;
  grade: string | null;
  institution_id?: string;
}

type AuthAction = "login" | "refresh" | "me" | "logout" | "generic";

interface ApiErrorBody {
  error?: string;
  code?: string;
}

export class ApiError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status = 0, code?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

export function getApiErrorMessage(error: unknown, fallback = "Ocurrió un error inesperado."): string {
  if (error instanceof ApiError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
}

function mapAuthMessage(action: AuthAction, status: number, fallback: string): string {
  if (action === "login") {
    if (status === 400) return "Debes ingresar usuario y contraseña.";
    if (status === 401) return "Credenciales inválidas. Verifica tus datos e intenta nuevamente.";
    if (status === 502) return "Kampus no está disponible en este momento. Intenta en unos minutos.";
    if (status === 504) return "Kampus tardó demasiado en responder. Intenta nuevamente.";
  }

  if (action === "refresh" || action === "me") {
    if (status === 401) return "Tu sesión expiró. Inicia sesión nuevamente.";
  }

  return fallback;
}

async function parseErrorBody(response: Response): Promise<ApiErrorBody> {
  try {
    const json = await response.json();
    // FastAPI devuelve { detail: string | Array } en lugar de { error: string }
    if (!json.error && json.detail) {
      const detail = json.detail;
      if (typeof detail === "string") {
        json.error = detail;
      } else if (Array.isArray(detail) && detail.length > 0) {
        json.error = detail.map((d: { msg?: string }) => d.msg || "").filter(Boolean).join("; ");
      }
    }
    return json as ApiErrorBody;
  } catch {
    return {};
  }
}

async function apiRequest<T>(
  path: string,
  init: RequestInit = {},
  action: AuthAction = "generic",
): Promise<T> {
  const controller = new AbortController();
  const timeoutMs = getRequestTimeoutMs(path);
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const headers = new Headers(init.headers);
    if (!headers.has("Accept")) {
      headers.set("Accept", "application/json");
    }

    const hasBody = init.body !== undefined && init.body !== null;
    const isFormDataBody = typeof FormData !== "undefined" && init.body instanceof FormData;
    if (hasBody && !isFormDataBody && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }

    const response = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers,
      signal: controller.signal,
    });

    if (!response.ok) {
      const body = await parseErrorBody(response);
      const fallbackMessage = body.error || "No se pudo completar la solicitud.";
      const mappedMessage = mapAuthMessage(action, response.status, fallbackMessage);
      throw new ApiError(mappedMessage, response.status, body.code);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    const text = await response.text();
    if (!text) {
      return undefined as T;
    }

    return JSON.parse(text) as T;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    if (error instanceof DOMException && error.name === "AbortError") {
      throw new ApiError("Tiempo de espera agotado. Intenta nuevamente.", 0, "TIMEOUT");
    }

    if (error instanceof TypeError) {
      throw new ApiError("No se pudo conectar con el servidor. Revisa tu conexión.", 0, "NETWORK_ERROR");
    }

    throw new ApiError("Ocurrió un error inesperado. Intenta nuevamente.", 0, "UNKNOWN_ERROR");
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function login(username: string, password: string): Promise<LoginResponse> {
  return apiRequest<LoginResponse>(
    "/api/auth/login",
    {
      method: "POST",
      body: JSON.stringify({ username, password }),
    },
    "login",
  );
}

export async function refreshToken(refresh_token: string): Promise<LoginResponse> {
  return apiRequest<LoginResponse>(
    "/api/auth/refresh",
    {
      method: "POST",
      body: JSON.stringify({ refresh_token }),
    },
    "refresh",
  );
}

export async function fetchMe(accessToken: string): Promise<MeResponse> {
  return apiRequest<MeResponse>(
    "/api/auth/me",
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
    "me",
  );
}

export async function logout(accessToken: string, refreshToken?: string): Promise<void> {
  await apiRequest<{ message: string }>(
    "/api/auth/logout",
    {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
      body: refreshToken ? JSON.stringify({ refresh_token: refreshToken }) : undefined,
    },
    "logout",
  );
}

export async function apiFetchWithAuth<T>(path: string, accessToken: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${accessToken}`);

  return apiRequest<T>(
    path,
    {
      ...init,
      headers,
    },
    "generic",
  );
}
