import { ReactNode } from 'react';

export interface PageLayoutProps {
  children: ReactNode;
  hasTopNav?: boolean;
  hasBottomNav?: boolean;
  className?: string;
  maxWidth?: 'full' | 'xl' | 'lg' | 'md' | 'sm';
  padding?: 'none' | 'small' | 'medium' | 'large';
}

export function PageLayout({
  children,
  hasTopNav = false,
  hasBottomNav = false,
  className = '',
  maxWidth = 'full',
  padding = 'medium',
}: PageLayoutProps) {
  const topSpacing = hasTopNav ? 'pt-[64px]' : '';
  const bottomSpacing = hasBottomNav ? 'pb-[64px] md:pb-0' : '';

  const maxWidthClasses = {
    full: 'max-w-full',
    xl: 'max-w-7xl',
    lg: 'max-w-5xl',
    md: 'max-w-3xl',
    sm: 'max-w-xl',
  };

  const paddingClasses = {
    none: '',
    small: 'px-small py-small',
    medium: 'px-default py-medium',
    large: 'px-large py-large',
  };

  return (
    <div className={`min-h-screen bg-background-light ${topSpacing} ${bottomSpacing}`}>
      <div className={`${maxWidthClasses[maxWidth]} mx-auto ${paddingClasses[padding]} ${className}`}>
        {children}
      </div>
    </div>
  );
}