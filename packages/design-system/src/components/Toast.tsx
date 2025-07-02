'use client';

import { useEffect, useState } from 'react';
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastProps {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
  onClose?: (id: string) => void;
  action?: {
    label: string;
    onClick: () => void;
  };
}

const icons = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

const colors = {
  success: {
    bg: 'bg-success',
    text: 'text-white',
    icon: 'text-white',
  },
  error: {
    bg: 'bg-error',
    text: 'text-white',
    icon: 'text-white',
  },
  warning: {
    bg: 'bg-warning',
    text: 'text-white',
    icon: 'text-white',
  },
  info: {
    bg: 'bg-info',
    text: 'text-white',
    icon: 'text-white',
  },
};

export function Toast({
  id,
  type,
  title,
  message,
  duration = 5000,
  onClose,
  action,
}: ToastProps) {
  const [isVisible, setIsVisible] = useState(true);
  const Icon = icons[type];
  const colorClasses = colors[type];

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, duration);

      return () => clearTimeout(timer);
    }
    return undefined;
  }, [duration]);

  const handleClose = () => {
    setIsVisible(false);
  };

  const handleAnimationComplete = () => {
    if (!isVisible && onClose) {
      onClose(id);
    }
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          onAnimationComplete={handleAnimationComplete}
          className={`
            flex items-start gap-small p-default rounded-button shadow-dropdown
            ${colorClasses.bg} ${colorClasses.text}
            min-w-[300px] max-w-md
          `}
        >
          <Icon className={`w-5 h-5 flex-shrink-0 mt-[2px] ${colorClasses.icon}`} />
          
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-body">{title}</h4>
            {message && (
              <p className="mt-1 text-body-small opacity-90">{message}</p>
            )}
            {action && (
              <button
                onClick={action.onClick}
                className="mt-2 text-body-small font-medium underline hover:no-underline"
              >
                {action.label}
              </button>
            )}
          </div>

          <button
            onClick={handleClose}
            className="flex-shrink-0 p-1 rounded hover:bg-white hover:bg-opacity-20 transition-colors duration-micro"
            aria-label="Close notification"
          >
            <X className="w-4 h-4" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export interface ToastContainerProps {
  toasts: ToastProps[];
  onClose: (id: string) => void;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';
}

export function ToastContainer({
  toasts,
  onClose,
  position = 'top-right',
}: ToastContainerProps) {
  const positionClasses = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'top-center': 'top-4 left-1/2 -translate-x-1/2',
    'bottom-center': 'bottom-4 left-1/2 -translate-x-1/2',
  };

  return (
    <div className={`fixed z-50 ${positionClasses[position]}`}>
      <div className="flex flex-col gap-small">
        {toasts.map((toast) => (
          <Toast key={toast.id} {...toast} onClose={onClose} />
        ))}
      </div>
    </div>
  );
}