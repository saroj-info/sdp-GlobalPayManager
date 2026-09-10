import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { History, Loader2, Plus, Send, Sparkles, Trash2 } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

interface SessionSummary {
  id: string;
  title: string;
  lastMessageAt: string;
  createdAt: string;
}

interface StoredMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  payload: { grounded?: boolean; followUp?: string | null } | null;
  createdAt: string;
}

interface CountryIntelResponse {
  answer: string;
  grounded: boolean;
  followUp?: string;
  sessionId: string;
}

interface CountryIntelChatProps {
  countryName: string; // canonical curated name, e.g. "Australia"
  employmentType?: string;
}

/**
 * "Ask AI" chat for the country intel panel. Messages render from the
 * persisted session (same pattern as the AI search modal) so a reopened
 * wizard can resume past conversations via the history popover. The panel
 * remounts on country change, which resets the chat — by design.
 */
export function CountryIntelChat({ countryName, employmentType }: CountryIntelChatProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const enabled = (user as any)?.featureFlags?.aiCountryIntelEnabled === true;

  const sessionsQuery = useQuery<{ items: SessionSummary[] }>({
    queryKey: ["/api/ai/country-intel/sessions"],
    enabled: enabled && historyOpen,
  });

  const activeSessionQuery = useQuery<{ messages: StoredMessage[] }>({
    queryKey: ["/api/ai/country-intel/sessions", activeSessionId],
    enabled: enabled && !!activeSessionId,
  });

  const askMutation = useMutation({
    mutationFn: async (question: string) => {
      const res = await apiRequest("POST", "/api/ai/country-intel", {
        query: question,
        sessionId: activeSessionId ?? undefined,
        country: countryName,
        employmentType,
      });
      return (await res.json()) as CountryIntelResponse;
    },
    onSuccess: async (data) => {
      setActiveSessionId(data.sessionId);
      // Render from the persisted messages, not the mutation payload — the
      // spinner clears when the repaint lands (AI-search modal pattern).
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["/api/ai/country-intel/sessions"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/ai/country-intel/sessions", data.sessionId] }),
      ]);
    },
    onError: (err: any) => {
      toast({
        title: "Ask AI failed",
        description: err?.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  const archiveMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/ai/country-intel/sessions/${id}`);
      return id;
    },
    onSuccess: (id) => {
      queryClient.invalidateQueries({ queryKey: ["/api/ai/country-intel/sessions"] });
      if (id === activeSessionId) setActiveSessionId(null);
    },
  });

  const messages = activeSessionQuery.data?.messages ?? [];

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages.length, askMutation.isPending]);

  if (!enabled) return null;

  const submit = (question: string) => {
    const q = question.trim();
    if (!q || askMutation.isPending) return;
    setDraft("");
    askMutation.mutate(q);
  };

  const lastFollowUp = !askMutation.isPending
    ? (messages[messages.length - 1]?.payload?.followUp ?? null)
    : null;

  return (
    <div className="border-t border-blue-200 pt-3 space-y-2" data-testid="section-country-intel-chat">
      <div className="flex items-center gap-2">
        <Sparkles className="h-3.5 w-3.5 text-blue-600 flex-shrink-0" />
        <p className="text-xs font-semibold text-blue-900 uppercase tracking-wide flex-1">
          Ask AI about hiring in {countryName}
        </p>
        <Popover open={historyOpen} onOpenChange={setHistoryOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-blue-700"
              title="Previous conversations"
              data-testid="button-country-intel-history"
            >
              <History className="h-3.5 w-3.5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-2" align="end">
            {sessionsQuery.isLoading ? (
              <p className="text-xs text-secondary-500 p-2">Loading…</p>
            ) : (sessionsQuery.data?.items ?? []).length === 0 ? (
              <p className="text-xs text-secondary-500 p-2">No previous conversations.</p>
            ) : (
              <div className="max-h-64 overflow-y-auto divide-y divide-secondary-100">
                {(sessionsQuery.data?.items ?? []).map((s) => (
                  <div key={s.id} className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => { setActiveSessionId(s.id); setHistoryOpen(false); }}
                      className="flex-1 min-w-0 text-left py-2 px-2 rounded hover:bg-secondary-50"
                      data-testid={`row-country-intel-session-${s.id}`}
                    >
                      <span className="block text-sm text-secondary-900 truncate">{s.title}</span>
                      <span className="block text-xs text-secondary-500">
                        {new Date(s.lastMessageAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                      </span>
                    </button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-secondary-400 hover:text-red-600 flex-shrink-0"
                      onClick={() => archiveMutation.mutate(s.id)}
                      title="Delete conversation"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </PopoverContent>
        </Popover>
        {activeSessionId && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-blue-700"
            onClick={() => setActiveSessionId(null)}
            title="New conversation"
            data-testid="button-country-intel-new-chat"
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      {(messages.length > 0 || askMutation.isPending) && (
        <div ref={scrollRef} className="max-h-64 overflow-y-auto space-y-2 pr-1">
          {messages.map((m) => (
            <div key={m.id} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
              <div
                className={
                  m.role === "user"
                    ? "max-w-[85%] rounded-lg bg-primary-600 text-white text-sm px-3 py-2"
                    : "max-w-[85%] rounded-lg bg-white border border-blue-200 text-sm text-secondary-800 px-3 py-2"
                }
              >
                <p className="whitespace-pre-wrap">{m.content}</p>
                {m.role === "assistant" && m.payload?.grounded === false && (
                  <p className="mt-1 text-xs text-amber-700">
                    Not from SDP's curated data — verify independently.
                  </p>
                )}
              </div>
            </div>
          ))}
          {askMutation.isPending && (
            <>
              <div className="flex justify-end">
                <div className="max-w-[85%] rounded-lg bg-primary-600 text-white text-sm px-3 py-2 opacity-70">
                  <p className="whitespace-pre-wrap">{askMutation.variables as string}</p>
                </div>
              </div>
              <div className="flex justify-start">
                <div className="rounded-lg bg-white border border-blue-200 px-3 py-2">
                  <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {lastFollowUp && (
        <button
          type="button"
          onClick={() => submit(lastFollowUp)}
          className="text-xs text-blue-700 border border-dashed border-blue-300 rounded-full px-3 py-1 hover:bg-blue-100"
          data-testid="button-country-intel-follow-up"
        >
          {lastFollowUp}
        </button>
      )}

      <div className="flex items-center gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              submit(draft);
            }
          }}
          placeholder={`e.g. "What notice period applies in ${countryName}?"`}
          className="bg-white text-sm"
          disabled={askMutation.isPending}
          data-testid="input-country-intel-question"
        />
        <Button
          type="button"
          size="sm"
          onClick={() => submit(draft)}
          disabled={askMutation.isPending || !draft.trim()}
          data-testid="button-country-intel-send"
        >
          {askMutation.isPending
            ? <Loader2 className="h-4 w-4 animate-spin" />
            : <Send className="h-4 w-4" />}
        </Button>
      </div>
      <p className="text-xs text-secondary-500">
        AI answers can be wrong — grounded figures come from SDP's curated data.
      </p>
    </div>
  );
}
