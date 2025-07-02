import React from 'react';

export interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  variant?: 'default' | 'interactive';
  padding?: 'none' | 'small' | 'medium' | 'large';
}

export function Card({
  children,
  className = '',
  onClick,
  variant = 'default',
  padding = 'medium',
}: CardProps) {
  const baseClasses = 'bg-background-white border border-gray-200 rounded-card shadow-card';
  
  const variantClasses = {
    default: '',
    interactive: 'cursor-pointer transition-shadow duration-standard hover:shadow-card-hover active:scale-[0.99]',
  };

  const paddingClasses = {
    none: '',
    small: 'p-small',
    medium: 'p-medium',
    large: 'p-large',
  };

  const classes = `${baseClasses} ${variantClasses[variant]} ${paddingClasses[padding]} ${className}`;

  if (onClick) {
    return (
      <div
        className={classes}
        onClick={onClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onClick();
          }
        }}
      >
        {children}
      </div>
    );
  }

  return <div className={classes}>{children}</div>;
}

export interface CardHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export function CardHeader({ children, className = '' }: CardHeaderProps) {
  return (
    <div className={`border-b border-gray-200 pb-medium mb-medium ${className}`}>
      {children}
    </div>
  );
}

export interface CardTitleProps {
  children: React.ReactNode;
  className?: string;
}

export function CardTitle({ children, className = '' }: CardTitleProps) {
  return <h3 className={`text-h3 text-primary-charcoal ${className}`}>{children}</h3>;
}

export interface CardContentProps {
  children: React.ReactNode;
  className?: string;
}

export function CardContent({ children, className = '' }: CardContentProps) {
  return <div className={`text-body text-primary-charcoal ${className}`}>{children}</div>;
}

export interface CardFooterProps {
  children: React.ReactNode;
  className?: string;
}

export function CardFooter({ children, className = '' }: CardFooterProps) {
  return (
    <div className={`border-t border-gray-200 pt-medium mt-medium ${className}`}>
      {children}
    </div>
  );
}