import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
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

  return {
    user,
    isLoading,
    isAuthenticated: !!user && !error,
    authReady,
    error
  };
}
