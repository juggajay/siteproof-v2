'use client';

import { motion } from 'framer-motion';
import { RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PullRefreshIndicatorProps {
  isPulling: boolean;
  isRefreshing: boolean;
  pullDistance: number;
  progress: number;
  threshold?: number;
}

/**
 * Visual indicator for pull-to-refresh functionality
 * Shows animated spinner and progress
 */
export function PullRefreshIndicator({
  isPulling,
  isRefreshing,
  pullDistance,
  progress,
  threshold = 80,
}: PullRefreshIndicatorProps) {
  // Don't show if not pulling or refreshing
  if (!isPulling && !isRefreshing) return null;

  // Calculate opacity based on pull distance
  const opacity = Math.min(pullDistance / threshold, 1);

  return (
    <div
      className="fixed top-0 left-0 right-0 flex justify-center pointer-events-none z-50"
      style={{
        transform: `translateY(${Math.min(pullDistance, threshold)}px)`,
        transition: isPulling ? 'none' : 'transform 0.3s ease-out',
      }}
    >
      <div
        className={cn(
          'flex flex-col items-center gap-2 px-6 py-3 bg-white/90 backdrop-blur-sm rounded-full shadow-lg',
          'border border-gray-200'
        )}
        style={{ opacity }}
      >
        {/* Spinner */}
        <motion.div
          animate={{
            rotate: isRefreshing ? 360 : progress * 3.6,
          }}
          transition={{
            duration: isRefreshing ? 1 : 0,
            repeat: isRefreshing ? Infinity : 0,
            ease: 'linear',
          }}
        >
          <RefreshCw
            className={cn(
              'h-6 w-6',
              progress >= 100 || isRefreshing ? 'text-primary-600' : 'text-gray-400'
            )}
          />
        </motion.div>

        {/* Status text */}
        <motion.p
          className="text-xs font-medium text-gray-600"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
        >
          {isRefreshing
            ? 'Refreshing...'
            : progress >= 100
            ? 'Release to refresh'
            : 'Pull to refresh'}
        </motion.p>

        {/* Progress bar */}
        {!isRefreshing && (
          <div className="w-full h-1 bg-gray-200 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-primary-600"
              style={{ width: `${Math.min(progress, 100)}%` }}
              transition={{ duration: 0.1 }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
