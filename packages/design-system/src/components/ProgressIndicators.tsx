'use client';

import { cn } from '../utils/cn';

// ========== Progress Bar ==========

export interface ProgressBarProps {
  value: number; // 0-100
  variant?: 'success' | 'error' | 'warning' | 'neutral';
  showPercentage?: boolean;
  label?: string;
  className?: string;
}

const progressBarVariants = {
  success: 'bg-success',
  error: 'bg-error',
  warning: 'bg-warning',
  neutral: 'bg-primary-blue',
} as const;

export function ProgressBar({
  value,
  variant = 'neutral',
  showPercentage = false,
  label,
  className,
}: ProgressBarProps) {
  const clampedValue = Math.min(Math.max(value, 0), 100);

  return (
    <div className={cn('w-full', className)}>
      {(label || showPercentage) && (
        <div className="flex items-center justify-between mb-2">
          {label && <span className="text-body-small font-medium text-primary-charcoal">{label}</span>}
          {showPercentage && (
            <span className="text-body-small font-medium text-secondary-gray">{Math.round(clampedValue)}%</span>
          )}
        </div>
      )}
      <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-300', progressBarVariants[variant])}
          style={{ width: `${clampedValue}%` }}
          role="progressbar"
          aria-valuenow={clampedValue}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={label || 'Progress'}
        />
      </div>
    </div>
  );
}

// ========== Progress Ring ==========

export interface ProgressSegment {
  value: number;
  color: string;
  label: string;
}

export interface ProgressRingProps {
  value?: number; // 0-100 for simple ring
  segments?: ProgressSegment[]; // For multi-segment ring
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  label?: string;
  className?: string;
}

const sizeConfig = {
  sm: { size: 40, strokeWidth: 4, fontSize: 'text-xs' },
  md: { size: 60, strokeWidth: 5, fontSize: 'text-sm' },
  lg: { size: 80, strokeWidth: 6, fontSize: 'text-base' },
} as const;

export function ProgressRing({
  value,
  segments,
  size = 'md',
  showLabel = false,
  label,
  className,
}: ProgressRingProps) {
  const config = sizeConfig[size];
  const radius = (config.size - config.strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;

  // Simple ring with single value
  if (value !== undefined && !segments) {
    const clampedValue = Math.min(Math.max(value, 0), 100);
    const strokeDashoffset = circumference - (clampedValue / 100) * circumference;

    return (
      <div className={cn('inline-flex flex-col items-center gap-2', className)}>
        <div className="relative">
          <svg width={config.size} height={config.size} className="transform -rotate-90">
            {/* Background circle */}
            <circle
              cx={config.size / 2}
              cy={config.size / 2}
              r={radius}
              fill="none"
              stroke="#E5E7EB"
              strokeWidth={config.strokeWidth}
            />
            {/* Progress circle */}
            <circle
              cx={config.size / 2}
              cy={config.size / 2}
              r={radius}
              fill="none"
              stroke="currentColor"
              className="text-success"
              strokeWidth={config.strokeWidth}
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              className="transition-all duration-300"
            />
          </svg>
          {showLabel && (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className={cn('font-semibold text-primary-charcoal', config.fontSize)}>
                {Math.round(clampedValue)}%
              </span>
            </div>
          )}
        </div>
        {label && <span className="text-sm text-gray-600">{label}</span>}
      </div>
    );
  }

  // Segmented ring
  if (segments && segments.length > 0) {
    let currentOffset = 0;

    return (
      <div className={cn('inline-flex flex-col items-center gap-2', className)}>
        <div className="relative">
          <svg width={config.size} height={config.size} className="transform -rotate-90">
            {/* Background circle */}
            <circle
              cx={config.size / 2}
              cy={config.size / 2}
              r={radius}
              fill="none"
              stroke="#E5E7EB"
              strokeWidth={config.strokeWidth}
            />
            {/* Segment circles */}
            {segments.map((segment, index) => {
              const segmentLength = (segment.value / 100) * circumference;
              const offset = currentOffset;
              currentOffset += segmentLength;

              return (
                <circle
                  key={index}
                  cx={config.size / 2}
                  cy={config.size / 2}
                  r={radius}
                  fill="none"
                  stroke={segment.color}
                  strokeWidth={config.strokeWidth}
                  strokeDasharray={`${segmentLength} ${circumference - segmentLength}`}
                  strokeDashoffset={-offset}
                  strokeLinecap="round"
                  className="transition-all duration-300"
                />
              );
            })}
          </svg>
        </div>
        {label && <span className="text-body-small text-secondary-gray">{label}</span>}
        {segments.length > 0 && (
          <div className="flex flex-col gap-1">
            {segments.map((segment, index) => (
              <div key={index} className="flex items-center gap-2 text-caption">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: segment.color }}
                  aria-hidden="true"
                />
                <span className="text-secondary-gray">
                  {segment.label}: {Math.round(segment.value)}%
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return null;
}
