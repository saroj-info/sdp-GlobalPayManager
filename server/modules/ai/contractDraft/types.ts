/**
 * Internal types for the contract-draft feature.
 *
 * Public surface is `POST /api/ai/contract-draft`.
 */

export interface AuthUser {
  id: string;
  userType: string;
  activeRole?: string;
  availableRoles?: string[];
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ContractChatRequest {
  messages: ChatMessage[];
  currentDraft?: Record<string, any>;
  /**
   * The step the user is currently viewing in the modal's stepper (1-4,
   * mirroring the manual wizard's data-entry steps). The AI uses this to
   * bias its questioning toward the current step; extraction is unbounded.
   */
  currentStep?: 1 | 2 | 3 | 4;
}

export interface PendingQuestion {
  fieldPath: string;
  question: string;
  candidates?: Array<{ id: string; label: string; hint?: string }>;
}

export interface ToolCallRecord {
  tool: string;
  args: Record<string, any>;
  resultHash: string;
}

export interface ChecklistState {
  required: string[];
  conditional: string[];
  optionalRecommended: string[];
}

export interface ContractChatResponse {
  assistantMessage: string;
  proposedFormData: Record<string, any>;
  pendingQuestions: PendingQuestion[];
  aiFilledFieldPaths: string[];
  nextSteps: ChecklistState;
  toolCallLog: ToolCallRecord[];
}

export type CallerRole = "sdp_internal" | "business_user";

export type DraftScope =
  | { kind: "allowed"; role: CallerRole; businessId?: string }
  | { kind: "denied"; status: number; message: string };

export interface ResolveWorkerRequest {
  email: string;
  businessId?: string;
}

export interface ResolveWorkerResponse {
  workerId: string;
  workerName: string;
}

export type DraftResult =
  | { ok: true; data: ContractChatResponse; audit: DraftAudit }
  | { ok: false; status: number; code: string; message: string; audit?: DraftAudit };

export interface DraftAudit {
  model: string;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
  toolCalls: ToolCallRecord[];
  resultStatus: "ok" | "validation_failed" | "upstream_error" | "unauthorized";
}
