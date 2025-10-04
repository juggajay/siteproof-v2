import React from 'react';
import { cn } from '@/lib/utils';

export interface BottomNavItem {
  id: string;
  icon: React.ReactNode;
  label: string;
  badge?: string | number;
  onClick?: () => void;
}

export interface BottomNavProps extends React.HTMLAttributes<HTMLElement> {
  items: BottomNavItem[];
  activeItemId?: string;
  onItemClick?: (id: string) => void;
}

const BottomNav = React.forwardRef<HTMLElement, BottomNavProps>(
  ({ className, items, activeItemId, onItemClick, ...props }, ref) => {
    const handleItemClick = (item: BottomNavItem) => {
      if (item.onClick) {
        item.onClick();
      }
      if (onItemClick) {
        onItemClick(item.id);
      }
    };

    return (
      <nav
        ref={ref}
        className={cn(
          'fixed bottom-0 left-0 right-0 h-nav-bottom bg-white border-t border-gray-200 shadow-nav z-sticky safe-area-bottom',
          className
        )}
        role="navigation"
        aria-label="Bottom navigation"
        {...props}
      >
        <div className="h-full flex items-center justify-around px-2">
          {items.map((item) => {
            const isActive = item.id === activeItemId;

            return (
              <button
                key={item.id}
                onClick={() => handleItemClick(item)}
                className={cn(
                  'relative flex flex-col items-center justify-center gap-1 min-w-[64px] min-h-[48px] px-3 py-2 rounded-lg transition-all duration-200 touch-manipulation',
                  isActive
                    ? 'text-primary-600 bg-primary-50'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50 active:bg-gray-100'
                )}
                aria-label={item.label}
                aria-current={isActive ? 'page' : undefined}
              >
                {/* Icon */}
                <span className={cn('text-2xl transition-transform', isActive && 'scale-110')}>
                  {item.icon}
                </span>

                {/* Label */}
                <span className={cn('text-xs font-medium', isActive && 'font-semibold')}>
                  {item.label}
                </span>

                {/* Badge */}
                {item.badge && (
                  <span className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 flex items-center justify-center text-[10px] font-bold text-white bg-error-main rounded-full">
                    {item.badge}
                  </span>
                )}

                {/* Touch target expansion */}
                <span className="absolute inset-0 -m-2" aria-hidden="true" />
              </button>
            );
          })}
        </div>
      </nav>
    );
  }
);

BottomNav.displayName = 'BottomNav';

export { BottomNav };
