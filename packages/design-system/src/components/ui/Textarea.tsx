import { forwardRef, TextareaHTMLAttributes } from 'react';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
  helperText?: string;
  label?: string;
  showCount?: boolean;
  maxLength?: number;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ error = false, helperText, label, showCount = false, maxLength, className = '', ...props }, ref) => {
    const baseClasses = `
      w-full px-default py-small
      bg-background-white rounded-input
      text-body text-primary-charcoal placeholder:text-gray-400
      resize-y min-h-[120px]
      transition-all duration-standard
      focus:outline-none
    `;

    const borderClasses = error
      ? 'border-2 border-error'
      : 'border-[1.5px] border-gray-300 hover:border-gray-400 focus:border-2 focus:border-primary-blue focus:shadow-focus';

    const disabledClasses = props.disabled
      ? 'opacity-50 cursor-not-allowed hover:border-gray-300'
      : '';

    const currentLength = props.value ? String(props.value).length : 0;

    return (
      <div className="w-full">
        {label && (
          <label className="block mb-2 text-body font-medium text-primary-charcoal">
            {label}
            {props.required && <span className="text-error ml-1">*</span>}
          </label>
        )}
        
        <div className="relative">
          <textarea
            ref={ref}
            className={`${baseClasses} ${borderClasses} ${disabledClasses} ${className}`}
            maxLength={maxLength}
            {...props}
          />
          
          {showCount && maxLength && (
            <div className="absolute bottom-2 right-2 text-caption text-secondary-gray">
              {currentLength}/{maxLength}
            </div>
          )}
        </div>

        {helperText && (
          <p className={`mt-1 text-body-small ${error ? 'text-error' : 'text-secondary-gray'}`}>
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';