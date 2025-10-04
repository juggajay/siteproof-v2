import React from 'react';
import { cn } from '@/lib/utils';

export interface ITPStatusButtonsProps {
  value?: 'pass' | 'fail' | 'na' | null;
  onChange?: (value: 'pass' | 'fail' | 'na') => void;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  label?: string;
  required?: boolean;
  error?: string;
}

const ITPStatusButtons = React.forwardRef<HTMLDivElement, ITPStatusButtonsProps>(
  (
    {
      value,
      onChange,
      disabled = false,
      size = 'md',
      fullWidth = false,
      label,
      required = false,
      error,
    },
    ref
  ) => {
    const buttonId = `itp-status-${Math.random().toString(36).substr(2, 9)}`;

    const baseButtonStyles =
      'flex-1 min-h-[48px] font-semibold rounded-lg border-2 transition-all duration-200 focus:outline-none focus:ring-3 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95';

    const sizeStyles = {
      sm: 'px-4 py-2 text-sm min-h-[40px]',
      md: 'px-6 py-3 text-base min-h-[48px]',
      lg: 'px-8 py-4 text-lg min-h-[56px]',
    };

    const getButtonStyles = (status: 'pass' | 'fail' | 'na') => {
      const isSelected = value === status;

      const variants = {
        pass: {
          selected:
            'bg-success-main text-white border-success-dark shadow-md hover:bg-success-dark focus:ring-success-main/30',
          unselected:
            'bg-white text-success-main border-success-main hover:bg-success-main/10 focus:ring-success-main/30',
        },
        fail: {
          selected:
            'bg-error-main text-white border-error-dark shadow-md hover:bg-error-dark focus:ring-error-main/30',
          unselected:
            'bg-white text-error-main border-error-main hover:bg-error-main/10 focus:ring-error-main/30',
        },
        na: {
          selected:
            'bg-neutral-main text-white border-neutral-dark shadow-md hover:bg-neutral-dark focus:ring-neutral-main/30',
          unselected:
            'bg-white text-neutral-main border-neutral-main hover:bg-neutral-main/10 focus:ring-neutral-main/30',
        },
      };

      return isSelected ? variants[status].selected : variants[status].unselected;
    };

    const icons = {
      pass: '✓',
      fail: '✗',
      na: '—',
    };

    const handleClick = (status: 'pass' | 'fail' | 'na') => {
      if (!disabled && onChange) {
        onChange(status);
      }
    };

    return (
      <div ref={ref} className={cn('flex flex-col gap-2', fullWidth && 'w-full')}>
        {label && (
          <label htmlFor={buttonId} className="text-sm font-medium text-gray-700">
            {label}
            {required && <span className="text-error-main ml-1">*</span>}
          </label>
        )}

        <div
          id={buttonId}
          className={cn('flex gap-3', fullWidth && 'w-full')}
          role="group"
          aria-label="ITP Status Selection"
          aria-invalid={!!error}
          aria-describedby={error ? `${buttonId}-error` : undefined}
        >
          <button
            type="button"
            onClick={() => handleClick('pass')}
            disabled={disabled}
            className={cn(baseButtonStyles, sizeStyles[size], getButtonStyles('pass'))}
            aria-pressed={value === 'pass'}
          >
            <span className="mr-2 text-xl" aria-hidden="true">
              {icons.pass}
            </span>
            Pass
          </button>

          <button
            type="button"
            onClick={() => handleClick('fail')}
            disabled={disabled}
            className={cn(baseButtonStyles, sizeStyles[size], getButtonStyles('fail'))}
            aria-pressed={value === 'fail'}
          >
            <span className="mr-2 text-xl" aria-hidden="true">
              {icons.fail}
            </span>
            Fail
          </button>

          <button
            type="button"
            onClick={() => handleClick('na')}
            disabled={disabled}
            className={cn(baseButtonStyles, sizeStyles[size], getButtonStyles('na'))}
            aria-pressed={value === 'na'}
          >
            <span className="mr-2 text-xl" aria-hidden="true">
              {icons.na}
            </span>
            N/A
          </button>
        </div>

        {error && (
          <p id={`${buttonId}-error`} className="text-sm text-error-main flex items-center gap-1">
            <span aria-hidden="true">✗</span>
            {error}
          </p>
        )}
      </div>
    );
  }
);

ITPStatusButtons.displayName = 'ITPStatusButtons';

export { ITPStatusButtons };
