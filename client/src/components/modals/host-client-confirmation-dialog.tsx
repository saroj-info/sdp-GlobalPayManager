/**
 * "Update Host Client Contract Confirmation": records whether the host client
 * confirmed a Customer Work contract (status, date, PO / SOW reference, note,
 * optional uploaded confirmation). Saves through
 * PUT /api/contracts/:id/host-client-confirmation (modules/contractLifecycle).
 */
import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { CheckCircle2, ClipboardCheck, FileText, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ObjectUploader } from "@/components/ObjectUploader";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, extractApiErrorMessage, queryClient } from "@/lib/queryClient";
import {
  HOST_CLIENT_CONFIRMATION_LABELS,
  HOST_CLIENT_CONFIRMATION_STATUSES,
  dateToDay,
  todayDay,
  type HostClientConfirmationStatus,
} from "@shared/contractLifecycle";

interface HostClientConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contract: any | null;
  onSaved?: () => void;
}

const invalidateContracts = () =>
  queryClient.invalidateQueries({
    predicate: (query) => typeof query.queryKey[0] === "string" && query.queryKey[0].startsWith("/api/contracts"),
  });

export function HostClientConfirmationDialog({ open, onOpenChange, contract, onSaved }: HostClientConfirmationDialogProps) {
  const { toast } = useToast();
  const [status, setStatus] = useState<HostClientConfirmationStatus>("confirmed");
  const [confirmedAt, setConfirmedAt] = useState("");
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  // documentPath: "" = none / removed. documentChanged tells the server whether to touch it.
  const [documentPath, setDocumentPath] = useState("");
  const [documentName, setDocumentName] = useState("");
  const [documentChanged, setDocumentChanged] = useState(false);
  const [storingDoc, setStoringDoc] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Seed from the contract each time the dialog opens.
  useEffect(() => {
    if (!open || !contract) return;
    const stored = contract.hostClientConfirmationStatus as HostClientConfirmationStatus | null | undefined;
    setStatus(stored ?? "confirmed");
    setConfirmedAt(dateToDay(contract.hostClientConfirmedAt) ?? (stored ? "" : todayDay()));
    setReference(contract.hostClientReference ?? "");
    setNote(contract.hostClientConfirmationNote ?? "");
    setDocumentPath(contract.hostClientConfirmationDocumentPath ?? "");
    setDocumentName(contract.hostClientConfirmationDocumentPath ? "Confirmation file on record" : "");
    setDocumentChanged(false);
    setFormError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, contract?.id]);

  const changeStatus = (next: HostClientConfirmationStatus) => {
    setStatus(next);
    if (next === "confirmed" && !confirmedAt) setConfirmedAt(todayDay());
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
      const res = await apiRequest("PUT", "/api/contracts/host-client-confirmation/document", { documentURL: uploadURL });
      const data = (await res.json()) as { objectPath: string };
      setDocumentPath(data.objectPath);
      setDocumentName(result?.successful?.[0]?.name || "Confirmation file");
      setDocumentChanged(true);
      toast({ title: "File uploaded", description: "The confirmation file will be attached when you save." });
    } catch (err) {
      toast({ title: "Couldn't store the file", description: extractApiErrorMessage(err, "Please try again."), variant: "destructive" });
    } finally {
      setStoringDoc(false);
    }
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload: Record<string, unknown> = {
        status,
        confirmedAt: confirmedAt || null,
        reference: reference.trim() || null,
        note: note.trim() || null,
      };
      if (documentChanged) payload.documentPath = documentPath || null;
      const res = await apiRequest("PUT", `/api/contracts/${contract.id}/host-client-confirmation`, payload);
      return res.json();
    },
    onSuccess: async () => {
      await invalidateContracts();
      toast({ title: "Confirmation saved", description: `Host client confirmation recorded as "${HOST_CLIENT_CONFIRMATION_LABELS[status]}".` });
      onSaved?.();
      onOpenChange(false);
    },
    onError: (err) => {
      toast({ title: "Couldn't save the confirmation", description: extractApiErrorMessage(err, "Please try again."), variant: "destructive" });
    },
  });

  const submit = () => {
    setFormError(null);
    if (status === "confirmed" && !confirmedAt) return setFormError("Enter the date the host client confirmed.");
    if (confirmedAt && confirmedAt > todayDay()) return setFormError("The confirmation date cannot be in the future.");
    if (reference.trim().length > 120) return setFormError("The reference is too long (120 characters max).");
    if (note.trim().length > 2000) return setFormError("The note is too long (2000 characters max).");
    saveMutation.mutate();
  };

  if (!contract) return null;
  const contractLabel = contract.contractName || contract.customRoleTitle || contract.roleTitle?.title || "Contract";
  const hostClientName = contract.customerBusiness?.name || contract.customerBusinessName || contract.clientName || null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" data-testid="dialog-host-client-confirmation">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-primary" />
            Host Client Contract Confirmation
          </DialogTitle>
          <DialogDescription>
            Record whether {hostClientName ? <span className="font-medium text-foreground">{hostClientName}</span> : "the host client"} has
            confirmed <span className="font-medium text-foreground">{contractLabel}</span>
            {contract.worker ? ` for ${contract.worker.firstName} ${contract.worker.lastName}` : ""}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="hcc-status">Status</Label>
              <Select value={status} onValueChange={(v) => changeStatus(v as HostClientConfirmationStatus)}>
                <SelectTrigger id="hcc-status" data-testid="select-host-client-confirmation-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {HOST_CLIENT_CONFIRMATION_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>{HOST_CLIENT_CONFIRMATION_LABELS[s]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="hcc-date">{status === "confirmed" ? "Confirmed on" : "Date"}{status === "confirmed" ? " *" : ""}</Label>
              <Input
                id="hcc-date"
                type="date"
                value={confirmedAt}
                max={todayDay()}
                onChange={(e) => setConfirmedAt(e.target.value)}
                data-testid="input-host-client-confirmation-date"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="hcc-reference">PO / SOW / reference number</Label>
            <Input
              id="hcc-reference"
              value={reference}
              maxLength={120}
              placeholder="e.g. PO-2026-0142"
              onChange={(e) => setReference(e.target.value)}
              data-testid="input-host-client-confirmation-reference"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="hcc-note">Note</Label>
            <Textarea
              id="hcc-note"
              value={note}
              maxLength={2000}
              rows={3}
              placeholder="Who confirmed, how (email, signed SOW), anything to remember"
              onChange={(e) => setNote(e.target.value)}
              data-testid="input-host-client-confirmation-note"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Confirmation file (optional)</Label>
            <div className="flex flex-wrap items-center gap-2">
              <ObjectUploader maxNumberOfFiles={1} maxFileSize={10485760} onGetUploadParameters={handleGetUploadParameters} onComplete={handleUploadComplete} buttonClassName="h-10">
                <span className="flex items-center gap-2 text-sm">
                  {storingDoc ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                  {documentPath ? "Change file" : "Upload signed SOW, PO, or other confirmation"}
                </span>
              </ObjectUploader>
              {documentPath && (
                <span className="flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-xs text-green-700" data-testid="chip-host-client-confirmation-document">
                  <CheckCircle2 className="h-3 w-3" /> {documentName}
                  <button
                    type="button"
                    className="ml-1 text-green-700/70 hover:text-green-900"
                    onClick={() => { setDocumentPath(""); setDocumentName(""); setDocumentChanged(true); }}
                    aria-label="Remove file"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">PDF or image, up to 10 MB. Kept with the contract; the worker never sees it.</p>
          </div>

          {formError && <p className="text-sm text-red-600" data-testid="text-host-client-confirmation-error">{formError}</p>}

          <div className="flex justify-end gap-3 pt-1">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saveMutation.isPending}>
              Cancel
            </Button>
            <Button type="button" onClick={submit} disabled={saveMutation.isPending || storingDoc} data-testid="button-host-client-confirmation-save">
              {saveMutation.isPending ? "Saving…" : "Save confirmation"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
