import React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  success?: boolean;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      type = 'text',
      label,
      error,
      helperText,
      success = false,
      fullWidth = false,
      leftIcon,
      rightIcon,
      disabled,
      ...props
    },
    ref
  ) => {
    const hasError = !!error;
    const inputId = props.id || `input-${Math.random().toString(36).substr(2, 9)}`;

    const baseStyles =
      'min-h-[48px] px-4 py-3 text-base font-normal bg-white border-2 rounded-input transition-all duration-200 focus:outline-none focus:ring-3 focus:ring-primary-300';

    const stateStyles = hasError
      ? 'border-error-main focus:border-error-main focus:ring-error-main/30 text-error-dark'
      : success
        ? 'border-success-main focus:border-success-main focus:ring-success-main/30'
        : 'border-gray-300 focus:border-primary-600 text-gray-900';

    const disabledStyles = disabled
      ? 'bg-gray-100 text-gray-400 cursor-not-allowed opacity-60'
      : 'hover:border-gray-400';

    const iconPaddingStyles = leftIcon ? 'pl-12' : rightIcon ? 'pr-12' : '';

    return (
      <div className={cn('flex flex-col gap-2', fullWidth && 'w-full')}>
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-gray-700">
            {label}
            {props.required && <span className="text-error-main ml-1">*</span>}
          </label>
        )}

        <div className="relative">
          {leftIcon && (
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none">
              {leftIcon}
            </div>
          )}

          <input
            ref={ref}
            type={type}
            id={inputId}
            disabled={disabled}
            className={cn(
              baseStyles,
              stateStyles,
              disabledStyles,
              iconPaddingStyles,
              fullWidth && 'w-full',
              className
            )}
            aria-invalid={hasError}
            aria-describedby={
              hasError ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined
            }
            {...props}
          />

          {rightIcon && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none">
              {rightIcon}
            </div>
          )}
        </div>

        {hasError && (
          <p id={`${inputId}-error`} className="text-sm text-error-main flex items-center gap-1">
            <span aria-hidden="true">✗</span>
            {error}
          </p>
        )}

        {!hasError && success && (
          <p className="text-sm text-success-main flex items-center gap-1">
            <span aria-hidden="true">✓</span>
            Valid
          </p>
        )}

        {!hasError && helperText && (
          <p id={`${inputId}-helper`} className="text-sm text-gray-600">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export { Input };
