'use client';

import React, { forwardRef } from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

export interface MobileButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'success';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  fullWidth?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  hapticFeedback?: boolean;
}

/**
 * Mobile-optimized button component with proper touch targets
 * Minimum height of 44px for all sizes (WCAG AA compliance)
 */
export const MobileButton = forwardRef<HTMLButtonElement, MobileButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      fullWidth = false,
      loading = false,
      icon,
      iconPosition = 'left',
      hapticFeedback = true,
      disabled,
      children,
      onClick,
      ...props
    },
    ref
  ) => {
    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      // Haptic feedback for mobile devices
      if (hapticFeedback && 'vibrate' in navigator && !disabled && !loading) {
        navigator.vibrate(10); // Short vibration
      }
      onClick?.(e);
    };

    const variants = {
      primary: 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800',
      secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300 active:bg-gray-400',
      danger: 'bg-red-600 text-white hover:bg-red-700 active:bg-red-800',
      ghost: 'bg-transparent text-gray-700 hover:bg-gray-100 active:bg-gray-200',
      success: 'bg-green-600 text-white hover:bg-green-700 active:bg-green-800',
    };

    const sizes = {
      sm: 'px-4 py-3 text-sm min-h-[44px]', // Minimum 44px height
      md: 'px-6 py-3.5 text-base min-h-[48px]', // 48px height
      lg: 'px-8 py-4 text-lg min-h-[56px]', // 56px height
      xl: 'px-10 py-5 text-xl min-h-[64px]', // 64px height
    };

    return (
      <button
        ref={ref}
        type="button"
        onClick={handleClick}
        disabled={disabled || loading}
        className={cn(
          // Base styles
          'relative inline-flex items-center justify-center',
          'font-medium rounded-lg',
          'transition-all duration-150',
          'transform active:scale-[0.98]', // Touch feedback
          'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500',
          'disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none',

          // Touch optimization
          'touch-manipulation', // Disable double-tap zoom
          'select-none', // Prevent text selection

          // Variant styles
          variants[variant],

          // Size styles
          sizes[size],

          // Full width
          fullWidth && 'w-full',

          className
        )}
        {...props}
      >
        {/* Loading spinner */}
        {loading && (
          <Loader2 className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-5 w-5 animate-spin" />
        )}

        {/* Content */}
        <span className={cn('inline-flex items-center gap-2', loading && 'invisible')}>
          {icon && iconPosition === 'left' && icon}
          {children}
          {icon && iconPosition === 'right' && icon}
        </span>
      </button>
    );
  }
);

MobileButton.displayName = 'MobileButton';
