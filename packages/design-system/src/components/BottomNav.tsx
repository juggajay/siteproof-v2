import { ReactNode } from 'react';

export interface BottomNavItem {
  id: string;
  label: string;
  icon: ReactNode;
  href?: string;
  onClick?: () => void;
  badge?: string | number;
}

export interface BottomNavProps {
  items: BottomNavItem[];
  activeItemId?: string;
  className?: string;
}

export function BottomNav({
  items,
  activeItemId,
  className = '',
}: BottomNavProps) {
  return (
    <nav
      className={`
        fixed bottom-0 left-0 right-0 z-30
        h-nav-bottom bg-background-white
        border-t border-gray-200 shadow-nav
        ${className}
      `}
    >
      <div className="h-full flex items-center justify-around px-small">
        {items.map((item) => {
          const isActive = item.id === activeItemId;
          const Component = item.href ? 'a' : 'button';
          
          return (
            <Component
              key={item.id}
              href={item.href}
              onClick={item.onClick}
              className={`
                relative flex flex-col items-center justify-center
                min-w-[56px] min-h-[56px] py-tiny px-small
                transition-colors duration-fast rounded-button
                ${isActive ? 'text-primary-blue bg-secondary-blue-pale' : 'text-secondary-gray'}
                hover:text-primary-blue hover:bg-secondary-light-gray
              `}
            >
              <div className="relative">
                {item.icon}
                {item.badge !== undefined && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center px-1 bg-error text-white text-[10px] font-medium rounded-full">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="mt-1 text-caption">
                {item.label}
              </span>
              {isActive && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-primary-blue rounded-b-full" />
              )}
            </Component>
          );
        })}
      </div>
    </nav>
  );
}