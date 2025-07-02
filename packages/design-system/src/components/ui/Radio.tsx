import { forwardRef, InputHTMLAttributes } from 'react';

export interface RadioOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface RadioGroupProps {
  name: string;
  options: RadioOption[];
  value?: string;
  onChange?: (value: string) => void;
  label?: string;
  error?: boolean;
  helperText?: string;
  orientation?: 'horizontal' | 'vertical';
  className?: string;
}

export function RadioGroup({
  name,
  options,
  value,
  onChange,
  label,
  error = false,
  helperText,
  orientation = 'vertical',
  className = '',
}: RadioGroupProps) {
  const orientationClasses = {
    horizontal: 'flex flex-row gap-large',
    vertical: 'flex flex-col gap-small',
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
          <Radio
            key={option.value}
            name={name}
            value={option.value}
            label={option.label}
            checked={value === option.value}
            onChange={() => onChange?.(option.value)}
            disabled={option.disabled}
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

export interface RadioProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string;
}

export const Radio = forwardRef<HTMLInputElement, RadioProps>(
  ({ label, className = '', ...props }, ref) => {
    return (
      <label className={`flex items-center gap-small cursor-pointer ${props.disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}>
        <input
          ref={ref}
          type="radio"
          className="sr-only peer"
          {...props}
        />
        <div className="relative w-5 h-5 flex items-center justify-center">
          <div className="w-full h-full border-2 border-gray-300 rounded-full peer-checked:border-primary-blue peer-hover:border-gray-400 peer-focus:shadow-focus transition-all duration-micro" />
          <div className="absolute w-3 h-3 bg-primary-blue rounded-full scale-0 peer-checked:scale-100 transition-transform duration-micro" />
        </div>
        <span className="text-body text-primary-charcoal">{label}</span>
      </label>
    );
  }
);

Radio.displayName = 'Radio';