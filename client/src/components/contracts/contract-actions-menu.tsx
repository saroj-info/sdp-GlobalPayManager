/**
 * Triple-dot quick actions beside "View Details" / "View" on the contracts
 * page: host client confirmation, renewal, extension and deletion. The page decides who
 * sees the menu (canUseContractActions in @shared/contractLifecycle); this
 * component only decides which items are enabled for the given contract.
 */
import type { ReactNode } from "react";
import { CalendarPlus, ClipboardCheck, MoreHorizontal, RefreshCw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface ContractActionsMenuProps {
  contract: any;
  onConfirmClient: (contract: any) => void;
  onRenew: (contract: any) => void;
  onExtend: (contract: any) => void;
  /** When given, a "Delete Contract" item is added (the server decides whether it is allowed). */
  onDelete?: (contract: any) => void;
  className?: string;
}

interface ItemSpec {
  testId: string;
  icon: ReactNode;
  label: string;
  /** When set the item is disabled and the reason shows as a tooltip. */
  reason: string | null;
  onSelect: () => void;
  className?: string;
}

export function ContractActionsMenu({ contract, onConfirmClient, onRenew, onExtend, onDelete, className }: ContractActionsMenuProps) {
  const confirmReason = contract?.isForClient ? null : "Only available on host-client (Customer Work) contracts";
  const extendReason = !contract?.endDate
    ? "This contract has no end date (ongoing)"
    : contract?.status === "terminated"
      ? "Terminated contracts cannot be extended"
      : null;

  const renderItem = (spec: ItemSpec) => {
    const item = (
      <DropdownMenuItem disabled={!!spec.reason} onSelect={() => spec.onSelect()} data-testid={spec.testId} className={spec.className}>
        {spec.icon}
        <span>{spec.label}</span>
      </DropdownMenuItem>
    );
    if (!spec.reason) return item;
    // A disabled item has pointer-events: none, so the wrapper carries the tooltip.
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div>{item}</div>
        </TooltipTrigger>
        <TooltipContent side="left">{spec.reason}</TooltipContent>
      </Tooltip>
    );
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={className}
          aria-label="More actions"
          title="More actions"
          data-testid={`button-contract-actions-${contract?.id}`}
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        {renderItem({
          testId: "menu-contract-confirm",
          icon: <ClipboardCheck className="mr-2 h-4 w-4" />,
          label: "Update Host Client Contract Confirmation",
          reason: confirmReason,
          onSelect: () => onConfirmClient(contract),
        })}
        {renderItem({
          testId: "menu-contract-renew",
          icon: <RefreshCw className="mr-2 h-4 w-4" />,
          label: "Contract Renewal",
          reason: null,
          onSelect: () => onRenew(contract),
        })}
        {renderItem({
          testId: "menu-contract-extend",
          icon: <CalendarPlus className="mr-2 h-4 w-4" />,
          label: "Contract Extending",
          reason: extendReason,
          onSelect: () => onExtend(contract),
        })}
        {onDelete && (
          <>
            <DropdownMenuSeparator />
            {renderItem({
              testId: "menu-contract-delete",
              icon: <Trash2 className="mr-2 h-4 w-4" />,
              label: "Delete Contract",
              reason: null,
              className: "text-destructive focus:text-destructive",
              onSelect: () => onDelete(contract),
            })}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
