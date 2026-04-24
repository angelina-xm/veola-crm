/**
 * Защищённые запросы: заголовок Authorization всегда из localStorage.getItem("access").
 * Refresh и очистка сессии — в @/src/lib/auth
 */

import { Deal, DealsByStage, PipelineStage } from "@/src/types";
import {
  authPaths,
  getApiBaseUrl,
  getFreshAccessToken,
  prepareRequestAccess,
  AuthError,
  logout,
} from "@/src/lib/auth";

export { AuthError } from "@/src/lib/auth";

/**
 * Authorization: Bearer <значение из localStorage "access">
 * X-Company-ID — если передан companyId
 * При 401: refresh → снова читаем "access" из localStorage → повтор запроса
 */
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

  let response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers,
  });

  if (path === authPaths.TOKEN_OBTAIN || path === authPaths.TOKEN_REFRESH) {
    return response;
  }

  if (response.status !== 401) {
    return response;
  }

  await getFreshAccessToken();

  const retryHeaders = new Headers(init.headers ?? {});
  const accessAfterRefresh = localStorage.getItem("access");
  if (!accessAfterRefresh) {
    logout("session_expired");
    throw new AuthError("Session expired", "session_expired");
  }
  retryHeaders.set("Authorization", `Bearer ${accessAfterRefresh}`);
  if (companyId !== undefined) {
    retryHeaders.set("X-Company-ID", companyId.toString());
  }

  response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: retryHeaders,
  });

  if (response.status === 401) {
    logout("session_expired");
    throw new AuthError("Session expired", "session_expired");
  }

  return response;
}

export async function getDeals(companyId: number) {
  const res = await fetchWithAuth("/deals/", {}, companyId);

  if (!res.ok) {
    throw new Error(`Failed to fetch deals: ${res.statusText}`);
  }

  return res.json();
}

export async function getPipelineStages(companyId: number) {
  const res = await fetchWithAuth("/pipeline-stages/", {}, companyId);

  if (!res.ok) {
    throw new Error(`Failed to fetch stages: ${res.statusText}`);
  }

  return res.json();
}

export async function updateDealStage(
  companyId: number,
  dealId: string | number,
  stageId: string | number
) {
  const normalizedStageId =
    typeof stageId === "string" && /^\d+$/.test(stageId)
      ? Number(stageId)
      : stageId;

  const res = await fetchWithAuth(
    `/deals/${dealId}/`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        stage: normalizedStageId,
      }),
    },
    companyId
  );

  if (!res.ok) {
    let errorMessage = `Failed to update deal: ${res.statusText}`;
    try {
      const errorData = await res.json();
      if (errorData?.detail) {
        errorMessage = String(errorData.detail);
      } else if (typeof errorData === "object" && errorData !== null) {
        errorMessage = JSON.stringify(errorData);
      }
    } catch {
      // ignore json parse errors
    }
    throw new Error(errorMessage);
  }

  return res.json();
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
