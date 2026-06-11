import { useQuery } from "@tanstack/react-query";
import { getQueryFn, apiRequest, queryClient } from "@/lib/queryClient";
import type { AuthUser } from "@/types/api";

export function useAuth() {
  const { data: user, isLoading, error } = useQuery<AuthUser | null>({
    queryKey: ["/api/auth/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // authReady is true when loading is complete (either success or error)
  const authReady = !isLoading;

  // Dual-role: `userType` is overloaded by the server with the ACTIVE role, so
  // existing `user.userType` reads transparently follow the active view.
  const activeRole = (user as any)?.userType as string | undefined;
  const availableRoles = ((user as any)?.availableRoles as string[] | undefined) ?? [];
  const canSwitchRole = availableRoles.length > 1;

  // Switch the active role: re-issue the JWT, then WIPE the entire query cache so
  // no data scoped to the previous role can linger (strict per-role isolation),
  // and refetch the auth user so the sidebar/dashboard rebuild for the new role.
  async function switchRole(role: string) {
    const res = await apiRequest("POST", "/api/auth/switch-role", { role });
    const data = await res.json();
    if (data?.token) {
      localStorage.setItem("authToken", data.token);
    }
    queryClient.clear();
    await queryClient.refetchQueries({ queryKey: ["/api/auth/user"] });
    return data;
  }

  return {
    user,
    isLoading,
    isAuthenticated: !!user && !error,
    authReady,
    error,
    activeRole,
    availableRoles,
    canSwitchRole,
    switchRole,
  };
}
