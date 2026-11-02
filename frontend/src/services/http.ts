import { API_BASE_URL } from "../api/config";

export type ApiFieldError = {
  field: string;
  code: string;
  message: string;
};

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public fields: ApiFieldError[] = [],
    public requestId: string | null = null,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export class NetworkError extends Error {
  constructor(message = "network-unavailable") {
    super(message);
    this.name = "NetworkError";
  }
}

type TokenListener = (token: string | null) => void;

let accessToken: string | null = null;
let refreshPromise: Promise<string | null> | null = null;
const tokenListeners = new Set<TokenListener>();

export function getAccessToken(): string | null {
  return accessToken;
}

export function setAccessToken(token: string | null): void {
  accessToken = token;
  tokenListeners.forEach(listener => listener(token));
}

export function subscribeAccessToken(listener: TokenListener): () => void {
  tokenListeners.add(listener);
  return () => tokenListeners.delete(listener);
}

export function readCookie(name: string): string | null {
  const prefix = `${name}=`;
  for (const part of document.cookie.split(";")) {
    const trimmed = part.trim();
    if (trimmed.startsWith(prefix)) {
      return decodeURIComponent(trimmed.slice(prefix.length));
    }
  }
  return null;
}

export function readCsrfToken(): string | null {
  for (const part of document.cookie.split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (name.startsWith("molscience_csrf_")) {
      return decodeURIComponent(rest.join("="));
    }
  }
  return null;
}

export function clearLegacyCredentialStorage(): void {
  for (const storage of [window.localStorage, window.sessionStorage]) {
    const keys: string[] = [];
    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index);
      if (key) keys.push(key);
    }
    for (const key of keys) {
      if (
        key === "molscience-access-token"
        || key === "molscience-current-user"
        || key.startsWith("molscience-refresh")
      ) {
        storage.removeItem(key);
      }
    }
  }
}

type RequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  signal?: AbortSignal;
  auth?: boolean;
  retryAuth?: boolean;
  headers?: Record<string, string>;
};

const REFRESHABLE_CODES = new Set([
  "AUTHENTICATION_REQUIRED",
  "TOKEN_INVALID",
  "SESSION_INVALID",
  "SESSION_REVOKED",
  "SESSION_EXPIRED",
]);

async function withRefreshLock<T>(task: () => Promise<T>): Promise<T> {
  const locks = (navigator as Navigator & {
    locks?: { request: (name: string, task: () => Promise<T>) => Promise<T> };
  }).locks;
  if (locks?.request) {
    return locks.request("molscience-session-refresh", task);
  }
  return task();
}

export function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) return refreshPromise;
  refreshPromise = withRefreshLock(async () => {
    const csrf = readCsrfToken();
    let response: Response;
    try {
      response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: "POST",
        credentials: "include",
        headers: {
          Accept: "application/json",
          ...(csrf ? { "X-CSRF-Token": csrf } : {}),
        },
      });
    } catch {
      throw new NetworkError();
    }
    if (!response.ok) {
      const apiError = await parseError(response);
      if (
        apiError.status === 403
        && ![
          "CSRF_TOKEN_MISSING",
          "CSRF_TOKEN_INVALID",
          "ORIGIN_NOT_ALLOWED",
          "REFRESH_TOKEN_MISSING",
        ].includes(apiError.code)
      ) {
        setAccessToken(null);
        throw apiError;
      }
      setAccessToken(null);
      return null;
    }
    const payload = await response.json().catch(() => null) as {
      access_token?: string;
    } | null;
    if (!payload?.access_token) {
      setAccessToken(null);
      return null;
    }
    setAccessToken(payload.access_token);
    return payload.access_token;
  }).finally(() => {
    refreshPromise = null;
  });
  return refreshPromise;
}

async function parseError(response: Response): Promise<ApiError> {
  const payload = await response.json().catch(() => null) as {
    error?: {
      code?: string;
      message?: string;
      fields?: ApiFieldError[];
    };
    request_id?: string;
    detail?: string | { code?: string; message?: string; fields?: ApiFieldError[] };
  } | null;
  const detail = payload?.detail;
  const structured = payload?.error
    || (detail && typeof detail === "object" ? detail : null);
  const message = typeof detail === "string"
    ? detail
    : structured?.message || "The request could not be completed.";
  return new ApiError(
    response.status,
    structured?.code || `HTTP_${response.status}`,
    message,
    structured?.fields || [],
    payload?.request_id || response.headers.get("X-Request-ID"),
  );
}

async function execute<T>(
  path: string,
  options: RequestOptions,
): Promise<T> {
  const headers: Record<string, string> = {
    Accept: "application/json",
    ...options.headers,
  };
  if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
  }
  if (options.auth !== false && accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method: options.method ?? "GET",
      credentials: "include",
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: options.signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw error;
    }
    throw new NetworkError();
  }

  if (response.status === 204) {
    return undefined as T;
  }
  if (response.ok) {
    return await response.json() as T;
  }

  const apiError = await parseError(response);
  if (
    response.status === 401
    && options.retryAuth !== false
    && options.auth !== false
    && accessToken
    && REFRESHABLE_CODES.has(apiError.code)
  ) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      return execute<T>(path, { ...options, retryAuth: false });
    }
  }
  throw apiError;
}

export function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  return execute<T>(path, options);
}

export function csrfRequestHeaders(): Record<string, string> {
  const csrf = readCsrfToken();
  return csrf ? { "X-CSRF-Token": csrf } : {};
}
