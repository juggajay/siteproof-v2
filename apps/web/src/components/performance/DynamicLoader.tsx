'use client';

import dynamic from 'next/dynamic';
import { ComponentType } from 'react';

/**
 * Loading Skeleton Component
 */
function LoadingSkeleton({ height = '200px' }: { height?: string }) {
  return (
    <div
      className="animate-pulse bg-gray-200 rounded-lg"
      style={{ height }}
      role="status"
      aria-label="Loading content"
    >
      <span className="sr-only">Loading...</span>
    </div>
  );
}

/**
 * Dynamic Component Loader with Optimized Loading States
 */
export function createDynamicComponent<P extends object>(
  importFn: () => Promise<{ default: ComponentType<P> }>,
  options?: {
    ssr?: boolean;
    loadingHeight?: string;
  }
) {
  return dynamic(importFn, {
    loading: () => <LoadingSkeleton height={options?.loadingHeight} />,
    ssr: options?.ssr ?? false,
  });
}
