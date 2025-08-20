'use client';

import React, { forwardRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { Eye, EyeOff, X } from 'lucide-react';

export interface MobileInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  clearable?: boolean;
  showPasswordToggle?: boolean;
  inputMode?: 'none' | 'text' | 'decimal' | 'numeric' | 'tel' | 'search' | 'email' | 'url';
}

/**
 * Mobile-optimized input component with proper touch targets and keyboard optimization
 */
export const MobileInput = forwardRef<HTMLInputElement, MobileInputProps>(
  (
    {
      className,
      label,
      error,
      hint,
      clearable = false,
      showPasswordToggle = false,
      type = 'text',
      disabled,
      value,
      onChange,
      inputMode,
      ...props
    },
    ref
  ) => {
    const [showPassword, setShowPassword] = useState(false);
    const [localValue, setLocalValue] = useState(value || '');

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setLocalValue(e.target.value);
      onChange?.(e);
    };

    const handleClear = () => {
      const event = {
        target: { value: '' },
      } as React.ChangeEvent<HTMLInputElement>;
      setLocalValue('');
      onChange?.(event);
    };

    const inputType = showPasswordToggle && showPassword ? 'text' : type;

    // Auto-detect inputMode based on type if not provided
    const detectedInputMode =
      inputMode ||
      (() => {
        switch (type) {
          case 'email':
            return 'email';
          case 'tel':
            return 'tel';
          case 'url':
            return 'url';
          case 'number':
            return 'numeric';
          case 'search':
            return 'search';
          default:
            return 'text';
        }
      })();

    return (
      <div className="w-full">
        {label && <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>}

        <div className="relative">
          <input
            ref={ref}
            type={inputType}
            value={localValue}
            onChange={handleChange}
            disabled={disabled}
            inputMode={detectedInputMode}
            className={cn(
              // Base styles
              'w-full rounded-lg border bg-white',
              'text-base', // Prevent zoom on iOS
              'transition-colors duration-150',

              // Mobile optimization - 56px height for comfortable touch
              'min-h-[56px] px-4 py-4',

              // Border and focus styles
              'border-gray-300 focus:border-blue-500',
              'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-20',

              // Disabled state
              'disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed',

              // Error state
              error && 'border-red-500 focus:border-red-500 focus:ring-red-500',

              // Padding for buttons
              (clearable || showPasswordToggle) && 'pr-12',

              className
            )}
            {...props}
          />

          {/* Clear button */}
          {clearable && localValue && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className={cn(
                'absolute right-2 top-1/2 -translate-y-1/2',
                'inline-flex items-center justify-center',
                'w-10 h-10 rounded-lg',
                'text-gray-400 hover:text-gray-600',
                'hover:bg-gray-100 active:bg-gray-200',
                'transition-colors duration-150',
                showPasswordToggle && 'right-12'
              )}
              aria-label="Clear input"
            >
              <X className="w-5 h-5" />
            </button>
          )}

          {/* Password toggle */}
          {showPasswordToggle && type === 'password' && (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className={cn(
                'absolute right-2 top-1/2 -translate-y-1/2',
                'inline-flex items-center justify-center',
                'w-10 h-10 rounded-lg',
                'text-gray-400 hover:text-gray-600',
                'hover:bg-gray-100 active:bg-gray-200',
                'transition-colors duration-150'
              )}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          )}
        </div>

        {/* Hint text */}
        {hint && !error && <p className="mt-1.5 text-sm text-gray-500">{hint}</p>}

        {/* Error message */}
        {error && <p className="mt-1.5 text-sm text-red-600">{error}</p>}
      </div>
    );
  }
);

MobileInput.displayName = 'MobileInput';
