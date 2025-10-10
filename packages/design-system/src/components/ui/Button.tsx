'use client';

import React from 'react';
import { motion, AnimatePresence, HTMLMotionProps } from 'framer-motion';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends Omit<HTMLMotionProps<'button'>, 'size'> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  children: React.ReactNode;
}

const variantStyles = {
  primary: 'btn-primary',
  secondary: 'btn-secondary',
  ghost:
    'bg-transparent text-primary-charcoal hover:bg-secondary-light-gray focus:ring-primary-blue rounded-lg px-4 py-2 transition-all duration-200',
  danger:
    'bg-error text-white hover:bg-error-dark focus:ring-error shadow-button rounded-lg px-6 py-3 min-h-[48px] transition-all duration-200',
};

const sizeStyles = {
  sm: 'text-sm min-h-[40px]',
  md: 'text-base min-h-[48px]',
  lg: 'text-lg min-h-[56px]',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      fullWidth = false,
      leftIcon,
      rightIcon,
      disabled,
      className = '',
      children,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading;

    return (
      <motion.button
        ref={ref}
        disabled={isDisabled}
        className={`
          relative
          ${variantStyles[variant]}
          ${sizeStyles[size]}
          ${fullWidth ? 'w-full' : ''}
          ${className}
        `}
        whileHover={!isDisabled ? { scale: 1.02 } : {}}
        whileTap={!isDisabled ? { scale: 0.98 } : {}}
        {...props}
      >
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div
              key="loader"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center pointer-events-none"
            >
              <Loader2 className="w-4 h-4 animate-spin" />
            </motion.div>
          ) : null}
        </AnimatePresence>

        <span className={`flex items-center gap-2 ${loading ? 'opacity-0' : ''}`}>
          {leftIcon && <span className="inline-flex">{leftIcon}</span>}
          {children}
          {rightIcon && <span className="inline-flex">{rightIcon}</span>}
        </span>
      </motion.button>
    );
  }
);

Button.displayName = 'Button';
