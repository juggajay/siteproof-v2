import { ReactNode } from 'react';

export interface SectionProps {
  children: ReactNode;
  title?: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
  spacing?: 'small' | 'medium' | 'large';
}

export function Section({
  children,
  title,
  description,
  actions,
  className = '',
  spacing = 'medium',
}: SectionProps) {
  const spacingClasses = {
    small: 'mb-small',
    medium: 'mb-medium',
    large: 'mb-large',
  };

  return (
    <section className={`${spacingClasses[spacing]} ${className}`}>
      {(title || description || actions) && (
        <div className="mb-medium">
          <div className="flex items-start justify-between gap-default">
            <div className="flex-1">
              {title && (
                <h2 className="text-h3 text-primary-charcoal mb-2">{title}</h2>
              )}
              {description && (
                <p className="text-body text-secondary-gray">{description}</p>
              )}
            </div>
            {actions && (
              <div className="flex-shrink-0">{actions}</div>
            )}
          </div>
        </div>
      )}
      {children}
    </section>
  );
}