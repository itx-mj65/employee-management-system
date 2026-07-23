'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

export default function QueryProvider({ children }) {
  const [queryClient] = useState(() =>
    new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 2 * 60 * 1000,       // 2 minutes — data is fresh for 2 min
          gcTime: 10 * 60 * 1000,          // 10 minutes — keep in cache
          retry: 2,                         // Retry failed requests twice
          retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000), // Exponential backoff
          refetchOnWindowFocus: false,      // Don't refetch when tab gets focus
          refetchOnReconnect: true,         // Refetch when internet comes back
          refetchOnMount: 'always',         // Always check on mount but serve stale
        },
        mutations: {
          retry: 0,                         // Don't retry mutations
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
