'use client';

import * as React from 'react';
import { cn } from '../../utils/cn';

export interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number;
  max?: number;
  variant?: 'linear' | 'circular';
  size?: 'sm' | 'md' | 'lg';
  indeterminate?: boolean;
}

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ className, value = 0, max = 100, variant = 'linear', size = 'md', indeterminate = false, ...props }, ref) => {
    const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

    if (variant === 'circular') {
      const circleSize = size === 'sm' ? 40 : size === 'md' ? 56 : 72;
      const strokeWidth = size === 'sm' ? 4 : size === 'md' ? 6 : 8;
      const radius = (circleSize - strokeWidth) / 2;
      const circumference = 2 * Math.PI * radius;
      const offset = circumference - (percentage / 100) * circumference;

      return (
        <div
          ref={ref}
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={max}
          aria-valuenow={indeterminate ? undefined : value}
          className={cn('inline-flex items-center justify-center', className)}
          {...props}
        >
          <svg width={circleSize} height={circleSize} className="transform -rotate-90">
            {/* Background circle */}
            <circle
              cx={circleSize / 2}
              cy={circleSize / 2}
              r={radius}
              fill="none"
              stroke="currentColor"
              strokeWidth={strokeWidth}
              className="text-secondary-light-gray"
            />
            {/* Progress circle */}
            <circle
              cx={circleSize / 2}
              cy={circleSize / 2}
              r={radius}
              fill="none"
              stroke="currentColor"
              strokeWidth={strokeWidth}
              strokeDasharray={circumference}
              strokeDashoffset={indeterminate ? 0 : offset}
              strokeLinecap="round"
              className={cn(
                'text-primary-blue transition-all duration-300',
                indeterminate && 'animate-spin'
              )}
              style={
                indeterminate
                  ? { strokeDasharray: `${circumference * 0.75} ${circumference}` }
                  : undefined
              }
            />
          </svg>
        </div>
      );
    }

    // Linear variant
    const height = size === 'sm' ? 'h-1' : size === 'md' ? 'h-2' : 'h-3';

    return (
      <div
        ref={ref}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={indeterminate ? undefined : value}
        className={cn(
          'relative w-full overflow-hidden rounded-full bg-secondary-light-gray',
          height,
          className
        )}
        {...props}
      >
        <div
          className={cn(
            'h-full bg-primary-blue transition-all duration-300',
            indeterminate && 'animate-pulse'
          )}
          style={{
            width: indeterminate ? '100%' : `${percentage}%`,
          }}
        />
      </div>
    );
  }
);
Progress.displayName = 'Progress';

export { Progress };
