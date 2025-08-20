'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface MobileResponsiveGridProps {
  children: React.ReactNode;
  className?: string;
  gap?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  cols?: {
    default?: number;
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
    '2xl'?: number;
  };
}

/**
 * Mobile-first responsive grid component
 * Automatically adjusts columns based on screen size
 */
export function MobileResponsiveGrid({
  children,
  className,
  gap = 'md',
  cols = {
    default: 1,
    sm: 2,
    md: 2,
    lg: 3,
    xl: 4,
    '2xl': 4,
  },
}: MobileResponsiveGridProps) {
  const gapClasses = {
    xs: 'gap-2',
    sm: 'gap-3',
    md: 'gap-4',
    lg: 'gap-6',
    xl: 'gap-8',
  };

  const gridClasses = cn(
    'grid',
    gapClasses[gap],

    // Mobile-first responsive columns
    cols.default && `grid-cols-${cols.default}`,
    cols.sm && `sm:grid-cols-${cols.sm}`,
    cols.md && `md:grid-cols-${cols.md}`,
    cols.lg && `lg:grid-cols-${cols.lg}`,
    cols.xl && `xl:grid-cols-${cols.xl}`,
    cols['2xl'] && `2xl:grid-cols-${cols['2xl']}`,

    className
  );

  return <div className={gridClasses}>{children}</div>;
}

/**
 * Individual grid item with optional span controls
 */
interface GridItemProps {
  children: React.ReactNode;
  className?: string;
  span?: {
    default?: number;
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
    '2xl'?: number;
  };
}

export function GridItem({ children, className, span }: GridItemProps) {
  const spanClasses = cn(
    span?.default && `col-span-${span.default}`,
    span?.sm && `sm:col-span-${span.sm}`,
    span?.md && `md:col-span-${span.md}`,
    span?.lg && `lg:col-span-${span.lg}`,
    span?.xl && `xl:col-span-${span.xl}`,
    span?.['2xl'] && `2xl:col-span-${span['2xl']}`,
    className
  );

  return <div className={spanClasses}>{children}</div>;
}
