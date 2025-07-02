import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps {
  options: SelectOption[];
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  error?: boolean;
  className?: string;
  name?: string;
  id?: string;
  required?: boolean;
}

export function Select({
  options,
  value,
  onChange,
  placeholder = 'Select an option',
  disabled = false,
  error = false,
  className = '',
  name,
  id,
  required = false,
}: SelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedValue, setSelectedValue] = useState(value);
  const selectRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSelectedValue(value);
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSelect = (optionValue: string) => {
    setSelectedValue(optionValue);
    setIsOpen(false);
    onChange?.(optionValue);
  };

  const selectedOption = options.find(opt => opt.value === selectedValue);

  const baseClasses = `
    relative w-full h-input-mobile md:h-input-desktop 
    px-default flex items-center justify-between
    bg-background-white rounded-input
    text-body text-primary-charcoal
    cursor-pointer transition-all duration-standard
  `;

  const borderClasses = error
    ? 'border-2 border-error'
    : isOpen
    ? 'border-2 border-primary-blue shadow-focus'
    : 'border-[1.5px] border-gray-300 hover:border-gray-400';

  const disabledClasses = disabled
    ? 'opacity-50 cursor-not-allowed hover:border-gray-300'
    : '';

  return (
    <div ref={selectRef} className={`relative ${className}`}>
      <input
        type="hidden"
        name={name}
        value={selectedValue || ''}
        required={required}
      />
      <div
        id={id}
        className={`${baseClasses} ${borderClasses} ${disabledClasses}`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        onKeyDown={(e) => {
          if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            setIsOpen(!isOpen);
          }
        }}
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        tabIndex={disabled ? -1 : 0}
      >
        <span className={selectedOption ? '' : 'text-gray-400'}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          className={`w-5 h-5 text-secondary-gray transition-transform duration-standard ${
            isOpen ? 'transform rotate-180' : ''
          }`}
        />
      </div>

      {isOpen && (
        <div
          className="absolute z-50 w-full mt-1 py-1 bg-background-white rounded-input border border-gray-200 shadow-dropdown max-h-60 overflow-auto"
          role="listbox"
        >
          {options.map((option) => (
            <div
              key={option.value}
              className={`
                px-default py-small cursor-pointer transition-colors duration-micro
                ${option.disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-secondary-blue-pale'}
                ${option.value === selectedValue ? 'bg-secondary-blue-pale text-primary-blue' : ''}
              `}
              onClick={() => !option.disabled && handleSelect(option.value)}
              onKeyDown={(e) => {
                if (!option.disabled && (e.key === 'Enter' || e.key === ' ')) {
                  e.preventDefault();
                  handleSelect(option.value);
                }
              }}
              role="option"
              aria-selected={option.value === selectedValue}
              tabIndex={option.disabled ? -1 : 0}
            >
              {option.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}