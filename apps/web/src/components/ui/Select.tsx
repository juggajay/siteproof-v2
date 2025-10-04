import React from 'react';
import { cn } from '@/lib/utils';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps
  extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> {
  label?: string;
  error?: string;
  helperText?: string;
  success?: boolean;
  fullWidth?: boolean;
  options: SelectOption[];
  placeholder?: string;
  onChange?: (value: string) => void;
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      className,
      label,
      error,
      helperText,
      success = false,
      fullWidth = false,
      options,
      placeholder,
      disabled,
      onChange,
      ...props
    },
    ref
  ) => {
    const hasError = !!error;
    const selectId = props.id || `select-${Math.random().toString(36).substr(2, 9)}`;

    const baseStyles =
      'min-h-[48px] px-4 py-3 pr-10 text-base font-normal bg-white border-2 rounded-input transition-all duration-200 focus:outline-none focus:ring-3 focus:ring-primary-300 appearance-none cursor-pointer';

    const stateStyles = hasError
      ? 'border-error-main focus:border-error-main focus:ring-error-main/30 text-error-dark'
      : success
        ? 'border-success-main focus:border-success-main focus:ring-success-main/30'
        : 'border-gray-300 focus:border-primary-600 text-gray-900';

    const disabledStyles = disabled
      ? 'bg-gray-100 text-gray-400 cursor-not-allowed opacity-60'
      : 'hover:border-gray-400';

    const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      if (onChange) {
        onChange(e.target.value);
      }
    };

    return (
      <div className={cn('flex flex-col gap-2', fullWidth && 'w-full')}>
        {label && (
          <label htmlFor={selectId} className="text-sm font-medium text-gray-700">
            {label}
            {props.required && <span className="text-error-main ml-1">*</span>}
          </label>
        )}

        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            disabled={disabled}
            className={cn(
              baseStyles,
              stateStyles,
              disabledStyles,
              fullWidth && 'w-full',
              className
            )}
            aria-invalid={hasError}
            aria-describedby={
              hasError ? `${selectId}-error` : helperText ? `${selectId}-helper` : undefined
            }
            onChange={handleChange}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((option) => (
              <option key={option.value} value={option.value} disabled={option.disabled}>
                {option.label}
              </option>
            ))}
          </select>

          {/* Dropdown arrow icon */}
          <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </div>
        </div>

        {hasError && (
          <p id={`${selectId}-error`} className="text-sm text-error-main flex items-center gap-1">
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
          <p id={`${selectId}-helper`} className="text-sm text-gray-600">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';

export { Select };
