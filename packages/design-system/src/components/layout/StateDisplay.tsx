'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, RefreshCw, Inbox } from 'lucide-react';
import { Button } from '../ui/Button';
import { SkeletonGroup } from '../ui/Skeleton';

export interface StateDisplayProps {
  loading?: boolean;
  error?: Error | string | null;
  empty?: boolean;
  children: React.ReactNode;
  
  // Customization options
  loadingComponent?: React.ReactNode;
  errorComponent?: React.ReactNode;
  emptyComponent?: React.ReactNode;
  
  // Callbacks
  onRetry?: () => void;
  onEmptyAction?: () => void;
  
  // Text customization
  errorTitle?: string;
  errorDescription?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyActionText?: string;
  retryText?: string;
  
  // Loading customization
  skeletonCount?: number;
  
  className?: string;
}

export const StateDisplay: React.FC<StateDisplayProps> = ({
  loading = false,
  error = null,
  empty = false,
  children,
  loadingComponent,
  errorComponent,
  emptyComponent,
  onRetry,
  onEmptyAction,
  errorTitle = 'Something went wrong',
  errorDescription,
  emptyTitle = 'No data found',
  emptyDescription = 'Get started by creating your first item.',
  emptyActionText = 'Create New',
  retryText = 'Try Again',
  skeletonCount = 3,
  className = '',
}) => {
  const errorMessage = error
    ? typeof error === 'string'
      ? error
      : error.message || errorDescription || 'An unexpected error occurred. Please try again.'
    : errorDescription || 'An unexpected error occurred. Please try again.';

  if (loading) {
    return (
      <AnimatePresence mode="wait">
        <motion.div
          key="loading"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className={className}
        >
          {loadingComponent || <SkeletonGroup count={skeletonCount} />}
        </motion.div>
      </AnimatePresence>
    );
  }

  if (error) {
    return (
      <AnimatePresence mode="wait">
        <motion.div
          key="error"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className={`flex flex-col items-center justify-center p-8 text-center ${className}`}
        >
          {errorComponent || (
            <>
              <div className="w-16 h-16 bg-error/10 rounded-full flex items-center justify-center mb-4">
                <AlertCircle className="w-8 h-8 text-error" />
              </div>
              <h3 className="text-h4 font-semibold text-primary-charcoal mb-2">
                {errorTitle}
              </h3>
              <p className="text-body-small text-secondary-gray mb-6 max-w-sm">
                {errorMessage}
              </p>
              {onRetry && (
                <Button
                  onClick={onRetry}
                  variant="secondary"
                  size="sm"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  {retryText}
                </Button>
              )}
            </>
          )}
        </motion.div>
      </AnimatePresence>
    );
  }

  if (empty) {
    return (
      <AnimatePresence mode="wait">
        <motion.div
          key="empty"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className={`flex flex-col items-center justify-center p-8 text-center ${className}`}
        >
          {emptyComponent || (
            <>
              <div className="w-16 h-16 bg-secondary-light-gray rounded-full flex items-center justify-center mb-4">
                <Inbox className="w-8 h-8 text-secondary-gray" />
              </div>
              <h3 className="text-h4 font-semibold text-primary-charcoal mb-2">
                {emptyTitle}
              </h3>
              <p className="text-body-small text-secondary-gray mb-6 max-w-sm">
                {emptyDescription}
              </p>
              {onEmptyAction && (
                <Button
                  onClick={onEmptyAction}
                  variant="primary"
                  size="sm"
                >
                  {emptyActionText}
                </Button>
              )}
            </>
          )}
        </motion.div>
      </AnimatePresence>
    );
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key="content"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className={className}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
};