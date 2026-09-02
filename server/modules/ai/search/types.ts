/**
 * Internal types for the AI search + Q&A feature.
 *
 * Public surface: POST /api/ai/search.
 */

export interface AuthUser {
  id: string;
  userType: string;
  activeRole?: string;
  availableRoles?: string[];
  sdpRole?: string | null;
  accessibleBusinessIds?: string[];
  accessibleCountries?: string[];
}

export type CallerRole = "sdp_internal" | "business_user" | "worker";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface SearchRequest {
  query: string;
  history?: ChatMessage[];
  // If present, the server loads the session's persisted turns as history
  // and appends the new turn to the same session. If absent, a new session
  // is created and its id is returned on the response.
  sessionId?: string;
  context?: {
    currentPage?: string;
    activeRole?: string;
  };
}

export type SearchMode = "find" | "ask" | "both";

export type SearchEntity =
  | "worker"
  | "contract"
  | "timesheet"
  | "invoice"
  | "leaveRequest"
  | "business";

export interface SearchRow {
  entity: SearchEntity;
  id: string;
  title: string;
  subtitle?: string;
  href: string;
  badges?: string[];
}

export interface Citation {
  kind: "primer" | "tool";
  label: string;
  slug?: string;
  toolName?: string;
}

export interface ToolCallSummary {
  tool: string;
  argsSummary: string;
  resultCount: number;
}

export interface SearchResponse {
  mode: SearchMode;
  answer?: string;
  rows: SearchRow[];
  citations: Citation[];
  toolCalls: ToolCallSummary[];
  followUp?: string;
  // The session this turn was persisted into. Present whenever the request
  // succeeded — either the request's sessionId echoed back, or a newly
  // minted session id if none was supplied.
  sessionId?: string;
}

export interface ToolCallRecord {
  tool: string;
  args: Record<string, any>;
  resultHash: string;
}

export interface SearchAudit {
  model: string;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
  toolCalls: ToolCallRecord[];
  resultStatus: "ok" | "validation_failed" | "upstream_error" | "unauthorized";
}

export type SearchScope =
  | { kind: "allowed"; role: CallerRole; businessId?: string; workerId?: string }
  | { kind: "denied"; status: number; message: string };

export type SearchResult =
  | { ok: true; data: SearchResponse; audit: SearchAudit }
  | { ok: false; status: number; code: string; message: string; audit?: SearchAudit };
