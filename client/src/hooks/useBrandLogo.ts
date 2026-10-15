/**
 * Which logo the app shell shows for the signed-in user.
 *
 *   business user → their business's logo (`user.business.logoUrl`)
 *   worker        → their employer's logo (`user.employerBusiness.logoUrl`)
 *   anyone else, or no logo → the SDP Global Pay logo (`src: null`)
 *
 * Host-client logins and the SDP-owned row never carry a logo, so they get
 * the SDP logo through the same rule. Public pages do not use this hook.
 */

import { useAuth } from "@/hooks/useAuth";
import type { AuthUser } from "@/types/api";

export interface BrandLogo {
  src: string | null;
  alt: string;
}

export const SDP_BRAND_ALT = "SDP Global Pay";

export function getBrandLogo(user: AuthUser | null | undefined): BrandLogo {
  if (user?.userType === "business_user" && user.business?.logoUrl) {
    return { src: user.business.logoUrl, alt: user.business.name || "Business logo" };
  }
  if (user?.userType === "worker" && user.employerBusiness?.logoUrl) {
    return { src: user.employerBusiness.logoUrl, alt: user.employerBusiness.name || "Business logo" };
  }
  return { src: null, alt: SDP_BRAND_ALT };
}

export function useBrandLogo(): BrandLogo {
  const { user } = useAuth();
  return getBrandLogo(user);
}
