import React from 'react';
import { motion } from 'framer-motion';

export interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
  animation?: 'pulse' | 'wave' | 'none';
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className = '',
  variant = 'text',
  width,
  height,
  animation = 'pulse',
}) => {
  const baseStyles = 'bg-gray-200 rounded';
  
  const variantStyles = {
    text: 'h-4 w-full rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-lg',
  };
  
  const animationStyles = {
    pulse: 'animate-pulse',
    wave: '',
    none: '',
  };
  
  const dimensions = {
    width: width || (variant === 'circular' ? '40px' : '100%'),
    height: height || (variant === 'circular' ? '40px' : variant === 'text' ? '16px' : '120px'),
  };
  
  if (animation === 'wave') {
    return (
      <div
        className={`relative overflow-hidden ${baseStyles} ${variantStyles[variant]} ${className}`}
        style={dimensions}
      >
        <motion.div
          className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent"
          animate={{
            translateX: ['100%', '200%'],
          }}
          transition={{
            repeat: Infinity,
            duration: 1.5,
            ease: 'easeInOut',
          }}
        />
      </div>
    );
  }
  
  return (
    <div
      className={`${baseStyles} ${variantStyles[variant]} ${animationStyles[animation]} ${className}`}
      style={dimensions}
      aria-hidden="true"
    />
  );
};

export interface SkeletonGroupProps {
  count?: number;
  className?: string;
  children?: React.ReactNode;
}

export const SkeletonGroup: React.FC<SkeletonGroupProps> = ({
  count = 3,
  className = '',
  children,
}) => {
  if (children) {
    return <div className={`space-y-3 ${className}`}>{children}</div>;
  }
  
  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: count }).map((_, index) => (
        <Skeleton key={index} />
      ))}
    </div>
  );
};