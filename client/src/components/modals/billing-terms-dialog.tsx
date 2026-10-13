/**
 * SDP Billing Terms dialog. Shows the current published terms (rendered for
 * one business) and collects the acceptance that rides the contract payload as
 * `billingTermsAcceptance`:
 *   - in_app:      the business user ticks "I have read and agree"
 *   - sdp_offline: an SDP admin records a signed offline acceptance
 *   - read_only:   shows a stored acceptance (frozen text) from contract details
 * Acceptance can be skipped (`allowSkip`) and done later from the contract.
 * Every mode offers a PDF download so the terms can be signed on paper; the
 * in_app and sdp_offline modes accept an optional upload of that signed copy.
 */
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, CheckCircle2, Download, ExternalLink, FileText, Loader2, X } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ObjectUploader } from "@/components/ObjectUploader";
import { apiRequest, extractApiErrorMessage } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { downloadBillingTermsPdf } from "@/lib/generateBillingTermsPdf";
import type { BillingTermsAcceptanceInput, BillingTermsAcceptanceView, RenderedBillingTerms } from "@shared/billingTerms";

export type BillingTermsDialogMode = "in_app" | "sdp_offline" | "read_only";

export const BILLING_TERMS_CURRENT_KEY = "/api/billing-terms/current";

/** Current published terms rendered for a business. Refetches on every mount (staleTime 0). */
export function useBillingTermsCurrent(opts: { businessId?: string; countryId?: string; enabled: boolean }) {
  const params = new URLSearchParams();
  if (opts.businessId) params.set("businessId", opts.businessId);
  if (opts.countryId) params.set("countryId", opts.countryId);
  const qs = params.toString();
  return useQuery<RenderedBillingTerms, Error>({
    queryKey: [BILLING_TERMS_CURRENT_KEY, opts.businessId ?? "", opts.countryId ?? ""],
    queryFn: async () => {
      const res = await apiRequest("GET", `${BILLING_TERMS_CURRENT_KEY}${qs ? `?${qs}` : ""}`);
      return res.json();
    },
    enabled: opts.enabled,
    staleTime: 0,
    retry: false,
  });
}

export function isBillingTermsNotPublished(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err ?? "");
  return msg.includes("BILLING_TERMS_NOT_PUBLISHED");
}

interface BillingTermsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: BillingTermsDialogMode;
  /** SDP on behalf: the business whose terms are rendered. Omit for business users. */
  businessId?: string;
  countryId?: string;
  /** Name shown in the confirmation copy (optional). */
  businessName?: string;
  /** read_only: the stored acceptance to display. */
  existingAcceptance?: BillingTermsAcceptanceView | null;
  /** read_only: contract id, used to fetch the signed agreement's download URL. */
  contractId?: string;
  onAccepted?: (payload: BillingTermsAcceptanceInput, terms: RenderedBillingTerms) => void;
  /** Shows "Skip for now" in in_app / sdp_offline modes. */
  allowSkip?: boolean;
  onSkip?: () => void;
}

const today = () => new Date().toISOString().slice(0, 10);

export function BillingTermsDialog({
  open,
  onOpenChange,
  mode,
  businessId,
  countryId,
  businessName,
  existingAcceptance,
  contractId,
  onAccepted,
  allowSkip,
  onSkip,
}: BillingTermsDialogProps) {
  const { toast } = useToast();
  const live = mode !== "read_only";
  const { data: terms, isLoading, error, refetch } = useBillingTermsCurrent({ businessId, countryId, enabled: open && live });

  const [agreed, setAgreed] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [signerName, setSignerName] = useState("");
  const [signerEmail, setSignerEmail] = useState("");
  const [acceptedDate, setAcceptedDate] = useState(today());
  const [documentPath, setDocumentPath] = useState("");
  const [documentName, setDocumentName] = useState("");
  const [storingDoc, setStoringDoc] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [docOpening, setDocOpening] = useState(false);

  useEffect(() => {
    if (!open) return;
    setAgreed(false);
    setConfirmed(false);
    setSignerName("");
    setSignerEmail("");
    setAcceptedDate(today());
    setDocumentPath("");
    setDocumentName("");
    setFormError(null);
    if (live) refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const notPublished = !!error && isBillingTermsNotPublished(error);
  const text = mode === "read_only" ? existingAcceptance?.termsText ?? "" : terms?.text ?? "";
  const versionNumber = mode === "read_only" ? existingAcceptance?.termsVersionNumber : terms?.versionNumber;
  const title = mode === "read_only" ? "SDP Billing Terms & Conditions" : terms?.title ?? "SDP Billing Terms & Conditions";
  const who = businessName ? businessName : "the business";

  const downloadPdf = () => {
    if (!text) return;
    downloadBillingTermsPdf({
      title,
      versionNumber,
      text,
      businessName,
      publishedAt: mode === "read_only" ? null : terms?.publishedAt,
      acceptedAt: mode === "read_only" ? existingAcceptance?.acceptedAt : null,
    });
  };

  const openSignedDocument = async () => {
    if (!contractId) return;
    setDocOpening(true);
    try {
      const res = await apiRequest("GET", `/api/contracts/${contractId}/billing-terms-acceptance/document-url`);
      const { url } = (await res.json()) as { url: string };
      window.open(url, "_blank", "noopener");
    } catch (err) {
      toast({ title: "Couldn't open the document", description: extractApiErrorMessage(err, "Please try again."), variant: "destructive" });
    } finally {
      setDocOpening(false);
    }
  };

  const skip = () => {
    onSkip?.();
    onOpenChange(false);
  };

  const handleGetUploadParameters = async () => {
    const res = await apiRequest("POST", "/api/objects/upload");
    const data = (await res.json()) as { uploadURL: string };
    return { method: "PUT" as const, url: data.uploadURL };
  };

  const handleUploadComplete = async (result: any) => {
    const uploadURL: string | undefined = result?.successful?.[0]?.uploadURL;
    if (!uploadURL) return;
    setStoringDoc(true);
    try {
      const res = await apiRequest("PUT", "/api/billing-terms/signed-document", { documentURL: uploadURL });
      const data = (await res.json()) as { objectPath: string };
      setDocumentPath(data.objectPath);
      setDocumentName(result?.successful?.[0]?.name || "Signed agreement");
      toast({ title: "File uploaded", description: "The signed agreement is attached to this acceptance." });
    } catch (err) {
      toast({ title: "Couldn't store the file", description: extractApiErrorMessage(err, "Please try again."), variant: "destructive" });
    } finally {
      setStoringDoc(false);
    }
  };

  const submitInApp = () => {
    if (!terms || !agreed) return;
    onAccepted?.({ method: "in_app", termsVersionId: terms.versionId, accepted: true, signedDocumentPath: documentPath }, terms);
    onOpenChange(false);
  };

  const submitOffline = () => {
    if (!terms) return;
    setFormError(null);
    if (!confirmed) return setFormError("Tick the confirmation first.");
    if (!signerName.trim()) return setFormError("Enter the name of the person who signed.");
    if (signerEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(signerEmail.trim())) return setFormError("Enter a valid signer email or leave it empty.");
    if (!acceptedDate) return setFormError("Enter the date the terms were accepted.");
    if (acceptedDate > today()) return setFormError("The accepted date cannot be in the future.");
    onAccepted?.(
      {
        method: "sdp_offline",
        termsVersionId: terms.versionId,
        confirmed: true,
        signerName: signerName.trim(),
        signerEmail: signerEmail.trim(),
        acceptedDate,
        signedDocumentPath: documentPath,
      },
      terms,
    );
    onOpenChange(false);
  };

  const uploaderBlock = (
    <div className="flex flex-wrap items-center gap-2">
      <ObjectUploader maxNumberOfFiles={1} maxFileSize={10485760} onGetUploadParameters={handleGetUploadParameters} onComplete={handleUploadComplete} buttonClassName="h-10">
        <span className="flex items-center gap-2 text-sm">
          {storingDoc ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
          {documentPath ? "Change file" : "Upload signed copy (optional)"}
        </span>
      </ObjectUploader>
      {documentPath && (
        <span className="flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-xs text-green-700" data-testid="chip-billing-terms-document">
          <CheckCircle2 className="h-3 w-3" /> {documentName}
          <button type="button" className="ml-1 text-green-700/70 hover:text-green-900" onClick={() => { setDocumentPath(""); setDocumentName(""); }} aria-label="Remove file">
            <X className="h-3 w-3" />
          </button>
        </span>
      )}
    </div>
  );

  const downloadButton = text ? (
    <Button type="button" variant="ghost" size="sm" onClick={downloadPdf} data-testid="button-billing-terms-download">
      <Download className="h-4 w-4 mr-1" /> Download PDF
    </Button>
  ) : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col gap-0 p-0" data-testid="dialog-billing-terms">
        <DialogHeader className="px-6 pt-6 pb-3 border-b">
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-accent-600" />
            {title}
            {versionNumber ? (
              <span className="ml-1 rounded-full bg-secondary-100 px-2 py-0.5 text-xs font-medium text-secondary-700" data-testid="text-billing-terms-version">
                v{versionNumber}
              </span>
            ) : null}
          </DialogTitle>
          <DialogDescription>
            {mode === "read_only"
              ? "The exact text that was accepted for this contract."
              : "These terms apply because SDP Global Pay will act as the billing entity for this contract. Download the PDF to sign on paper, then upload the signed copy."}
          </DialogDescription>
          {downloadButton && <div className="flex justify-start pt-1">{downloadButton}</div>}
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4" data-testid="scroll-billing-terms">
          {live && isLoading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-8 justify-center">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading terms…
            </div>
          )}
          {live && error && (
            <Alert className="border-amber-300 bg-amber-50" data-testid="alert-billing-terms-unavailable">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-900 text-sm">
                {notPublished
                  ? mode === "sdp_offline"
                    ? "SDP's billing terms have not been published yet. Publish them under Templates → System Settings before using this billing option."
                    : "SDP has not published its billing terms yet. Contact SDP to use this billing option, or choose Invoice Separately."
                  : extractApiErrorMessage(error, "Couldn't load the billing terms.")}
              </AlertDescription>
            </Alert>
          )}
          {text && (
            <div className="whitespace-pre-wrap text-sm leading-6 text-secondary-800" data-testid="text-billing-terms-body">
              {text}
            </div>
          )}
          {mode === "read_only" && existingAcceptance && (
            <div className="mt-4 rounded-md border bg-secondary-50 p-3 text-xs text-secondary-700 space-y-1">
              <div>
                Accepted {existingAcceptance.method === "in_app" ? "in the app" : "offline (recorded by SDP)"} on{" "}
                {new Date(existingAcceptance.acceptedAt).toLocaleDateString()}
              </div>
              <div>
                By: {existingAcceptance.method === "in_app" ? existingAcceptance.acceptedByName ?? "—" : existingAcceptance.signerName ?? "—"}
                {existingAcceptance.signerEmail ? ` (${existingAcceptance.signerEmail})` : ""}
              </div>
              {existingAcceptance.recordedByName && <div>Recorded by: {existingAcceptance.recordedByName}</div>}
            </div>
          )}
        </div>

        {mode === "in_app" && (
          <DialogFooter className="flex-col sm:flex-col items-stretch gap-3 border-t px-6 py-4">
            <label className="flex items-start gap-3 text-sm cursor-pointer">
              <Checkbox
                checked={agreed}
                onCheckedChange={(v) => setAgreed(v === true)}
                disabled={!terms}
                data-testid="checkbox-billing-terms-agree"
                className="mt-0.5"
              />
              <span>
                I have read and agree to the SDP Billing Terms{versionNumber ? ` (v${versionNumber})` : ""} on behalf of {who}.
              </span>
            </label>
            <div className="space-y-1">
              <Label className="text-xs text-secondary-600">Signed on paper? Attach the signed copy.</Label>
              {uploaderBlock}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs text-secondary-500">{allowSkip ? "You can accept later from the contract." : ""}</span>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)} data-testid="button-billing-terms-cancel">
                  Cancel
                </Button>
                {allowSkip && (
                  <Button type="button" variant="secondary" onClick={skip} data-testid="button-billing-terms-skip">
                    Skip for now
                  </Button>
                )}
                <Button type="button" onClick={submitInApp} disabled={!terms || !agreed || storingDoc} data-testid="button-billing-terms-agree">
                  Agree and continue
                </Button>
              </div>
            </div>
          </DialogFooter>
        )}

        {mode === "sdp_offline" && (
          <DialogFooter className="flex-col sm:flex-col items-stretch gap-3 border-t px-6 py-4">
            <label className="flex items-start gap-3 text-sm cursor-pointer">
              <Checkbox
                checked={confirmed}
                onCheckedChange={(v) => setConfirmed(v === true)}
                disabled={!terms}
                data-testid="checkbox-billing-terms-confirm"
                className="mt-0.5"
              />
              <span>I confirm that {who} has accepted these terms{versionNumber ? ` (v${versionNumber})` : ""} offline.</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="bt-signer-name">Signer name *</Label>
                <Input id="bt-signer-name" value={signerName} onChange={(e) => setSignerName(e.target.value)} placeholder="Full name" data-testid="input-billing-terms-signer-name" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="bt-signer-email">Signer email</Label>
                <Input id="bt-signer-email" type="email" value={signerEmail} onChange={(e) => setSignerEmail(e.target.value)} placeholder="Optional" data-testid="input-billing-terms-signer-email" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="bt-accepted-date">Accepted on *</Label>
                <Input id="bt-accepted-date" type="date" max={today()} value={acceptedDate} onChange={(e) => setAcceptedDate(e.target.value)} data-testid="input-billing-terms-accepted-date" />
              </div>
              <div className="space-y-1">
                <Label>Signed agreement</Label>
                {uploaderBlock}
              </div>
            </div>
            {formError && <p className="text-sm text-red-600" data-testid="text-billing-terms-form-error">{formError}</p>}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs text-secondary-500">{allowSkip ? "You can record it later from the contract." : ""}</span>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)} data-testid="button-billing-terms-cancel">
                  Cancel
                </Button>
                {allowSkip && (
                  <Button type="button" variant="secondary" onClick={skip} data-testid="button-billing-terms-skip">
                    Skip for now
                  </Button>
                )}
                <Button type="button" onClick={submitOffline} disabled={!terms || storingDoc} data-testid="button-billing-terms-record">
                  Record acceptance
                </Button>
              </div>
            </div>
          </DialogFooter>
        )}

        {mode === "read_only" && (
          <DialogFooter className="border-t px-6 py-4 gap-2">
            {existingAcceptance?.hasSignedDocument && contractId && (
              <Button type="button" variant="outline" onClick={openSignedDocument} disabled={docOpening} data-testid="button-billing-terms-signed-document">
                <ExternalLink className="h-4 w-4 mr-1" /> Signed agreement
              </Button>
            )}
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} data-testid="button-billing-terms-close">
              Close
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
