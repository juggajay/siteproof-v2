'use client';

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../utils/cn';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-primary-blue focus:ring-offset-2',
  {
    variants: {
      variant: {
        default:
          'border-transparent bg-primary-charcoal text-white hover:bg-primary-charcoal/80',
        success:
          'border-transparent bg-success text-white hover:bg-success/80',
        error:
          'border-transparent bg-error text-white hover:bg-error/80',
        warning:
          'border-transparent bg-warning text-primary-charcoal hover:bg-warning/80',
        info:
          'border-transparent bg-primary-blue text-white hover:bg-primary-blue/80',
        outline: 'text-primary-charcoal border-secondary-medium-gray',
      },
      size: {
        sm: 'px-2 py-0.5 text-xs',
        md: 'px-2.5 py-0.5 text-xs',
        lg: 'px-3 py-1 text-sm',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  dot?: boolean;
}

const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant, size, dot, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(badgeVariants({ variant, size }), className)}
        {...props}
      >
        {dot && (
          <span
            className={cn(
              'mr-1 inline-block h-2 w-2 rounded-full',
              variant === 'success' && 'bg-white',
              variant === 'error' && 'bg-white',
              variant === 'warning' && 'bg-primary-charcoal',
              variant === 'info' && 'bg-white',
              (!variant || variant === 'default') && 'bg-white',
              variant === 'outline' && 'bg-primary-charcoal'
            )}
          />
        )}
        {children}
      </div>
    );
  }
);
Badge.displayName = 'Badge';

export { Badge, badgeVariants };
