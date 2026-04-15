import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import {
  apiFetchWithAuth,
  fetchMe,
  getApiErrorMessage,
  isApiError,
  login as apiLogin,
  logout as apiLogout,
  refreshToken as apiRefreshToken,
  type LoginResponse,
  type MeResponse,
} from "../services/api";

interface User {
  id: number;
  name: string;
  role: string;
  grade: string | null;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  loading: boolean;
  authReady: boolean;
  error: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  clearError: () => void;
  authFetch: <T = unknown>(path: string, init?: RequestInit) => Promise<T>;
}

const AuthContext = createContext<AuthState | null>(null);

const STORAGE_KEY = "saber11_auth";
export const SESSION_NOTICE_KEY = "saber11_session_notice";

interface StoredAuthData {
  accessToken: string;
  refreshToken: string;
  user: User;
}

function isStoredAuthData(value: unknown): value is StoredAuthData {
  if (!value || typeof value !== "object") {
    return false;
  }

  const data = value as Record<string, unknown>;

  return (
    typeof data.accessToken === "string" &&
    typeof data.refreshToken === "string" &&
    !!data.user &&
    typeof data.user === "object"
  );
}

function loadStored(): StoredAuthData | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as unknown;
    return isStoredAuthData(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function saveStored(data: LoginResponse) {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ accessToken: data.access_token, refreshToken: data.refresh_token, user: data.user }),
  );
}

function saveStoredRaw(data: StoredAuthData) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function clearStored() {
  localStorage.removeItem(STORAGE_KEY);
}

function mapMeToUser(data: MeResponse): User {
  return {
    id: data.id,
    name: data.name,
    role: data.role,
    grade: data.grade,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const initialStored = useMemo(() => loadStored(), []);
  const [user, setUser] = useState<User | null>(initialStored?.user ?? null);
  const [accessToken, setAccessToken] = useState<string | null>(initialStored?.accessToken ?? null);
  const [refreshToken, setRefreshToken] = useState<string | null>(initialStored?.refreshToken ?? null);
  const [loading, setLoading] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const tokensRef = useRef<{ accessToken: string | null; refreshToken: string | null }>({
    accessToken: initialStored?.accessToken ?? null,
    refreshToken: initialStored?.refreshToken ?? null,
  });
  const refreshPromiseRef = useRef<Promise<LoginResponse> | null>(null);

  useEffect(() => {
    tokensRef.current = { accessToken, refreshToken };
  }, [accessToken, refreshToken]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const applySession = useCallback((data: LoginResponse) => {
    setUser(data.user);
    setAccessToken(data.access_token);
    setRefreshToken(data.refresh_token);
    saveStored(data);
  }, []);

  const destroySession = useCallback((notice?: string) => {
    setUser(null);
    setAccessToken(null);
    setRefreshToken(null);
    setError(null);
    clearStored();

    if (notice) {
      sessionStorage.setItem(SESSION_NOTICE_KEY, notice);
    }
  }, []);

  const renewSession = useCallback(async () => {
    const currentRefreshToken = tokensRef.current.refreshToken;
    if (!currentRefreshToken) {
      throw new Error("No hay refresh token disponible.");
    }

    if (refreshPromiseRef.current) {
      return refreshPromiseRef.current;
    }

    const refreshPromise = apiRefreshToken(currentRefreshToken)
      .then((data) => {
        applySession(data);
        return data;
      })
      .finally(() => {
        refreshPromiseRef.current = null;
      });

    refreshPromiseRef.current = refreshPromise;
    return refreshPromise;
  }, [applySession]);

  const login = useCallback(async (username: string, password: string) => {
    setLoading(true);
    setError(null);

    try {
      const data = await apiLogin(username, password);
      applySession(data);
    } catch (err) {
      const message = getApiErrorMessage(err, "No se pudo iniciar sesión.");
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [applySession]);

  const logout = useCallback(() => {
    const currentAccessToken = tokensRef.current.accessToken;
    const currentRefreshToken = tokensRef.current.refreshToken;

    if (currentAccessToken) {
      apiLogout(currentAccessToken, currentRefreshToken ?? undefined).catch(() => undefined);
    }

    destroySession();
  }, [destroySession]);

  const authFetch = useCallback(
    async <T,>(path: string, init?: RequestInit): Promise<T> => {
      const currentAccessToken = tokensRef.current.accessToken;
      if (!currentAccessToken) {
        throw new Error("Sesión no iniciada.");
      }

      try {
        return await apiFetchWithAuth<T>(path, currentAccessToken, init);
      } catch (err) {
        if (!isApiError(err) || err.status !== 401) {
          throw err;
        }

        try {
          const refreshed = await renewSession();
          return await apiFetchWithAuth<T>(path, refreshed.access_token, init);
        } catch (refreshError) {
          destroySession("Tu sesión expiró. Inicia sesión nuevamente.");
          throw refreshError;
        }
      }
    },
    [destroySession, renewSession],
  );

  useEffect(() => {
    let active = true;

    async function bootstrapAuth() {
      const stored = loadStored();

      if (!stored?.accessToken || !stored?.refreshToken) {
        if (active) {
          clearStored();
          setAuthReady(true);
        }
        return;
      }

      try {
        const me = await fetchMe(stored.accessToken);
        if (!active) return;

        const nextUser = mapMeToUser(me);
        setUser(nextUser);
        setAccessToken(stored.accessToken);
        setRefreshToken(stored.refreshToken);
        saveStoredRaw({
          accessToken: stored.accessToken,
          refreshToken: stored.refreshToken,
          user: nextUser,
        });
      } catch (err) {
        if (isApiError(err) && err.status === 401) {
          try {
            const refreshed = await apiRefreshToken(stored.refreshToken);
            if (!active) return;

            const me = await fetchMe(refreshed.access_token);
            if (!active) return;

            applySession({ ...refreshed, user: mapMeToUser(me) });
          } catch {
            if (active) {
              destroySession();
            }
          }
        } else if (active) {
          destroySession();
        }
      } finally {
        if (active) {
          setAuthReady(true);
        }
      }
    }

    bootstrapAuth();

    return () => {
      active = false;
    };
  }, [applySession, destroySession]);

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken,
        refreshToken,
        loading,
        authReady,
        error,
        login,
        logout,
        clearError,
        authFetch,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  return ctx;
}
