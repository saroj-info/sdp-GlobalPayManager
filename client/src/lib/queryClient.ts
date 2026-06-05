import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

// Triggered whenever a request to a protected endpoint comes back 401.
// Reasons this fires: JWT in localStorage expired, JWT was tampered with, or
// the server returned 401 for any other reason. We clear the stale token and
// redirect to /login so the user lands somewhere actionable instead of seeing
// a "no token" toast and being stuck on a broken page.
//
// Guards:
//   - if no `authToken` was stored, the user was never logged in → don't redirect
//     (the 401 is "you need to sign in to see this" rather than "your session
//     expired", and the login page itself can return 401 for bad credentials)
//   - if we're already on /login, don't redirect (avoid loop)
//   - module-level flag prevents concurrent fan-out from many parallel queries
//     all triggering a redirect at once
let isAuthExpiredHandled = false;
function handleAuthExpired() {
  if (typeof window === "undefined") return;
  if (isAuthExpiredHandled) return;
  if (window.location.pathname === "/login") return;
  if (!localStorage.getItem("authToken")) return;
  isAuthExpiredHandled = true;
  try { localStorage.clear(); } catch {}
  try { sessionStorage.clear(); } catch {}
  try { queryClient.clear(); } catch {}
  window.location.href = "/login?session=expired";
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const headers: Record<string, string> = {};
  
  if (data) {
    headers["Content-Type"] = "application/json";
  }

  // Add auth token from localStorage
  const token = localStorage.getItem('authToken');
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: 'include', // Include session cookies
    cache: 'no-store', // Prevent browser caching
  });

  if (res.status === 401) handleAuthExpired();
  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const headers: Record<string, string> = {};
    
    // Add auth token from localStorage
    const token = localStorage.getItem('authToken');
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const res = await fetch(queryKey.join("/") as string, {
      headers,
      credentials: 'include', // Include session cookies
      cache: 'no-store', // Prevent browser caching
    });

    if (res.status === 401) {
      // Stale/expired token — clear it and bounce to /login. Guard inside the
      // helper skips the redirect for unauthenticated users on public pages.
      handleAuthExpired();
      if (unauthorizedBehavior === "returnNull") return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // Cache data for 5 minutes to reduce duplicate queries
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});

// Logout utility function
export async function handleLogout() {
  try {
    // Call backend logout endpoint to destroy session
    await fetch('/api/logout', {
      method: 'POST',
      credentials: 'include',
    });
  } catch (error) {
    console.error('Logout API call failed:', error);
    // Continue with logout even if API call fails
  }
  
  // Clear entire localStorage and sessionStorage
  try {
    localStorage.clear();
    sessionStorage.clear();
  } catch (e) {
    // fall back to removing the known key if clear fails
    localStorage.removeItem('authToken');
  }

  // Clear all TanStack Query cache
  queryClient.clear();
  
  // Redirect to login
  window.location.href = '/login';
}
