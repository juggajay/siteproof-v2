'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';

export interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
  threshold?: number;
  maxPullDistance?: number;
  className?: string;
  enableHaptic?: boolean;
}

/**
 * PullToRefresh Component
 *
 * Wraps content with pull-to-refresh functionality.
 * Shows a loading indicator when pulling down from the top.
 *
 * @example
 * <PullToRefresh onRefresh={async () => await fetchData()}>
 *   <YourContent />
 * </PullToRefresh>
 */
export function PullToRefresh({
  onRefresh,
  children,
  threshold = 80,
  maxPullDistance = 120,
  className,
  enableHaptic = true,
}: PullToRefreshProps) {
  const { onTouchStart, onTouchMove, onTouchEnd, state } = usePullToRefresh({
    onRefresh,
    threshold,
    maxPullDistance,
    enableHaptic,
  });

  const pullProgress = Math.min((state.pullDistance / threshold) * 100, 100);
  const spinnerRotation = (pullProgress / 100) * 360;

  return (
    <div
      className={cn('relative overflow-auto', className)}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Pull indicator */}
      <div
        className="absolute top-0 left-0 right-0 flex items-center justify-center transition-all duration-200 ease-out"
        style={{
          height: state.pulling || state.refreshing ? state.pullDistance : 0,
          opacity: state.pulling || state.refreshing ? 1 : 0,
        }}
      >
        <div className="relative">
          {state.refreshing ? (
            // Spinning loader during refresh
            <svg
              className="animate-spin h-8 w-8 text-primary-600"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          ) : (
            // Pull progress indicator
            <div className="relative">
              <svg
                className="h-8 w-8 text-primary-600 transition-transform duration-100"
                style={{
                  transform: `rotate(${spinnerRotation}deg)`,
                }}
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              {state.canRefresh && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <svg
                    className="h-4 w-4 text-primary-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={3}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div
        className="transition-transform duration-200 ease-out"
        style={{
          transform:
            state.pulling || state.refreshing
              ? `translateY(${state.pullDistance}px)`
              : 'translateY(0)',
        }}
      >
        {children}
      </div>
    </div>
  );
}
