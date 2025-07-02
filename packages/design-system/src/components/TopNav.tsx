import { ReactNode } from 'react';
import { Menu, ArrowLeft } from 'lucide-react';

export interface TopNavProps {
  title?: string;
  leftAction?: {
    icon?: ReactNode;
    onClick: () => void;
    label: string;
  };
  rightActions?: Array<{
    icon: ReactNode;
    onClick: () => void;
    label: string;
    badge?: string | number;
  }>;
  className?: string;
  showBackButton?: boolean;
  onBack?: () => void;
  showMenuButton?: boolean;
  onMenuClick?: () => void;
}

export function TopNav({
  title,
  leftAction,
  rightActions = [],
  className = '',
  showBackButton = false,
  onBack,
  showMenuButton = false,
  onMenuClick,
}: TopNavProps) {
  const renderLeftSection = () => {
    if (showBackButton && onBack) {
      return (
        <button
          onClick={onBack}
          className="p-tiny rounded-button hover:bg-secondary-light-gray transition-colors duration-micro"
          aria-label="Go back"
        >
          <ArrowLeft className="w-6 h-6 text-primary-charcoal" />
        </button>
      );
    }

    if (showMenuButton && onMenuClick) {
      return (
        <button
          onClick={onMenuClick}
          className="p-tiny rounded-button hover:bg-secondary-light-gray transition-colors duration-micro"
          aria-label="Open menu"
        >
          <Menu className="w-6 h-6 text-primary-charcoal" />
        </button>
      );
    }

    if (leftAction) {
      return (
        <button
          onClick={leftAction.onClick}
          className="p-tiny rounded-button hover:bg-secondary-light-gray transition-colors duration-micro"
          aria-label={leftAction.label}
        >
          {leftAction.icon || <ArrowLeft className="w-6 h-6 text-primary-charcoal" />}
        </button>
      );
    }

    return null;
  };

  return (
    <header
      className={`
        fixed top-0 left-0 right-0 z-30
        h-[64px] bg-background-white
        border-b border-gray-200
        ${className}
      `}
    >
      <div className="h-full flex items-center justify-between px-default">
        <div className="flex items-center gap-small">
          {renderLeftSection()}
          {title && (
            <h1 className="text-h4 text-primary-charcoal truncate max-w-[200px] md:max-w-none">
              {title}
            </h1>
          )}
        </div>

        {rightActions.length > 0 && (
          <div className="flex items-center gap-tiny">
            {rightActions.map((action, index) => (
              <button
                key={index}
                onClick={action.onClick}
                className="relative p-tiny rounded-button hover:bg-secondary-light-gray transition-colors duration-micro"
                aria-label={action.label}
              >
                {action.icon}
                {action.badge !== undefined && (
                  <span className="absolute top-0 right-0 min-w-[18px] h-[18px] flex items-center justify-center px-1 bg-accent-red text-white text-[10px] font-medium rounded-full">
                    {action.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </header>
  );
}