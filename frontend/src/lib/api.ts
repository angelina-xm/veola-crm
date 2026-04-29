/**
 * Защищённые запросы: заголовок Authorization всегда из localStorage.getItem("access").
 * Refresh и очистка сессии — в @/src/lib/auth
 */

import { Client, Deal, DealsByStage, PipelineStage } from "@/src/types";
import {
  authPaths,
  getApiBaseUrl,
  getApiUrlTroubleshootHint,
  getFreshAccessToken,
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
 * X-Company-ID — если передан companyId
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
  if (companyId !== undefined) {
    headers.set("X-Company-ID", companyId.toString());
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
  if (companyId !== undefined) {
    retryHeaders.set("X-Company-ID", companyId.toString());
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
