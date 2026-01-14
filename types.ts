
export interface Group {
  id: number;
  name: string;
}

export interface Requester {
  id: number;
  name: string;
  email: string;
}

export interface Ticket {
  id: number;
  subject: string;
  description: string;
  description_text: string;
  status: number;
  priority: number;
  created_at: string;
  updated_at: string;
  group_id: number;
  requester_id: number;
  responder_id: number | null;
  type: string | null;
  custom_fields: { [key: string]: any };
}

export interface Conversation {
  id: number;
  body: string;
  body_text: string;
  created_at: string;
  user_id: number;
  incoming: boolean;
  private: boolean;
}

export type Urgency = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

export const CATEGORIES = [
  "Shipments", "Returns", "Refunds", "Exchanges", "Incorrect items",
  "Damages/defects", "Discount/Voucher", "Stock/product", "Spam", "Other"
] as const;

export type Category = typeof CATEGORIES[number];

export interface TicketAnalysis {
  urgency: Urgency;
  category: Category;
}

export interface TicketActivity {
  ticket: Ticket;
  conversations: Conversation[];
  aiSummary: string;
  timeSpent: number;
  analysis: TicketAnalysis;
  requesterName: string | null;
  lastResponseDate: string | null;
  statusSince: string;
  statusName: string;
  periodInStatus: string;
  sentimentScore: number;
  riskScore: number;
}

export interface GeminiSummaryResponse {
  summary: string;
  timeSpentMinutes: number;
  urgency: string;
  category: string;
  sentimentScore: number;
  riskScore: number;
}

export type ConnectionMode = 'direct' | 'proxy';
export type ApiKeyStatus = 'idle' | 'testing' | 'valid' | 'invalid';
export type TestConnectionStatus = 'idle' | 'testing' | 'success' | 'failed';

export type TicketScope = '25' | '50' | '75' | 'all' | 'custom';

export interface SortConfig {
  key: keyof TicketActivity | string;
  direction: 'ascending' | 'descending';
}

export interface FreshdeskSearchResponse {
  results: Ticket[];
  total: number;
}

export interface DashboardMetrics {
  activeTickets: number;
  createdToday: number;
  createdTrend24h: number;
  createdTrend7d: number;
  reopenedToday: number;
  reopenedTrend24h: number;
  reopenedTrend7d: number;
  workedToday: number;
  workedTrend24h: number;
  workedTrend7d: number;
  closedToday: number;
  closedTrend24h: number;
  closedTrend7d: number;
  ticketsByHour: number[]; 
  workedTicketsByHour: number[];
  closedTicketsByHour: number[];
  // Historical 24h (Yesterday) comparison data
  ticketsByHour24hAgo: number[];
  workedTicketsByHour24hAgo: number[];
  closedTicketsByHour24hAgo: number[];
  // Historical 7-day comparison data
  ticketsByHour7dAgo: number[];
  workedTicketsByHour7dAgo: number[];
  closedTicketsByHour7dAgo: number[];
  createdFrequency: string; 
  responseFrequency: string;
  averageTickets7Days: number; // New field for average
}

export interface SavedReport {
  id: string;
  timestamp: string;
  group: Group;
  metrics: DashboardMetrics;
  activities: TicketActivity[];
  executiveSummary: string;
}
