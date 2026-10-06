/**
 * Dashboard dispatcher — routes the authenticated user to their role's
 * dashboard. Only the mounted component fetches data, so e.g. third-party
 * sessions make zero dashboard API calls.
 *
 * Also the one place a business user is sent to /business-profile when their
 * business details are missing: plain login, 2FA login and role switch all
 * land here (`/dashboard` or `/`), and deep links to other pages never do.
 */

import { useLayoutEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { PageLoader } from "@/components/ui/loader";
import { getMissingBusinessDetails } from "@shared/businessProfile";
import { hasBeenPromptedForBusinessProfile, markPromptedForBusinessProfile } from "@/lib/businessProfilePrompt";
import { SdpDashboard } from "./sdp-dashboard";
import { BusinessDashboard } from "./business-dashboard";
import { WorkerDashboard } from "./worker-dashboard";
import { ThirdPartyDashboard } from "./third-party-dashboard";

// Rendered in place of the business dashboard, so the dashboard neither
// flashes nor fetches before the move. The marker is set first: the profile
// page's "Skip for now" comes back here and must not be redirected again.
function BusinessProfileRedirect() {
  const [, setLocation] = useLocation();
  useLayoutEffect(() => {
    markPromptedForBusinessProfile();
    setLocation("/business-profile", { replace: true });
  }, [setLocation]);
  return <PageLoader label="Loading" />;
}

export default function Dashboard() {
  const { user, isAuthenticated, authReady } = useAuth();

  if (!authReady) {
    return <PageLoader label="Loading dashboard" />;
  }

  if (!isAuthenticated || !user) {
    window.location.href = "/login";
    return null;
  }

  switch (user.userType) {
    case "worker":
      return <WorkerDashboard />;
    case "business_user":
      // Once per login (per auth token) while details are missing; after that
      // the reminder bar in the app shell takes over.
      if (getMissingBusinessDetails(user.business).length > 0 && !hasBeenPromptedForBusinessProfile()) {
        return <BusinessProfileRedirect />;
      }
      return <BusinessDashboard />;
    case "sdp_internal":
      return <SdpDashboard />;
    default:
      // third_party_business and anything unknown — static welcome, no data
      // fetches (the old fallthrough into the business view 403'd everywhere).
      return <ThirdPartyDashboard />;
  }
}
