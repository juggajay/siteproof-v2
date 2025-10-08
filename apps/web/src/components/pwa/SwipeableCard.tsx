'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { useSwipe } from '@/hooks/useSwipe';

export interface SwipeableCardProps {
  children: React.ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  leftAction?: {
    label: string;
    icon?: React.ReactNode;
    color?: 'success' | 'error' | 'warning' | 'primary';
  };
  rightAction?: {
    label: string;
    icon?: React.ReactNode;
    color?: 'success' | 'error' | 'warning' | 'primary';
  };
  className?: string;
  threshold?: number;
  enableHaptic?: boolean;
}

/**
 * SwipeableCard Component
 *
 * A card that reveals actions when swiped left or right.
 * Common pattern for mobile interfaces (like email apps).
 *
 * @example
 * <SwipeableCard
 *   onSwipeLeft={() => deleteItem()}
 *   onSwipeRight={() => archiveItem()}
 *   leftAction={{ label: 'Delete', color: 'error' }}
 *   rightAction={{ label: 'Archive', color: 'success' }}
 * >
 *   <div>Card content</div>
 * </SwipeableCard>
 */
export function SwipeableCard({
  children,
  onSwipeLeft,
  onSwipeRight,
  leftAction,
  rightAction,
  className,
  threshold = 80,
  enableHaptic = true,
}: SwipeableCardProps) {
  const [offset, setOffset] = useState(0);
  const [swiping, setSwiping] = useState(false);

  const swipeHandlers = useSwipe({
    onSwipeLeft: () => {
      if (onSwipeLeft) {
        setOffset(-100);
        setTimeout(() => {
          onSwipeLeft();
          setOffset(0);
        }, 300);
      }
    },
    onSwipeRight: () => {
      if (onSwipeRight) {
        setOffset(100);
        setTimeout(() => {
          onSwipeRight();
          setOffset(0);
        }, 300);
      }
    },
    threshold,
    enableHaptic,
  });

  const colorClasses = {
    success: 'bg-success-main text-white',
    error: 'bg-error-main text-white',
    warning: 'bg-warning-main text-gray-900',
    primary: 'bg-primary-600 text-white',
  };

  return (
    <div className="relative overflow-hidden rounded-lg">
      {/* Left action (revealed when swiping right) */}
      {rightAction && (
        <div
          className={cn(
            'absolute left-0 top-0 bottom-0 flex items-center justify-start pl-6 transition-all duration-200',
            colorClasses[rightAction.color || 'primary'],
            offset > 0 ? 'opacity-100' : 'opacity-0'
          )}
          style={{ width: `${Math.max(0, offset)}%` }}
        >
          <div className="flex items-center gap-2">
            {rightAction.icon}
            <span className="font-semibold">{rightAction.label}</span>
          </div>
        </div>
      )}

      {/* Right action (revealed when swiping left) */}
      {leftAction && (
        <div
          className={cn(
            'absolute right-0 top-0 bottom-0 flex items-center justify-end pr-6 transition-all duration-200',
            colorClasses[leftAction.color || 'error'],
            offset < 0 ? 'opacity-100' : 'opacity-0'
          )}
          style={{ width: `${Math.abs(Math.min(0, offset))}%` }}
        >
          <div className="flex items-center gap-2">
            <span className="font-semibold">{leftAction.label}</span>
            {leftAction.icon}
          </div>
        </div>
      )}

      {/* Card content */}
      <div
        className={cn(
          'relative bg-white transition-transform duration-200 ease-out',
          className
        )}
        style={{
          transform: swiping ? `translateX(${offset}%)` : 'translateX(0)',
        }}
        {...swipeHandlers}
        onTouchStart={(e) => {
          setSwiping(true);
          swipeHandlers.onTouchStart(e);
        }}
        onTouchEnd={() => {
          setSwiping(false);
          swipeHandlers.onTouchEnd();
        }}
      >
        {children}
      </div>
    </div>
  );
}
