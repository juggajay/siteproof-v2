'use client';

import { CheckCircle2, XCircle, Minus } from 'lucide-react';
import { cn } from '../utils/cn';

export type ITPStatus = 'pass' | 'fail' | 'na';

export interface ITPStatusButtonProps {
  status: ITPStatus;
  selected?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  size?: 'md' | 'lg';
  className?: string;
}

// Okabe-Ito color-blind safe palette
const statusConfig = {
  pass: {
    icon: CheckCircle2,
    label: 'Pass',
    colors: {
      active: 'bg-[#117733] border-[#117733] text-white shadow-lg',
      inactive: 'bg-white border-[#117733] text-[#117733] hover:bg-[#117733]/10',
      disabled: 'bg-gray-100 border-gray-300 text-gray-400 cursor-not-allowed',
    },
  },
  fail: {
    icon: XCircle,
    label: 'Fail',
    colors: {
      active: 'bg-[#D55E00] border-[#D55E00] text-white shadow-lg',
      inactive: 'bg-white border-[#D55E00] text-[#D55E00] hover:bg-[#D55E00]/10',
      disabled: 'bg-gray-100 border-gray-300 text-gray-400 cursor-not-allowed',
    },
  },
  na: {
    icon: Minus,
    label: 'N/A',
    colors: {
      active: 'bg-[#888888] border-[#888888] text-white shadow-lg',
      inactive: 'bg-white border-[#888888] text-[#888888] hover:bg-[#888888]/10',
      disabled: 'bg-gray-100 border-gray-300 text-gray-400 cursor-not-allowed',
    },
  },
} as const;

const sizeClasses = {
  md: 'min-h-[48px] min-w-[48px] px-3 py-2',
  lg: 'min-h-[56px] min-w-[56px] px-4 py-3',
} as const;

/**
 * ITPStatusButton - Specialized button for inspection status selection
 *
 * Features:
 * - Color-blind safe (Okabe-Ito palette)
 * - Icons + text + color (never color alone)
 * - 56x56px touch targets for gloved hands
 * - Immediate visual feedback
 */
export function ITPStatusButton({
  status,
  selected = false,
  onClick,
  disabled = false,
  size = 'md',
  className,
}: ITPStatusButtonProps) {
  const config = statusConfig[status];
  const Icon = config.icon;

  const colorClass = disabled
    ? config.colors.disabled
    : selected
    ? config.colors.active
    : config.colors.inactive;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        // Base styles
        'rounded-lg border-2 transition-all',
        'flex flex-col items-center justify-center gap-1',
        'font-medium text-sm',
        'transform active:scale-95',
        'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500',
        // Size
        sizeClasses[size],
        // Colors
        colorClass,
        className
      )}
      aria-pressed={selected}
      aria-label={`${config.label} ${selected ? '(selected)' : ''}`}
    >
      <Icon className="h-6 w-6" aria-hidden="true" />
      <span className="uppercase tracking-wide">{config.label}</span>
    </button>
  );
}
