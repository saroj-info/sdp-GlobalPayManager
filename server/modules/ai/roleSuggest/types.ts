/**
 * Internal types for the role-description suggester.
 *
 * Public surface: POST /api/ai/suggest-role-description — one LLM call that
 * turns a custom role title from the manual contract wizard into a short
 * generic description. AuthUser is shared with the AI search module (same
 * JWT shape, same scope resolver).
 */

import type { AuthUser } from "../search/types";

export type { AuthUser };

export interface RoleSuggestRequest {
  roleTitle: string;
}

export interface RoleSuggestResponse {
  description: string;
}

export interface RoleSuggestAudit {
  businessId?: string; // resolved scope's business — threads through to ai_prompt_log
  model: string;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
  toolCalls: unknown[]; // always [] — this feature has no tools
  resultStatus: "ok" | "validation_failed" | "upstream_error" | "unauthorized";
}

export type RoleSuggestResult =
  | { ok: true; data: RoleSuggestResponse; audit: RoleSuggestAudit }
  | { ok: false; status: number; code: string; message: string; audit?: RoleSuggestAudit };
