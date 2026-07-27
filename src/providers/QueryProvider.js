'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

export default function QueryProvider({ children }) {
  const [queryClient] = useState(() =>
    new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 2 * 60 * 1000,
          gcTime: 10 * 60 * 1000,
          retry: (failureCount, error) => {
            if (error?.response?.status >= 400 && error?.response?.status < 500) return false;
            return failureCount < 2;
          },
          retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000),
          refetchOnWindowFocus: false,
          refetchOnReconnect: true,
          refetchOnMount: 'always',
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
