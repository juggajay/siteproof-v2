'use client';

import * as React from 'react';
import { cn } from '../../utils/cn';
import { AlertCircle, CheckCircle, Eye, EyeOff } from 'lucide-react';

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  success?: boolean;
  helperText?: string;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  showPasswordToggle?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      type = 'text',
      label,
      error,
      success,
      helperText,
      fullWidth = false,
      leftIcon,
      rightIcon,
      showPasswordToggle = false,
      id,
      disabled,
      ...props
    },
    ref
  ) => {
    const [showPassword, setShowPassword] = React.useState(false);
    const inputId = id || `input-${React.useId()}`;
    const hasError = Boolean(error);
    const hasSuccess = success && !hasError;
    const isPasswordField = type === 'password';
    const shouldShowPasswordToggle = isPasswordField && showPasswordToggle;

    const inputType = isPasswordField && showPassword ? 'text' : type;

    return (
      <div className={cn('space-y-2', fullWidth && 'w-full')}>
        {label && (
          <label
            htmlFor={inputId}
            className={cn(
              'block text-sm font-medium text-foreground',
              disabled && 'opacity-50'
            )}
          >
            {label}
          </label>
        )}

        <div className="relative">
          {leftIcon && (
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-foreground-muted">
              {leftIcon}
            </div>
          )}

          <input
            ref={ref}
            id={inputId}
            type={inputType}
            disabled={disabled}
            className={cn(
              // Base styles
              'flex h-12 w-full rounded-lg border-2 border-outline bg-surface px-4 py-3 text-base transition-all duration-200',
              // Focus styles
              'focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20',
              // Placeholder
              'placeholder:text-foreground-muted',
              // Disabled state
              'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-surface-dim',
              // Error state
              hasError &&
                'border-error focus:border-error focus:ring-error/20 pr-10',
              // Success state
              hasSuccess &&
                'border-success focus:border-success focus:ring-success/20 pr-10',
              // Icon padding
              leftIcon && 'pl-10',
              (rightIcon || shouldShowPasswordToggle) && 'pr-10',
              // Mobile optimization
              'min-h-[48px] text-[16px] md:text-base',
              // Custom className
              className
            )}
            aria-invalid={hasError}
            aria-describedby={
              hasError
                ? `${inputId}-error`
                : helperText
                  ? `${inputId}-helper`
                  : undefined
            }
            {...props}
          />

          {/* Status icons or password toggle */}
          <div className="absolute inset-y-0 right-0 flex items-center pr-3">
            {shouldShowPasswordToggle ? (
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-foreground-muted hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 rounded p-1 transition-colors"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                tabIndex={-1}
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5" aria-hidden="true" />
                ) : (
                  <Eye className="h-5 w-5" aria-hidden="true" />
                )}
              </button>
            ) : rightIcon ? (
              <div className="text-foreground-muted">{rightIcon}</div>
            ) : hasError ? (
              <AlertCircle
                className="h-5 w-5 text-error"
                aria-hidden="true"
              />
            ) : hasSuccess ? (
              <CheckCircle
                className="h-5 w-5 text-success"
                aria-hidden="true"
              />
            ) : null}
          </div>
        </div>

        {/* Error message */}
        {error && (
          <p
            id={`${inputId}-error`}
            className="text-sm text-error animate-in slide-in-from-top-1 duration-200"
            role="alert"
          >
            {error}
          </p>
        )}

        {/* Helper text */}
        {!error && helperText && (
          <p
            id={`${inputId}-helper`}
            className="text-sm text-foreground-muted"
          >
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export { Input };
