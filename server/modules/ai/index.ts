/**
 * Public surface of the AI module.
 *
 * Anything outside this folder must import from `./` (this file) only.
 */

export { registerAiContractRoutes } from "./contractDraft/controller";
export { draftContractFromPrompt } from "./contractDraft/service";
export { isAiEnabled } from "./openaiClient";
export type {
  ChatMessage,
  ContractChatRequest,
  ContractChatResponse,
  PendingQuestion,
} from "./contractDraft/types";
