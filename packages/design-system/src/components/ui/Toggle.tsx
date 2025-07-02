import { forwardRef, InputHTMLAttributes } from 'react';

export interface ToggleProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> {
  label?: string;
  labelPosition?: 'left' | 'right';
  toggleSize?: 'small' | 'medium' | 'large';
}

export const Toggle = forwardRef<HTMLInputElement, ToggleProps>(
  ({ label, labelPosition = 'right', toggleSize = 'medium', className = '', ...props }, ref) => {
    const sizeClasses = {
      small: {
        track: 'w-8 h-4',
        thumb: 'w-3 h-3',
        translate: 'peer-checked:translate-x-4',
      },
      medium: {
        track: 'w-11 h-6',
        thumb: 'w-5 h-5',
        translate: 'peer-checked:translate-x-5',
      },
      large: {
        track: 'w-14 h-7',
        thumb: 'w-6 h-6',
        translate: 'peer-checked:translate-x-7',
      },
    };

    const sizes = sizeClasses[toggleSize];
    const Component = label ? 'label' : 'div';

    const toggle = (
      <div className="relative inline-block">
        <input
          ref={ref}
          type="checkbox"
          className="sr-only peer"
          {...props}
        />
        <div className={`
          ${sizes.track}
          bg-gray-300 rounded-full transition-colors duration-standard
          peer-checked:bg-primary-blue
          peer-disabled:opacity-50
          peer-focus:ring-2 peer-focus:ring-primary-blue peer-focus:ring-offset-2
        `} />
        <div className={`
          absolute top-0.5 left-0.5
          ${sizes.thumb}
          bg-white rounded-full shadow-sm
          transition-transform duration-standard
          ${sizes.translate}
        `} />
      </div>
    );

    if (label) {
      return (
        <Component className={`inline-flex items-center gap-small cursor-pointer ${props.disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}>
          {labelPosition === 'left' && (
            <span className="text-body text-primary-charcoal select-none">{label}</span>
          )}
          {toggle}
          {labelPosition === 'right' && (
            <span className="text-body text-primary-charcoal select-none">{label}</span>
          )}
        </Component>
      );
    }

    return toggle;
  }
);

Toggle.displayName = 'Toggle';