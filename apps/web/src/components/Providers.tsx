'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import dynamic from 'next/dynamic';
import { ServiceWorkerProvider } from './ServiceWorkerProvider';
import { ToastProvider, ThemeProvider } from '@siteproof/design-system';
import { useState, type ComponentType } from 'react';

const ReactQueryDevtools = (
  process.env.NODE_ENV === 'production'
    ? () => null
    : dynamic(
        () =>
          import('@tanstack/react-query-devtools').then((mod) => mod.ReactQueryDevtools),
        { ssr: false }
      )
) as ComponentType<{ initialIsOpen?: boolean }>;

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000, // 5 minutes
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light" storageKey="siteproof-theme">
        <ToastProvider>
          <ServiceWorkerProvider>
            {children}
          </ServiceWorkerProvider>
        </ToastProvider>
      </ThemeProvider>
      {process.env.NODE_ENV !== 'production' && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  );
}
