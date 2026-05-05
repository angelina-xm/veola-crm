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
  content?: string | null;
  due_date?: string | null;
  is_completed?: boolean;
  created_at: string;
}

// API Response
export interface ApiResponse<T = unknown> {
  data: T;
  error?: string;
  message?: string;
}
