/**
 * "Contract Renewal": a brand-new contract cloned from this one with new dates
 * and rates. Everything else (role, timesheet and payment setup, host client,
 * billing setup, remuneration lines, billing lines, project rates, tier
 * discounts) is copied by the server in one call:
 * POST /api/contracts/:id/renew (modules/contractLifecycle).
 */
import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, extractApiErrorMessage, queryClient } from "@/lib/queryClient";
import { dateToDay, getDefaultRenewalDates, getDefaultRenewalName } from "@shared/contractLifecycle";

interface ContractRenewalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contract: any | null;
  onCreated: (created: any) => void;
}

interface RateLineDraft {
  id: string;
  projectName: string;
  rateType: string;
  currency: string;
  isDefault: boolean;
  currentRate: string;
  rate: string;
  currentClientRate: string;
  clientRate: string;
}

const fmt = (d: string | Date | null | undefined) =>
  d ? new Date(d).toLocaleDateString("en-AU", { day: "2-digit", month: "short", year: "numeric" }) : "Ongoing";

const unitOf = (rateType: string | null | undefined) =>
  rateType === "hourly" ? "hr" : rateType === "daily" ? "day" : rateType === "annual" ? "year" : rateType || "";

const isAmount = (v: string) => v.trim() !== "" && Number.isFinite(Number(v)) && Number(v) >= 0;

export function ContractRenewalDialog({ open, onOpenChange, contract, onCreated }: ContractRenewalDialogProps) {
  const { toast } = useToast();
  const [contractName, setContractName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [rate, setRate] = useState("");
  const [rateLines, setRateLines] = useState<RateLineDraft[]>([]);
  const [customerBillingRate, setCustomerBillingRate] = useState("");
  const [fixedBillingAmount, setFixedBillingAmount] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !contract) return;
    const dates = getDefaultRenewalDates(contract);
    setContractName(getDefaultRenewalName(contract));
    setStartDate(dates.startDate);
    setEndDate(dates.endDate ?? "");
    setRate(contract.rate != null ? String(contract.rate) : "");
    const lines: any[] = contract.rateStructure === "multiple" && Array.isArray(contract.rateLines) ? contract.rateLines : [];
    setRateLines(
      lines.map((l) => ({
        id: l.id,
        projectName: l.projectName || l.description || "Rate line",
        rateType: l.rateType || contract.rateType,
        currency: l.currency || contract.currency,
        isDefault: !!l.isDefault,
        currentRate: l.rate != null ? String(l.rate) : "",
        rate: l.rate != null ? String(l.rate) : "",
        currentClientRate: l.clientRate != null ? String(l.clientRate) : "",
        clientRate: l.clientRate != null ? String(l.clientRate) : "",
      })),
    );
    setCustomerBillingRate(contract.customerBillingRate != null ? String(contract.customerBillingRate) : "");
    setFixedBillingAmount(contract.fixedBillingAmount != null ? String(contract.fixedBillingAmount) : "");
    setFormError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, contract?.id]);

  const isMultiRate = !!contract && contract.rateStructure === "multiple" && rateLines.length > 0;
  const isForClient = !!contract?.isForClient;
  const isFixedPrice = contract?.clientBillingType === "fixed_price";
  const showClientRate = isForClient && !isFixedPrice;

  const renewMutation = useMutation({
    mutationFn: async () => {
      const payload: Record<string, unknown> = {
        contractName: contractName.trim() || null,
        startDate,
        endDate: endDate || null,
      };
      if (isMultiRate) {
        payload.rateLines = rateLines.map((l) => ({
          id: l.id,
          rate: l.rate.trim(),
          ...(showClientRate ? { clientRate: l.clientRate.trim() === "" ? null : l.clientRate.trim() } : {}),
        }));
      } else {
        payload.rate = rate.trim();
        if (showClientRate) payload.customerBillingRate = customerBillingRate.trim() === "" ? null : customerBillingRate.trim();
      }
      if (isForClient && isFixedPrice) payload.fixedBillingAmount = fixedBillingAmount.trim() === "" ? null : fixedBillingAmount.trim();
      const res = await apiRequest("POST", `/api/contracts/${contract.id}/renew`, payload);
      return (await res.json()) as { contract: any; documentRegenerated: boolean; warnings: string[] };
    },
    onSuccess: async (data) => {
      await queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey[0];
          return typeof key === "string" && (key.startsWith("/api/contracts") || key.startsWith("/api/role-titles") || key.startsWith("/api/workers"));
        },
      });
      const templateMissing = Array.isArray(data.warnings) && data.warnings.includes("TEMPLATE_MISSING");
      toast({
        title: "Renewal created",
        description: templateMissing
          ? "The previous contract template no longer exists, so no document was generated. Pick a template in Edit Contract."
          : `The new contract starts ${fmt(data.contract?.startDate ?? startDate)} and is ready to review.`,
      });
      onCreated(data.contract);
      onOpenChange(false);
    },
    onError: (err) => {
      toast({ title: "Couldn't create the renewal", description: extractApiErrorMessage(err, "Please try again."), variant: "destructive" });
    },
  });

  const submit = () => {
    setFormError(null);
    const sourceStart = dateToDay(contract?.startDate);
    if (!startDate) return setFormError("Enter the start date of the renewal.");
    if (sourceStart && startDate <= sourceStart) return setFormError("The renewal must start after the current contract's start date.");
    if (endDate && endDate <= startDate) return setFormError("The end date must be after the start date.");
    if (isMultiRate) {
      for (const line of rateLines) {
        if (!isAmount(line.rate)) return setFormError(`Enter a valid rate for ${line.projectName}.`);
        if (showClientRate && line.clientRate.trim() !== "" && !isAmount(line.clientRate)) return setFormError(`Enter a valid client rate for ${line.projectName}.`);
      }
    } else {
      if (!isAmount(rate)) return setFormError("Enter a valid worker rate.");
      if (showClientRate && customerBillingRate.trim() !== "" && !isAmount(customerBillingRate)) return setFormError("Enter a valid client billing rate.");
    }
    if (isForClient && isFixedPrice && fixedBillingAmount.trim() !== "" && !isAmount(fixedBillingAmount)) return setFormError("Enter a valid fixed billing amount.");
    renewMutation.mutate();
  };

  if (!contract) return null;
  const contractLabel = contract.contractName || contract.customRoleTitle || contract.roleTitle?.title || "Contract";
  const workerName = contract.worker ? `${contract.worker.firstName} ${contract.worker.lastName}` : null;
  const hostClientName = contract.customerBusiness?.name || contract.customerBusinessName || contract.clientName || null;
  const existingRenewals: any[] = Array.isArray(contract.renewals) ? contract.renewals : [];
  const currentEndDay = dateToDay(contract.endDate);
  const overlaps = !!currentEndDay && !!startDate && startDate <= currentEndDay;
  const currency = contract.currency || "";
  const unit = unitOf(contract.rateType);
  const setLine = (id: string, patch: Partial<RateLineDraft>) =>
    setRateLines((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="dialog-contract-renewal">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-primary" />
            Renew Contract
          </DialogTitle>
          <DialogDescription>
            Creates a new contract from <span className="font-medium text-foreground">{contractLabel}</span>
            {workerName ? ` for ${workerName}` : ""}. Set the new dates and rates; everything else is copied.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Previous details */}
          <div className="rounded-lg border bg-secondary-50 p-3 text-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-secondary-700 mb-2">Current contract</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-2">
              {workerName && (
                <div><p className="text-xs text-muted-foreground">Worker</p><p className="font-medium">{workerName}</p></div>
              )}
              <div><p className="text-xs text-muted-foreground">Term</p><p className="font-medium" data-testid="text-renewal-current-term">{fmt(contract.startDate)} – {fmt(contract.endDate)}</p></div>
              {!isMultiRate && (
                <div>
                  <p className="text-xs text-muted-foreground">Worker rate</p>
                  <p className="font-medium">{currency} {contract.rateType === "annual" ? (contract.totalPackageValue || contract.rate) : contract.rate}/{unit}</p>
                </div>
              )}
              {hostClientName && (
                <div><p className="text-xs text-muted-foreground">Host client</p><p className="font-medium">{hostClientName}</p></div>
              )}
              {isForClient && isFixedPrice && (
                <div><p className="text-xs text-muted-foreground">Fixed billing</p><p className="font-medium">{contract.customerCurrency || currency} {contract.fixedBillingAmount ?? "—"}</p></div>
              )}
              {isForClient && !isFixedPrice && !isMultiRate && (
                <div><p className="text-xs text-muted-foreground">Client billing rate</p><p className="font-medium">{contract.customerCurrency || currency} {contract.customerBillingRate ?? "—"}/{unitOf(contract.customerBillingRateType || contract.rateType)}</p></div>
              )}
            </div>
          </div>

          {existingRenewals.length > 0 && (
            <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800" data-testid="text-renewal-already-renewed">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>
                This contract already has a renewal: {existingRenewals.map((r) => `${r.contractName || r.customRoleTitle || "Contract"} (${fmt(r.startDate)} – ${fmt(r.endDate)})`).join("; ")}. You can still create another one.
              </span>
            </div>
          )}

          {/* New contract */}
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="renew-name">Contract name</Label>
              <Input id="renew-name" value={contractName} maxLength={200} onChange={(e) => setContractName(e.target.value)} data-testid="input-renewal-name" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="renew-start">Start date *</Label>
                <Input id="renew-start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} data-testid="input-renewal-start" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="renew-end">End date</Label>
                <Input id="renew-end" type="date" value={endDate} min={startDate || undefined} onChange={(e) => setEndDate(e.target.value)} data-testid="input-renewal-end" />
                <p className="text-xs text-muted-foreground">Leave empty for an ongoing contract.</p>
              </div>
            </div>
            {overlaps && (
              <p className="text-xs text-amber-700" data-testid="text-renewal-overlap">
                The renewal starts on or before the current contract's end date ({fmt(contract.endDate)}); the two contracts will overlap.
              </p>
            )}

            {isMultiRate ? (
              <div className="space-y-2">
                <Label>Project rates</Label>
                <div className="rounded-lg border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-secondary-50 text-xs uppercase tracking-wide text-secondary-700">
                      <tr>
                        <th className="px-3 py-2 text-left font-semibold">Project</th>
                        <th className="px-3 py-2 text-right font-semibold">Current</th>
                        <th className="px-3 py-2 text-left font-semibold">New rate *</th>
                        {showClientRate && <th className="px-3 py-2 text-left font-semibold">Client rate</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {rateLines.map((line) => (
                        <tr key={line.id} data-testid={`row-renewal-rate-line-${line.id}`}>
                          <td className="px-3 py-2 align-middle">
                            <span className="font-medium">{line.projectName}</span>
                            {line.isDefault && <span className="ml-1 text-[10px] uppercase text-muted-foreground">default</span>}
                          </td>
                          <td className="px-3 py-2 text-right align-middle tabular-nums text-muted-foreground whitespace-nowrap">
                            {line.currency} {line.currentRate}/{unitOf(line.rateType)}
                          </td>
                          <td className="px-3 py-2 align-middle">
                            <Input type="number" min="0" step="0.01" value={line.rate} onChange={(e) => setLine(line.id, { rate: e.target.value })} className="h-9" data-testid={`input-renewal-rate-${line.id}`} />
                          </td>
                          {showClientRate && (
                            <td className="px-3 py-2 align-middle">
                              <Input type="number" min="0" step="0.01" value={line.clientRate} placeholder={line.currentClientRate || "—"} onChange={(e) => setLine(line.id, { clientRate: e.target.value })} className="h-9" data-testid={`input-renewal-client-rate-${line.id}`} />
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {showClientRate && <p className="text-xs text-muted-foreground">The default project's client rate becomes the contract's client billing rate.</p>}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="renew-rate">{contract.rateType === "annual" ? "Annual package (CTC) *" : "Worker rate *"}</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">{currency}</span>
                    <Input id="renew-rate" type="number" min="0" step="0.01" value={rate} onChange={(e) => setRate(e.target.value)} data-testid="input-renewal-rate" />
                    <span className="text-sm text-muted-foreground whitespace-nowrap">/ {unit}</span>
                  </div>
                </div>
                {showClientRate && (
                  <div className="space-y-1.5">
                    <Label htmlFor="renew-client-rate">Client billing rate</Label>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">{contract.customerCurrency || currency}</span>
                      <Input id="renew-client-rate" type="number" min="0" step="0.01" value={customerBillingRate} onChange={(e) => setCustomerBillingRate(e.target.value)} data-testid="input-renewal-client-rate" />
                      <span className="text-sm text-muted-foreground whitespace-nowrap">/ {unitOf(contract.customerBillingRateType || contract.rateType)}</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {isForClient && isFixedPrice && (
              <div className="space-y-1.5 sm:max-w-xs">
                <Label htmlFor="renew-fixed">Fixed billing amount</Label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">{contract.customerCurrency || currency}</span>
                  <Input id="renew-fixed" type="number" min="0" step="0.01" value={fixedBillingAmount} onChange={(e) => setFixedBillingAmount(e.target.value)} data-testid="input-renewal-fixed-amount" />
                  {contract.fixedBillingFrequency && <span className="text-sm text-muted-foreground whitespace-nowrap">/ {String(contract.fixedBillingFrequency).replace(/_/g, " ")}</span>}
                </div>
              </div>
            )}
          </div>

          <p className="text-xs text-muted-foreground" data-testid="text-renewal-footnote">
            Copied to the new contract: role, timesheet and payment setup, host client and billing setup, remuneration lines, SDP billing lines, project rates and tier discounts (restarting from the new start date). Not carried over: timesheets, purchase orders, the signature and the SDP billing-terms acceptance. The current contract is not changed.
          </p>

          {formError && <p className="text-sm text-red-600" data-testid="text-renewal-error">{formError}</p>}

          <div className="flex justify-end gap-3 pt-1">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={renewMutation.isPending}>
              Cancel
            </Button>
            <Button type="button" onClick={submit} disabled={renewMutation.isPending} data-testid="button-renewal-create">
              {renewMutation.isPending ? "Creating…" : "Create renewal"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
