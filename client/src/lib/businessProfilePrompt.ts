/**
 * "Prompted once per login" marker for the business-profile redirect
 * (pages/dashboard/index.tsx).
 *
 * Every login, 2FA login and role switch stores a new auth token, so the
 * marker is tied to the current token: a new token prompts again, while a
 * refresh or a sidebar click with the same token does not. Logout and session
 * expiry clear localStorage, which removes the marker along with the token.
 */

const MARKER_KEY = "businessProfilePromptedFor";

// The token's tail identifies it without keeping a second copy of the JWT.
function tokenFingerprint(): string | null {
  const token = localStorage.getItem("authToken");
  return token ? token.slice(-32) : null;
}

// No token (session-only auth) or blocked storage counts as "already
// prompted": never redirect on a guess. The reminder bar still shows.
export function hasBeenPromptedForBusinessProfile(): boolean {
  try {
    const fingerprint = tokenFingerprint();
    return !fingerprint || localStorage.getItem(MARKER_KEY) === fingerprint;
  } catch {
    return true;
  }
}

export function markPromptedForBusinessProfile(): void {
  try {
    const fingerprint = tokenFingerprint();
    if (fingerprint) localStorage.setItem(MARKER_KEY, fingerprint);
  } catch {
    // storage unavailable: nothing to remember
  }
}
