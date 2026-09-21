/**
 * Internal types for the SDP-admin AI settings module.
 *
 * Public surface (all requireSdpRole(['sdp_super_admin','sdp_admin'])):
 *   GET /api/ai/admin/settings   — the global daily token limit
 *   PUT /api/ai/admin/settings   — update it
 *   GET /api/ai/admin/usage      — today's token usage grouped by business
 */

export interface AiSettingsPayload {
  dailyTokenLimit: number | null; // null = unlimited
  updatedAt: string | null;
}

export interface AiUsageRow {
  businessId: string | null; // null = SDP internal / unattributed rows
  businessName: string | null;
  tokens: number;
  requests: number;
}

export type SettingsResult =
  | { ok: true; data: AiSettingsPayload }
  | { ok: false; status: number; message: string };
