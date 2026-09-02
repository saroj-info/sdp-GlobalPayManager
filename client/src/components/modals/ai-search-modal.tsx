/**
 * AI search + Q&A command bar (⌘K).
 *
 * Feature-flagged on `user.featureFlags.aiSearchEnabled`. Mounted once in
 * AuthenticatedLayout; opened via header trigger OR ⌘K / Ctrl+K.
 *
 * Sessions persist in the DB (ai_search_sessions / ai_search_messages) — the
 * modal is a thin view over the sessions API. Left sidebar lists past
 * sessions grouped by day; right pane shows the active thread; composer at
 * the bottom sends a new turn against the pinned sessionId. Closing the
 * modal does NOT wipe state — reopening resumes where you left off.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  Search,
  ArrowRight,
  BookOpen,
  Wrench,
  Sparkles,
  Plus,
  Trash2,
  Pencil,
  User as UserIcon,
  Bot,
  Check,
  X,
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

type SearchMode = "find" | "ask" | "both";

type SearchEntity =
  | "worker"
  | "contract"
  | "timesheet"
  | "invoice"
  | "leaveRequest"
  | "business";

interface SearchRow {
  entity: SearchEntity;
  id: string;
  title: string;
  subtitle?: string;
  href: string;
  badges?: string[];
}

interface Citation {
  kind: "primer" | "tool";
  label: string;
  slug?: string;
  toolName?: string;
}

interface ToolCallSummary {
  tool: string;
  argsSummary: string;
  resultCount: number;
}

interface AssistantPayload {
  mode: SearchMode;
  answer?: string | null;
  rows: SearchRow[];
  citations: Citation[];
  toolCalls: ToolCallSummary[];
  followUp?: string | null;
}

interface SearchResponse extends AssistantPayload {
  sessionId?: string;
}

interface StoredMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  payload: AssistantPayload | null;
  createdAt: string;
}

interface SessionSummary {
  id: string;
  title: string;
  lastMessageAt: string;
  createdAt: string;
}

interface SessionWithMessages {
  session: SessionSummary & { role: string; businessId: string | null };
  messages: StoredMessage[];
}

interface AiSearchModalProps {
  open: boolean;
  onOpenChange: (next: boolean) => void;
}

const SAMPLE_PROMPTS_ADMIN = [
  "contracts expiring next month",
  "unpaid invoices over 30 days old",
  "employer on-cost for €80k in Ireland",
  "how do I add a country?",
];
const SAMPLE_PROMPTS_BUSINESS = [
  "show me my active contracts",
  "how do I approve a timesheet?",
  "what would it cost to hire someone for $120k in Australia?",
  "unpaid invoices from Acme",
];
const SAMPLE_PROMPTS_WORKER = [
  "my submitted timesheets",
  "how do I request leave?",
  "my active contracts",
  "when does my current contract end?",
];

const ENTITY_LABEL: Record<SearchEntity, string> = {
  worker: "Workers",
  contract: "Contracts",
  timesheet: "Timesheets",
  invoice: "Invoices",
  leaveRequest: "Leave requests",
  business: "Businesses",
};

const ENTITY_ORDER: SearchEntity[] = [
  "contract",
  "invoice",
  "timesheet",
  "leaveRequest",
  "worker",
  "business",
];

function groupSessionsByDay(sessions: SessionSummary[]): Array<{ label: string; items: SessionSummary[] }> {
  const now = new Date();
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const today = startOfDay(now);
  const yesterday = today - 24 * 60 * 60 * 1000;
  const lastWeek = today - 7 * 24 * 60 * 60 * 1000;
  const buckets: Record<string, SessionSummary[]> = {
    Today: [],
    Yesterday: [],
    "Last week": [],
    Earlier: [],
  };
  for (const s of sessions) {
    const t = new Date(s.lastMessageAt).getTime();
    const day = startOfDay(new Date(t));
    if (day === today) buckets.Today.push(s);
    else if (day === yesterday) buckets.Yesterday.push(s);
    else if (day >= lastWeek) buckets["Last week"].push(s);
    else buckets.Earlier.push(s);
  }
  return (["Today", "Yesterday", "Last week", "Earlier"] as const)
    .map((label) => ({ label, items: buckets[label] }))
    .filter((g) => g.items.length > 0);
}

export function AiSearchModal({ open, onOpenChange }: AiSearchModalProps) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const activeRole = (user as any)?.activeRole ?? (user as any)?.userType ?? "";
  const isAdmin = activeRole === "sdp_internal";
  const isWorker = activeRole === "worker";
  const inputRef = useRef<HTMLInputElement | null>(null);
  const threadRef = useRef<HTMLDivElement | null>(null);

  const [query, setQuery] = useState("");
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [renamingSessionId, setRenamingSessionId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const [openPrimer, setOpenPrimer] = useState<{ slug: string; body: string } | null>(null);

  // A role switch invalidates every visible session — the sidebar refetches
  // under the new role, so an old activeSessionId would 404. Drop it.
  useEffect(() => {
    setActiveSessionId(null);
    setOpenPrimer(null);
  }, [activeRole]);

  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open, activeSessionId]);

  const sessionsQuery = useQuery<{ items: SessionSummary[] }>({
    queryKey: ["/api/ai/search/sessions"],
    enabled: open,
  });

  const activeSessionQuery = useQuery<SessionWithMessages>({
    queryKey: ["/api/ai/search/sessions", activeSessionId],
    enabled: open && !!activeSessionId,
  });

  const searchMutation = useMutation({
    mutationFn: async ({ question, sessionId }: { question: string; sessionId: string | null }) => {
      const res = await apiRequest("POST", "/api/ai/search", {
        query: question,
        sessionId: sessionId ?? undefined,
        context: {
          currentPage: typeof window !== "undefined" ? window.location.pathname : undefined,
          activeRole,
        },
      });
      return (await res.json()) as SearchResponse;
    },
    onSuccess: async (data) => {
      const nextSessionId = data.sessionId ?? activeSessionId;
      if (nextSessionId && nextSessionId !== activeSessionId) {
        setActiveSessionId(nextSessionId);
      }
      // Refresh the two queries that back the sidebar + the active thread.
      // Await so the composer's "in flight" spinner clears only once the
      // thread has repainted.
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["/api/ai/search/sessions"] }),
        nextSessionId
          ? queryClient.invalidateQueries({
              queryKey: ["/api/ai/search/sessions", nextSessionId],
            })
          : Promise.resolve(),
      ]);
    },
    onError: (err: any) => {
      const msg = err?.message ?? "Failed to reach the AI search service.";
      toast({ title: "Search failed", description: msg, variant: "destructive" });
    },
  });

  const renameMutation = useMutation({
    mutationFn: async ({ id, title }: { id: string; title: string }) => {
      const res = await apiRequest("PATCH", `/api/ai/search/sessions/${id}`, { title });
      return (await res.json()) as { id: string; title: string };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ai/search/sessions"] });
      setRenamingSessionId(null);
      setRenameDraft("");
    },
    onError: (err: any) => {
      toast({ title: "Rename failed", description: err?.message ?? "", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/ai/search/sessions/${id}`);
      return await res.json();
    },
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ["/api/ai/search/sessions"] });
      if (activeSessionId === id) setActiveSessionId(null);
    },
    onError: (err: any) => {
      toast({ title: "Delete failed", description: err?.message ?? "", variant: "destructive" });
    },
  });

  const primerMutation = useMutation({
    mutationFn: async (slug: string) => {
      const res = await apiRequest("GET", `/api/ai/search/primers/${encodeURIComponent(slug)}`);
      return (await res.json()) as { slug: string; title: string; body: string };
    },
    onSuccess: (data) => {
      setOpenPrimer({ slug: data.title || data.slug, body: data.body ?? "" });
    },
    onError: (err: any) => {
      toast({
        title: "Could not load primer",
        description: err?.message ?? "Unknown error",
        variant: "destructive",
      });
    },
  });

  const samples = useMemo(() => {
    if (isAdmin) return SAMPLE_PROMPTS_ADMIN;
    if (isWorker) return SAMPLE_PROMPTS_WORKER;
    return SAMPLE_PROMPTS_BUSINESS;
  }, [isAdmin, isWorker]);

  const sessions = sessionsQuery.data?.items ?? [];
  const groupedSessions = useMemo(() => groupSessionsByDay(sessions), [sessions]);
  const activeMessages = activeSessionQuery.data?.messages ?? [];

  // Auto-scroll the thread to bottom on new messages / new session load.
  useEffect(() => {
    if (!threadRef.current) return;
    threadRef.current.scrollTop = threadRef.current.scrollHeight;
  }, [activeMessages.length, searchMutation.isPending, openPrimer]);

  const submit = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || searchMutation.isPending) return;
    searchMutation.mutate({ question: trimmed, sessionId: activeSessionId });
    setQuery("");
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit(query);
    }
  };

  const openRow = (href: string) => {
    onOpenChange(false);
    setLocation(href);
  };

  const beginNewChat = () => {
    setActiveSessionId(null);
    setOpenPrimer(null);
    setQuery("");
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const beginRename = (session: SessionSummary) => {
    setRenamingSessionId(session.id);
    setRenameDraft(session.title);
  };

  const commitRename = () => {
    if (!renamingSessionId) return;
    const title = renameDraft.trim();
    if (!title) {
      setRenamingSessionId(null);
      return;
    }
    renameMutation.mutate({ id: renamingSessionId, title });
  };

  const cancelRename = () => {
    setRenamingSessionId(null);
    setRenameDraft("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-5xl w-[95vw] p-0 overflow-hidden gap-0"
        data-testid="ai-search-modal"
      >
        <div className="flex h-[70vh] min-h-[420px]">
          {/* Sidebar */}
          <aside className="w-64 shrink-0 border-r flex flex-col bg-secondary-50/50">
            <div className="p-3 border-b">
              <Button
                type="button"
                variant="outline"
                className="w-full justify-start gap-2"
                onClick={beginNewChat}
                data-testid="ai-search-new-chat"
              >
                <Plus className="h-4 w-4" />
                New chat
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto py-2">
              {sessionsQuery.isLoading ? (
                <div className="px-3 py-6 text-xs text-secondary-500">Loading…</div>
              ) : groupedSessions.length === 0 ? (
                <div className="px-3 py-6 text-xs text-secondary-500">
                  No chats yet. Ask something to start.
                </div>
              ) : (
                groupedSessions.map((group) => (
                  <div key={group.label} className="pb-2">
                    <div className="px-3 py-1 text-[10px] uppercase tracking-wider text-secondary-500">
                      {group.label}
                    </div>
                    <div className="space-y-0.5 px-1">
                      {group.items.map((s) => {
                        const isActive = s.id === activeSessionId;
                        const isRenaming = s.id === renamingSessionId;
                        return (
                          <div
                            key={s.id}
                            className={cn(
                              "group flex items-center gap-1 rounded-md px-2 py-1.5 text-sm",
                              isActive
                                ? "bg-primary-100 text-primary-900"
                                : "hover:bg-secondary-100 text-secondary-800",
                            )}
                            data-testid="ai-search-session-row"
                          >
                            {isRenaming ? (
                              <>
                                <input
                                  autoFocus
                                  value={renameDraft}
                                  onChange={(e) => setRenameDraft(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") commitRename();
                                    if (e.key === "Escape") cancelRename();
                                  }}
                                  className="flex-1 min-w-0 rounded bg-white border px-1.5 py-1 text-sm outline-none"
                                  maxLength={60}
                                  data-testid="ai-search-session-rename-input"
                                />
                                <button
                                  type="button"
                                  onClick={commitRename}
                                  className="p-1 hover:bg-white rounded"
                                  aria-label="Save"
                                  data-testid="ai-search-session-rename-save"
                                >
                                  <Check className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={cancelRename}
                                  className="p-1 hover:bg-white rounded"
                                  aria-label="Cancel"
                                >
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveSessionId(s.id);
                                    setOpenPrimer(null);
                                  }}
                                  className="flex-1 min-w-0 truncate text-left"
                                  data-testid="ai-search-session-open"
                                >
                                  {s.title || "New chat"}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => beginRename(s)}
                                  className="opacity-0 group-hover:opacity-100 p-1 hover:bg-white rounded transition"
                                  aria-label="Rename"
                                  data-testid="ai-search-session-rename"
                                >
                                  <Pencil className="h-3 w-3 text-secondary-500" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (confirm("Delete this chat? This cannot be undone.")) {
                                      deleteMutation.mutate(s.id);
                                    }
                                  }}
                                  className="opacity-0 group-hover:opacity-100 p-1 hover:bg-white rounded transition"
                                  aria-label="Delete"
                                  data-testid="ai-search-session-delete"
                                >
                                  <Trash2 className="h-3 w-3 text-secondary-500" />
                                </button>
                              </>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>
          </aside>

          {/* Thread + composer */}
          <section className="flex-1 min-w-0 flex flex-col">
            {/* Thread body */}
            <div ref={threadRef} className="flex-1 overflow-y-auto">
              {openPrimer ? (
                <PrimerPanel
                  slug={openPrimer.slug}
                  body={openPrimer.body}
                  onClose={() => setOpenPrimer(null)}
                />
              ) : !activeSessionId && !searchMutation.isPending && activeMessages.length === 0 ? (
                <EmptyState samples={samples} onPick={submit} />
              ) : (
                <div className="p-4 space-y-4">
                  {activeSessionQuery.isLoading && !searchMutation.isPending && activeMessages.length === 0 && (
                    <div className="text-sm text-secondary-500">Loading chat…</div>
                  )}
                  {activeMessages.map((m) => (
                    <MessageBubble
                      key={m.id}
                      message={m}
                      onOpenRow={openRow}
                      onOpenPrimer={(slug) => primerMutation.mutate(slug)}
                      onSubmit={submit}
                      primerLoading={primerMutation.isPending}
                    />
                  ))}
                  {/* Optimistic: show the user's question the instant they hit
                      Send, plus an assistant "thinking" indicator. Both are
                      replaced by the persisted turns once the server response
                      lands and the thread query refetches. */}
                  {searchMutation.isPending && searchMutation.variables && (
                    <>
                      <div className="flex items-start gap-2" data-testid="pending-user-bubble">
                        <UserIcon className="h-4 w-4 mt-0.5 text-secondary-500" />
                        <div className="max-w-[85%] rounded-md bg-primary-50 border border-primary-100 px-3 py-2 text-sm text-secondary-800 whitespace-pre-wrap">
                          {searchMutation.variables.question}
                        </div>
                      </div>
                      <div className="flex items-start gap-2 text-sm text-secondary-500">
                        <Bot className="h-4 w-4 mt-0.5" />
                        <div className="flex items-center gap-2">
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          Working on it…
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Composer */}
            <div className="border-t p-3">
              <div className="flex items-center gap-2 rounded-md border px-3 py-2 bg-white focus-within:border-primary-400 focus-within:ring-1 focus-within:ring-primary-200">
                <Search className="h-4 w-4 text-secondary-400 shrink-0" />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={onKeyDown}
                  placeholder={
                    activeSessionId
                      ? "Reply in this chat…"
                      : isAdmin
                        ? "Ask about workers, contracts, invoices, or a country's employment rules…"
                        : isWorker
                          ? "Ask about your timesheets, leave, or how something works…"
                          : "Ask about your workforce, contracts, invoices, or hiring costs…"
                  }
                  className="flex-1 bg-transparent outline-none text-sm placeholder:text-secondary-400"
                  data-testid="ai-search-input"
                  disabled={searchMutation.isPending}
                />
                {searchMutation.isPending && (
                  <Loader2 className="h-4 w-4 animate-spin text-secondary-400" />
                )}
                <Button
                  type="button"
                  size="sm"
                  className="h-7 px-3"
                  onClick={() => submit(query)}
                  disabled={!query.trim() || searchMutation.isPending}
                  data-testid="ai-search-submit"
                >
                  Send
                </Button>
              </div>
              <div className="flex items-center justify-between mt-2 px-1 text-xs text-secondary-400">
                <span>
                  {activeSessionId
                    ? "Answers grounded in your data. AI never makes changes."
                    : "Start a new chat by asking anything above."}
                </span>
                <span>↵ send · Esc close</span>
              </div>
            </div>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function EmptyState({ samples, onPick }: { samples: string[]; onPick: (text: string) => void }) {
  return (
    <div className="p-6">
      <div className="mx-auto max-w-md text-center py-8">
        <div className="mx-auto h-10 w-10 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center">
          <Sparkles className="h-5 w-5" />
        </div>
        <h3 className="mt-3 text-base font-semibold text-secondary-800">
          Search, ask, or estimate
        </h3>
        <p className="mt-1 text-sm text-secondary-500">
          Find people and records, ask how SDP works, or get grounded numbers for pay,
          tax, and on-costs by country.
        </p>
      </div>
      <div className="mx-auto max-w-lg">
        <div className="text-xs uppercase text-secondary-500 mb-2 px-1">Try one of these</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {samples.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => onPick(s)}
              className="rounded-md border px-3 py-2 text-left text-sm text-secondary-700 hover:bg-secondary-50 hover:border-secondary-300 transition"
              data-testid="ai-search-sample"
            >
              {s}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function MessageBubble({
  message,
  onOpenRow,
  onOpenPrimer,
  onSubmit,
  primerLoading,
}: {
  message: StoredMessage;
  onOpenRow: (href: string) => void;
  onOpenPrimer: (slug: string) => void;
  onSubmit: (text: string) => void;
  primerLoading: boolean;
}) {
  if (message.role === "user") {
    return (
      <div className="flex items-start gap-2">
        <UserIcon className="h-4 w-4 mt-0.5 text-secondary-500" />
        <div className="max-w-[85%] rounded-md bg-primary-50 border border-primary-100 px-3 py-2 text-sm text-secondary-800 whitespace-pre-wrap">
          {message.content}
        </div>
      </div>
    );
  }
  const payload = message.payload;
  const rowsByEntity = new Map<SearchEntity, SearchRow[]>();
  for (const r of payload?.rows ?? []) {
    const list = rowsByEntity.get(r.entity) ?? [];
    list.push(r);
    rowsByEntity.set(r.entity, list);
  }
  const hasBody =
    (payload?.answer && payload.answer.trim().length > 0) ||
    (payload?.rows?.length ?? 0) > 0 ||
    (payload?.citations?.length ?? 0) > 0;
  return (
    <div className="flex items-start gap-2">
      <Bot className="h-4 w-4 mt-0.5 text-secondary-500 shrink-0" />
      <div className="flex-1 min-w-0 space-y-3">
        {!hasBody && (
          <div className="text-sm text-secondary-500 whitespace-pre-wrap">
            {message.content || "(no response)"}
          </div>
        )}
        {payload?.answer && (
          <div className="rounded-md border bg-white p-3">
            <p className="text-sm text-secondary-800 whitespace-pre-wrap">{payload.answer}</p>
            {payload.citations.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {payload.citations.map((c, i) => (
                  <button
                    key={`${c.kind}-${i}`}
                    type="button"
                    onClick={() => {
                      if (c.kind === "primer" && c.slug) onOpenPrimer(c.slug);
                    }}
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs",
                      c.kind === "primer"
                        ? "border-primary-200 bg-primary-50 text-primary-700 hover:bg-primary-100"
                        : "border-secondary-200 bg-white text-secondary-600",
                    )}
                    disabled={c.kind !== "primer" || primerLoading}
                    data-testid={`citation-${c.kind}`}
                  >
                    {c.kind === "primer" ? (
                      <BookOpen className="h-3 w-3" />
                    ) : (
                      <Wrench className="h-3 w-3" />
                    )}
                    {c.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        {ENTITY_ORDER.map((entity) => {
          const rows = rowsByEntity.get(entity);
          if (!rows || rows.length === 0) return null;
          return (
            <div key={entity}>
              <div className="text-xs uppercase text-secondary-500 mb-1 px-1">
                {ENTITY_LABEL[entity]}
              </div>
              <div className="space-y-1">
                {rows.map((r) => (
                  <button
                    key={`${entity}-${r.id}`}
                    type="button"
                    onClick={() => onOpenRow(r.href)}
                    className="flex w-full items-center justify-between rounded-md border border-transparent px-3 py-2 text-left hover:bg-secondary-50 hover:border-secondary-200 transition"
                    data-testid={`row-${entity}`}
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-secondary-800 truncate">
                        {r.title}
                      </div>
                      {r.subtitle && (
                        <div className="text-xs text-secondary-500 truncate">{r.subtitle}</div>
                      )}
                      {r.badges && r.badges.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {r.badges.map((b, i) => (
                            <span
                              key={i}
                              className="inline-flex items-center rounded-full border border-secondary-200 bg-secondary-50 px-1.5 py-0.5 text-[10px] text-secondary-600"
                            >
                              {b}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <ArrowRight className="h-4 w-4 text-secondary-400 shrink-0 ml-2" />
                  </button>
                ))}
              </div>
            </div>
          );
        })}
        {payload?.followUp && (
          <button
            type="button"
            onClick={() => onSubmit(payload.followUp!)}
            className="w-full rounded-md border border-dashed border-secondary-300 px-3 py-2 text-left text-sm text-secondary-600 hover:bg-secondary-50"
            data-testid="ai-search-followup"
          >
            {payload.followUp}
          </button>
        )}
      </div>
    </div>
  );
}

function PrimerPanel({ slug, body, onClose }: { slug: string; body: string; onClose: () => void }) {
  return (
    <div className="p-4 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs uppercase text-secondary-500">
          <BookOpen className="h-3 w-3" />
          {slug}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-xs h-7"
          onClick={onClose}
          data-testid="ai-search-primer-back"
        >
          Back
        </Button>
      </div>
      <div className="rounded-md border bg-white p-3 text-sm text-secondary-800 whitespace-pre-wrap">
        {body || "(primer body unavailable)"}
      </div>
    </div>
  );
}

