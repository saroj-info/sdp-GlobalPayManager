import { useAuth } from "@/hooks/useAuth";
import { describeMissingBusinessDetails, getMissingBusinessDetails } from "@shared/businessProfile";

/**
 * Required business details the signed-in business user still has to fill in
 * (address, country, registration number). Always "nothing missing" for other
 * roles, host-client logins and users with no business. Reads the cached auth
 * user, so it adds no request.
 */
export function useMissingBusinessDetails() {
  const { user } = useAuth();
  const business = user?.userType === "business_user" ? user.business : null;
  const missing = getMissingBusinessDetails(business);
  return {
    missing,
    isIncomplete: missing.length > 0,
    // e.g. "address, country and business registration number"
    missingText: describeMissingBusinessDetails(missing, business?.registrationCountryId),
  };
}
