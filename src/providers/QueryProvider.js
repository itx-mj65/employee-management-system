'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

// === PRODUCTION QUERY CLIENT FOR 100+ EMPLOYEES ===
// - Deduplication: same queryKey from multiple components = 1 request
// - Stale-while-revalidate: shows cached data instantly, refetches in background
// - Smart retries: only retry server errors, not client errors
// - Structural sharing: React won't re-render if data hasn't actually changed

export default function QueryProvider({ children }) {
  const [queryClient] = useState(() =>
    new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 2 * 60 * 1000,        // 2 min default — most data is fresh enough
          gcTime: 15 * 60 * 1000,           // 15 min in cache after unmount
          retry: (failureCount, error) => {
            const status = error?.response?.status;
            if (status >= 400 && status < 500) return false;  // Don't retry 4xx
            return failureCount < 2;                           // Retry 5xx twice
          },
          retryDelay: (attempt) => Math.min(1500 * 2 ** attempt, 10000),
          refetchOnWindowFocus: false,       // Don't spam server on tab switch
          refetchOnReconnect: true,          // Refetch when back online
          refetchOnMount: true,
          keepPreviousData: true,              // Refetch if stale on mount
          structuralSharing: true,           // Prevent unnecessary re-renders
          throwOnError: false,
          networkMode: 'offlineFirst',       // Use cache when offline
        },
        mutations: {
          retry: 0,
          throwOnError: false,
          networkMode: 'offlineFirst',
        },
      },
    })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
