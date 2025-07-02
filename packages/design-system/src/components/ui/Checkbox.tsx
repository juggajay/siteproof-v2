import { forwardRef, InputHTMLAttributes } from 'react';
import { Check, Minus } from 'lucide-react';

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  indeterminate?: boolean;
  error?: boolean;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, indeterminate = false, error = false, className = '', ...props }, ref) => {
    const Component = label ? 'label' : 'div';
    
    return (
      <Component className={`inline-flex items-center gap-small ${props.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} ${className}`}>
        <div className="relative">
          <input
            ref={ref}
            type="checkbox"
            className="sr-only peer"
            {...props}
          />
          <div className={`
            w-5 h-5 rounded border-2 transition-all duration-micro
            ${error ? 'border-error' : 'border-gray-300 peer-hover:border-gray-400'}
            peer-checked:bg-primary-blue peer-checked:border-primary-blue
            peer-focus:shadow-focus
            ${indeterminate ? 'bg-primary-blue border-primary-blue' : ''}
          `}>
            {indeterminate ? (
              <Minus className="w-3 h-3 text-white absolute top-0.5 left-0.5" />
            ) : (
              <Check className="w-3 h-3 text-white absolute top-0.5 left-0.5 scale-0 peer-checked:scale-100 transition-transform duration-micro" />
            )}
          </div>
        </div>
        {label && (
          <span className="text-body text-primary-charcoal select-none">{label}</span>
        )}
      </Component>
    );
  }
);

Checkbox.displayName = 'Checkbox';

export interface CheckboxGroupProps {
  options: Array<{
    value: string;
    label: string;
    disabled?: boolean;
  }>;
  values?: string[];
  onChange?: (values: string[]) => void;
  label?: string;
  error?: boolean;
  helperText?: string;
  orientation?: 'horizontal' | 'vertical';
  className?: string;
}

export function CheckboxGroup({
  options,
  values = [],
  onChange,
  label,
  error = false,
  helperText,
  orientation = 'vertical',
  className = '',
}: CheckboxGroupProps) {
  const orientationClasses = {
    horizontal: 'flex flex-row gap-large flex-wrap',
    vertical: 'flex flex-col gap-small',
  };

  const handleChange = (value: string, checked: boolean) => {
    if (checked) {
      onChange?.([...values, value]);
    } else {
      onChange?.(values.filter(v => v !== value));
    }
  };

  return (
    <div className={className}>
      {label && (
        <p className="mb-3 text-body font-medium text-primary-charcoal">
          {label}
        </p>
      )}
      
      <div className={orientationClasses[orientation]}>
        {options.map((option) => (
          <Checkbox
            key={option.value}
            value={option.value}
            label={option.label}
            checked={values.includes(option.value)}
            onChange={(e) => handleChange(option.value, e.target.checked)}
            disabled={option.disabled}
            error={error}
          />
        ))}
      </div>

      {helperText && (
        <p className={`mt-2 text-body-small ${error ? 'text-error' : 'text-secondary-gray'}`}>
          {helperText}
        </p>
      )}
    </div>
  );
}