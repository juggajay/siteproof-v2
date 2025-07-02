import { ReactNode } from 'react';
import { motion } from 'framer-motion';

export interface FABProps {
  icon: ReactNode;
  onClick: () => void;
  label: string;
  position?: 'bottom-right' | 'bottom-left' | 'bottom-center';
  size?: 'small' | 'medium' | 'large';
  extended?: boolean;
  extendedText?: string;
  className?: string;
  disabled?: boolean;
}

export function FAB({
  icon,
  onClick,
  label,
  position = 'bottom-right',
  size = 'medium',
  extended = false,
  extendedText,
  className = '',
  disabled = false,
}: FABProps) {
  const positionClasses = {
    'bottom-right': 'bottom-20 right-4 md:bottom-6 md:right-6',
    'bottom-left': 'bottom-20 left-4 md:bottom-6 md:left-6',
    'bottom-center': 'bottom-20 left-1/2 -translate-x-1/2 md:bottom-6',
  };

  const sizeClasses = {
    small: extended ? 'h-10' : 'w-10 h-10',
    medium: extended ? 'h-14' : 'w-14 h-14',
    large: extended ? 'h-16' : 'w-16 h-16',
  };

  const iconSizeClasses = {
    small: 'w-5 h-5',
    medium: 'w-6 h-6',
    large: 'w-7 h-7',
  };

  const paddingClasses = {
    small: extended ? 'px-4' : '',
    medium: extended ? 'px-6' : '',
    large: extended ? 'px-8' : '',
  };

  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={`
        fixed z-40
        ${positionClasses[position]}
        ${sizeClasses[size]}
        ${paddingClasses[size]}
        ${extended ? 'rounded-full' : 'rounded-fab'}
        bg-primary-blue text-white shadow-fab
        flex items-center justify-center gap-small
        transition-all duration-standard
        hover:shadow-button-hover hover:scale-105
        active:scale-95
        disabled:opacity-50 disabled:cursor-not-allowed
        ${className}
      `}
      whileHover={{ scale: disabled ? 1 : 1.05 }}
      whileTap={{ scale: disabled ? 1 : 0.95 }}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 200, damping: 20 }}
    >
      <span className={iconSizeClasses[size]}>{icon}</span>
      {extended && extendedText && (
        <span className="text-button whitespace-nowrap">{extendedText}</span>
      )}
    </motion.button>
  );
}

export interface FABGroupProps {
  children: ReactNode;
  className?: string;
}

export function FABGroup({ children, className = '' }: FABGroupProps) {
  return (
    <div className={`flex flex-col gap-small ${className}`}>
      {children}
    </div>
  );
}