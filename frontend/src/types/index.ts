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

// Pipeline Stage
export interface PipelineStage {
  id: string | number;
  name: string;
  order?: number;
  company?: string | number;
}

// Deals grouped by stage
export type DealsByStage = Record<string, Deal[]>;

// API Response
export interface ApiResponse<T = any> {
  data: T;
  error?: string;
  message?: string;
}
