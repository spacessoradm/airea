import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey.join("/") as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

// iOS Safari detection for optimized caching
const isIOSSafari = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "returnNull" }),
      refetchInterval: false,
      refetchOnWindowFocus: !isIOSSafari, // Disable for iOS Safari to reduce battery usage
      staleTime: isIOSSafari ? 10 * 60 * 1000 : 5 * 60 * 1000, // Longer stale time for iOS
      gcTime: isIOSSafari ? 30 * 60 * 1000 : 15 * 60 * 1000, // Longer cache for iOS 
      retry: isIOSSafari ? 0 : 1, // No retries on iOS for faster loading
      networkMode: isIOSSafari ? 'offlineFirst' : 'online', // Prefer cache on iOS
    },
    mutations: {
      retry: 1,
      networkMode: 'offlineFirst',
    },
  },
});

// Preload critical data for instant app startup
export const preloadCriticalData = () => {
  // iOS Safari: Reduce initial prefetching to essential data only
  if (isIOSSafari) {
    // Only preload the most critical data
    queryClient.prefetchQuery({
      queryKey: ['/api/properties'],
      staleTime: 30 * 60 * 1000,
    });
  } else {
    // Preload main properties data
    queryClient.prefetchQuery({
      queryKey: ['/api/properties'],
      staleTime: 15 * 60 * 1000,
    });

    // Preload recommendations for instant page switches
    queryClient.prefetchQuery({
      queryKey: ['/api/recommendations/trending'],
      staleTime: 15 * 60 * 1000,
    });

    queryClient.prefetchQuery({
      queryKey: ['/api/recommendations/personalized'],
      staleTime: 15 * 60 * 1000,
    });
  }
};
