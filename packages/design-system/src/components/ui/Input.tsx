'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, CheckCircle } from 'lucide-react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  success?: boolean;
  helperText?: string;
  fullWidth?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      success,
      helperText,
      fullWidth = false,
      className = '',
      id,
      ...props
    },
    ref
  ) => {
    const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;
    const hasError = Boolean(error);
    const hasSuccess = success && !hasError;

    const borderColor = hasError
      ? 'border-error focus:border-error focus:ring-error'
      : hasSuccess
      ? 'border-success focus:border-success focus:ring-success'
      : 'border-gray-300 focus:border-primary-blue focus:ring-primary-blue';

    return (
      <div className={`${fullWidth ? 'w-full' : ''}`}>
        {label && (
          <label
            htmlFor={inputId}
            className="block text-body-small font-medium text-primary-charcoal mb-2"
          >
            {label}
          </label>
        )}
        
        <div className="relative">
          <input
            ref={ref}
            id={inputId}
            className={`
              input
              ${hasError ? 'input-error' : ''}
              ${hasSuccess ? 'input-success' : ''}
              ${className}
            `}
            aria-invalid={hasError}
            aria-describedby={
              hasError ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined
            }
            {...props}
          />
          
          <AnimatePresence>
            {(hasError || hasSuccess) && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none"
              >
                {hasError ? (
                  <AlertCircle className="w-5 h-5 text-error" aria-hidden="true" />
                ) : (
                  <CheckCircle className="w-5 h-5 text-success" aria-hidden="true" />
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        
        <AnimatePresence mode="wait">
          {error && (
            <motion.p
              id={`${inputId}-error`}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mt-1 text-body-small text-error"
              role="alert"
            >
              {error}
            </motion.p>
          )}
          
          {!error && helperText && (
            <motion.p
              id={`${inputId}-helper`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="mt-1 text-body-small text-secondary-gray"
            >
              {helperText}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    );
  }
);

Input.displayName = 'Input';