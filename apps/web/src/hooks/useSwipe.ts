import { useState, useCallback, TouchEvent } from 'react';
import { haptics } from '@/lib/haptics';

export interface SwipeHandlers {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  threshold?: number;
  enableHaptic?: boolean;
}

export interface SwipeEventHandlers {
  onTouchStart: (e: TouchEvent) => void;
  onTouchMove: (e: TouchEvent) => void;
  onTouchEnd: () => void;
}

/**
 * Custom hook for handling swipe gestures
 *
 * @param handlers - Callback functions for different swipe directions
 * @returns Event handlers to attach to an element
 *
 * @example
 * const swipeHandlers = useSwipe({
 *   onSwipeLeft: () => console.log('Swiped left'),
 *   onSwipeRight: () => console.log('Swiped right'),
 *   threshold: 50,
 *   enableHaptic: true
 * });
 *
 * <div {...swipeHandlers}>Swipeable content</div>
 */
export function useSwipe({
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  onSwipeDown,
  threshold = 50,
  enableHaptic = true,
}: SwipeHandlers): SwipeEventHandlers {
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
  const [touchEnd, setTouchEnd] = useState<{ x: number; y: number } | null>(null);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    setTouchEnd(null);
    setTouchStart({
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY,
    });
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    setTouchEnd({
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY,
    });
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (!touchStart || !touchEnd) return;

    const deltaX = touchStart.x - touchEnd.x;
    const deltaY = touchStart.y - touchEnd.y;
    const absDeltaX = Math.abs(deltaX);
    const absDeltaY = Math.abs(deltaY);

    // Determine if swipe is horizontal or vertical
    const isHorizontal = absDeltaX > absDeltaY;

    // Horizontal swipes
    if (isHorizontal && absDeltaX > threshold) {
      if (deltaX > 0) {
        // Swipe left
        if (onSwipeLeft) {
          if (enableHaptic) haptics.selection();
          onSwipeLeft();
        }
      } else {
        // Swipe right
        if (onSwipeRight) {
          if (enableHaptic) haptics.selection();
          onSwipeRight();
        }
      }
    }
    // Vertical swipes
    else if (!isHorizontal && absDeltaY > threshold) {
      if (deltaY > 0) {
        // Swipe up
        if (onSwipeUp) {
          if (enableHaptic) haptics.selection();
          onSwipeUp();
        }
      } else {
        // Swipe down
        if (onSwipeDown) {
          if (enableHaptic) haptics.selection();
          onSwipeDown();
        }
      }
    }

    // Reset
    setTouchStart(null);
    setTouchEnd(null);
  }, [touchStart, touchEnd, threshold, enableHaptic, onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown]);

  return {
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd,
  };
}
