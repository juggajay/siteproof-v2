import React from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'success' | 'error' | 'warning' | 'neutral' | 'info';
  size?: 'sm' | 'md' | 'lg';
  withIcon?: boolean;
  dot?: boolean;
}

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  (
    {
      className,
      variant = 'neutral',
      size = 'md',
      withIcon = true,
      dot = false,
      children,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center gap-1.5 font-medium rounded-full transition-colors';

    const variantStyles = {
      success: 'bg-success-main/10 text-success-dark border border-success-main/20',
      error: 'bg-error-main/10 text-error-dark border border-error-main/20',
      warning: 'bg-warning-main/10 text-warning-dark border border-warning-main/20',
      neutral: 'bg-neutral-main/10 text-neutral-dark border border-neutral-main/20',
      info: 'bg-info-main/10 text-info-main border border-info-main/20',
    };

    const sizeStyles = {
      sm: 'px-2 py-0.5 text-xs',
      md: 'px-3 py-1 text-sm',
      lg: 'px-4 py-1.5 text-base',
    };

    const icons = {
      success: '✓',
      error: '✗',
      warning: '⚠',
      neutral: '—',
      info: 'ℹ',
    };

    const dotColors = {
      success: 'bg-success-main',
      error: 'bg-error-main',
      warning: 'bg-warning-main',
      neutral: 'bg-neutral-main',
      info: 'bg-info-main',
    };

    return (
      <span
        ref={ref}
        className={cn(baseStyles, variantStyles[variant], sizeStyles[size], className)}
        {...props}
      >
        {dot && (
          <span className={cn('w-2 h-2 rounded-full', dotColors[variant])} aria-hidden="true" />
        )}
        {withIcon && !dot && <span aria-hidden="true">{icons[variant]}</span>}
        <span>{children}</span>
      </span>
    );
  }
);

Badge.displayName = 'Badge';

export { Badge };
