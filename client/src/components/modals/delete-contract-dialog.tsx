/**
 * "Delete Contract" confirmation. On open it asks the server what a delete
 * would do (GET /api/contracts/:id/deletion-check): when timesheets, invoices,
 * margin payments or a renewal exist the dialog explains why it cannot be
 * deleted; otherwise it lists what goes with the contract (signed or not) and
 * asks for one confirming click (DELETE /api/contracts/:id). A 409 on the
 * confirm (activity recorded in the meantime) swaps to the blocked state.
 */
import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { AlertTriangle, Loader2, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, extractApiErrorBody, extractApiErrorMessage, queryClient } from "@/lib/queryClient";
import { listContractDeleteBlockers, type ContractDeleteBlockers, type ContractDeletionCheck } from "@shared/contractLifecycle";

interface DeleteContractDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contract: any | null;
  /** Called after a successful delete, before the dialog closes. */
  onDeleted?: (contractId: string) => void;
}

const fmtDay = (d: string | Date | null | undefined) =>
  d ? new Date(d).toLocaleDateString("en-AU", { day: "2-digit", month: "short", year: "numeric" }) : "";

export function contractDisplayName(contract: any): string {
  return (
    contract?.contractName ||
    contract?.customRoleTitle ||
    contract?.roleTitle?.title ||
    contract?.roleTitle?.name ||
    "this contract"
  );
}

export function DeleteContractDialog({ open, onOpenChange, contract, onDeleted }: DeleteContractDialogProps) {
  const { toast } = useToast();
  const contractId: string | undefined = contract?.id;
  const [blockedOverride, setBlockedOverride] = useState<ContractDeleteBlockers | null>(null);

  useEffect(() => {
    if (!open) setBlockedOverride(null);
  }, [open, contractId]);

  const check = useQuery<ContractDeletionCheck>({
    queryKey: ["/api/contracts", contractId, "deletion-check"],
    enabled: open && !!contractId,
    staleTime: 0,
    gcTime: 0,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/contracts/${id}`);
    },
    onSuccess: async (_data, id) => {
      toast({ title: "Contract deleted", description: `${contractDisplayName(contract)} was removed.` });
      // Close first: the details modal and this dialog hold per-contract queries
      // (change log, deletion check) that would otherwise refetch and 404.
      onDeleted?.(id);
      onOpenChange(false);
      await queryClient.invalidateQueries({
        predicate: (q) => {
          const first = q.queryKey[0];
          // The deleted contract's own queries (change log, this check) are
          // unmounting; refetching them would only 404.
          if (q.queryKey.some((k) => typeof k === "string" && k.includes(id))) return false;
          return typeof first === "string" && (
            first.startsWith("/api/contracts") || first.startsWith("/api/purchase-orders") || first.startsWith("/api/workers")
          );
        },
      });
    },
    onError: (err: unknown) => {
      const body = extractApiErrorBody(err);
      if (body?.code === "CONTRACT_HAS_ACTIVITY" && body.blockers) {
        setBlockedOverride(body.blockers as ContractDeleteBlockers);
        return;
      }
      toast({
        title: "Could not delete the contract",
        description: extractApiErrorMessage(err, "Please try again."),
        variant: "destructive",
      });
    },
  });

  const data = check.data;
  const blockers = blockedOverride ?? (data && !data.canDelete ? data.blockers : null);
  const view: "checking" | "error" | "blocked" | "confirm" =
    check.isPending ? "checking" : check.isError ? "error" : blockers ? "blocked" : "confirm";
  const deleting = deleteMutation.isPending;
  const name = contractDisplayName(contract);
  const workerName = [contract?.worker?.firstName, contract?.worker?.lastName].filter(Boolean).join(" ");
  const term = contract?.startDate ? `${fmtDay(contract.startDate)} – ${contract.endDate ? fmtDay(contract.endDate) : "Ongoing"}` : "";
  const poCount = data?.related?.purchaseOrders ?? 0;

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (!next && deleting) return;
        onOpenChange(next);
      }}
    >
      <AlertDialogContent className="max-h-[90vh] overflow-y-auto" data-testid="dialog-delete-contract">
        {view === "checking" && (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete contract</AlertDialogTitle>
              <AlertDialogDescription className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Checking for timesheets and invoices…
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel data-testid="button-cancel-delete-contract">Cancel</AlertDialogCancel>
            </AlertDialogFooter>
          </>
        )}

        {view === "error" && (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle>Could not check this contract</AlertDialogTitle>
              <AlertDialogDescription>{extractApiErrorMessage(check.error, "Please try again.")}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel data-testid="button-cancel-delete-contract">Close</AlertDialogCancel>
            </AlertDialogFooter>
          </>
        )}

        {view === "blocked" && blockers && (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle>This contract cannot be deleted</AlertDialogTitle>
              <AlertDialogDescription>
                Work has been recorded against "{name}". A contract with activity is kept for the records.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-3 text-sm" data-testid="delete-contract-blockers">
              <ul className="list-disc pl-5 text-secondary-800">
                {listContractDeleteBlockers(blockers).map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
              <p className="text-xs text-secondary-600">
                Remove or finish the linked records first. Only draft timesheets can be deleted; invoices and approved timesheets stay.
              </p>
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel data-testid="button-cancel-delete-contract">Close</AlertDialogCancel>
            </AlertDialogFooter>
          </>
        )}

        {view === "confirm" && data && (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete "{name}"?</AlertDialogTitle>
              <AlertDialogDescription>
                {workerName ? `${workerName} · ` : ""}{term}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-3 text-sm">
              <p className="text-secondary-800">
                This removes the contract and everything that belongs to it: its pay lines, project rates, billing lines,
                {poCount > 0 ? ` ${poCount} purchase order${poCount === 1 ? "" : "s"},` : ""} tier discounts, change history
                and the billing-terms acceptance. This cannot be undone.
              </p>
              {data.signed && (
                <div className="flex gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-amber-900" data-testid="delete-contract-signed-warning">
                  <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600" />
                  <span>The worker has signed this contract. Deleting it removes the signed record permanently.</span>
                </div>
              )}
              {data.awaitingSignature && (
                <div className="flex gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-amber-900" data-testid="delete-contract-pending-warning">
                  <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600" />
                  <span>It has been sent for signing; the signing link will stop working.</span>
                </div>
              )}
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleting} data-testid="button-cancel-delete-contract">Keep it</AlertDialogCancel>
              {/* A plain Button, not AlertDialogAction: the action closes on click, which would hide the spinner and the 409 swap. */}
              <Button
                variant="destructive"
                disabled={deleting || !contractId}
                onClick={() => contractId && deleteMutation.mutate(contractId)}
                data-testid="button-confirm-delete-contract"
              >
                {deleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                {deleting ? "Deleting…" : "Delete contract"}
              </Button>
            </AlertDialogFooter>
          </>
        )}
      </AlertDialogContent>
    </AlertDialog>
  );
}
