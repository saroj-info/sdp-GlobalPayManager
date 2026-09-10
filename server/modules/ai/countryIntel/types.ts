/**
 * Internal types for the country-intel Q&A feature.
 *
 * Public surface: POST /api/ai/country-intel (+ session routes).
 * AuthUser / ChatMessage are shared with the AI search module — same JWT
 * shape, same history contract.
 */

import type { AuthUser, ChatMessage } from "../search/types";

export type { AuthUser, ChatMessage };

export interface CountryIntelRequest {
  query: string;
  // If present, the server loads the session's persisted turns as history
  // and appends the new turn to it. If absent, a new session is created and
  // its id is returned on the response.
  sessionId?: string;
  country: string; // canonical name or ISO code — canonicalised server-side
  jurisdiction?: string;
  employmentType?: string; // wizard engagement type — picks contractor vs employer framing
}

export interface CountryIntelResponse {
  answer: string;
  // true when the model derived the answer from the curated country JSON;
  // false answers carry the "AI general knowledge" label prefix.
  grounded: boolean;
  followUp?: string;
  sessionId: string;
}

export interface CountryIntelAudit {
  model: string;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
  toolCalls: unknown[]; // always [] — this feature has no tools
  resultStatus: "ok" | "validation_failed" | "upstream_error" | "unauthorized";
}

export type CountryIntelResult =
  | { ok: true; data: CountryIntelResponse; audit: CountryIntelAudit }
  | { ok: false; status: number; code: string; message: string; audit?: CountryIntelAudit };
