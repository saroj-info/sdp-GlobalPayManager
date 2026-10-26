/**
 * SDP admin editor for the default SDP fee lines a new quote starts from
 * (Templates → System Settings). One list per engagement category × "SDP is
 * billing agent". Server: modules/quotes (GET/PUT /api/admin/quote-fee-defaults).
 */
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, Loader2, Save, Sparkles } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiRequest, extractApiErrorMessage } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import type { QuoteFeeDefault } from "@shared/schema";
import {
  QUOTE_ENGAGEMENT_CATEGORIES,
  QUOTE_ENGAGEMENT_CATEGORY_LABELS,
  SUGGESTED_QUOTE_FEE_DEFAULTS,
  newQuoteLineId,
  type QuoteEngagementCategory,
  type QuoteFeeLine,
} from "@shared/quotes";
import { FeeLinesTable } from "@/components/quotes/fee-lines-table";

const ADMIN_KEY = "/api/admin/quote-fee-defaults";

type LocalItem = QuoteFeeLine & { engagementCategory: QuoteEngagementCategory; sdpIsBillingAgent: boolean };

function rowToLocal(r: QuoteFeeDefault): LocalItem {
  return {
    id: r.id,
    description: r.description,
    lineType: r.lineType as QuoteFeeLine["lineType"],
    rate: r.rate != null ? Number(r.rate) : null,
    amountUsd: r.amountUsd != null ? Number(r.amountUsd) : null,
    paidBy: r.paidBy as QuoteFeeLine["paidBy"],
    applies: r.isActive,
    sortOrder: r.sortOrder,
    note: null,
    engagementCategory: r.engagementCategory as QuoteEngagementCategory,
    sdpIsBillingAgent: r.sdpIsBillingAgent,
  };
}

export function QuoteFeeDefaultsPanel() {
  const { user } = useAuth();
  const sdpRole = (user as any)?.sdpRole;
  const isAdmin = sdpRole === "sdp_super_admin" || sdpRole === "sdp_admin";
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery<{ items: QuoteFeeDefault[] }>({ queryKey: [ADMIN_KEY], enabled: isAdmin });

  const [items, setItems] = useState<LocalItem[]>([]);
  const [dirty, setDirty] = useState(false);
  const [category, setCategory] = useState<QuoteEngagementCategory>("employment");
  const [billingAgent, setBillingAgent] = useState(false);

  useEffect(() => {
    if (dirty || !data) return;
    setItems(data.items.map(rowToLocal));
  }, [data, dirty]);

  const inCell = (i: LocalItem) => i.engagementCategory === category && i.sdpIsBillingAgent === billingAgent;
  const cellLines: QuoteFeeLine[] = items.filter(inCell);

  const setCellLines = (lines: QuoteFeeLine[]) => {
    setDirty(true);
    setItems((prev) => [
      ...prev.filter((i) => !inCell(i)),
      ...lines.map((l) => ({ ...l, engagementCategory: category, sdpIsBillingAgent: billingAgent })),
    ]);
  };

  const loadSuggested = () => {
    const suggested = SUGGESTED_QUOTE_FEE_DEFAULTS.filter((d) => d.engagementCategory === category && d.sdpIsBillingAgent === billingAgent);
    setCellLines(
      suggested.map((d, idx) => ({
        id: newQuoteLineId("fee"),
        description: d.description,
        lineType: d.lineType,
        rate: d.rate,
        amountUsd: d.amountUsd,
        paidBy: d.paidBy,
        applies: true,
        sortOrder: idx,
        note: null,
      })),
    );
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        items: items.map((i) => ({
          engagementCategory: i.engagementCategory,
          sdpIsBillingAgent: i.sdpIsBillingAgent,
          description: i.description,
          lineType: i.lineType,
          rate: i.lineType === "percentage_of_pay" ? (i.rate ?? 0) : null,
          amountUsd: i.lineType === "fixed_amount" ? (i.amountUsd ?? 0) : null,
          paidBy: i.paidBy,
          sortOrder: i.sortOrder,
          isActive: i.applies,
        })),
      };
      const res = await apiRequest("PUT", ADMIN_KEY, payload);
      return (await res.json()) as { items: QuoteFeeDefault[] };
    },
    onSuccess: async ({ items: saved }) => {
      queryClient.setQueryData([ADMIN_KEY], { items: saved });
      setItems(saved.map(rowToLocal));
      setDirty(false);
      toast({ title: "SDP fee defaults saved", description: `${saved.length} fee line${saved.length === 1 ? "" : "s"} across all engagement types.` });
      await queryClient.invalidateQueries({
        predicate: (q) => typeof q.queryKey[0] === "string" && (q.queryKey[0].startsWith(ADMIN_KEY) || q.queryKey[0].startsWith("/api/quotes/defaults")),
      });
    },
    onError: (err: any) => toast({ title: "Could not save fee defaults", description: extractApiErrorMessage(err, "Please check the lines and try again."), variant: "destructive" }),
  });

  const invalidLine = items.find((i) => !i.description.trim());

  return (
    <Card data-testid="quote-fee-defaults-panel">
      <CardHeader>
        <CardTitle className="text-base">Quote SDP fee defaults</CardTitle>
        <CardDescription>
          The SDP fee lines a new quote starts from, per engagement category and depending on whether SDP acts as billing agent.
          Percentage fees are a share of annual gross pay; fixed fees are USD per month. Every quote can still edit its own lines.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isAdmin && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>Only SDP super admins and admins can edit the fee defaults.</AlertDescription>
          </Alert>
        )}
        {isAdmin && error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{extractApiErrorMessage(error, "Could not load the fee defaults.")}</AlertDescription>
          </Alert>
        )}
        {isAdmin && (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Tabs value={category} onValueChange={(v) => setCategory(v as QuoteEngagementCategory)}>
                <TabsList>
                  {QUOTE_ENGAGEMENT_CATEGORIES.map((c) => (
                    <TabsTrigger key={c} value={c} data-testid={`fee-defaults-tab-${c}`}>{QUOTE_ENGAGEMENT_CATEGORY_LABELS[c]}</TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
              <div className="flex items-center gap-2">
                <Switch id="fee-defaults-billing-agent" checked={billingAgent} onCheckedChange={setBillingAgent} data-testid="switch-fee-defaults-billing-agent" />
                <Label htmlFor="fee-defaults-billing-agent" className="text-sm">SDP acts as billing agent</Label>
              </div>
            </div>

            {isLoading ? (
              <div className="flex items-center gap-2 text-sm text-secondary-600"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
            ) : (
              <FeeLinesTable
                mode="defaults"
                lines={cellLines}
                onChange={setCellLines}
                showPaidBy
                addLabel="Add default fee"
                emptyText="No default fees for this combination yet. Add lines or load the suggested placeholders."
              />
            )}

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-secondary-100 pt-4">
              <Button type="button" variant="outline" size="sm" onClick={loadSuggested} data-testid="button-load-suggested-fees">
                <Sparkles className="mr-1 h-4 w-4" /> Load suggested placeholders for this combination
              </Button>
              <div className="flex items-center gap-3">
                {dirty && <span className="text-xs text-amber-700">Unsaved changes</span>}
                <Button type="button" size="sm" onClick={() => saveMutation.mutate()} disabled={!dirty || saveMutation.isPending || !!invalidLine} data-testid="button-save-fee-defaults">
                  {saveMutation.isPending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Save className="mr-1 h-4 w-4" />} Save all fee defaults
                </Button>
              </div>
            </div>
            {invalidLine && <p className="text-xs text-destructive">Every fee line needs a description before saving.</p>}
            <p className="text-xs text-secondary-500">
              The suggested placeholders use the public pricing page figures (USD per month) plus a 2% billing-agent fee paid by the host client. Replace them with SDP's real schedule.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
