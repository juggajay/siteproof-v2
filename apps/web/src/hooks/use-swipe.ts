'use client';

import { useRef, useState } from 'react';
import { haptics } from '@/lib/haptics';

export interface SwipeCallbacks {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  onSwipeStart?: () => void;
  onSwipeEnd?: () => void;
}

export interface SwipeConfig {
  minSwipeDistance?: number;
  maxSwipeTime?: number;
  preventDefaultTouchmoveEvent?: boolean;
  trackTouch?: boolean;
  trackMouse?: boolean;
  enableHaptic?: boolean;
}

const DEFAULT_CONFIG: Required<SwipeConfig> = {
  minSwipeDistance: 60,
  maxSwipeTime: 500,
  preventDefaultTouchmoveEvent: false,
  trackTouch: true,
  trackMouse: false,
  enableHaptic: true,
};

/**
 * Custom swipe detection hook
 * Detects swipe gestures on touch devices
 */
export function useSwipe(
  callbacks: SwipeCallbacks,
  config: SwipeConfig = {}
) {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };
  const startX = useRef<number>(0);
  const startY = useRef<number>(0);
  const startTime = useRef<number>(0);
  const [isSwiping, setIsSwiping] = useState(false);

  const handlers = useRef<{
    onTouchStart: (e: TouchEvent) => void;
    onTouchMove: (e: TouchEvent) => void;
    onTouchEnd: (e: TouchEvent) => void;
    onMouseDown: (e: MouseEvent) => void;
    onMouseMove: (e: MouseEvent) => void;
    onMouseUp: (e: MouseEvent) => void;
  }>({
    onTouchStart: (e: TouchEvent) => {
      const touch = e.touches[0];
      startX.current = touch.clientX;
      startY.current = touch.clientY;
      startTime.current = Date.now();
      setIsSwiping(true);
      callbacks.onSwipeStart?.();
    },

    onTouchMove: (e: TouchEvent) => {
      if (mergedConfig.preventDefaultTouchmoveEvent) {
        e.preventDefault();
      }
    },

    onTouchEnd: (e: TouchEvent) => {
      const touch = e.changedTouches[0];
      const deltaX = touch.clientX - startX.current;
      const deltaY = touch.clientY - startY.current;
      const deltaTime = Date.now() - startTime.current;

      setIsSwiping(false);
      callbacks.onSwipeEnd?.();

      // Check if swipe is valid
      if (deltaTime > mergedConfig.maxSwipeTime) return;

      const absX = Math.abs(deltaX);
      const absY = Math.abs(deltaY);

      // Determine swipe direction
      if (absX > absY && absX > mergedConfig.minSwipeDistance) {
        if (mergedConfig.enableHaptic) {
          haptics.selection();
        }
        if (deltaX > 0) {
          callbacks.onSwipeRight?.();
        } else {
          callbacks.onSwipeLeft?.();
        }
      } else if (absY > absX && absY > mergedConfig.minSwipeDistance) {
        if (mergedConfig.enableHaptic) {
          haptics.selection();
        }
        if (deltaY > 0) {
          callbacks.onSwipeDown?.();
        } else {
          callbacks.onSwipeUp?.();
        }
      }
    },

    onMouseDown: (e: MouseEvent) => {
      startX.current = e.clientX;
      startY.current = e.clientY;
      startTime.current = Date.now();
      setIsSwiping(true);
      callbacks.onSwipeStart?.();
    },

    onMouseMove: () => {
      // Mouse tracking can be added here if needed
    },

    onMouseUp: (e: MouseEvent) => {
      const deltaX = e.clientX - startX.current;
      const deltaY = e.clientY - startY.current;
      const deltaTime = Date.now() - startTime.current;

      setIsSwiping(false);
      callbacks.onSwipeEnd?.();

      if (deltaTime > mergedConfig.maxSwipeTime) return;

      const absX = Math.abs(deltaX);
      const absY = Math.abs(deltaY);

      if (absX > absY && absX > mergedConfig.minSwipeDistance) {
        if (deltaX > 0) {
          callbacks.onSwipeRight?.();
        } else {
          callbacks.onSwipeLeft?.();
        }
      } else if (absY > absX && absY > mergedConfig.minSwipeDistance) {
        if (deltaY > 0) {
          callbacks.onSwipeDown?.();
        } else {
          callbacks.onSwipeUp?.();
        }
      }
    },
  });

  return {
    onTouchStart: mergedConfig.trackTouch ? handlers.current.onTouchStart : undefined,
    onTouchMove: mergedConfig.trackTouch ? handlers.current.onTouchMove : undefined,
    onTouchEnd: mergedConfig.trackTouch ? handlers.current.onTouchEnd : undefined,
    onMouseDown: mergedConfig.trackMouse ? handlers.current.onMouseDown : undefined,
    onMouseMove: mergedConfig.trackMouse ? handlers.current.onMouseMove : undefined,
    onMouseUp: mergedConfig.trackMouse ? handlers.current.onMouseUp : undefined,
    isSwiping,
  };
}
