'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { haptics } from '@/lib/haptics';

export interface PullToRefreshConfig {
  threshold?: number;
  maxPullDistance?: number;
  resistance?: number;
  enableHaptic?: boolean;
  onRefresh: () => Promise<void>;
}

const DEFAULT_CONFIG = {
  threshold: 80,
  maxPullDistance: 120,
  resistance: 2.5,
  enableHaptic: true,
};

/**
 * Pull-to-refresh hook for mobile lists
 * Implements iOS-style pull-to-refresh behavior
 */
export function usePullToRefresh(config: PullToRefreshConfig) {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };
  const [isPulling, setIsPulling] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const startY = useRef(0);
  const isDragging = useRef(false);
  const hasTriggeredHaptic = useRef(false);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    // Only allow pull-to-refresh when at the top of the page
    if (window.scrollY === 0) {
      startY.current = e.touches[0].clientY;
      isDragging.current = true;
      hasTriggeredHaptic.current = false;
    }
  }, []);

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!isDragging.current || isRefreshing) return;

      const currentY = e.touches[0].clientY;
      const distance = currentY - startY.current;

      // Only track downward pulls
      if (distance > 0) {
        // Apply resistance to create natural feeling
        const resistedDistance = distance / mergedConfig.resistance;
        const cappedDistance = Math.min(resistedDistance, mergedConfig.maxPullDistance);

        setPullDistance(cappedDistance);
        setIsPulling(true);

        // Trigger haptic when threshold is reached
        if (
          mergedConfig.enableHaptic &&
          !hasTriggeredHaptic.current &&
          cappedDistance >= mergedConfig.threshold
        ) {
          haptics.medium();
          hasTriggeredHaptic.current = true;
        }

        // Prevent scrolling when pulling
        if (distance > 10) {
          e.preventDefault();
        }
      }
    },
    [isRefreshing, mergedConfig]
  );

  const handleTouchEnd = useCallback(async () => {
    if (!isDragging.current) return;

    isDragging.current = false;

    // Trigger refresh if threshold is met
    if (pullDistance >= mergedConfig.threshold && !isRefreshing) {
      setIsRefreshing(true);
      if (mergedConfig.enableHaptic) {
        haptics.success();
      }

      try {
        await mergedConfig.onRefresh();
      } catch (error) {
        console.error('Refresh failed:', error);
        if (mergedConfig.enableHaptic) {
          haptics.error();
        }
      } finally {
        setIsRefreshing(false);
      }
    }

    // Reset state
    setIsPulling(false);
    setPullDistance(0);
    hasTriggeredHaptic.current = false;
  }, [pullDistance, isRefreshing, mergedConfig]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Add event listeners
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd);

    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  // Calculate progress percentage
  const progress = Math.min((pullDistance / mergedConfig.threshold) * 100, 100);

  return {
    isPulling,
    isRefreshing,
    pullDistance,
    progress,
    canRefresh: pullDistance >= mergedConfig.threshold,
  };
}
