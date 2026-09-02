/**
 * Thin wrapper around the OpenAI SDK.
 *
 * One client per process, configured from env. All calls go through
 * `chatExtract` / `chatSummary` so upstream errors never leak the SDK
 * types up the stack — callers get a normalized `AiUpstreamError` they
 * can translate to a 503.
 */

import OpenAI from "openai";
import type { ChatCompletion, ChatCompletionMessageParam, ChatCompletionTool } from "openai/resources/chat/completions";

const DEFAULT_EXTRACT_MODEL = "gpt-5.6-terra";
const DEFAULT_PREVIEW_MODEL = "gpt-5.6-terra";

let client: OpenAI | null = null;

function getClient(): OpenAI {
  if (client) return client;
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new AiUpstreamError("OPENAI_API_KEY_MISSING", "OpenAI API key is not configured");
  }
  client = new OpenAI({ apiKey });
  return client;
}

export class AiUpstreamError extends Error {
  constructor(public code: string, message: string, public cause?: unknown) {
    super(message);
    this.name = "AiUpstreamError";
  }
}

export interface ChatExtractParams {
  messages: ChatCompletionMessageParam[];
  tools?: ChatCompletionTool[];
  toolChoice?: "auto" | "none" | "required";
  temperature?: number;
  maxTokens?: number;
  jsonMode?: boolean; // when true, the final assistant content is guaranteed to be a JSON object
}

export interface ChatCallResult {
  completion: ChatCompletion;
  model: string;
  latencyMs: number;
  usage: { promptTokens: number; completionTokens: number };
}

export async function chatExtract(params: ChatExtractParams): Promise<ChatCallResult> {
  const model = process.env.OPENAI_MODEL_EXTRACT || DEFAULT_EXTRACT_MODEL;
  return runChat(model, params);
}

export async function chatSummary(params: ChatExtractParams): Promise<ChatCallResult> {
  const model = process.env.OPENAI_MODEL_PREVIEW || DEFAULT_PREVIEW_MODEL;
  return runChat(model, params);
}

async function runChat(model: string, params: ChatExtractParams): Promise<ChatCallResult> {
  const started = Date.now();
  // Reasoning-tier models (gpt-5.x family) reject function tools on
  // /v1/chat/completions unless reasoning_effort is 'none' — we need tools for
  // the contract-draft loop, so force it off. Non-reasoning models ignore the
  // field. Detection is name-based: any model starting with "gpt-5" is
  // treated as reasoning-tier (gpt-4.x + gpt-4o do not use this param).
  const isReasoningTier = /^gpt-5/i.test(model);
  const createParams: Record<string, unknown> = {
    model,
    messages: params.messages,
    tools: params.tools,
    tool_choice: params.toolChoice ?? (params.tools ? "auto" : undefined),
    temperature: params.temperature ?? 0.2,
    max_tokens: params.maxTokens,
    response_format: params.jsonMode ? { type: "json_object" } : undefined,
  };
  if (isReasoningTier) {
    createParams.reasoning_effort = "none";
  }
  try {
    const completion = await getClient().chat.completions.create(createParams as any);
    return {
      completion,
      model,
      latencyMs: Date.now() - started,
      usage: {
        promptTokens: completion.usage?.prompt_tokens ?? 0,
        completionTokens: completion.usage?.completion_tokens ?? 0,
      },
    };
  } catch (err: any) {
    const status = err?.status ?? err?.response?.status;
    const upstreamCode =
      status === 401 ? "OPENAI_AUTH_FAILED" :
      status === 429 ? "OPENAI_RATE_LIMITED" :
      status === 400 ? "OPENAI_BAD_REQUEST" :
      "OPENAI_UPSTREAM_ERROR";
    throw new AiUpstreamError(upstreamCode, err?.message || "OpenAI call failed", err);
  }
}

export function isAiEnabled(): boolean {
  return process.env.AI_CONTRACT_DRAFT_ENABLED === "true";
}

export function isAiSearchEnabled(): boolean {
  return process.env.AI_SEARCH_ENABLED === "true";
}
