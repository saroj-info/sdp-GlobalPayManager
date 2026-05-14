/**
 * Workforce orchestrator. The single public entry point for the module.
 *
 * Flow:
 *   1. Resolve the scope (auth → which workers can this caller see)
 *   2. Fetch + filter + sort + paginate at the DB level
 *
 * Like every other module's service.ts, this returns a tagged result so the
 * controller is the only thing that maps to HTTP status codes.
 */

import { resolveWorkerListScope } from "./authorize";
import { fetchWorkerList } from "./repository";
import type { AuthUser, ListWorkersResult, WorkerListQuery } from "./types";

export async function listWorkers(user: AuthUser, query: WorkerListQuery): Promise<ListWorkersResult> {
  const scope = await resolveWorkerListScope(user);
  if (scope.kind === "denied") {
    return { ok: false, status: scope.status, message: scope.message };
  }
  const data = await fetchWorkerList(scope, query);
  return { ok: true, data };
}
