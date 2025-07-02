export type BadgeVariant = 'default' | 'primary' | 'success' | 'warning' | 'error' | 'info';
export type BadgeSize = 'small' | 'medium' | 'large';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: BadgeSize;
  className?: string;
  rounded?: boolean;
}

export function Badge({
  children,
  variant = 'default',
  size = 'medium',
  className = '',
  rounded = false,
}: BadgeProps) {
  const variantClasses = {
    default: 'bg-secondary-light-gray text-secondary-gray',
    primary: 'bg-primary-blue text-white',
    success: 'bg-accent-green text-white',
    warning: 'bg-accent-yellow text-primary-charcoal',
    error: 'bg-accent-red text-white',
    info: 'bg-info text-white',
  };

  const sizeClasses = {
    small: 'px-2 py-0.5 text-caption',
    medium: 'px-3 py-1 text-body-small',
    large: 'px-4 py-1.5 text-body',
  };

  const roundedClass = rounded ? 'rounded-full' : 'rounded';

  return (
    <span
      className={`
        inline-flex items-center font-medium
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${roundedClass}
        ${className}
      `}
    >
      {children}
    </span>
  );
}

export interface BadgeGroupProps {
  children: React.ReactNode;
  gap?: 'small' | 'medium';
  className?: string;
}

export function BadgeGroup({
  children,
  gap = 'small',
  className = '',
}: BadgeGroupProps) {
  const gapClasses = {
    small: 'gap-tiny',
    medium: 'gap-small',
  };

  return (
    <div className={`inline-flex flex-wrap items-center ${gapClasses[gap]} ${className}`}>
      {children}
    </div>
  );
}