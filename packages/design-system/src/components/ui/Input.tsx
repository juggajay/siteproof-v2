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
      ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
      : hasSuccess
      ? 'border-green-500 focus:border-green-500 focus:ring-green-500'
      : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500';

    return (
      <div className={`${fullWidth ? 'w-full' : ''}`}>
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            {label}
          </label>
        )}
        
        <div className="relative">
          <input
            ref={ref}
            id={inputId}
            className={`
              block w-full px-3 py-2 pr-10
              text-gray-900 placeholder-gray-500
              border rounded-lg shadow-sm
              focus:outline-none focus:ring-2 focus:ring-offset-0
              disabled:bg-gray-50 disabled:cursor-not-allowed
              transition-colors duration-200
              ${borderColor}
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
                  <AlertCircle className="w-5 h-5 text-red-500" aria-hidden="true" />
                ) : (
                  <CheckCircle className="w-5 h-5 text-green-500" aria-hidden="true" />
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
              className="mt-1 text-sm text-red-600"
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
              className="mt-1 text-sm text-gray-500"
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