/**
 * /quotes/new and /quotes/:id — the quote editor. One draft object feeds the
 * inputs on the left and the live preview on the right through
 * `computeQuote`, so both always show the same figures in the local currency
 * (and the comparison currency, when the quote has one). SDP internal users only.
 */
import { useEffect, useMemo, useState } from "react";
import { useLocation, useParams } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Copy, FileSignature, Loader2, Mail, MessageSquare, Save, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
  comparisonCurrencyOptions,
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
import { SendQuoteDialog } from "@/components/quotes/send-quote-dialog";
import { quoteToWizardPrefill } from "@/components/quotes/quote-convert";
import { QUOTE_CONVERT_ENABLED } from "@/pages/quotes";
import { ContractWizardModal } from "@/components/modals/contract-wizard-modal";
import {
  defaultComparisonFor, draftFx, draftProblem, draftToInput, draftToPayload, emptyDraft, fxFieldsFor, quoteRowToDraft, type QuoteDraft,
} from "@/components/quotes/quote-draft";

const QUOTES_PREFIX = "/api/quotes";

function invalidateQuotes(queryClient: ReturnType<typeof useQueryClient>) {
  return queryClient.invalidateQueries({
    predicate: (q) => typeof q.queryKey[0] === "string" && q.queryKey[0].startsWith(QUOTES_PREFIX),
  });
}

function fmtDateTime(value: unknown): string {
  if (!value) return "";
  const d = new Date(value as string);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleString("en-AU", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function QuoteEditor() {
  const params = useParams<{ id?: string }>();
  const quoteId = params.id && params.id !== "new" ? params.id : null;
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isSdp = (user as any)?.userType === "sdp_internal";

  usePageHeader(quoteId ? "Quote" : "New quote", "Cost of hiring one worker in a country, in the local currency and an optional comparison currency");

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
  // What was last saved (the payload that was sent), so "Send quote" waits for a save.
  const [savedPayload, setSavedPayload] = useState<string | null>(null);
  const [sendOpen, setSendOpen] = useState(false);
  const [convertConfirmOpen, setConvertConfirmOpen] = useState(false);
  const [convertOpen, setConvertOpen] = useState(false);
  // The contract wizard (convert to contract) needs the worker list only while it is open.
  const { data: workers = [] } = useQuery<any[]>({ queryKey: ["/api/workers"], enabled: isSdp && convertOpen });

  // First draft: the saved row (edit) or an empty quote for the first country (new).
  useEffect(() => {
    if (draft) return;
    if (quoteId) {
      if (quoteData?.quote) {
        const loaded = quoteRowToDraft(quoteData.quote);
        setDraft(loaded);
        setSavedPayload(JSON.stringify(draftToPayload(loaded)));
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
      if (next.comparisonCurrency && next.comparisonCurrency === next.currency) {
        next = { ...next, comparisonCurrency: defaultComparisonFor(next.currency), fxLocalPerComparison: "" };
      }
      if (!fxTouched) {
        const f = fxFieldsFor(defaults.fx, next.currency, next.comparisonCurrency);
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
  // The saved row (send round, answer, conversion) and the wizard prefill built from it; hooks stay above the early returns.
  const meta = quoteData?.quote ?? null;
  const convertPrefill = useMemo(() => (meta && convertOpen ? quoteToWizardPrefill(meta) : null), [meta, convertOpen]);

  const update = (patch: Partial<QuoteDraft>) => {
    if ("fxLocalPerComparison" in patch || "fxLocalPerUsd" in patch) setFxTouched(true);
    if ("jurisdiction" in patch && !("countryId" in patch)) setJurisdictionTouched(true);
    if ("countryId" in patch) {
      setJurisdictionTouched(false);
      setFxTouched(false);
    }
    setDraft((d) => (d ? { ...d, ...patch } : d));
  };
  // Picking a comparison currency applies today's cross rate when the provider has it; otherwise the rate is typed by hand.
  const onComparisonChange = (code: string) => {
    setDraft((d) => {
      if (!d) return d;
      const live = fxFieldsFor(defaults?.fx, d.currency, code);
      if (live) {
        setFxTouched(false);
        return { ...d, comparisonCurrency: code, ...live };
      }
      setFxTouched(true);
      return { ...d, comparisonCurrency: code, fxLocalPerComparison: "", fxRateSource: "manual", fxRateAsOf: null };
    });
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
  const liveFx = draft ? fxFieldsFor(defaults?.fx, draft.currency, draft.comparisonCurrency) : null;
  const liveRateAvailable = !!liveFx && (!draft?.comparisonCurrency || liveFx.fxLocalPerComparison !== "");
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
    onSuccess: async ({ quote }, saved) => {
      toast({ title: "Quote saved", description: `${quote.quoteNumber} · ${quote.title}` });
      // The payload that was sent, not the returned row: its normalised lines differ in benign ways.
      setSavedPayload(JSON.stringify(draftToPayload({ ...saved, status: quote.status })));
      await invalidateQuotes(queryClient);
      if (!draft?.id) {
        setLocation(`/quotes/${quote.id}`, { replace: true });
      } else {
        // The server may keep a sent / answered status over the one the form held.
        setDraft((d) => (d ? { ...d, quoteNumber: quote.quoteNumber, status: quote.status } : d));
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

  const dirty = savedPayload != null && JSON.stringify(draftToPayload(draft)) !== savedPayload;
  const converted = !!meta?.convertedContractId;
  const sendBlockedReason = converted ? "Already converted to a contract" : dirty ? "Save the quote first" : undefined;
  const onSent = (sent: Quote) => {
    setDraft((d) => (d ? { ...d, status: sent.status } : d));
    setSavedPayload((prev) => (prev && draft ? JSON.stringify(draftToPayload({ ...draft, status: sent.status })) : prev));
    void invalidateQuotes(queryClient);
  };

  return (
    <div className="p-6 space-y-6" data-testid="quote-editor">
      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" variant="ghost" size="sm" onClick={() => setLocation("/quotes")} data-testid="button-back-to-quotes">
          <ArrowLeft className="mr-1 h-4 w-4" /> Quotes
        </Button>
        <span className="font-mono text-sm text-secondary-600" data-testid="quote-number">{draft.quoteNumber ?? "New quote"}</span>
        {defaultsLoading && <Loader2 className="h-4 w-4 animate-spin text-secondary-400" aria-label="Loading defaults" />}
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {draft.id && converted && (
            <Badge variant="outline" className="border-green-200 bg-green-50 text-green-700" data-testid="badge-quote-converted">
              <FileSignature className="mr-1 h-3 w-3" /> Converted to a contract ·{" "}
              <a href="/contracts" className="underline" onClick={(e) => { e.preventDefault(); setLocation("/contracts"); }}>open Contracts</a>
            </Badge>
          )}
          {draft.id && (
            <>
              <Button type="button" variant="outline" size="sm" onClick={() => setSendOpen(true)} disabled={!!sendBlockedReason} title={sendBlockedReason} data-testid="button-send-quote">
                <Mail className="mr-1 h-4 w-4" /> Send quote
              </Button>
              {QUOTE_CONVERT_ENABLED && (
                <Button type="button" variant="outline" size="sm" onClick={() => setConvertConfirmOpen(true)} disabled={converted || dirty} title={converted ? "Already converted to a contract" : dirty ? "Save the quote first" : undefined} data-testid="button-convert-quote">
                  <FileSignature className="mr-1 h-4 w-4" /> Convert to contract
                </Button>
              )}
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

          {meta?.sentAt && (
            <Card data-testid="card-quote-response">
              <CardContent className="space-y-2 pt-6 text-sm">
                <div className="flex items-center gap-2 font-medium text-secondary-900">
                  <Mail className="h-4 w-4 text-primary-600" /> Sent to {meta.sentTo} on {fmtDateTime(meta.sentAt)}
                  {!meta.respondedAt && <span className="text-xs font-normal text-secondary-500">· awaiting the client's answer{meta.responseTokenExpiresAt ? ` (link expires ${fmtDateTime(meta.responseTokenExpiresAt)})` : ""}</span>}
                </div>
                {meta.respondedAt && (
                  <div className={meta.responseAction === "declined" ? "text-red-700" : "text-green-700"} data-testid="text-quote-response">
                    {meta.responseAction === "declined" ? "Declined" : "Accepted"} on {fmtDateTime(meta.respondedAt)}
                  </div>
                )}
                {meta.responseNote && (
                  <div className="rounded-md border border-red-100 bg-red-50/60 p-3">
                    <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-red-700">Client's reason</div>
                    <div className="whitespace-pre-wrap text-secondary-900" data-testid="text-quote-response-note">{meta.responseNote}</div>
                  </div>
                )}
                {meta.responseFeedback && (
                  <div className="rounded-md border border-blue-100 bg-blue-50/60 p-3">
                    <div className="mb-1 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-blue-700"><MessageSquare className="h-3 w-3" /> Client's feedback{meta.responseFeedbackAt ? ` · ${fmtDateTime(meta.responseFeedbackAt)}` : ""}</div>
                    <div className="whitespace-pre-wrap text-secondary-900" data-testid="text-quote-response-feedback">{meta.responseFeedback}</div>
                  </div>
                )}
                {!meta.respondedAt && (
                  <p className="text-xs text-secondary-500">Saving a change to the quote makes the sent link stale (the client's PDF would differ); send it again afterwards.</p>
                )}
              </CardContent>
            </Card>
          )}

          <EngagementCard draft={draft} countries={countries} jurisdictions={defaults?.jurisdictions ?? []} onChange={update} />
          <PayCard
            draft={draft}
            result={result}
            fx={defaults?.fx ?? null}
            fxLoading={defaultsLoading}
            liveRateAvailable={liveRateAvailable}
            comparisonOptions={comparisonCurrencyOptions(countries, draft.currency)}
            onChange={update}
            onComparisonChange={onComparisonChange}
            onUseLiveRate={useLiveRate}
            onCostLinesChange={onCostLinesChange}
            costLinesTouched={costLinesTouched}
            costItemsConfigured={defaults ? defaults.costItemsConfigured : true}
            onReloadCostDefaults={reloadCostDefaults}
          />
          <FeesNotesCard
            draft={draft}
            result={result}
            fx={defaults?.fx ?? null}
            fxLoading={defaultsLoading}
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

      <SendQuoteDialog
        quote={sendOpen ? meta : null}
        countryName={countryName}
        onOpenChange={(open) => !open && setSendOpen(false)}
        onSent={onSent}
      />

      <AlertDialog open={convertConfirmOpen} onOpenChange={setConvertConfirmOpen}>
        <AlertDialogContent data-testid="dialog-convert-quote">
          <AlertDialogHeader>
            <AlertDialogTitle>Create a contract from {draft.quoteNumber}?</AlertDialogTitle>
            <AlertDialogDescription>
              The contract wizard opens with the country, engagement type, pay basis, rate and currency from the quote filled in.
              Pick the worker on step 1 (the quote's engagement type applies when the worker is of the same kind) and, when the quote
              is not linked to a business, the business. The quote is marked as converted once the contract is created.
              {meta && meta.status !== "accepted" && <> This quote has not been accepted{meta.status === "declined" ? " (it was declined)" : ""}.</>}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Not now</AlertDialogCancel>
            <AlertDialogAction onClick={() => { setConvertConfirmOpen(false); setConvertOpen(true); }} data-testid="button-confirm-convert-quote">
              Open the contract wizard
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {convertOpen && convertPrefill && (
        <ContractWizardModal
          open
          onOpenChange={(open) => { if (!open) setConvertOpen(false); }}
          workers={workers}
          countries={countries}
          prefill={convertPrefill}
          onCreated={() => {
            toast({ title: "Contract created", description: `${draft.quoteNumber} is now marked as converted.` });
            void invalidateQuotes(queryClient);
          }}
        />
      )}

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
