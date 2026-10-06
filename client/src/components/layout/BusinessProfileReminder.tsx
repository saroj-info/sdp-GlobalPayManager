import { useLocation } from "wouter";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMissingBusinessDetails } from "@/hooks/useBusinessProfile";

/**
 * Reminder bar for a business user whose business details are missing. Sits at
 * the top of every authenticated page until the details are saved; hidden on
 * the profile page itself. It is in the normal flow of <main>, so it scrolls
 * with the page and the app shell's scroll lock is untouched. No fixed widths:
 * beside the sidebar a tablet leaves about 512px, so the text and button wrap.
 */
export function BusinessProfileReminder() {
  const [location, setLocation] = useLocation();
  const { isIncomplete, missingText } = useMissingBusinessDetails();

  if (!isIncomplete || location === "/business-profile") return null;

  return (
    <div
      role="status"
      className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-amber-200 bg-amber-50 px-6 py-2 text-sm text-amber-800"
      data-testid="banner-business-profile"
    >
      <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
      <p className="min-w-0 flex-1 basis-56">
        Your business profile is incomplete. Missing: {missingText}. You cannot create contracts until these details are saved.
      </p>
      <Button
        size="sm"
        variant="outline"
        className="shrink-0 border-amber-300 bg-white text-amber-900 hover:bg-amber-100"
        onClick={() => setLocation("/business-profile")}
        data-testid="button-complete-business-profile"
      >
        Complete business profile
      </Button>
    </div>
  );
}
