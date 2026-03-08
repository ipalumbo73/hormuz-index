export interface DashboardSummary {
  indices: Record<string, { value: number; delta: number; level: string; history?: number[]; ci_low?: number; ci_high?: number }>;
  scenarios: Record<string, { probability: number; score: number; delta?: number; ci_low?: number; ci_high?: number }>;
  noi_components: Record<string, number>;
  alerts: Alert[];
  events_24h_count: number;
  last_updated: string | null;
}

export interface Alert {
  id: string;
  level: string;
  title: string;
  message: string;
  timestamp: string;
}

export interface PlotlyFigure {
  data: any[];
  layout: any;
  config?: any;
  meta?: any;
}

export interface EventItem {
  id: string;
  title: string;
  summary: string;
  category: string;
  severity: number;
  confidence: number;
  timestamp_utc: string;
  source_id: string;
  source_reliability: number;
  actor_tags: string[];
  country_tags: string[];
  location_tags: string[];
  signal_payload: Record<string, number>;
}

export interface EventListResponse {
  events: EventItem[];
  total: number;
  page: number;
  page_size: number;
}
