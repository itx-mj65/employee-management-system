'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

export default function QueryProvider({ children }) {
  const [queryClient] = useState(() =>
    new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 3 * 60 * 1000,
          gcTime: 15 * 60 * 1000,
          retry: (failureCount, error) => {
            // Don't retry on 4xx errors (client errors)
            if (error?.response?.status >= 400 && error?.response?.status < 500) return false;
            return failureCount < 2;
          },
          retryDelay: (attempt) => Math.min(2000 * 2 ** attempt, 15000),
          refetchOnWindowFocus: false,
          refetchOnReconnect: true,
          throwOnError: false,
        },
        mutations: {
          retry: 0,
          throwOnError: false,
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
