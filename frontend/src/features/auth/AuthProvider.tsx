import {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  ApiError,
  NetworkError,
  apiRequest,
  clearLegacyCredentialStorage,
  csrfRequestHeaders,
  getAccessToken,
  refreshAccessToken,
  setAccessToken,
} from "../../services/http";
import {
  ApiKeyCreated,
  ApiKeyList,
  LoginResult,
  Me,
  SessionList,
} from "./types";

export type AuthStatus =
  | "checking"
  | "guest"
  | "authenticated"
  | "restricted"
  | "network_error";

type AuthErrorInfo = {
  code: string;
  message: string;
};

type AuthContextValue = {
  status: AuthStatus;
  me: Me | null;
  error: AuthErrorInfo | null;
  login: (input: {
    email: string;
    password: string;
    remember: boolean;
  }) => Promise<Me>;
  logout: () => Promise<void>;
  logoutAll: () => Promise<void>;
  signOutLocally: () => void;
  refreshMe: () => Promise<Me>;
  updateProfile: (input: {
    display_name?: string | null;
    organization?: string | null;
  }) => Promise<Me>;
  changePassword: (input: {
    current_password: string;
    new_password: string;
    new_password_confirmation: string;
  }) => Promise<void>;
  retry: () => void;
  listSessions: () => Promise<SessionList>;
  revokeSession: (sessionId: string) => Promise<void>;
  listApiKeys: () => Promise<ApiKeyList>;
  createApiKey: (input: {
    name: string;
    current_password: string;
    expires_in_days?: number;
  }) => Promise<ApiKeyCreated>;
  revokeApiKey: (apiKeyId: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const RESTRICTED_CODES = new Set([
  "ACCOUNT_DISABLED",
  "ACCOUNT_LOCKED",
  "EMAIL_NOT_VERIFIED",
  "ACCOUNT_NOT_ACTIVE",
  "ACCOUNT_TYPE_NOT_ALLOWED",
]);

function toErrorInfo(error: unknown): AuthErrorInfo {
  if (error instanceof ApiError) {
    return { code: error.code, message: error.message };
  }
  if (error instanceof NetworkError) {
    return { code: "NETWORK_ERROR", message: error.message };
  }
  return { code: "UNKNOWN_ERROR", message: "unexpected-error" };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("checking");
  const [me, setMe] = useState<Me | null>(null);
  const [error, setError] = useState<AuthErrorInfo | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    clearLegacyCredentialStorage();
    let cancelled = false;
    setStatus("checking");
    setError(null);

    const bootstrap = async () => {
      try {
        const token = await refreshAccessToken();
        if (cancelled) return;
        if (!token) {
          setAccessToken(null);
          setMe(null);
          setStatus("guest");
          return;
        }
        const payload = await apiRequest<Me>("/me");
        if (cancelled) return;
        setMe(payload);
        setStatus("authenticated");
      } catch (caught) {
        if (cancelled) return;
        const info = toErrorInfo(caught);
        if (
          caught instanceof ApiError
          && RESTRICTED_CODES.has(caught.code)
        ) {
          setMe(null);
          setError(info);
          setStatus("restricted");
          return;
        }
        if (caught instanceof NetworkError) {
          setError(info);
          setStatus("network_error");
          return;
        }
        setAccessToken(null);
        setMe(null);
        setStatus("guest");
      }
    };

    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, [reloadToken]);

  const login = useCallback(async (input: {
    email: string;
    password: string;
    remember: boolean;
  }) => {
    const result = await apiRequest<LoginResult>("/auth/login", {
      method: "POST",
      auth: false,
      body: input,
    });
    setAccessToken(result.access_token);
    const payload = await apiRequest<Me>("/me");
    setMe(payload);
    setError(null);
    setStatus("authenticated");
    return payload;
  }, []);

  const logout = useCallback(async () => {
    await apiRequest<void>("/auth/logout", {
      method: "POST",
      headers: csrfRequestHeaders(),
    });
    setAccessToken(null);
    setMe(null);
    setError(null);
    setStatus("guest");
  }, []);

  const logoutAll = useCallback(async () => {
    await apiRequest<void>("/auth/logout-all", {
      method: "POST",
      headers: csrfRequestHeaders(),
    });
    setAccessToken(null);
    setMe(null);
    setError(null);
    setStatus("guest");
  }, []);

  const signOutLocally = useCallback(() => {
    setAccessToken(null);
    setMe(null);
    setError(null);
    setStatus("guest");
  }, []);

  const refreshMe = useCallback(async () => {
    const payload = await apiRequest<Me>("/me");
    setMe(payload);
    return payload;
  }, []);

  const updateProfile = useCallback(async (input: {
    display_name?: string | null;
    organization?: string | null;
  }) => {
    const payload = await apiRequest<Me>("/me", {
      method: "PATCH",
      body: input,
    });
    setMe(payload);
    return payload;
  }, []);

  const changePassword = useCallback(async (input: {
    current_password: string;
    new_password: string;
    new_password_confirmation: string;
  }) => {
    await apiRequest<void>("/auth/password/change", {
      method: "POST",
      body: input,
    });
    setAccessToken(null);
    setMe(null);
    setError(null);
    setStatus("guest");
  }, []);

  const retry = useCallback(() => {
    setReloadToken(value => value + 1);
  }, []);

  const listSessions = useCallback(
    () => apiRequest<SessionList>("/me/sessions"),
    [],
  );

  const revokeSession = useCallback(async (sessionId: string) => {
    await apiRequest<void>(`/me/sessions/${encodeURIComponent(sessionId)}`, {
      method: "DELETE",
    });
  }, []);

  const listApiKeys = useCallback(
    () => apiRequest<ApiKeyList>("/me/api-keys"),
    [],
  );

  const createApiKey = useCallback(async (input: {
    name: string;
    current_password: string;
    expires_in_days?: number;
  }) => apiRequest<ApiKeyCreated>("/me/api-keys", {
    method: "POST",
    body: input,
  }), []);

  const revokeApiKey = useCallback(async (apiKeyId: string) => {
    await apiRequest<void>(`/me/api-keys/${encodeURIComponent(apiKeyId)}`, {
      method: "DELETE",
    });
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    status,
    me,
    error,
    login,
    logout,
    logoutAll,
    signOutLocally,
    refreshMe,
    updateProfile,
    changePassword,
    retry,
    listSessions,
    revokeSession,
    listApiKeys,
    createApiKey,
    revokeApiKey,
  }), [
    status,
    me,
    error,
    login,
    logout,
    logoutAll,
    signOutLocally,
    refreshMe,
    updateProfile,
    changePassword,
    retry,
    listSessions,
    revokeSession,
    listApiKeys,
    createApiKey,
    revokeApiKey,
  ]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
}

export function hasStoredSessionHint(): boolean {
  return getAccessToken() !== null;
}
