/**
 * Dashboard dispatcher — routes the authenticated user to their role's
 * dashboard. Only the mounted component fetches data, so e.g. third-party
 * sessions make zero dashboard API calls.
 */

import { useAuth } from "@/hooks/useAuth";
import { PageLoader } from "@/components/ui/loader";
import { SdpDashboard } from "./sdp-dashboard";
import { BusinessDashboard } from "./business-dashboard";
import { WorkerDashboard } from "./worker-dashboard";
import { ThirdPartyDashboard } from "./third-party-dashboard";

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
      return <BusinessDashboard />;
    case "sdp_internal":
      return <SdpDashboard />;
    default:
      // third_party_business and anything unknown — static welcome, no data
      // fetches (the old fallthrough into the business view 403'd everywhere).
      return <ThirdPartyDashboard />;
  }
}
