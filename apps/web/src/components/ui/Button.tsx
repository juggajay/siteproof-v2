import React from 'react';
import { cn } from '@/lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:
    | 'primary'
    | 'secondary'
    | 'success'
    | 'error'
    | 'warning'
    | 'neutral'
    | 'ghost'
    | 'outline';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      fullWidth = false,
      loading = false,
      icon,
      iconPosition = 'left',
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center gap-2 font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-primary-300 relative';

    const variantStyles = {
      primary:
        'bg-primary-600 text-white hover:bg-primary-700 active:bg-primary-800 shadow-sm hover:shadow-md hover:-translate-y-0.5',
      secondary:
        'bg-transparent text-primary-600 border-2 border-primary-600 hover:bg-primary-50 hover:border-primary-700',
      success: 'bg-success-main text-white hover:bg-success-dark shadow-sm hover:shadow-md',
      error: 'bg-error-main text-white hover:bg-error-dark shadow-sm hover:shadow-md',
      warning: 'bg-warning-main text-gray-900 hover:bg-warning-dark shadow-sm hover:shadow-md',
      neutral: 'bg-neutral-main text-white hover:bg-neutral-dark shadow-sm hover:shadow-md',
      ghost: 'bg-transparent hover:bg-gray-100 text-gray-700',
      outline: 'border-2 border-gray-300 bg-transparent hover:bg-gray-50',
    };

    const sizeStyles = {
      sm: 'min-h-[40px] px-4 py-2 text-sm rounded-lg',
      md: 'min-h-[48px] px-6 py-3 text-base rounded-lg',
      lg: 'min-h-[56px] px-8 py-4 text-lg rounded-xl',
    };

    return (
      <button
        className={cn(
          baseStyles,
          variantStyles[variant],
          sizeStyles[size],
          fullWidth && 'w-full',
          className
        )}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {/* Expanded touch target for mobile */}
        <span className="absolute inset-0 -m-1" aria-hidden="true" />

        {loading && (
          <svg
            className="animate-spin h-5 w-5"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}

        {!loading && icon && iconPosition === 'left' && (
          <span className="flex-shrink-0">{icon}</span>
        )}

        <span className="relative">{children}</span>

        {!loading && icon && iconPosition === 'right' && (
          <span className="flex-shrink-0">{icon}</span>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';

export { Button };
