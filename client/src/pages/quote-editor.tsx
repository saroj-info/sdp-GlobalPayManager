/**
 * /quotes/new and /quotes/:id — the quote editor. One draft object feeds the
 * inputs on the left and the live preview on the right through
 * `computeQuote`, so both always show the same figures in the local currency
 * and USD. SDP internal users only.
 */
import { useEffect, useMemo, useState } from "react";
import { useLocation, useParams } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Copy, Loader2, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { BusinessCombobox } from "@/components/pickers/BusinessCombobox";
import { usePageHeader } from "@/contexts/AuthenticatedLayoutContext";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, extractApiErrorMessage } from "@/lib/queryClient";
import { downloadQuotePdf } from "@/lib/generateQuotePdf";
import type { Country, Quote } from "@shared/schema";
import {
  QUOTE_STATUSES,
  QUOTE_STATUS_LABELS,
  computeQuote,
  type QuoteCostLine,
  type QuoteDefaultsResponse,
  type QuoteFeeLine,
  type QuoteStatus,
} from "@shared/quotes";
import { EngagementCard } from "@/components/quotes/engagement-card";
import { PayCard } from "@/components/quotes/pay-card";
import { FeesNotesCard } from "@/components/quotes/fees-notes-card";
import { QuotePreviewPanel } from "@/components/quotes/quote-preview-panel";
import {
  draftFx, draftProblem, draftToInput, draftToPayload, emptyDraft, fxFieldsFor, quoteRowToDraft, type QuoteDraft,
} from "@/components/quotes/quote-draft";

const QUOTES_PREFIX = "/api/quotes";

function invalidateQuotes(queryClient: ReturnType<typeof useQueryClient>) {
  return queryClient.invalidateQueries({
    predicate: (q) => typeof q.queryKey[0] === "string" && q.queryKey[0].startsWith(QUOTES_PREFIX),
  });
}

export default function QuoteEditor() {
  const params = useParams<{ id?: string }>();
  const quoteId = params.id && params.id !== "new" ? params.id : null;
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isSdp = (user as any)?.userType === "sdp_internal";

  usePageHeader(quoteId ? "Quote" : "New quote", "Cost of hiring one worker in a country, in the local currency and USD");

  const { data: countries = [] } = useQuery<Country[]>({ queryKey: ["/api/countries"], enabled: isSdp });
  const { data: quoteData, isLoading: quoteLoading, error: quoteError } = useQuery<{ quote: Quote }>({
    queryKey: [QUOTES_PREFIX, quoteId],
    enabled: !!quoteId && isSdp,
  });

  const [draft, setDraft] = useState<QuoteDraft | null>(null);
  const [costLinesTouched, setCostLinesTouched] = useState(false);
  const [feeLinesTouched, setFeeLinesTouched] = useState(false);
  const [fxTouched, setFxTouched] = useState(false);
  const [jurisdictionTouched, setJurisdictionTouched] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  // First draft: the saved row (edit) or an empty quote for the first country (new).
  useEffect(() => {
    if (draft) return;
    if (quoteId) {
      if (quoteData?.quote) {
        setDraft(quoteRowToDraft(quoteData.quote));
        setCostLinesTouched(true);
        setFeeLinesTouched(true);
        setFxTouched(true);
        setJurisdictionTouched(true);
      }
      return;
    }
    if (countries.length) {
      const first = countries.find((c) => c.id === "au") ?? countries[0];
      setDraft(emptyDraft({ countryId: first.id, currency: first.currency }));
    }
  }, [draft, quoteId, quoteData, countries]);

  const defaultsUrl = draft
    ? `${QUOTES_PREFIX}/defaults?countryId=${encodeURIComponent(draft.countryId)}&category=${draft.engagementCategory}` +
      `&billingAgent=${draft.isForClient && draft.sdpIsBillingAgent}&jurisdiction=${encodeURIComponent(draft.jurisdiction)}`
    : null;
  const { data: defaults, isFetching: defaultsLoading } = useQuery<QuoteDefaultsResponse>({
    queryKey: [defaultsUrl],
    enabled: !!defaultsUrl && isSdp,
    staleTime: 60_000,
  });

  // Seed the lines, the currency and the live rate from the defaults while
  // the user has not edited them (edits set the "touched" flags).
  useEffect(() => {
    if (!defaults) return;
    setDraft((d) => {
      if (!d) return d;
      let next = d;
      if (!costLinesTouched) next = { ...next, costLines: defaults.costLines };
      if (!feeLinesTouched) next = { ...next, feeLines: defaults.feeLines };
      if (defaults.country.id === next.countryId && defaults.country.currency !== next.currency) {
        next = { ...next, currency: defaults.country.currency };
      }
      if (!fxTouched) {
        const f = fxFieldsFor(defaults.fx, defaults.country.currency);
        if (f) next = { ...next, ...f };
      }
      if (next.jurisdiction && !defaults.jurisdictions.includes(next.jurisdiction)) next = { ...next, jurisdiction: "" };
      // A new quote starts on the country's first state (Australia: New South Wales) so state payroll tax is quoted.
      if (!jurisdictionTouched && !next.jurisdiction && defaults.country.id === next.countryId && defaults.jurisdictions.length) {
        next = { ...next, jurisdiction: defaults.jurisdictions[0] };
      }
      return next === d ? d : next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaults]);

  const result = useMemo(() => (draft ? computeQuote(draftToInput(draft), draftFx(draft)) : null), [draft]);

  const update = (patch: Partial<QuoteDraft>) => {
    if ("fxLocalPerUsd" in patch) setFxTouched(true);
    if ("jurisdiction" in patch && !("countryId" in patch)) setJurisdictionTouched(true);
    if ("countryId" in patch) setJurisdictionTouched(false);
    setDraft((d) => (d ? { ...d, ...patch } : d));
  };
  const onCostLinesChange = (lines: QuoteCostLine[]) => {
    setCostLinesTouched(true);
    setDraft((d) => (d ? { ...d, costLines: lines } : d));
  };
  const onFeeLinesChange = (lines: QuoteFeeLine[]) => {
    setFeeLinesTouched(true);
    setDraft((d) => (d ? { ...d, feeLines: lines } : d));
  };
  const reloadCostDefaults = () => {
    setCostLinesTouched(false);
    if (defaults) setDraft((d) => (d ? { ...d, costLines: defaults.costLines } : d));
  };
  const reloadFeeDefaults = () => {
    setFeeLinesTouched(false);
    if (defaults) setDraft((d) => (d ? { ...d, feeLines: defaults.feeLines } : d));
  };
  const liveFx = draft ? fxFieldsFor(defaults?.fx, draft.currency) : null;
  const useLiveRate = () => {
    if (!liveFx) return;
    setFxTouched(false);
    setDraft((d) => (d ? { ...d, ...liveFx } : d));
  };

  const saveMutation = useMutation({
    mutationFn: async (d: QuoteDraft) => {
      const payload = draftToPayload(d);
      const res = d.id ? await apiRequest("PUT", `${QUOTES_PREFIX}/${d.id}`, payload) : await apiRequest("POST", QUOTES_PREFIX, payload);
      return (await res.json()) as { quote: Quote };
    },
    onSuccess: async ({ quote }) => {
      toast({ title: "Quote saved", description: `${quote.quoteNumber} · ${quote.title}` });
      await invalidateQuotes(queryClient);
      if (!draft?.id) {
        setLocation(`/quotes/${quote.id}`, { replace: true });
      } else {
        setDraft((d) => (d ? { ...d, quoteNumber: quote.quoteNumber } : d));
      }
    },
    onError: (err: any) => {
      toast({ title: "Could not save the quote", description: extractApiErrorMessage(err, "Please check the quote and try again."), variant: "destructive" });
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: async (id: string) => (await (await apiRequest("POST", `${QUOTES_PREFIX}/${id}/duplicate`)).json()) as { quote: Quote },
    onSuccess: async ({ quote }) => {
      toast({ title: "Quote duplicated", description: quote.quoteNumber });
      await invalidateQuotes(queryClient);
      setLocation(`/quotes/${quote.id}`);
    },
    onError: (err: any) => toast({ title: "Could not duplicate", description: extractApiErrorMessage(err, "Please try again."), variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { await apiRequest("DELETE", `${QUOTES_PREFIX}/${id}`); },
    onSuccess: async () => {
      toast({ title: "Quote deleted" });
      await invalidateQuotes(queryClient);
      setLocation("/quotes");
    },
    onError: (err: any) => toast({ title: "Could not delete", description: extractApiErrorMessage(err, "Please try again."), variant: "destructive" }),
  });

  if (!isSdp) {
    return (
      <div className="p-6">
        <div className="text-center">
          <h1 className="mb-2 text-2xl font-bold text-secondary-900">Access Denied</h1>
          <p className="text-secondary-600">Only SDP internal users can prepare quotes.</p>
        </div>
      </div>
    );
  }

  if (quoteId && quoteError) {
    return (
      <div className="p-6">
        <p className="text-secondary-700">{extractApiErrorMessage(quoteError, "This quote could not be loaded.")}</p>
        <Button variant="link" className="px-0" onClick={() => setLocation("/quotes")}>Back to quotes</Button>
      </div>
    );
  }

  if (!draft || !result || (quoteId && quoteLoading)) {
    return (
      <div className="flex items-center gap-2 p-6 text-secondary-600" data-testid="quote-editor-loading">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading quote…
      </div>
    );
  }

  const countryName = countries.find((c) => c.id === draft.countryId)?.name ?? defaults?.country.name ?? draft.countryId;
  const problem = draftProblem(draft);
  const saving = saveMutation.isPending;

  const handleSave = () => {
    if (problem) {
      toast({ title: "Not ready to save", description: problem, variant: "destructive" });
      return;
    }
    saveMutation.mutate(draft);
  };

  const handlePdf = () => downloadQuotePdf({ draft, result, countryName });

  return (
    <div className="p-6 space-y-6" data-testid="quote-editor">
      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" variant="ghost" size="sm" onClick={() => setLocation("/quotes")} data-testid="button-back-to-quotes">
          <ArrowLeft className="mr-1 h-4 w-4" /> Quotes
        </Button>
        <span className="font-mono text-sm text-secondary-600" data-testid="quote-number">{draft.quoteNumber ?? "New quote"}</span>
        {defaultsLoading && <Loader2 className="h-4 w-4 animate-spin text-secondary-400" aria-label="Loading defaults" />}
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {draft.id && (
            <>
              <Button type="button" variant="outline" size="sm" onClick={() => duplicateMutation.mutate(draft.id!)} disabled={duplicateMutation.isPending} data-testid="button-duplicate-quote">
                <Copy className="mr-1 h-4 w-4" /> Duplicate
              </Button>
              <Button type="button" variant="outline" size="sm" className="text-destructive" onClick={() => setDeleteOpen(true)} data-testid="button-delete-quote">
                <Trash2 className="mr-1 h-4 w-4" /> Delete
              </Button>
            </>
          )}
          <Button type="button" size="sm" onClick={handleSave} disabled={saving} data-testid="button-save-quote">
            {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Save className="mr-1 h-4 w-4" />} Save quote
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_20rem] 2xl:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="min-w-0 space-y-6">
          <Card data-testid="quote-details-card">
            <CardContent className="grid grid-cols-12 gap-3 pt-6">
              <div className="col-span-12 md:col-span-5">
                <Label htmlFor="quote-title" className="mb-1 block text-xs font-medium text-secondary-600">Title</Label>
                <Input id="quote-title" className="h-9" value={draft.title} onChange={(e) => update({ title: e.target.value })} placeholder="e.g. Senior developer, Sydney" data-testid="input-quote-title" />
              </div>
              <div className="col-span-12 md:col-span-4">
                <Label htmlFor="quote-client" className="mb-1 block text-xs font-medium text-secondary-600">Prepared for</Label>
                <Input id="quote-client" className="h-9" value={draft.clientName} onChange={(e) => update({ clientName: e.target.value })} placeholder="Business or contact name" data-testid="input-quote-client" />
              </div>
              <div className="col-span-6 md:col-span-3">
                <Label htmlFor="quote-valid-until" className="mb-1 block text-xs font-medium text-secondary-600">Valid until</Label>
                <Input id="quote-valid-until" type="date" className="h-9" value={draft.validUntil} onChange={(e) => update({ validUntil: e.target.value })} data-testid="input-quote-valid-until" />
              </div>
              <div className="col-span-12 md:col-span-5">
                <Label className="mb-1 block text-xs font-medium text-secondary-600">Business (optional)</Label>
                <BusinessCombobox value={draft.businessId} onChange={(id) => update({ businessId: id })} clearable placeholder="Link to a business…" testId="quote-business" />
              </div>
              <div className="col-span-6 md:col-span-3">
                <Label htmlFor="quote-status" className="mb-1 block text-xs font-medium text-secondary-600">Status</Label>
                <Select value={draft.status} onValueChange={(v) => update({ status: v as QuoteStatus })}>
                  <SelectTrigger id="quote-status" className="h-9" data-testid="select-quote-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {QUOTE_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>{QUOTE_STATUS_LABELS[s]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <EngagementCard draft={draft} countries={countries} jurisdictions={defaults?.jurisdictions ?? []} onChange={update} />
          <PayCard
            draft={draft}
            result={result}
            fx={defaults?.fx ?? null}
            fxLoading={defaultsLoading}
            liveRateAvailable={!!liveFx}
            onChange={update}
            onUseLiveRate={useLiveRate}
            onCostLinesChange={onCostLinesChange}
            costLinesTouched={costLinesTouched}
            onReloadCostDefaults={reloadCostDefaults}
          />
          <FeesNotesCard
            draft={draft}
            result={result}
            onChange={update}
            onFeeLinesChange={onFeeLinesChange}
            feeLinesTouched={feeLinesTouched}
            defaultsEmpty={!!defaults && defaults.feeLines.length === 0}
            onReloadFeeDefaults={reloadFeeDefaults}
          />
        </div>
        <div className="min-w-0 self-start xl:sticky xl:top-0">
          <QuotePreviewPanel draft={draft} result={result} countryName={countryName} onDownloadPdf={handlePdf} />
        </div>
      </div>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this quote?</AlertDialogTitle>
            <AlertDialogDescription>{draft.quoteNumber} will be removed permanently. This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => draft.id && deleteMutation.mutate(draft.id)} data-testid="button-confirm-delete-quote">
              Delete quote
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
