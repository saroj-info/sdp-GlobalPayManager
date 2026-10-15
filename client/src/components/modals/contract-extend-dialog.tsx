/**
 * "Contract Extending": same contract, later end date. Only the end date
 * changes (logged in Change History); a signed document is left as signed.
 * POST /api/contracts/:id/extend (modules/contractLifecycle).
 */
import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { CalendarPlus, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, extractApiErrorMessage, queryClient } from "@/lib/queryClient";
import { addDays, dateToDay, isEndDateLater } from "@shared/contractLifecycle";

interface ContractExtendDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contract: any | null;
  onExtended?: (contract: any) => void;
}

const fmt = (d: string | Date | null | undefined) =>
  d ? new Date(d).toLocaleDateString("en-AU", { day: "2-digit", month: "short", year: "numeric" }) : "—";

export function ContractExtendDialog({ open, onOpenChange, contract, onExtended }: ContractExtendDialogProps) {
  const { toast } = useToast();
  const [endDate, setEndDate] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setEndDate("");
    setFormError(null);
  }, [open, contract?.id]);

  const currentEndDay = dateToDay(contract?.endDate);
  const minDay = currentEndDay ? addDays(currentEndDay, 1) : undefined;

  const extendMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/contracts/${contract.id}/extend`, { endDate });
      return (await res.json()) as { contract: any; previousEndDate: string | null; documentRegenerated: boolean };
    },
    onSuccess: async (data) => {
      await queryClient.invalidateQueries({
        predicate: (query) => typeof query.queryKey[0] === "string" && query.queryKey[0].startsWith("/api/contracts"),
      });
      toast({
        title: `Contract extended to ${fmt(data.contract?.endDate ?? endDate)}`,
        description: data.documentRegenerated
          ? "The contract document was regenerated with the new end date."
          : "The new end date is recorded in the contract's Change History.",
      });
      onExtended?.(data.contract);
      onOpenChange(false);
    },
    onError: (err) => {
      toast({ title: "Couldn't extend the contract", description: extractApiErrorMessage(err, "Please try again."), variant: "destructive" });
    },
  });

  const submit = () => {
    setFormError(null);
    if (!endDate) return setFormError("Enter the new end date.");
    if (!isEndDateLater(contract?.endDate, endDate)) return setFormError("The new end date must be after the current end date.");
    extendMutation.mutate();
  };

  if (!contract) return null;
  const contractLabel = contract.contractName || contract.customRoleTitle || contract.roleTitle?.title || "Contract";
  const isSigned = !!contract.signedAt;
  const awaitingSignature = !isSigned && !!contract.signingToken && !!contract.emailSentAt;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto" data-testid="dialog-contract-extend">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarPlus className="h-5 w-5 text-primary" />
            Extend Contract
          </DialogTitle>
          <DialogDescription>
            <span className="font-medium text-foreground">{contractLabel}</span>
            {contract.worker ? ` — ${contract.worker.firstName} ${contract.worker.lastName}` : ""}. Only the end date changes; everything else stays as it is.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 rounded-lg bg-secondary-50 p-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Start date</p>
              <p className="font-medium">{fmt(contract.startDate)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Current end date</p>
              <p className="font-medium" data-testid="text-extend-current-end">{fmt(contract.endDate)}</p>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="extend-end-date">New end date *</Label>
            <Input
              id="extend-end-date"
              type="date"
              value={endDate}
              min={minDay}
              onChange={(e) => setEndDate(e.target.value)}
              data-testid="input-extend-end-date"
            />
            <p className="text-xs text-muted-foreground">Must be after {fmt(contract.endDate)}.</p>
          </div>

          <div className="flex items-start gap-2 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-800" data-testid="text-extend-note">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>
              {isSigned
                ? "This contract is signed. The signed document will not change; the new end date is recorded on the contract and logged in Change History."
                : awaitingSignature
                  ? "This contract is awaiting signature. The document is regenerated with the new end date; re-send it for signing so the worker signs the updated version."
                  : contract.templateId
                    ? "The contract document will be regenerated with the new end date."
                    : "The new end date is recorded on the contract and logged in Change History."}
            </span>
          </div>

          {formError && <p className="text-sm text-red-600" data-testid="text-extend-error">{formError}</p>}

          <div className="flex justify-end gap-3 pt-1">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={extendMutation.isPending}>
              Cancel
            </Button>
            <Button type="button" onClick={submit} disabled={extendMutation.isPending} data-testid="button-extend-confirm">
              {extendMutation.isPending ? "Extending…" : "Extend contract"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
