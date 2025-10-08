import React from 'react';
import { cn } from '@/lib/utils';
import { haptics } from '@/lib/haptics';

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:
    | 'primary'
    | 'secondary'
    | 'success'
    | 'error'
    | 'warning'
    | 'neutral'
    | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  icon: React.ReactNode;
  label?: string;
  showLabel?: boolean;
  enableHaptic?: boolean;
}

/**
 * IconButton Component
 *
 * Accessible icon button with proper touch targets (minimum 44px on mobile).
 * Includes haptic feedback and ARIA labels for screen readers.
 */
const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  (
    {
      className,
      variant = 'ghost',
      size = 'md',
      icon,
      label,
      showLabel = false,
      disabled,
      enableHaptic = true,
      onClick,
      ...props
    },
    ref
  ) => {
    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      // Provide haptic feedback on mobile devices
      if (enableHaptic && !disabled) {
        haptics.light();
      }
      onClick?.(e);
    };

    const baseStyles =
      'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-primary-300 relative touch-manipulation select-none';

    const variantStyles = {
      primary:
        'bg-primary-600 text-white hover:bg-primary-700 active:bg-primary-800 shadow-sm',
      secondary:
        'bg-transparent text-primary-600 border-2 border-primary-600 hover:bg-primary-50',
      success: 'bg-success-main text-white hover:bg-success-dark shadow-sm',
      error: 'bg-error-main text-white hover:bg-error-dark shadow-sm',
      warning: 'bg-warning-main text-gray-900 hover:bg-warning-dark shadow-sm',
      neutral: 'bg-neutral-main text-white hover:bg-neutral-dark shadow-sm',
      ghost: 'bg-transparent hover:bg-gray-100 text-gray-700 active:bg-gray-200',
    };

    const sizeStyles = {
      sm: 'min-h-[44px] min-w-[44px] md:min-h-[40px] md:min-w-[40px] p-2 text-sm',
      md: 'min-h-[48px] min-w-[48px] p-3 text-base',
      lg: 'min-h-[56px] min-w-[56px] p-4 text-lg',
    };

    return (
      <button
        className={cn(
          baseStyles,
          variantStyles[variant],
          sizeStyles[size],
          showLabel && 'px-4',
          className
        )}
        ref={ref}
        disabled={disabled}
        onClick={handleClick}
        aria-label={label || props['aria-label']}
        {...props}
      >
        {/* Expanded touch target for mobile */}
        <span className="absolute inset-0 -m-1" aria-hidden="true" />

        <span className="flex-shrink-0 relative z-10">{icon}</span>

        {showLabel && label && <span className="relative z-10">{label}</span>}
      </button>
    );
  }
);

IconButton.displayName = 'IconButton';

export { IconButton };
