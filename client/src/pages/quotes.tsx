/**
 * /quotes — the list of saved cost quotes (SDP internal users only), with
 * search, status and country filters, and open / duplicate / PDF / delete.
 */
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, Download, FileText, Loader2, MoreHorizontal, Plus, Search, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { DataPagination } from "@/components/ui/data-pagination";
import { usePageHeader } from "@/contexts/AuthenticatedLayoutContext";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, extractApiErrorMessage } from "@/lib/queryClient";
import { downloadQuotePdf } from "@/lib/generateQuotePdf";
import { cn } from "@/lib/utils";
import type { Country, Quote } from "@shared/schema";
import { getEngagementTypeLabel } from "@shared/engagementTypes";
import {
  QUOTE_ENGAGEMENT_CATEGORY_LABELS,
  QUOTE_STATUSES,
  QUOTE_STATUS_LABELS,
  computeQuote,
  type QuoteEngagementCategory,
  type QuoteListResult,
  type QuoteStatus,
} from "@shared/quotes";
import { MoneyPair } from "@/components/quotes/money";
import { draftFx, draftToInput, quoteRowToDraft } from "@/components/quotes/quote-draft";

const QUOTES_PREFIX = "/api/quotes";
const PAGE_SIZE = 20;

type DisplayStatus = QuoteStatus | "expired";

function displayStatus(q: Quote): DisplayStatus {
  if ((q.status === "draft" || q.status === "sent") && q.validUntil) {
    const until = new Date(q.validUntil as unknown as string);
    if (!Number.isNaN(until.getTime()) && until.getTime() < Date.now() - 24 * 60 * 60 * 1000) return "expired";
  }
  return q.status;
}

const STATUS_CLASS: Record<DisplayStatus, string> = {
  draft: "bg-secondary-100 text-secondary-900",
  sent: "bg-accent-50 text-accent-600",
  accepted: "bg-green-50 text-green-700",
  declined: "bg-red-50 text-red-700",
  expired: "bg-amber-50 text-amber-700",
};

function fmtDate(value: unknown): string {
  if (!value) return "";
  const d = new Date(value as string);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export default function Quotes() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isSdp = (user as any)?.userType === "sdp_internal";

  usePageHeader("Quotes", "Cost quotes for hiring a worker in a country, in the local currency with an optional comparison currency");

  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [countryId, setCountryId] = useState<string>("all");
  const [pendingDelete, setPendingDelete] = useState<Quote | null>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const { data: countries = [] } = useQuery<Country[]>({ queryKey: ["/api/countries"], enabled: isSdp });
  const countryName = (id: string) => countries.find((c) => c.id === id)?.name ?? id;

  const params = { page, pageSize: PAGE_SIZE, search, status: status === "all" ? "" : status, countryId: countryId === "all" ? "" : countryId };
  const { data, isLoading, isFetching } = useQuery<QuoteListResult<Quote>>({
    queryKey: [QUOTES_PREFIX, params],
    enabled: isSdp,
    queryFn: async () => {
      const qs = new URLSearchParams();
      qs.set("page", String(params.page));
      qs.set("pageSize", String(params.pageSize));
      if (params.search) qs.set("search", params.search);
      if (params.status) qs.set("status", params.status);
      if (params.countryId) qs.set("countryId", params.countryId);
      const res = await apiRequest("GET", `${QUOTES_PREFIX}?${qs.toString()}`);
      return res.json();
    },
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ predicate: (q) => typeof q.queryKey[0] === "string" && q.queryKey[0].startsWith(QUOTES_PREFIX) });

  const duplicateMutation = useMutation({
    mutationFn: async (id: string) => (await (await apiRequest("POST", `${QUOTES_PREFIX}/${id}/duplicate`)).json()) as { quote: Quote },
    onSuccess: async ({ quote }) => {
      toast({ title: "Quote duplicated", description: quote.quoteNumber });
      await invalidate();
      setLocation(`/quotes/${quote.id}`);
    },
    onError: (err: any) => toast({ title: "Could not duplicate", description: extractApiErrorMessage(err, "Please try again."), variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { await apiRequest("DELETE", `${QUOTES_PREFIX}/${id}`); },
    onSuccess: async () => {
      toast({ title: "Quote deleted" });
      setPendingDelete(null);
      await invalidate();
    },
    onError: (err: any) => toast({ title: "Could not delete", description: extractApiErrorMessage(err, "Please try again."), variant: "destructive" }),
  });

  if (!isSdp) {
    return (
      <div className="p-6">
        <div className="text-center">
          <h1 className="mb-2 text-2xl font-bold text-secondary-900">Access Denied</h1>
          <p className="text-secondary-600">Only SDP internal users can access quotes.</p>
        </div>
      </div>
    );
  }

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const handlePdf = (q: Quote) => {
    const draft = quoteRowToDraft(q);
    const result = computeQuote(draftToInput(draft), draftFx(draft));
    downloadQuotePdf({ draft, result, countryName: countryName(q.countryId) });
  };

  return (
    <div className="p-6 space-y-6" data-testid="quotes-page">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full md:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-secondary-400" />
          <Input className="h-9 pl-9" placeholder="Search number, title or client…" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} data-testid="input-quotes-search" />
        </div>
        <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
          <SelectTrigger className="h-9 w-40" data-testid="select-quotes-status"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {QUOTE_STATUSES.map((s) => <SelectItem key={s} value={s}>{QUOTE_STATUS_LABELS[s]}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={countryId} onValueChange={(v) => { setCountryId(v); setPage(1); }}>
          <SelectTrigger className="h-9 w-44" data-testid="select-quotes-country"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All countries</SelectItem>
            {countries.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        {isFetching && !isLoading && <Loader2 className="h-4 w-4 animate-spin text-secondary-400" />}
        <Button className="ml-auto" size="sm" onClick={() => setLocation("/quotes/new")} data-testid="button-new-quote">
          <Plus className="mr-1 h-4 w-4" /> New quote
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center gap-2 p-6 text-secondary-600"><Loader2 className="h-4 w-4 animate-spin" /> Loading quotes…</div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center gap-3 p-10 text-center">
              <FileText className="h-8 w-8 text-secondary-400" />
              <p className="text-secondary-700">{search || status !== "all" || countryId !== "all" ? "No quotes match these filters." : "No quotes yet."}</p>
              <Button size="sm" onClick={() => setLocation("/quotes/new")}><Plus className="mr-1 h-4 w-4" /> Prepare a quote</Button>
            </div>
          ) : (
            <Table data-testid="quotes-table">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-32">Quote</TableHead>
                  <TableHead>Title · Prepared for</TableHead>
                  <TableHead>Country</TableHead>
                  <TableHead>Engagement</TableHead>
                  <TableHead className="text-right">Gross pay / year</TableHead>
                  <TableHead className="text-right">Total / year</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((q) => {
                  const st = displayStatus(q);
                  const totals = q.totals;
                  return (
                    <TableRow key={q.id} className="cursor-pointer" onClick={() => setLocation(`/quotes/${q.id}`)} data-testid={`quote-row-${q.quoteNumber}`}>
                      <TableCell className="font-mono text-sm">{q.quoteNumber}</TableCell>
                      <TableCell>
                        <div className="font-medium text-secondary-900">{q.title}</div>
                        {q.clientName && <div className="text-xs text-secondary-500">{q.clientName}</div>}
                      </TableCell>
                      <TableCell className="text-sm">{countryName(q.countryId)}{q.jurisdiction ? <span className="text-secondary-500"> · {q.jurisdiction}</span> : null}</TableCell>
                      <TableCell className="text-sm">
                        <div>{QUOTE_ENGAGEMENT_CATEGORY_LABELS[q.engagementCategory as QuoteEngagementCategory] ?? q.engagementCategory}</div>
                        <div className="text-xs text-secondary-500">{getEngagementTypeLabel(q.employmentType)} · {q.isForClient ? "Host Client Work" : "Internal Work"}</div>
                      </TableCell>
                      <TableCell className="text-right">
                        <MoneyPair size="xs" local={totals?.local.annual.pay ?? 0} comparison={totals?.comparison?.annual.pay ?? null} currency={q.currency} comparisonCurrency={q.comparisonCurrency} />
                      </TableCell>
                      <TableCell className="text-right">
                        <MoneyPair size="xs" local={totals?.local.annual.total ?? 0} comparison={totals?.comparison?.annual.total ?? null} currency={q.currency} comparisonCurrency={q.comparisonCurrency} />
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn("border-transparent", STATUS_CLASS[st])} data-testid={`quote-status-${q.quoteNumber}`}>
                          {st === "expired" ? "Expired" : QUOTE_STATUS_LABELS[st]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-secondary-600">{fmtDate(q.updatedAt)}</TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" aria-label="Quote actions" data-testid={`quote-actions-${q.quoteNumber}`}>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setLocation(`/quotes/${q.id}`)}><FileText className="mr-2 h-4 w-4" /> Open</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => duplicateMutation.mutate(q.id)}><Copy className="mr-2 h-4 w-4" /> Duplicate</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handlePdf(q)}><Download className="mr-2 h-4 w-4" /> Download PDF</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setPendingDelete(q)}><Trash2 className="mr-2 h-4 w-4" /> Delete</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <DataPagination page={page} totalPages={totalPages} totalItems={total} pageSize={PAGE_SIZE} onPageChange={setPage} label="quotes" hideWhenSinglePage />

      <AlertDialog open={!!pendingDelete} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {pendingDelete?.quoteNumber}?</AlertDialogTitle>
            <AlertDialogDescription>"{pendingDelete?.title}" will be removed permanently. This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => pendingDelete && deleteMutation.mutate(pendingDelete.id)} data-testid="button-confirm-delete-quote">
              Delete quote
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
