import { ReactNode } from 'react';

export interface GridProps {
  children: ReactNode;
  columns?: 1 | 2 | 3 | 4 | 6 | 12;
  gap?: 'small' | 'medium' | 'large';
  responsive?: boolean;
  className?: string;
}

export function Grid({
  children,
  columns = 3,
  gap = 'medium',
  responsive = true,
  className = '',
}: GridProps) {
  const columnClasses = {
    1: 'grid-cols-1',
    2: responsive ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-2',
    3: responsive ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-3',
    4: responsive ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4' : 'grid-cols-4',
    6: responsive ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-6' : 'grid-cols-6',
    12: responsive ? 'grid-cols-3 md:grid-cols-6 lg:grid-cols-12' : 'grid-cols-12',
  };

  const gapClasses = {
    small: 'gap-small',
    medium: 'gap-medium',
    large: 'gap-large',
  };

  return (
    <div className={`grid ${columnClasses[columns]} ${gapClasses[gap]} ${className}`}>
      {children}
    </div>
  );
}

export interface GridItemProps {
  children: ReactNode;
  span?: 1 | 2 | 3 | 4 | 6 | 12;
  className?: string;
}

export function GridItem({
  children,
  span = 1,
  className = '',
}: GridItemProps) {
  const spanClasses = {
    1: 'col-span-1',
    2: 'col-span-2',
    3: 'col-span-3',
    4: 'col-span-4',
    6: 'col-span-6',
    12: 'col-span-12',
  };

  return (
    <div className={`${spanClasses[span]} ${className}`}>
      {children}
    </div>
  );
}