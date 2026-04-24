/**
 * Авторизация: только ключи localStorage "access" и "refresh".
 * Не импортирует api.ts.
 */

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000/api";

const LS_ACCESS = "access";
const LS_REFRESH = "refresh";

const TOKEN_OBTAIN_PATH = "/token/";
const TOKEN_REFRESH_PATH = "/token/refresh/";
const LOGIN_PATH = "/login";

const ACCESS_EXPIRY_REFRESH_LEEWAY_SECONDS = 60;

function isBrowser() {
  return typeof window !== "undefined";
}

export function getApiBaseUrl() {
  return API_BASE_URL;
}

export const authPaths = {
  TOKEN_OBTAIN: TOKEN_OBTAIN_PATH,
  TOKEN_REFRESH: TOKEN_REFRESH_PATH,
} as const;

export function getAccessToken(): string | null {
  if (!isBrowser()) return null;
  return localStorage.getItem(LS_ACCESS);
}

export function getRefreshToken(): string | null {
  if (!isBrowser()) return null;
  return localStorage.getItem(LS_REFRESH);
}

export function clearAuthTokens() {
  if (!isBrowser()) return;
  localStorage.removeItem(LS_ACCESS);
  localStorage.removeItem(LS_REFRESH);
}

export function hasAuthSession() {
  return Boolean(getAccessToken() && getRefreshToken());
}

export class AuthError extends Error {
  reason: string;

  constructor(message: string, reason: string = "session_expired") {
    super(message);
    this.name = "AuthError";
    this.reason = reason;
  }
}

export function getLoginReasonMessage(reason: string | null) {
  if (!reason) return null;

  const map: Record<string, string> = {
    session_expired: "Сессия истекла. Войдите снова.",
    refresh_failed: "Не удалось обновить сессию. Войдите снова.",
    missing_tokens: "Нужна авторизация для доступа.",
    missing_access_token: "Нужна авторизация для доступа.",
    missing_refresh_token: "Нужна авторизация для доступа.",
    manual_logout: "Вы вышли из системы.",
  };

  return map[reason] || "Требуется повторный вход.";
}

function redirectToLogin(reason: string = "session_expired") {
  clearAuthTokens();
  if (isBrowser()) {
    window.location.href = `${LOGIN_PATH}?reason=${encodeURIComponent(reason)}`;
  }
}

/** Перед запросом: нет access → редирект; скоро истечёт → refresh (пишет новый access в LS). */
export async function prepareRequestAccess(): Promise<void> {
  if (!isBrowser()) {
    throw new AuthError("Auth is client-only", "missing_access_token");
  }

  const access = localStorage.getItem(LS_ACCESS);
  if (!access) {
    redirectToLogin("missing_access_token");
    throw new AuthError("No access token", "missing_access_token");
  }

  if (!isTokenExpiringSoon(access)) {
    return;
  }

  const updated = await getFreshAccessToken();
  if (!updated) {
    throw new AuthError("Session expired", "session_expired");
  }
}

/**
 * POST /api/token/
 * Тело: { username, password }
 * Ответ: { access, refresh } → localStorage "access" / "refresh"
 */
export async function login(username: string, password: string) {
  const response = await fetch(`${API_BASE_URL}${TOKEN_OBTAIN_PATH}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  if (!response.ok) {
    throw new Error("Invalid username or password");
  }

  const data = (await response.json()) as {
    access?: string;
    refresh?: string;
  };

  const access = data.access;
  const refresh = data.refresh;

  if (!access || !refresh) {
    throw new Error("Token pair is missing in login response");
  }

  if (!isBrowser()) return;
  localStorage.setItem(LS_ACCESS, access);
  localStorage.setItem(LS_REFRESH, refresh);
}

export function logout(reason: string = "manual_logout") {
  clearAuthTokens();
  if (isBrowser()) {
    window.location.href = `${LOGIN_PATH}?reason=${encodeURIComponent(reason)}`;
  }
}

let refreshPromise: Promise<string | null> | null = null;

function parseJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
    const json = atob(padded);
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function isTokenExpiringSoon(
  token: string,
  thresholdSeconds: number = ACCESS_EXPIRY_REFRESH_LEEWAY_SECONDS
) {
  const payload = parseJwtPayload(token);
  const exp = typeof payload?.exp === "number" ? payload.exp : null;
  if (!exp) return true;
  const nowSeconds = Math.floor(Date.now() / 1000);
  return exp - nowSeconds <= thresholdSeconds;
}

/**
 * POST /api/token/refresh/
 * При ошибке: очистка localStorage и редирект на /login
 */
export async function refreshAccessToken(): Promise<string | null> {
  if (!isBrowser()) return null;

  const storedRefresh = localStorage.getItem(LS_REFRESH);
  if (!storedRefresh) {
    redirectToLogin("missing_refresh_token");
    return null;
  }

  const response = await fetch(`${API_BASE_URL}${TOKEN_REFRESH_PATH}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh: storedRefresh }),
  });

  if (!response.ok) {
    redirectToLogin("refresh_failed");
    return null;
  }

  const data = (await response.json()) as {
    access?: string;
    refresh?: string;
  };

  const newAccess = data.access;
  const newRefresh = data.refresh;

  if (!newAccess) {
    redirectToLogin("invalid_refresh_payload");
    return null;
  }

  localStorage.setItem(LS_ACCESS, newAccess);
  if (newRefresh) {
    localStorage.setItem(LS_REFRESH, newRefresh);
  }

  return newAccess;
}

export function getFreshAccessToken(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = refreshAccessToken().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}
