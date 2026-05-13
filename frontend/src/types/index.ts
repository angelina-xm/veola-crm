// Client (CRM)
export interface Client {
  id: string | number;
  name: string;
  email?: string | null;
  phone?: string | null;
  /** FK компании с API — для фильтрации на фронте при multi-tenant */
  company?: string | number;
}

// Deal
export interface Deal {
  id: string | number;
  title: string;
  stage: string | number;
  stageId?: string | number;
  amount?: number;
  client?: string | number;
  created_at?: string;
}

/** GET /deals/stale/ */
export interface StaleDeal {
  id: string;
  title: string;
  amount: string | number;
  client: number;
  client_name?: string;
  stage: number | null;
  created_at: string;
  last_activity: string | null;
}

// Pipeline Stage
export interface PipelineStage {
  id: string | number;
  name: string;
  order?: number;
  company?: string | number;
}

// Deals grouped by stage
export type DealsByStage = Record<string, Deal[]>;

// Activity (deal timeline)
export type ActivityType = "call" | "meeting" | "note" | "task";

export interface Activity {
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
}

/** GET/PATCH /tasks/ — CRM follow-up task row (backed by Activity.type === "task"). */
export type TaskPriority = "low" | "medium" | "high" | "urgent";

export type TaskUiState =
  | "completed"
  | "overdue"
  | "today"
  | "upcoming"
  | "backlog"
  | "other";

export type TaskBucketQuery = "today" | "upcoming" | "overdue" | "completed";

export interface CrmTask {
  id: number;
  deal: number | null;
  client: number | null;
  author: number;
  author_email?: string;
  assigned_to: number | null;
  assigned_to_email?: string | null;
  completed_by: number | null;
  completed_by_email?: string | null;
  type: "task";
  category?: string | null;
  auto_type?: string | null;
  content: string;
  due_date: string | null;
  priority: TaskPriority;
  is_completed: boolean;
  completed_at: string | null;
  created_at: string;
  deal_title: string | null;
  client_name: string | null;
  state: TaskUiState;
}

// API Response
export interface ApiResponse<T = unknown> {
  data: T;
  error?: string;
  message?: string;
}

// Analytics v1 (GET /analytics/v1/overview/)
export type AnalyticsGranularity = "week" | "month";

export type AnalyticsFeedKind =
  | "deal_won"
  | "deal_moved"
  | "note_added"
  | "task_completed"
  | "task_open"
  | "activity_logged";

export interface AnalyticsV1Kpis {
  pipeline_value: string;
  active_deals: number;
  conversion_rate_pct: number;
  stale_health: { healthy: number; at_risk: number; stale: number };
  won_this_month: number;
  won_this_month_revenue: string;
  average_deal_size: string;
  visible_deals_total: number;
  won_deals_total: number;
}

export interface AnalyticsV1FunnelStage {
  stage_id: number;
  name: string;
  order: number;
  deal_count: number;
  dropoff_from_previous_pct: number | null;
}

export interface AnalyticsV1TrendPoint {
  period_start: string;
  revenue: string;
}

export interface AnalyticsV1TeamRow {
  user_id: number;
  email: string;
  deals_won: number;
  deals_active: number;
  revenue_won: string;
  stale_deals: number;
}

export interface AnalyticsV1FeedItem {
  id: number;
  kind: AnalyticsFeedKind;
  type: string;
  auto_type: string | null;
  content: string;
  deal_id: number | null;
  deal_title: string | null;
  author_id: number;
  author_email: string | null;
  is_completed: boolean;
  created_at: string;
}

export interface AnalyticsV1Overview {
  tier: string;
  granularity: AnalyticsGranularity;
  meta: Record<string, string>;
  kpis: AnalyticsV1Kpis;
  funnel: AnalyticsV1FunnelStage[];
  revenue_trend: AnalyticsV1TrendPoint[];
  team_performance: AnalyticsV1TeamRow[];
  recent_activity: AnalyticsV1FeedItem[];
}
