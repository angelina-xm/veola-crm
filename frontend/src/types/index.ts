// Client (CRM)
export type ClientType = "business" | "individual";
export type ClientRelationshipStatus =
  | "active"
  | "prospect"
  | "dormant"
  | "churned";

export interface Client {
  id: string | number;
  name: string;
  client_type?: ClientType;
  relationship_status?: ClientRelationshipStatus;
  email?: string | null;
  phone?: string | null;
  industry?: string;
  description?: string;
  products_services?: string;
  website?: string;
  company_size?: string;
  last_conversation_topic?: string;
  last_conversation_mood?: string;
  last_conversation_outcome?: string;
  next_step?: string;
  last_conversation_at?: string | null;
  created_at?: string;
  updated_at?: string;
  company?: string | number;
}

export interface ClientContact {
  id: number;
  full_name: string;
  role_title: string;
  email: string;
  phone: string;
  preferred_contact_method: "email" | "phone" | "any";
  notes: string;
  is_primary: boolean;
}

export interface ClientRelationshipMemory {
  last_conversation_topic: string;
  last_conversation_mood: string;
  last_conversation_outcome: string;
  next_step: string;
  last_conversation_at: string | null;
}

export interface ClientProfileMetrics {
  customer_since: string | null;
  total_revenue: number;
  won_deals: number;
  active_deals: number;
  total_deals: number;
  last_activity_at: string | null;
  average_deal_size: number;
}

export interface ClientOperationalDeal {
  id: number;
  title: string;
  amount: string;
  stage_name: string;
  created_at: string;
}

export interface ClientOperationalTask {
  id: number;
  content: string;
  due_date: string | null;
  priority: string;
  deal_id: number | null;
  deal_title: string | null;
  assigned_to_email: string | null;
}

/** GET /clients/:id/profile/ */
export interface ClientProfile {
  client: Client;
  contacts: ClientContact[];
  has_primary_contact: boolean;
  primary_contact: ClientContact | null;
  relationship_memory: ClientRelationshipMemory;
  metrics: ClientProfileMetrics;
  operational: {
    active_deals: ClientOperationalDeal[];
    open_tasks: ClientOperationalTask[];
  };
}

export type TimelineFilter =
  | "all"
  | "deals"
  | "activities"
  | "tasks"
  | "calls"
  | "notes";

export interface TimelineEvent {
  id: string;
  kind: "deal" | "activity" | "task";
  event_type: string;
  title: string;
  subtitle: string;
  body: string;
  occurred_at: string;
  importance: "normal" | "highlight" | "milestone";
  filter_group: "deals" | "activities" | "tasks";
  deal_id: number | null;
  deal_title: string | null;
  metadata: Record<string, unknown>;
}

export interface ClientTimelineSummary {
  total_deals: number;
  open_deals: number;
  won_deals: number;
  lost_deals: number;
  total_won_revenue: number;
  relationship_since: string | null;
  timeline_events: number;
  last_activity_at?: string | null;
  average_deal_size?: number;
}

/** GET /clients/:id/timeline/ */
export interface ClientTimeline {
  client_id: number;
  client_name: string;
  summary: ClientTimelineSummary;
  events: TimelineEvent[];
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
  closed_at?: string | null;
  win_reason?: string;
  loss_reason?: string;
  close_competitor?: string;
  close_notes?: string;
  is_operational?: boolean;
  stage_name?: string | null;
  close_transition?: DealCloseTransition | null;
  waiting_on_client?: boolean;
  waiting_reason?: string;
  follow_up_on?: string | null;
  assigned_to?: number | null;
  assigned_to_email?: string | null;
}

/** GET /deals/pipeline-health/ */
export interface PipelineHealth {
  total_operational: number;
  healthy: number;
  attention_needed: number;
  at_risk: number;
  waiting_on_client: number;
  summary_message: string;
  tiers: { tier1_hours: number; tier2_days: number; tier3_days: number };
}

export interface DealSignal {
  id: string;
  signal_type: string;
  severity: "info" | "warning" | "critical";
  is_active: boolean;
  deal: number;
  deal_title?: string;
  message?: string;
  tier?: number | null;
  suggested_actions?: string[];
  metadata?: Record<string, unknown>;
  first_seen_at?: string;
  last_checked_at?: string;
}

/** PATCH /deals/:id/ when closing as Won */
export interface DealCloseTransition {
  outcome: "won" | "lost" | "closed";
  deal_id: number;
  title: string;
  amount: string;
  cycle_days: number;
  client_id: number;
  closed_at: string | null;
  win_reason: string | null;
  loss_reason: string | null;
  links: {
    view_customer: string;
    back_to_pipeline: string;
  };
}

/** GET /deals/closed-summary/ */
export interface ClosedDealSummaryItem {
  id: number;
  title: string;
  amount: string | number;
  client_id: number;
  client_name: string;
  stage_name: string | null;
  closed_at: string | null;
  win_reason?: string;
  loss_reason?: string;
}

export interface ClosedDealsSummary {
  closed_today_count: number;
  won_today_count: number;
  revenue_closed_today: string | number;
  revenue_closed_this_week: string | number;
  recent_wins: ClosedDealSummaryItem[];
  closed_today: ClosedDealSummaryItem[];
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
  automation_key?: string | null;
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
  deal_closed_warning?: string | null;
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
