/**
 * Авторизация: только ключи localStorage "access" и "refresh".
 * Не импортирует api.ts.
 */

/**
 * Значение по умолчанию, если NEXT_PUBLIC_API_URL не задан.
 * Один и тот же URL и для `next dev`, и для production — чтобы без .env фронт не стучался в localhost.
 * Для API на этой машине задайте в .env.local: NEXT_PUBLIC_API_URL=http://127.0.0.1:8000/api
 */
const DEFAULT_API_BASE_URL = "https://veola-crm.onrender.com/api";

const LS_ACCESS = "access";
const LS_REFRESH = "refresh";

const TOKEN_OBTAIN_PATH = "/token/";
const TOKEN_REFRESH_PATH = "/token/refresh/";
const REGISTER_PATH = "/users/register/";
const LOGIN_PATH = "/login";

const ACCESS_EXPIRY_REFRESH_LEEWAY_SECONDS = 60;

function isBrowser() {
  return typeof window !== "undefined";
}

function normalizeApiBaseUrl(raw: string): string {
  return raw.trim().replace(/\/+$/, "");
}

/**
 * Базовый URL API для всех запросов (auth и fetchWithAuth).
 * Приоритет: NEXT_PUBLIC_API_URL → иначе production API на Render (см. DEFAULT_API_BASE_URL).
 */
export function getApiBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_API_URL;
  if (typeof raw === "string" && raw.trim().length > 0) {
    return normalizeApiBaseUrl(raw);
  }
  return DEFAULT_API_BASE_URL;
}

/** Подсказка для сообщений об ошибке сети. */
export function getApiUrlTroubleshootHint(): string {
  return "Проверьте NEXT_PUBLIC_API_URL, CORS на бэкенде и что API доступен. Для Django на localhost укажите в .env.local: NEXT_PUBLIC_API_URL=http://127.0.0.1:8000/api (см. frontend/.env.example).";
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
    network_unreachable:
      "Нет связи с сервером API. Проверьте, что backend запущен и адрес NEXT_PUBLIC_API_URL верный.",
  };

  return map[reason] || "Требуется повторный вход.";
}

function apiNetworkErrorMessage(): string {
  const base = getApiBaseUrl();
  return `Не удалось связаться с сервером (${base}). ${getApiUrlTroubleshootHint()}`;
}

function isLikelyNetworkFailure(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  return (
    err.name === "TypeError" ||
    err.message.toLowerCase().includes("failed to fetch") ||
    err.message.toLowerCase().includes("networkerror") ||
    err.message.toLowerCase().includes("load failed")
  );
}

function parseApiValidationBody(data: unknown): string | null {
  if (!data || typeof data !== "object") return null;
  const parts: string[] = [];
  for (const [key, val] of Object.entries(data)) {
    if (val === undefined) continue;
    if (typeof val === "string") parts.push(`${key}: ${val}`);
    else if (Array.isArray(val))
      parts.push(`${key}: ${val.map(String).join("; ")}`);
    else if (typeof val === "object" && val !== null && "detail" in val)
      parts.push(`${key}: ${String((val as { detail: unknown }).detail)}`);
    else parts.push(`${key}: ${JSON.stringify(val)}`);
  }
  return parts.length > 0 ? parts.join(" ") : null;
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
    const accessStill = localStorage.getItem(LS_ACCESS);
    /** Refresh не удался (часто сеть), но access ещё живой — отправляем запрос с текущим токеном. */
    if (accessStill && !isAccessTokenExpired(accessStill)) {
      return;
    }
    throw new AuthError(
      "Не удалось обновить сессию или токен истёк.",
      "refresh_failed"
    );
  }
}

/**
 * POST /api/token/
 * Тело: { username, password }
 * Ответ: { access, refresh } → localStorage "access" / "refresh"
 */
export async function login(username: string, password: string) {
  const apiBase = getApiBaseUrl();
  let response: Response;
  try {
    response = await fetch(`${apiBase}${TOKEN_OBTAIN_PATH}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
  } catch (err) {
    if (isLikelyNetworkFailure(err)) {
      throw new Error(apiNetworkErrorMessage());
    }
    throw err;
  }

  if (!response.ok) {
    let msg = "Неверный логин или пароль.";
    try {
      const raw: unknown = await response.json();
      const parsed = parseApiValidationBody(raw);
      if (parsed) msg = parsed;
      else if (
        raw &&
        typeof raw === "object" &&
        "detail" in raw &&
        typeof (raw as { detail: unknown }).detail === "string"
      ) {
        msg = (raw as { detail: string }).detail;
      }
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }

  let data: { access?: string; refresh?: string };
  try {
    data = (await response.json()) as {
      access?: string;
      refresh?: string;
    };
  } catch {
    throw new Error("Некорректный ответ сервера при входе.");
  }

  const access = data.access;
  const refresh = data.refresh;

  if (!access || !refresh) {
    throw new Error("В ответе нет токенов доступа.");
  }

  if (!isBrowser()) return;
  localStorage.setItem(LS_ACCESS, access);
  localStorage.setItem(LS_REFRESH, refresh);
}

export type RegisterPayload = {
  email: string;
  username: string;
  password: string;
  company_name: string;
};

/**
 * POST /api/users/register/
 * Django: RegisterSerializer → пользователь + компания + membership owner.
 */
export async function register(payload: RegisterPayload): Promise<void> {
  const apiBase = getApiBaseUrl();
  let response: Response;
  try {
    response = await fetch(`${apiBase}${REGISTER_PATH}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    if (isLikelyNetworkFailure(err)) {
      throw new Error(apiNetworkErrorMessage());
    }
    throw err;
  }

  if (!response.ok) {
    let msg = `Ошибка регистрации (${response.status})`;
    try {
      const raw: unknown = await response.json();
      const parsed = parseApiValidationBody(raw);
      if (parsed) msg = parsed;
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }
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

/** JWT уже недействителен по полю exp (локальное время клиента). */
function isAccessTokenExpired(token: string): boolean {
  const payload = parseJwtPayload(token);
  const exp = typeof payload?.exp === "number" ? payload.exp : null;
  if (!exp) return false;
  const nowSeconds = Math.floor(Date.now() / 1000);
  return exp <= nowSeconds;
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

  const apiBase = getApiBaseUrl();
  let response: Response;
  try {
    response = await fetch(`${apiBase}${TOKEN_REFRESH_PATH}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh: storedRefresh }),
    });
  } catch {
    /** Сеть / CORS / DNS — не очищаем токены, чтобы можно было повторить после восстановления связи. */
    return null;
  }

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
