'use client';

import { useState, useRef } from 'react';
import { motion, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { Trash2, Archive, Edit, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { haptics } from '@/lib/haptics';

interface SwipeAction {
  icon: React.ReactNode;
  label: string;
  color: string;
  backgroundColor: string;
  onAction: () => void;
}

interface SwipeableCardProps {
  children: React.ReactNode;
  className?: string;
  leftActions?: SwipeAction[];
  rightActions?: SwipeAction[];
  swipeThreshold?: number;
  enableHaptic?: boolean;
}

/**
 * Swipeable card component for mobile interactions
 * Reveals actions on swipe left/right
 */
export function SwipeableCard({
  children,
  className,
  leftActions = [],
  rightActions = [],
  swipeThreshold = 80,
  enableHaptic = true,
}: SwipeableCardProps) {
  const [isRevealed, setIsRevealed] = useState(false);
  const x = useMotionValue(0);
  const cardRef = useRef<HTMLDivElement>(null);

  // Transform x position to background color
  const backgroundColor = useTransform(
    x,
    [-swipeThreshold, 0, swipeThreshold],
    ['rgba(239, 68, 68, 0.1)', 'transparent', 'rgba(34, 197, 94, 0.1)']
  );

  const handleDragEnd = (_: any, info: PanInfo) => {
    const offset = info.offset.x;
    const velocity = info.velocity.x;

    // Check if swipe threshold is met
    if (Math.abs(offset) > swipeThreshold || Math.abs(velocity) > 500) {
      if (enableHaptic) {
        haptics.medium();
      }

      // Execute action based on direction
      if (offset > 0 && leftActions.length > 0) {
        // Swipe right - left actions
        leftActions[0].onAction();
      } else if (offset < 0 && rightActions.length > 0) {
        // Swipe left - right actions
        rightActions[0].onAction();
      }

      // Reset position
      x.set(0);
      setIsRevealed(false);
    } else {
      // Snap back to center
      x.set(0);
      setIsRevealed(false);
    }
  };

  const handleDrag = (_: any, info: PanInfo) => {
    const offset = info.offset.x;

    // Provide haptic feedback when threshold is crossed
    if (enableHaptic && Math.abs(offset) > swipeThreshold && !isRevealed) {
      haptics.selection();
      setIsRevealed(true);
    } else if (Math.abs(offset) < swipeThreshold && isRevealed) {
      setIsRevealed(false);
    }
  };

  return (
    <div className={cn('relative overflow-hidden', className)}>
      {/* Background actions - Left (swipe right to reveal) */}
      {leftActions.length > 0 && (
        <div className="absolute inset-y-0 left-0 flex items-center">
          {leftActions.map((action, index) => (
            <motion.button
              key={index}
              className={cn(
                'h-full px-6 flex items-center gap-2',
                'font-medium text-white transition-colors',
                action.backgroundColor
              )}
              onClick={() => {
                if (enableHaptic) haptics.medium();
                action.onAction();
              }}
              style={{ color: action.color }}
            >
              {action.icon}
              <span className="text-sm font-medium">{action.label}</span>
            </motion.button>
          ))}
        </div>
      )}

      {/* Background actions - Right (swipe left to reveal) */}
      {rightActions.length > 0 && (
        <div className="absolute inset-y-0 right-0 flex items-center">
          {rightActions.map((action, index) => (
            <motion.button
              key={index}
              className={cn(
                'h-full px-6 flex items-center gap-2',
                'font-medium text-white transition-colors',
                action.backgroundColor
              )}
              onClick={() => {
                if (enableHaptic) haptics.medium();
                action.onAction();
              }}
              style={{ color: action.color }}
            >
              {action.icon}
              <span className="text-sm font-medium">{action.label}</span>
            </motion.button>
          ))}
        </div>
      )}

      {/* Foreground card */}
      <motion.div
        ref={cardRef}
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.2}
        onDrag={handleDrag}
        onDragEnd={handleDragEnd}
        style={{ x, backgroundColor }}
        className="relative bg-white touch-pan-y"
      >
        {children}
      </motion.div>
    </div>
  );
}

// Pre-built action configurations
export const SwipeActions = {
  delete: (onDelete: () => void): SwipeAction => ({
    icon: <Trash2 className="h-5 w-5" />,
    label: 'Delete',
    color: 'white',
    backgroundColor: 'bg-red-600 hover:bg-red-700',
    onAction: onDelete,
  }),

  archive: (onArchive: () => void): SwipeAction => ({
    icon: <Archive className="h-5 w-5" />,
    label: 'Archive',
    color: 'white',
    backgroundColor: 'bg-gray-600 hover:bg-gray-700',
    onAction: onArchive,
  }),

  edit: (onEdit: () => void): SwipeAction => ({
    icon: <Edit className="h-5 w-5" />,
    label: 'Edit',
    color: 'white',
    backgroundColor: 'bg-blue-600 hover:bg-blue-700',
    onAction: onEdit,
  }),

  complete: (onComplete: () => void): SwipeAction => ({
    icon: <CheckCircle className="h-5 w-5" />,
    label: 'Complete',
    color: 'white',
    backgroundColor: 'bg-green-600 hover:bg-green-700',
    onAction: onComplete,
  }),
};
