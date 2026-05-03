/**
 * Защищённые запросы: заголовок Authorization всегда из localStorage.getItem("access").
 * Refresh и очистка сессии — в @/src/lib/auth
 */

import {
  Activity,
  ActivityType,
  Client,
  Deal,
  DealsByStage,
  PipelineStage,
  StaleDeal,
} from "@/src/types";
import {
  authPaths,
  getApiBaseUrl,
  getApiUrlTroubleshootHint,
  getFreshAccessToken,
  getStoredCompanyId,
  prepareRequestAccess,
  AuthError,
  logout,
} from "@/src/lib/auth";

export { AuthError } from "@/src/lib/auth";

async function parseErrorBody(res: Response): Promise<string> {
  let message = `Request failed: ${res.statusText}`;
  try {
    const errorData: unknown = await res.json();
    if (
      errorData &&
      typeof errorData === "object" &&
      "detail" in errorData &&
      errorData.detail !== undefined
    ) {
      message = String((errorData as { detail: unknown }).detail);
    } else if (typeof errorData === "object" && errorData !== null) {
      message = JSON.stringify(errorData);
    }
  } catch {
    // ignore JSON parse errors
  }
  return message;
}

type ListResponse<T> = T[] | { results: T[] };

export function normalizeApiList<T>(payload: ListResponse<T>): T[] {
  return Array.isArray(payload) ? payload : payload.results;
}

/**
 * Authorization: Bearer <значение из localStorage "access">
 * X-Company-ID — из аргумента companyId или из localStorage (companyId) после логина
 * При 401: refresh → снова читаем "access" из localStorage → повтор запроса
 */
function networkAuthError(): AuthError {
  const base = getApiBaseUrl();
  return new AuthError(
    `Не удалось связаться с API (${base}). ${getApiUrlTroubleshootHint()}`,
    "network_unreachable"
  );
}

export async function fetchWithAuth(
  path: string,
  init: RequestInit = {},
  companyId?: number
) {
  await prepareRequestAccess();

  const baseUrl = getApiBaseUrl();
  const headers = new Headers(init.headers ?? {});

  const access = localStorage.getItem("access");
  if (!access) {
    logout("missing_access_token");
    throw new AuthError("No access token", "missing_access_token");
  }
  headers.set("Authorization", `Bearer ${access}`);
  const resolvedCompanyId =
    companyId !== undefined && Number.isFinite(companyId)
      ? companyId
      : getStoredCompanyId();
  if (resolvedCompanyId != null) {
    headers.set("X-Company-ID", String(resolvedCompanyId));
  }

  let response: Response;
  try {
    response = await fetch(`${baseUrl}${path}`, {
      ...init,
      headers,
    });
  } catch {
    throw networkAuthError();
  }

  if (path === authPaths.TOKEN_OBTAIN || path === authPaths.TOKEN_REFRESH) {
    return response;
  }

  if (response.status !== 401) {
    return response;
  }

  const accessBeforeRefresh = localStorage.getItem("access");

  await getFreshAccessToken();

  const accessAfterRefresh = localStorage.getItem("access");
  if (!accessAfterRefresh) {
    logout("session_expired");
    throw new AuthError("Session expired", "session_expired");
  }

  /** Refresh не изменил access — обычно обрыв сети при POST /token/refresh/ */
  if (accessBeforeRefresh !== null && accessAfterRefresh === accessBeforeRefresh) {
    throw new AuthError(
      "Сессия не обновлена: нет связи с сервером авторизации или refresh отклонён. Проверьте, что API доступен по адресу из NEXT_PUBLIC_API_URL.",
      "network_unreachable"
    );
  }

  const retryHeaders = new Headers(init.headers ?? {});
  retryHeaders.set("Authorization", `Bearer ${accessAfterRefresh}`);
  const resolvedRetry =
    companyId !== undefined && Number.isFinite(companyId)
      ? companyId
      : getStoredCompanyId();
  if (resolvedRetry != null) {
    retryHeaders.set("X-Company-ID", String(resolvedRetry));
  }

  try {
    response = await fetch(`${baseUrl}${path}`, {
      ...init,
      headers: retryHeaders,
    });
  } catch {
    throw networkAuthError();
  }

  if (response.status === 401) {
    logout("session_expired");
    throw new AuthError("Session expired", "session_expired");
  }

  return response;
}

export async function getDeals(companyId: number) {
  const res = await fetchWithAuth("/deals/", {}, companyId);

  if (!res.ok) {
    throw new Error(await parseErrorBody(res));
  }

  return res.json();
}

export async function getStaleDeals(companyId: number): Promise<StaleDeal[]> {
  const res = await fetchWithAuth("/deals/stale/", {}, companyId);
  if (!res.ok) {
    throw new Error(await parseErrorBody(res));
  }
  const data: unknown = await res.json();
  const list = normalizeApiList(
    data as ListResponse<{
      id: string | number;
      title: string;
      amount: string | number;
      client: number;
      client_name?: string;
      stage: number | null;
      created_at: string;
      last_activity: string | null;
    }>
  );
  return list.map((row) => ({
    ...row,
    id: String(row.id),
  }));
}

export async function getPipelineStages(companyId: number) {
  const res = await fetchWithAuth("/pipeline-stages/", {}, companyId);

  if (!res.ok) {
    throw new Error(await parseErrorBody(res));
  }

  return res.json();
}

export async function getClients(companyId: number): Promise<Client[]> {
  const res = await fetchWithAuth("/clients/", {}, companyId);
  if (!res.ok) {
    throw new Error(await parseErrorBody(res));
  }
  const data: unknown = await res.json();
  const list = normalizeApiList(data as ListResponse<Client>);
  return list.map((c) => ({
    ...c,
    id: String(c.id),
  }));
}

export type CreateClientPayload = {
  name: string;
  email?: string;
};

export async function createClient(
  companyId: number,
  payload: CreateClientPayload
): Promise<Client> {
  const res = await fetchWithAuth(
    "/clients/",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
    companyId
  );
  if (!res.ok) {
    throw new Error(await parseErrorBody(res));
  }
  const raw = (await res.json()) as Client;
  return {
    ...raw,
    id: String(raw.id),
  };
}

export async function deleteClient(
  companyId: number,
  id: string | number
): Promise<void> {
  const res = await fetchWithAuth(
    `/clients/${id}/`,
    { method: "DELETE" },
    companyId
  );
  if (!res.ok && res.status !== 204) {
    throw new Error(await parseErrorBody(res));
  }
}

function normalizeActivityRow(raw: {
  id: string | number;
  deal: string | number;
  author: string | number;
  author_email?: string | null;
  type: ActivityType;
  content?: string | null;
  due_date?: string | null;
  is_completed?: boolean;
  created_at: string;
}): Activity {
  return {
    id: String(raw.id),
    deal: raw.deal,
    author: raw.author,
    author_email: raw.author_email,
    type: raw.type,
    content: raw.content,
    due_date: raw.due_date,
    is_completed: Boolean(raw.is_completed),
    created_at: raw.created_at,
  };
}

export async function getActivities(
  companyId: number,
  dealId: string | number
): Promise<Activity[]> {
  const q = new URLSearchParams({ deal_id: String(dealId) });
  const res = await fetchWithAuth(`/activities/?${q.toString()}`, {}, companyId);
  if (!res.ok) {
    throw new Error(await parseErrorBody(res));
  }
  const data: unknown = await res.json();
  const list = normalizeApiList(
    data as ListResponse<{
      id: string | number;
      deal: string | number;
      author: string | number;
      author_email?: string | null;
      type: ActivityType;
      content?: string | null;
      due_date?: string | null;
      is_completed?: boolean;
      created_at: string;
    }>
  );
  return list.map((row) => normalizeActivityRow(row));
}

export type CreateActivityPayload = {
  deal: number;
  type: ActivityType;
  content?: string;
  due_date?: string | null;
};

export async function createActivity(
  companyId: number,
  payload: CreateActivityPayload
): Promise<Activity> {
  const body: Record<string, unknown> = {
    deal: payload.deal,
    type: payload.type,
  };
  if (payload.content !== undefined && payload.content !== "") {
    body.content = payload.content;
  }
  if (payload.due_date) {
    body.due_date = payload.due_date;
  }
  const res = await fetchWithAuth(
    "/activities/",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
    companyId
  );
  if (!res.ok) {
    throw new Error(await parseErrorBody(res));
  }
  const raw = (await res.json()) as {
    id: string | number;
    deal: string | number;
    author: string | number;
    author_email?: string | null;
    type: ActivityType;
    content?: string | null;
    due_date?: string | null;
    is_completed?: boolean;
    created_at: string;
  };
  return normalizeActivityRow(raw);
}

export type PatchActivityPayload = {
  is_completed?: boolean;
};

export async function patchActivity(
  companyId: number,
  activityId: string | number,
  body: PatchActivityPayload
): Promise<Activity> {
  const res = await fetchWithAuth(
    `/activities/${activityId}/`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
    companyId
  );
  if (!res.ok) {
    throw new Error(await parseErrorBody(res));
  }
  const raw = (await res.json()) as {
    id: string | number;
    deal: string | number;
    author: string | number;
    author_email?: string | null;
    type: ActivityType;
    content?: string | null;
    due_date?: string | null;
    is_completed?: boolean;
    created_at: string;
  };
  return normalizeActivityRow(raw);
}

export type CreateDealPayload = {
  title: string;
  amount: number;
  stage: number;
  client: number;
};

export async function createDeal(
  companyId: number,
  payload: CreateDealPayload
): Promise<unknown> {
  const res = await fetchWithAuth(
    "/deals/",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
    companyId
  );
  if (!res.ok) {
    throw new Error(await parseErrorBody(res));
  }
  return res.json();
}

export type PatchDealPayload = {
  title?: string;
  amount?: number;
  stage?: number;
};

export async function patchDeal(
  companyId: number,
  dealId: string | number,
  body: PatchDealPayload
): Promise<unknown> {
  const res = await fetchWithAuth(
    `/deals/${dealId}/`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
    companyId
  );
  if (!res.ok) {
    throw new Error(await parseErrorBody(res));
  }
  return res.json();
}

export async function deleteDeal(
  companyId: number,
  dealId: string | number
): Promise<void> {
  const res = await fetchWithAuth(
    `/deals/${dealId}/`,
    { method: "DELETE" },
    companyId
  );
  if (!res.ok && res.status !== 204) {
    throw new Error(await parseErrorBody(res));
  }
}

export async function updateDealStage(
  companyId: number,
  dealId: string | number,
  stageId: string | number
) {
  const stageNum =
    typeof stageId === "number"
      ? stageId
      : Number.parseInt(String(stageId), 10);
  if (!Number.isFinite(stageNum)) {
    throw new Error("Invalid stage id");
  }
  return patchDeal(companyId, dealId, { stage: stageNum });
}

export function groupDealsByStage(deals: Deal[], stages: PipelineStage[]) {
  const grouped: DealsByStage = {};

  stages.forEach((stage) => {
    grouped[String(stage.id)] = [];
  });

  deals.forEach((deal) => {
    const stageId = String(deal.stage || deal.stageId);
    if (grouped[stageId]) {
      grouped[stageId].push({
        ...deal,
        stageId,
      });
    }
  });

  return grouped;
}
