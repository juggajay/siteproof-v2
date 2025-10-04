import React from 'react';
import { cn } from '@/lib/utils';

export interface FABProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'success' | 'error' | 'warning';
  size?: 'md' | 'lg';
  position?: 'bottom-right' | 'bottom-left' | 'bottom-center' | 'top-right' | 'top-left';
  icon: React.ReactNode;
  label?: string;
  extended?: boolean;
}

const FAB = React.forwardRef<HTMLButtonElement, FABProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      position = 'bottom-right',
      icon,
      label,
      extended = false,
      disabled,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'fixed z-50 inline-flex items-center justify-center gap-3 font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-3 focus:ring-primary-300 shadow-fab hover:shadow-xl active:scale-95';

    const variantStyles = {
      primary: 'bg-primary-600 text-white hover:bg-primary-700 active:bg-primary-800',
      secondary: 'bg-transparent text-primary-600 border-2 border-primary-600 hover:bg-primary-50',
      success: 'bg-success-main text-white hover:bg-success-dark',
      error: 'bg-error-main text-white hover:bg-error-dark',
      warning: 'bg-warning-main text-gray-900 hover:bg-warning-dark',
    };

    const sizeStyles = extended
      ? {
          md: 'h-[56px] px-6 rounded-fab text-base',
          lg: 'h-[64px] px-8 rounded-fab text-lg',
        }
      : {
          md: 'w-[56px] h-[56px] rounded-full text-xl',
          lg: 'w-[64px] h-[64px] rounded-full text-2xl',
        };

    const positionStyles = {
      'bottom-right': 'bottom-6 right-6',
      'bottom-left': 'bottom-6 left-6',
      'bottom-center': 'bottom-6 left-1/2 -translate-x-1/2',
      'top-right': 'top-6 right-6',
      'top-left': 'top-6 left-6',
    };

    return (
      <button
        ref={ref}
        className={cn(
          baseStyles,
          variantStyles[variant],
          sizeStyles[size],
          positionStyles[position],
          className
        )}
        disabled={disabled}
        aria-label={label || 'Floating action button'}
        {...props}
      >
        <span className={cn('flex-shrink-0', extended && label && 'text-xl')}>{icon}</span>
        {extended && label && <span>{label}</span>}
      </button>
    );
  }
);

FAB.displayName = 'FAB';

export { FAB };
