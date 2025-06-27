import React from 'react';
import { NCRSeverity } from '@siteproof/database';
import { AlertTriangle } from 'lucide-react';

interface NcrSeverityBadgeProps {
  severity: NCRSeverity;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

const severityConfig: Record<NCRSeverity, {
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
}> = {
  low: {
    label: 'Low',
    color: 'text-blue-700',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
  },
  medium: {
    label: 'Medium',
    color: 'text-yellow-700',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
  },
  high: {
    label: 'High',
    color: 'text-orange-700',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
  },
  critical: {
    label: 'Critical',
    color: 'text-red-700',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
  },
};

export function NcrSeverityBadge({
  severity,
  size = 'md',
  showIcon = true,
}: NcrSeverityBadgeProps) {
  const config = severityConfig[severity];

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
    lg: 'px-3 py-1.5 text-base',
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  return (
    <span
      className={`
        inline-flex items-center gap-1.5 font-medium rounded-full border
        ${config.color} ${config.bgColor} ${config.borderColor}
        ${sizeClasses[size]}
      `}
    >
      {showIcon && <AlertTriangle className={iconSizes[size]} />}
      {config.label}
    </span>
  );
}