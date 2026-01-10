import { useQuery } from "@tanstack/react-query";
import type { User } from "@shared/schema";

export function useAuth() {
  const { data: user, isLoading, error } = useQuery<User>({
    queryKey: ["/api/auth/user"],
    retry: false,
    staleTime: 15 * 60 * 1000, // 15 minutes - auth rarely changes
    gcTime: 30 * 60 * 1000, // 30 minutes garbage collection
    refetchOnMount: false, // Don't refetch on every mount
    refetchOnWindowFocus: false,
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    error,
  };
}
