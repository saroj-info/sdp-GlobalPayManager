/**
 * Public surface of the AI search module.
 */

export { registerAiSearchRoutes } from "./controller";
export { runSearch } from "./service";
export { isAiSearchEnabled } from "../openaiClient";
export type {
  SearchRequest,
  SearchResponse,
  SearchRow,
  SearchMode,
  Citation,
  ChatMessage,
} from "./types";
