/**
 * Internal types for the Cost Settings module. Wire shapes live in
 * shared/countryCosts.ts.
 */
export interface AuthUser {
  id: string;
  userType: string;
  sdpRole?: string | null;
}

export type Result<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; message: string; code?: string; extra?: Record<string, unknown> };
