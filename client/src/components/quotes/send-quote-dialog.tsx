/**
 * "Send quote": emails the PDF with Accept / Reject links. The PDF is built here,
 * in the browser, from the saved row (the same generator as "Download PDF") and
 * uploaded as the raw body of POST /api/quotes/:id/send; the server writes the
 * send round first and puts it back when the email fails (502 EMAIL_SEND_FAILED).
 * "Send to" is prefilled from the linked business's contact email and stays editable.
 */
import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { AlertTriangle, Loader2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiUpload, extractApiErrorMessage } from "@/lib/queryClient";
import { quotePdfBlob } from "@/lib/generateQuotePdf";
import type { Business, Quote } from "@shared/schema";
import { QUOTE_RESPONSE_TTL_DAYS, QUOTE_SEND_DEFAULT_MESSAGE, computeQuote } from "@shared/quotes";
import { draftFx, draftToInput, quoteRowToDraft } from "./quote-draft";

interface SendQuoteDialogProps {
  /** The quote to send; null closes the dialog. */
  quote: Quote | null;
  countryName: string;
  onOpenChange: (open: boolean) => void;
  onSent: (quote: Quote) => void;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function fmtDate(value: unknown): string {
  if (!value) return "";
  const d = new Date(value as string);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function fmtDateTime(value: unknown): string {
  if (!value) return "";
  const d = new Date(value as string);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleString("en-AU", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function SendQuoteDialog({ quote, countryName, onOpenChange, onSent }: SendQuoteDialogProps) {
  const { toast } = useToast();
  const [to, setTo] = useState("");
  const [message, setMessage] = useState(QUOTE_SEND_DEFAULT_MESSAGE);
  const [seededFor, setSeededFor] = useState<string | null>(null);

  // The same cache BusinessCombobox fills; rows carry contactEmail.
  const { data: businesses = [], isLoading: businessesLoading } = useQuery<Business[]>({
    queryKey: ["/api/businesses"],
    enabled: !!quote?.businessId,
  });
  const linkedBusiness = quote?.businessId ? businesses.find((b) => b.id === quote.businessId) ?? null : null;

  // Seed the fields once per quote: the linked business's email, else the last recipient.
  useEffect(() => {
    if (!quote) {
      setSeededFor(null);
      return;
    }
    if (seededFor === quote.id) return;
    if (quote.businessId && businessesLoading) return;
    setTo(linkedBusiness?.contactEmail ?? quote.sentTo ?? "");
    setMessage(QUOTE_SEND_DEFAULT_MESSAGE);
    setSeededFor(quote.id);
  }, [quote, seededFor, linkedBusiness, businessesLoading]);

  const sendMutation = useMutation({
    mutationFn: async () => {
      if (!quote) throw new Error("No quote selected");
      const draft = quoteRowToDraft(quote);
      const result = computeQuote(draftToInput(draft), draftFx(draft));
      const pdf = quotePdfBlob({ draft, result, countryName });
      const qs = new URLSearchParams({ to: to.trim(), message: message.trim() });
      const res = await apiUpload("POST", `/api/quotes/${quote.id}/send?${qs.toString()}`, pdf);
      return (await res.json()) as { quote: Quote };
    },
    onSuccess: ({ quote: sent }) => {
      toast({ title: "Quote sent", description: `${sent.quoteNumber} was emailed to ${sent.sentTo ?? to.trim()}.` });
      onSent(sent);
      onOpenChange(false);
    },
    onError: (err: any) => {
      toast({ title: "Quote not sent", description: extractApiErrorMessage(err, "Please try again."), variant: "destructive" });
    },
  });

  if (!quote) return null;

  const validUntilEnd = quote.validUntil ? new Date(quote.validUntil as unknown as string).getTime() + DAY_MS : null;
  const validityPassed = validUntilEnd != null && !Number.isNaN(validUntilEnd) && validUntilEnd < Date.now();
  const converted = !!quote.convertedContractId;
  const emailOk = EMAIL_RE.test(to.trim());
  const blocked = converted || validityPassed;
  const linkLife = quote.validUntil && !validityPassed ? `until ${fmtDate(quote.validUntil)} (the quote's "Valid until" date)` : `for ${QUOTE_RESPONSE_TTL_DAYS} days`;

  return (
    <Dialog open={!!quote} onOpenChange={(open) => !sendMutation.isPending && onOpenChange(open)}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg" data-testid="dialog-send-quote">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Mail className="h-4 w-4 text-primary-600" /> Send {quote.quoteNumber}</DialogTitle>
          <DialogDescription>
            The email carries the quote PDF, an Accept and a Reject button, and a link to review the quote online. The link works {linkLife}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="send-quote-to">Send to</Label>
            <Input
              id="send-quote-to"
              type="email"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="name@company.com"
              autoComplete="off"
              data-testid="input-send-quote-to"
            />
            <p className="text-xs text-secondary-500" data-testid="text-send-quote-to-hint">
              {quote.businessId
                ? businessesLoading
                  ? "Loading the linked business…"
                  : linkedBusiness?.contactEmail
                    ? `Prefilled from ${linkedBusiness.name}'s contact email; change it if needed.`
                    : linkedBusiness
                      ? `${linkedBusiness.name} has no contact email on file; enter one.`
                      : "The linked business is not in your list; enter the address."
                : "This quote is not linked to a business; enter the recipient's address."}
            </p>
          </div>

          <div className="space-y-1">
            <Label htmlFor="send-quote-message">Message</Label>
            <Textarea
              id="send-quote-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              maxLength={2000}
              data-testid="textarea-send-quote-message"
            />
          </div>

          {converted && (
            <p className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800" data-testid="text-send-quote-converted">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> This quote has been converted to a contract and can no longer be sent for acceptance. Use "Download PDF" to share it.
            </p>
          )}
          {!converted && validityPassed && (
            <p className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800" data-testid="text-send-quote-expired">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> This quote's "Valid until" date ({fmtDate(quote.validUntil)}) has passed. Update it and save before sending.
            </p>
          )}
          {!blocked && quote.respondedAt && (
            <p className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800" data-testid="text-send-quote-responded">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {quote.responseAction === "declined" ? "Declined" : "Accepted"} by {quote.sentTo} on {fmtDateTime(quote.respondedAt)}. Sending again starts a new response round and clears that answer.
            </p>
          )}
          {!blocked && !quote.respondedAt && quote.sentAt && (
            <p className="rounded-md border border-secondary-200 bg-secondary-50 p-3 text-xs text-secondary-700" data-testid="text-send-quote-sent-before">
              Sent to {quote.sentTo} on {fmtDateTime(quote.sentAt)}. Sending again replaces that link; the earlier one stops working.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={sendMutation.isPending}>Cancel</Button>
          <Button
            type="button"
            onClick={() => sendMutation.mutate()}
            disabled={blocked || !emailOk || sendMutation.isPending}
            title={!emailOk ? "Enter a valid email address" : undefined}
            data-testid="button-send-quote-confirm"
          >
            {sendMutation.isPending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Mail className="mr-1 h-4 w-4" />} Send quote
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
