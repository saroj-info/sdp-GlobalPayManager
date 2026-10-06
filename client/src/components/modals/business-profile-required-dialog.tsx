import { useLocation } from "wouter";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useMissingBusinessDetails } from "@/hooks/useBusinessProfile";

interface BusinessProfileRequiredDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Shown instead of the contract wizard / AI draft when a business user tries
 * to create a contract while their business details are missing. The server
 * refuses the create as well (409 BUSINESS_PROFILE_INCOMPLETE).
 */
export function BusinessProfileRequiredDialog({ open, onOpenChange }: BusinessProfileRequiredDialogProps) {
  const [, setLocation] = useLocation();
  const { missingText } = useMissingBusinessDetails();

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent data-testid="dialog-business-profile-required">
        <AlertDialogHeader>
          <AlertDialogTitle>Complete your business profile first</AlertDialogTitle>
          <AlertDialogDescription>
            A contract cannot be created until your business details are saved. Missing: {missingText}.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel data-testid="button-profile-required-cancel">Not now</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => setLocation("/business-profile")}
            data-testid="button-profile-required-continue"
          >
            Complete business profile
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
