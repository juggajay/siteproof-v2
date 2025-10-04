import React from 'react';
import { cn } from '@/lib/utils';

export interface TopNavProps extends React.HTMLAttributes<HTMLElement> {
  title?: string;
  leftAction?: React.ReactNode;
  rightActions?: React.ReactNode;
  transparent?: boolean;
  sticky?: boolean;
}

const TopNav = React.forwardRef<HTMLElement, TopNavProps>(
  (
    {
      className,
      title,
      leftAction,
      rightActions,
      transparent = false,
      sticky = true,
      children,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'w-full min-h-[64px] px-4 py-3 flex items-center justify-between gap-4 transition-all duration-200 z-sticky';

    const backgroundStyles = transparent
      ? 'bg-transparent'
      : 'bg-white shadow-sm border-b border-gray-200';

    const stickyStyles = sticky ? 'sticky top-0' : '';

    return (
      <nav
        ref={ref}
        className={cn(baseStyles, backgroundStyles, stickyStyles, 'safe-area-top', className)}
        role="navigation"
        aria-label="Top navigation"
        {...props}
      >
        {/* Left Action */}
        {leftAction && <div className="flex-shrink-0">{leftAction}</div>}

        {/* Title */}
        {title && (
          <div className="flex-1 min-w-0 text-center">
            <h1 className="text-h4 font-semibold text-gray-900 truncate">{title}</h1>
          </div>
        )}

        {/* Custom Content */}
        {children && <div className="flex-1">{children}</div>}

        {/* Right Actions */}
        {rightActions && (
          <div className="flex-shrink-0 flex items-center gap-2">{rightActions}</div>
        )}
      </nav>
    );
  }
);

TopNav.displayName = 'TopNav';

export { TopNav };
