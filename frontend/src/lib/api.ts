/**
 * Защищённые запросы: заголовок Authorization всегда из localStorage.getItem("access").
 * Refresh и очистка сессии — в @/src/lib/auth
 */

import type {
  Activity,
  ActivityType,
  AnalyticsFeedKind,
  AnalyticsV1Overview,
  Client,
  CrmTask,
  Deal,
  DealsByStage,
  PipelineStage,
  StaleDeal,
  TaskBucketQuery,
  TaskPriority,
  TaskUiState,
} from "@/src/types";
import {
  authPaths,
  getApiBaseUrl,
  getApiUrlTroubleshootHint,
  getFreshAccessToken,
  resolveCompanyIdForRequest,
  prepareRequestAccess,
  AuthError,
  logout,
} from "@/src/lib/auth";
import type { AutomationSettings } from "@/src/lib/autoTaskRules";
import type { MembershipProfile } from "@/src/lib/roles";
import { memberPermissionsFromMeResponse } from "@/src/lib/roles";

export { AuthError } from "@/src/lib/auth";

export const AUTOMATION_SETTINGS_FALLBACK: AutomationSettings = {
  auto_follow_up: false,
  auto_discount: true,
  auto_reorder: true,
};

function formatApiErrorDetail(detail: unknown): string {
  if (detail == null) return "Unknown error";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((item) => {
        if (typeof item === "string") return item;
        if (item && typeof item === "object") return JSON.stringify(item);
        return String(item);
      })
      .join("; ");
  }
  return JSON.stringify(detail);
}

async function parseErrorBody(res: Response): Promise<string> {
  const statusLine = `HTTP ${res.status} ${res.statusText || ""}`.trim();
  try {
    const errorData: unknown = await res.json();
    if (errorData && typeof errorData === "object") {
      const o = errorData as Record<string, unknown>;
      if ("detail" in o && o.detail !== undefined) {
        return `${statusLine}: ${formatApiErrorDetail(o.detail)}`;
      }
      return `${statusLine}: ${JSON.stringify(o)}`;
    }
    return statusLine;
  } catch {
    return statusLine;
  }
}

type ListResponse<T> = T[] | { results: T[] };

export function normalizeApiList<T>(payload: ListResponse<T>): T[] {
  return Array.isArray(payload) ? payload : payload.results;
}

/**
 * Authorization: Bearer <значение из localStorage "access">
 * X-Company-ID — приоритет localStorage (resolveCompanyIdForRequest), без рассинхрона с UI
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
  const resolvedCompanyId = resolveCompanyIdForRequest(companyId);
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
  const resolvedRetry = resolveCompanyIdForRequest(companyId);
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

export type DealsLayer = "all" | "operational" | "closed";

export async function getDeals(
  companyId: number,
  options?: { layer?: DealsLayer }
) {
  const layer = options?.layer ?? "all";
  const qs = layer !== "all" ? `?layer=${encodeURIComponent(layer)}` : "";
  const res = await fetchWithAuth(`/deals/${qs}`, {}, companyId);

  if (!res.ok) {
    throw new Error(await parseErrorBody(res));
  }

  return res.json();
}

export async function getAutomationSettings(
  companyId: number
): Promise<AutomationSettings> {
  const res = await fetchWithAuth("/settings/", {}, companyId);
  if (!res.ok) {
    throw new Error(await parseErrorBody(res));
  }
  const data = (await res.json()) as Partial<AutomationSettings>;
  return {
    auto_follow_up:
      typeof data.auto_follow_up === "boolean"
        ? data.auto_follow_up
        : AUTOMATION_SETTINGS_FALLBACK.auto_follow_up,
    auto_discount:
      typeof data.auto_discount === "boolean"
        ? data.auto_discount
        : AUTOMATION_SETTINGS_FALLBACK.auto_discount,
    auto_reorder:
      typeof data.auto_reorder === "boolean"
        ? data.auto_reorder
        : AUTOMATION_SETTINGS_FALLBACK.auto_reorder,
  };
}

export async function patchAutomationSettings(
  companyId: number,
  data: Partial<AutomationSettings>
): Promise<AutomationSettings> {
  const res = await fetchWithAuth(
    "/settings/",
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    },
    companyId
  );
  if (!res.ok) {
    throw new Error(await parseErrorBody(res));
  }
  const raw = (await res.json()) as Partial<AutomationSettings>;
  return {
    auto_follow_up:
      typeof raw.auto_follow_up === "boolean"
        ? raw.auto_follow_up
        : AUTOMATION_SETTINGS_FALLBACK.auto_follow_up,
    auto_discount:
      typeof raw.auto_discount === "boolean"
        ? raw.auto_discount
        : AUTOMATION_SETTINGS_FALLBACK.auto_discount,
    auto_reorder:
      typeof raw.auto_reorder === "boolean"
        ? raw.auto_reorder
        : AUTOMATION_SETTINGS_FALLBACK.auto_reorder,
  };
}

export type TeamMemberRole = "owner" | "manager" | "employee";

export type TeamMember = {
  id: number;
  user_id: number;
  email: string;
  username: string;
  role: TeamMemberRole;
  is_active: boolean;
  can_view_all_deals: boolean;
  can_create_deals: boolean;
  can_edit_all_deals: boolean;
  can_delete_deals: boolean;
  can_manage_team: boolean;
  can_manage_automations: boolean;
  can_view_analytics: boolean;
  created_at: string;
};

export type PendingTeamInvite = {
  email: string;
  role: string;
  expires_at: string;
  token: string;
  created_at: string;
};

export type TeamMembersPayload = {
  members: TeamMember[];
  pending_invites: PendingTeamInvite[];
};

function normalizeTeamMember(raw: Record<string, unknown>): TeamMember {
  const role = String(raw.role ?? "").toLowerCase();
  if (role !== "owner" && role !== "manager" && role !== "employee") {
    throw new Error("Invalid team member role");
  }
  return {
    id: Number(raw.id),
    user_id: Number(raw.user_id),
    email: String(raw.email ?? ""),
    username: String(raw.username ?? ""),
    role: role as TeamMemberRole,
    is_active: Boolean(raw.is_active),
    can_view_all_deals: Boolean(raw.can_view_all_deals),
    can_create_deals: Boolean(raw.can_create_deals),
    can_edit_all_deals: Boolean(raw.can_edit_all_deals),
    can_delete_deals: Boolean(raw.can_delete_deals),
    can_manage_team: Boolean(raw.can_manage_team),
    can_manage_automations: Boolean(raw.can_manage_automations),
    can_view_analytics: Boolean(raw.can_view_analytics),
    created_at: String(raw.created_at ?? ""),
  };
}

export async function getTeamMembers(
  companyId: number
): Promise<TeamMembersPayload> {
  const res = await fetchWithAuth("/team/members/", {}, companyId);
  if (!res.ok) {
    throw new Error(await parseErrorBody(res));
  }
  const data = (await res.json()) as Record<string, unknown>;
  const membersRaw = data.members;
  const invitesRaw = data.pending_invites;
  const members: TeamMember[] = [];
  if (Array.isArray(membersRaw)) {
    for (const row of membersRaw) {
      if (row && typeof row === "object") {
        members.push(normalizeTeamMember(row as Record<string, unknown>));
      }
    }
  }
  const pending_invites: PendingTeamInvite[] = [];
  if (Array.isArray(invitesRaw)) {
    for (const row of invitesRaw) {
      if (!row || typeof row !== "object") continue;
      const o = row as Record<string, unknown>;
      pending_invites.push({
        email: String(o.email ?? ""),
        role: String(o.role ?? ""),
        expires_at: String(o.expires_at ?? ""),
        token: String(o.token ?? ""),
        created_at: String(o.created_at ?? ""),
      });
    }
  }
  return { members, pending_invites };
}

export type TeamMemberUpdatePayload = Partial<{
  role: TeamMemberRole;
  is_active: boolean;
  can_view_all_deals: boolean;
  can_create_deals: boolean;
  can_edit_all_deals: boolean;
  can_delete_deals: boolean;
  can_manage_team: boolean;
  can_manage_automations: boolean;
  can_view_analytics: boolean;
}>;

export async function patchTeamMember(
  companyId: number,
  memberId: number,
  payload: TeamMemberUpdatePayload
): Promise<TeamMember> {
  const res = await fetchWithAuth(
    `/team/members/${memberId}/`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
    companyId
  );
  if (!res.ok) {
    throw new Error(await parseErrorBody(res));
  }
  const raw = (await res.json()) as Record<string, unknown>;
  return normalizeTeamMember(raw);
}

export async function deleteTeamMember(
  companyId: number,
  memberId: number
): Promise<void> {
  const res = await fetchWithAuth(
    `/team/members/${memberId}/`,
    { method: "DELETE" },
    companyId
  );
  if (!res.ok) {
    throw new Error(await parseErrorBody(res));
  }
}

export type TeamInvitePayload = {
  email: string;
  role: Exclude<TeamMemberRole, "owner">;
};

export type TeamInviteResult =
  | { status: "attached"; member: TeamMember }
  | {
      status: "invited";
      message: string;
      token: string;
      expires_at: string;
    };

export async function postTeamInvite(
  companyId: number,
  payload: TeamInvitePayload
): Promise<TeamInviteResult> {
  const res = await fetchWithAuth(
    "/team/invite/",
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
  const data = (await res.json()) as Record<string, unknown>;
  const status = String(data.status ?? "");
  if (status === "attached" && data.member && typeof data.member === "object") {
    return {
      status: "attached",
      member: normalizeTeamMember(data.member as Record<string, unknown>),
    };
  }
  if (status === "invited") {
    return {
      status: "invited",
      message: String(data.message ?? ""),
      token: String(data.token ?? ""),
      expires_at: String(data.expires_at ?? ""),
    };
  }
  throw new Error("Unexpected invite response");
}

export async function getCurrentMembership(
  companyId: number
): Promise<MembershipProfile> {
  const res = await fetchWithAuth("/membership/me/", {}, companyId);
  if (!res.ok) {
    throw new Error(await parseErrorBody(res));
  }
  const raw = (await res.json()) as Record<string, unknown>;
  const role = String(raw.role ?? "").toLowerCase();
  if (
    typeof raw.user_id !== "number" ||
    typeof raw.company_id !== "number" ||
    (role !== "owner" && role !== "manager" && role !== "employee")
  ) {
    throw new Error("Invalid membership response");
  }
  const roleNorm = role as MembershipProfile["role"];
  const permissions = memberPermissionsFromMeResponse(raw, roleNorm);
  const companyName =
    typeof raw.company_name === "string" && raw.company_name.trim()
      ? raw.company_name.trim()
      : `Company #${raw.company_id}`;
  const userEmail =
    typeof raw.user_email === "string" ? raw.user_email : "";
  const userDisplay =
    typeof raw.user_display_name === "string" && raw.user_display_name.trim()
      ? raw.user_display_name.trim()
      : userEmail.split("@")[0] || "User";

  return {
    user_id: raw.user_id as number,
    company_id: raw.company_id as number,
    company_name: companyName,
    user_email: userEmail,
    user_display_name: userDisplay,
    role: roleNorm,
    is_active: Boolean(raw.is_active),
    permissions,
  };
}

export type NotificationItemType =
  | "overdue_task"
  | "due_today"
  | "stale_deals";

export type NotificationItem = {
  type: NotificationItemType;
  message: string;
  count: number;
};

export async function getNotifications(
  companyId: number
): Promise<NotificationItem[]> {
  const res = await fetchWithAuth("/notifications/", {}, companyId);
  if (!res.ok) {
    throw new Error(await parseErrorBody(res));
  }
  const data: unknown = await res.json();
  if (!Array.isArray(data)) return [];
  const out: NotificationItem[] = [];
  for (const row of data) {
    if (!row || typeof row !== "object") continue;
    const o = row as Record<string, unknown>;
    const type = o.type;
    const message = o.message;
    const countRaw = o.count;
    const count =
      typeof countRaw === "number"
        ? countRaw
        : Number.parseInt(String(countRaw), 10);
    if (
      type === "overdue_task" ||
      type === "due_today" ||
      type === "stale_deals"
    ) {
      if (typeof message === "string" && Number.isFinite(count)) {
        out.push({ type, message, count });
      }
    }
  }
  return out;
}

export async function getPipelineHealth(
  companyId: number
): Promise<import("@/src/types").PipelineHealth> {
  const res = await fetchWithAuth("/deals/pipeline-health/", {}, companyId);
  if (!res.ok) {
    throw new Error(await parseErrorBody(res));
  }
  return res.json();
}

export type InactivityAction =
  | "add_follow_up"
  | "log_call"
  | "waiting_on_client"
  | "clear_waiting"
  | "snooze"
  | "dismiss";

export async function postDealInactivityAction(
  companyId: number,
  dealId: string | number,
  body: {
    action: InactivityAction;
    waiting_reason?: string;
    follow_up_on?: string;
    content?: string;
    days?: number;
  }
): Promise<Record<string, unknown>> {
  const res = await fetchWithAuth(
    `/deals/${dealId}/inactivity-action/`,
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

export type AnalyticsV1Granularity = "week" | "month";

export async function getAnalyticsV1Overview(
  companyId: number,
  granularity: AnalyticsV1Granularity = "week"
): Promise<AnalyticsV1Overview> {
  const res = await fetchWithAuth(
    `/analytics/v1/overview/?granularity=${encodeURIComponent(granularity)}`,
    {},
    companyId
  );
  if (!res.ok) {
    throw new Error(await parseErrorBody(res));
  }
  const raw = (await res.json()) as Record<string, unknown>;
  return parseAnalyticsV1Overview(raw);
}

function parseAnalyticsV1Overview(raw: Record<string, unknown>): AnalyticsV1Overview {
  const kpisRaw = raw.kpis;
  const kpis =
    kpisRaw && typeof kpisRaw === "object"
      ? (kpisRaw as Record<string, unknown>)
      : {};
  const staleRaw = kpis.stale_health;
  const stale =
    staleRaw && typeof staleRaw === "object"
      ? (staleRaw as Record<string, unknown>)
      : {};

  const funnelIn = Array.isArray(raw.funnel) ? raw.funnel : [];
  const funnel = funnelIn.map((row) => {
    const o = row as Record<string, unknown>;
    return {
      stage_id: Number(o.stage_id),
      name: String(o.name ?? ""),
      order: Number(o.order ?? 0),
      deal_count: Number(o.deal_count ?? 0),
      dropoff_from_previous_pct:
        o.dropoff_from_previous_pct === null ||
        o.dropoff_from_previous_pct === undefined
          ? null
          : Number(o.dropoff_from_previous_pct),
    };
  });

  const trendIn = Array.isArray(raw.revenue_trend) ? raw.revenue_trend : [];
  const revenue_trend = trendIn.map((row) => {
    const o = row as Record<string, unknown>;
    return {
      period_start: String(o.period_start ?? ""),
      revenue: String(o.revenue ?? "0"),
    };
  });

  const teamIn = Array.isArray(raw.team_performance)
    ? raw.team_performance
    : [];
  const team_performance = teamIn.map((row) => {
    const o = row as Record<string, unknown>;
    return {
      user_id: Number(o.user_id),
      email: String(o.email ?? ""),
      deals_won: Number(o.deals_won ?? 0),
      deals_active: Number(o.deals_active ?? 0),
      revenue_won: String(o.revenue_won ?? "0"),
      stale_deals: Number(o.stale_deals ?? 0),
    };
  });

  const feedIn = Array.isArray(raw.recent_activity)
    ? raw.recent_activity
    : [];
  const recent_activity = feedIn.map((row) => {
    const o = row as Record<string, unknown>;
    return {
      id: Number(o.id),
      kind: String(o.kind ?? "activity_logged") as AnalyticsFeedKind,
      type: String(o.type ?? ""),
      auto_type: o.auto_type == null ? null : String(o.auto_type),
      content: String(o.content ?? ""),
      deal_id: o.deal_id == null ? null : Number(o.deal_id),
      deal_title: o.deal_title == null ? null : String(o.deal_title),
      author_id: Number(o.author_id ?? 0),
      author_email:
        o.author_email == null ? null : String(o.author_email),
      is_completed: Boolean(o.is_completed),
      created_at: String(o.created_at ?? ""),
    };
  });

  const metaRaw = raw.meta;
  const meta: Record<string, string> = {};
  if (metaRaw && typeof metaRaw === "object") {
    for (const [k, v] of Object.entries(metaRaw as Record<string, unknown>)) {
      meta[k] = String(v ?? "");
    }
  }

  const g = raw.granularity === "month" ? "month" : "week";

  return {
    tier: String(raw.tier ?? "free"),
    granularity: g,
    meta,
    kpis: {
      pipeline_value: String(kpis.pipeline_value ?? "0"),
      active_deals: Number(kpis.active_deals ?? 0),
      conversion_rate_pct: Number(kpis.conversion_rate_pct ?? 0),
      stale_health: {
        healthy: Number(stale.healthy ?? 0),
        at_risk: Number(stale.at_risk ?? 0),
        stale: Number(stale.stale ?? 0),
      },
      won_this_month: Number(kpis.won_this_month ?? 0),
      won_this_month_revenue: String(kpis.won_this_month_revenue ?? "0"),
      average_deal_size: String(kpis.average_deal_size ?? "0"),
      visible_deals_total: Number(kpis.visible_deals_total ?? 0),
      won_deals_total: Number(kpis.won_deals_total ?? 0),
    },
    funnel,
    revenue_trend,
    team_performance,
    recent_activity,
  };
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

export async function getClientTimeline(
  companyId: number,
  clientId: string | number,
  filter: import("@/src/types").TimelineFilter = "all"
): Promise<import("@/src/types").ClientTimeline> {
  const path =
    filter === "all"
      ? `/clients/${clientId}/timeline/`
      : `/clients/${clientId}/timeline/?filter=${encodeURIComponent(filter)}`;
  const res = await fetchWithAuth(path, {}, companyId);
  if (!res.ok) {
    throw new Error(await parseErrorBody(res));
  }
  return res.json();
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
  deal?: string | number | null;
  client?: string | number | null;
  author: string | number;
  author_email?: string | null;
  type: ActivityType;
  category?: string | null;
  auto_type?: string | null;
  automation_key?: string | null;
  content?: string | null;
  due_date?: string | null;
  is_completed?: boolean;
  created_at: string;
}): Activity {
  return {
    id: String(raw.id),
    deal: raw.deal,
    client: raw.client,
    author: raw.author,
    author_email: raw.author_email,
    type: raw.type,
    category: raw.category,
    auto_type: raw.auto_type,
    automation_key: raw.automation_key,
    content: raw.content,
    due_date: raw.due_date,
    is_completed: Boolean(raw.is_completed),
    created_at: raw.created_at,
  };
}

export async function getCompanyOpenTasks(
  companyId: number
): Promise<Activity[]> {
  const q = new URLSearchParams({
    type: "task",
    is_completed: "false",
  });
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

/** Server-side pipeline automation (stale / pricing / dormant heuristics). */
export async function postSyncAutomationTasks(companyId: number): Promise<{
  created: number;
}> {
  const res = await fetchWithAuth(
    "/activities/sync-automation/",
    { method: "POST" },
    companyId
  );
  if (!res.ok) {
    throw new Error(await parseErrorBody(res));
  }
  const raw = (await res.json()) as { created?: number };
  return { created: Number(raw.created ?? 0) };
}

const TASK_PRIORITIES: TaskPriority[] = ["low", "medium", "high", "urgent"];
const TASK_UI_STATES: TaskUiState[] = [
  "completed",
  "overdue",
  "today",
  "upcoming",
  "backlog",
  "other",
];

function parseTaskPriority(v: unknown): TaskPriority {
  const s = String(v ?? "medium").toLowerCase();
  return TASK_PRIORITIES.includes(s as TaskPriority) ? (s as TaskPriority) : "medium";
}

function parseTaskUiState(v: unknown): TaskUiState {
  const s = String(v ?? "other").toLowerCase();
  return TASK_UI_STATES.includes(s as TaskUiState) ? (s as TaskUiState) : "other";
}

function normalizeCrmTask(row: Record<string, unknown>): CrmTask {
  return {
    id: Number(row.id),
    deal: row.deal == null ? null : Number(row.deal),
    client: row.client == null ? null : Number(row.client),
    author: Number(row.author ?? 0),
    author_email:
      row.author_email == null ? undefined : String(row.author_email),
    assigned_to: row.assigned_to == null ? null : Number(row.assigned_to),
    assigned_to_email:
      row.assigned_to_email == null ? null : String(row.assigned_to_email),
    completed_by: row.completed_by == null ? null : Number(row.completed_by),
    completed_by_email:
      row.completed_by_email == null ? null : String(row.completed_by_email),
    type: "task",
    category: row.category == null ? null : String(row.category),
    auto_type: row.auto_type == null ? null : String(row.auto_type),
    content: String(row.content ?? ""),
    due_date: row.due_date == null ? null : String(row.due_date),
    priority: parseTaskPriority(row.priority),
    is_completed: Boolean(row.is_completed),
    completed_at: row.completed_at == null ? null : String(row.completed_at),
    created_at: String(row.created_at ?? ""),
    deal_title: row.deal_title == null ? null : String(row.deal_title),
    client_name: row.client_name == null ? null : String(row.client_name),
    state: parseTaskUiState(row.state),
  };
}

/** CRM tasks: GET /tasks/ or /tasks/my/ with ?bucket= */
export async function getTasksBucket(
  companyId: number,
  bucket: TaskBucketQuery,
  opts?: { scope?: "my" | "team" }
): Promise<CrmTask[]> {
  const scope = opts?.scope ?? "my";
  const path = scope === "my" ? "/tasks/my/" : "/tasks/";
  const q = new URLSearchParams({ bucket });
  const res = await fetchWithAuth(`${path}?${q.toString()}`, {}, companyId);
  if (!res.ok) {
    throw new Error(await parseErrorBody(res));
  }
  const data: unknown = await res.json();
  const list = normalizeApiList(data as ListResponse<Record<string, unknown>>);
  return list.map((row) => normalizeCrmTask(row));
}

export type PatchCrmTaskPayload = Partial<{
  content: string;
  due_date: string | null;
  priority: TaskPriority;
  assigned_to: number | null;
  is_completed: boolean;
}>;

export async function patchCrmTask(
  companyId: number,
  taskId: number,
  body: PatchCrmTaskPayload
): Promise<CrmTask> {
  const res = await fetchWithAuth(
    `/tasks/${taskId}/`,
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
  const raw = (await res.json()) as Record<string, unknown>;
  return normalizeCrmTask(raw);
}

export async function completeCrmTask(
  companyId: number,
  taskId: number
): Promise<CrmTask> {
  const res = await fetchWithAuth(
    `/tasks/${taskId}/complete/`,
    { method: "POST" },
    companyId
  );
  if (!res.ok) {
    throw new Error(await parseErrorBody(res));
  }
  const raw = (await res.json()) as Record<string, unknown>;
  return normalizeCrmTask(raw);
}

export type CreateCrmTaskPayload = {
  deal?: number | null;
  client?: number | null;
  content: string;
  due_date?: string | null;
  priority?: TaskPriority;
  assigned_to?: number | null;
};

export async function createCrmTask(
  companyId: number,
  payload: CreateCrmTaskPayload
): Promise<CrmTask> {
  const body: Record<string, unknown> = {
    content: payload.content,
  };
  if (payload.deal != null) body.deal = payload.deal;
  if (payload.client != null) body.client = payload.client;
  if (payload.due_date) body.due_date = payload.due_date;
  if (payload.priority) body.priority = payload.priority;
  if (payload.assigned_to != null) body.assigned_to = payload.assigned_to;
  const res = await fetchWithAuth(
    "/tasks/",
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
  const raw = (await res.json()) as Record<string, unknown>;
  return normalizeCrmTask(raw);
}

/** Все заметки компании (type=note), для карточек/last activity без нового API. */
export async function getCompanyNotes(companyId: number): Promise<Activity[]> {
  const q = new URLSearchParams({
    type: "note",
  });
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

export async function getClientActivities(
  companyId: number,
  clientId: string | number
): Promise<Activity[]> {
  const q = new URLSearchParams({ client_id: String(clientId) });
  const res = await fetchWithAuth(`/activities/?${q.toString()}`, {}, companyId);
  if (!res.ok) {
    throw new Error(await parseErrorBody(res));
  }
  const data: unknown = await res.json();
  const list = normalizeApiList(
    data as ListResponse<{
      id: string | number;
      deal?: string | number | null;
      client?: string | number | null;
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
  deal?: number;
  client?: number;
  type: ActivityType;
  category?: string;
  auto_type?: string;
  content?: string;
  due_date?: string | null;
};

export async function createActivity(
  companyId: number,
  payload: CreateActivityPayload
): Promise<Activity> {
  const body: Record<string, unknown> = { type: payload.type };
  if (payload.deal !== undefined) {
    body.deal = payload.deal;
  }
  if (payload.client !== undefined) {
    body.client = payload.client;
  }
  if (payload.content !== undefined && payload.content !== "") {
    body.content = payload.content;
  }
  if (payload.category !== undefined && payload.category.trim() !== "") {
    body.category = payload.category.trim();
  }
  if (payload.auto_type !== undefined && payload.auto_type.trim() !== "") {
    body.auto_type = payload.auto_type.trim();
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
    deal?: string | number | null;
    client?: string | number | null;
    author: string | number;
    author_email?: string | null;
    type: ActivityType;
    category?: string | null;
    auto_type?: string | null;
    content?: string | null;
    due_date?: string | null;
    is_completed?: boolean;
    created_at: string;
  };
  return normalizeActivityRow(raw);
}

export type PatchActivityPayload = {
  is_completed?: boolean;
  content?: string;
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
    category?: string | null;
    auto_type?: string | null;
    content?: string | null;
    due_date?: string | null;
    is_completed?: boolean;
    created_at: string;
  };
  return normalizeActivityRow(raw);
}

/** Алиас для PATCH activity (например закрытие задачи). */
export const updateActivity = patchActivity;

export async function deleteActivity(
  companyId: number,
  activityId: string | number
): Promise<void> {
  const res = await fetchWithAuth(
    `/activities/${activityId}/`,
    { method: "DELETE" },
    companyId
  );
  if (!res.ok && res.status !== 204) {
    throw new Error(await parseErrorBody(res));
  }
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
  win_reason?: string;
  loss_reason?: string;
  close_competitor?: string;
  close_notes?: string;
  waiting_on_client?: boolean;
  waiting_reason?: string;
  follow_up_on?: string | null;
};

export type PatchDealResponse = {
  close_transition?: import("@/src/types").DealCloseTransition | null;
  [key: string]: unknown;
};

export async function getClosedDealsSummary(
  companyId: number
): Promise<import("@/src/types").ClosedDealsSummary> {
  const res = await fetchWithAuth("/deals/closed-summary/", {}, companyId);
  if (!res.ok) {
    throw new Error(await parseErrorBody(res));
  }
  return res.json();
}

export async function patchDeal(
  companyId: number,
  dealId: string | number,
  body: PatchDealPayload
): Promise<PatchDealResponse> {
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
