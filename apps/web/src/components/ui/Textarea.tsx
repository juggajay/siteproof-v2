import React from 'react';
import { cn } from '@/lib/utils';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
  success?: boolean;
  fullWidth?: boolean;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    { className, label, error, helperText, success = false, fullWidth = false, disabled, ...props },
    ref
  ) => {
    const hasError = !!error;
    const textareaId = props.id || `textarea-${Math.random().toString(36).substr(2, 9)}`;

    const baseStyles =
      'min-h-[120px] px-4 py-3 text-base font-normal bg-white border-2 rounded-input transition-all duration-200 focus:outline-none focus:ring-3 focus:ring-primary-300 resize-vertical';

    const stateStyles = hasError
      ? 'border-error-main focus:border-error-main focus:ring-error-main/30 text-error-dark'
      : success
        ? 'border-success-main focus:border-success-main focus:ring-success-main/30'
        : 'border-gray-300 focus:border-primary-600 text-gray-900';

    const disabledStyles = disabled
      ? 'bg-gray-100 text-gray-400 cursor-not-allowed opacity-60'
      : 'hover:border-gray-400';

    return (
      <div className={cn('flex flex-col gap-2', fullWidth && 'w-full')}>
        {label && (
          <label htmlFor={textareaId} className="text-sm font-medium text-gray-700">
            {label}
            {props.required && <span className="text-error-main ml-1">*</span>}
          </label>
        )}

        <textarea
          ref={ref}
          id={textareaId}
          disabled={disabled}
          className={cn(baseStyles, stateStyles, disabledStyles, fullWidth && 'w-full', className)}
          aria-invalid={hasError}
          aria-describedby={
            hasError ? `${textareaId}-error` : helperText ? `${textareaId}-helper` : undefined
          }
          {...props}
        />

        {hasError && (
          <p id={`${textareaId}-error`} className="text-sm text-error-main flex items-center gap-1">
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
          <p id={`${textareaId}-helper`} className="text-sm text-gray-600">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';

export { Textarea };
