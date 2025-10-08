import { useState, useCallback, useRef, TouchEvent } from 'react';
import { haptics } from '@/lib/haptics';

export interface PullToRefreshOptions {
  onRefresh: () => Promise<void>;
  threshold?: number;
  maxPullDistance?: number;
  enableHaptic?: boolean;
}

export interface PullToRefreshState {
  pulling: boolean;
  refreshing: boolean;
  pullDistance: number;
  canRefresh: boolean;
}

export interface PullToRefreshHandlers {
  onTouchStart: (e: TouchEvent) => void;
  onTouchMove: (e: TouchEvent) => void;
  onTouchEnd: () => void;
  state: PullToRefreshState;
}

/**
 * Custom hook for pull-to-refresh functionality
 *
 * @param options - Configuration options
 * @returns Event handlers and state for pull-to-refresh
 *
 * @example
 * const pullToRefresh = usePullToRefresh({
 *   onRefresh: async () => {
 *     await fetchData();
 *   },
 *   threshold: 80
 * });
 *
 * <div {...pullToRefresh}>
 *   {pullToRefresh.state.refreshing && <Spinner />}
 *   <Content />
 * </div>
 */
export function usePullToRefresh({
  onRefresh,
  threshold = 80,
  maxPullDistance = 120,
  enableHaptic = true,
}: PullToRefreshOptions): PullToRefreshHandlers {
  const [state, setState] = useState<PullToRefreshState>({
    pulling: false,
    refreshing: false,
    pullDistance: 0,
    canRefresh: false,
  });

  const startY = useRef<number>(0);
  const scrollElement = useRef<HTMLElement | null>(null);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    const target = e.currentTarget as HTMLElement;
    scrollElement.current = target;

    // Only allow pull-to-refresh when scrolled to the top
    if (target.scrollTop === 0) {
      startY.current = e.touches[0].clientY;
      setState(prev => ({ ...prev, pulling: true }));
    }
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!state.pulling || state.refreshing) return;

    const currentY = e.touches[0].clientY;
    const distance = Math.min(currentY - startY.current, maxPullDistance);

    if (distance > 0) {
      // Prevent default scrolling while pulling
      e.preventDefault();

      const canRefresh = distance >= threshold;

      // Provide haptic feedback when threshold is reached
      if (canRefresh && !state.canRefresh && enableHaptic) {
        haptics.medium();
      }

      setState(prev => ({
        ...prev,
        pullDistance: distance,
        canRefresh,
      }));
    }
  }, [state.pulling, state.refreshing, state.canRefresh, threshold, maxPullDistance, enableHaptic]);

  const handleTouchEnd = useCallback(async () => {
    if (!state.pulling || state.refreshing) return;

    if (state.canRefresh) {
      setState(prev => ({ ...prev, refreshing: true }));

      if (enableHaptic) {
        haptics.success();
      }

      try {
        await onRefresh();
      } catch (error) {
        console.error('Refresh failed:', error);
        if (enableHaptic) {
          haptics.error();
        }
      } finally {
        setState({
          pulling: false,
          refreshing: false,
          pullDistance: 0,
          canRefresh: false,
        });
      }
    } else {
      // Reset if threshold not met
      setState({
        pulling: false,
        refreshing: false,
        pullDistance: 0,
        canRefresh: false,
      });
    }

    startY.current = 0;
  }, [state.pulling, state.refreshing, state.canRefresh, onRefresh, enableHaptic]);

  return {
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd,
    state,
  };
}
