'use client';

import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  size?: 'small' | 'medium' | 'large' | 'full';
  closeOnOutsideClick?: boolean;
  showCloseButton?: boolean;
  className?: string;
  preventScroll?: boolean;
  mobileFullScreen?: boolean;
}

export function Modal({
  isOpen,
  onClose,
  children,
  title,
  size = 'medium',
  closeOnOutsideClick = true,
  showCloseButton = true,
  className = '',
  preventScroll = true,
  mobileFullScreen = true,
}: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && preventScroll) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
    return undefined;
  }, [isOpen, preventScroll]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
    return undefined;
  }, [isOpen, onClose]);

  const sizeClasses = {
    small: 'max-w-sm',
    medium: 'max-w-lg',
    large: 'max-w-4xl',
    full: 'max-w-full mx-4',
  };

  const mobileClasses = mobileFullScreen
    ? 'h-full w-full md:h-auto md:w-auto md:rounded-card'
    : 'rounded-card';

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black bg-opacity-50"
            onClick={closeOnOutsideClick ? onClose : undefined}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-0">
            <motion.div
              ref={modalRef}
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{
                duration: 0.3,
                type: 'spring',
                damping: 25,
                stiffness: 300,
              }}
              className={`
                relative bg-background-white shadow-dropdown
                ${mobileClasses}
                ${sizeClasses[size]}
                ${className}
                w-full
                max-h-[90vh] overflow-hidden flex flex-col
              `}
              onClick={(e) => e.stopPropagation()}
            >
              {(title || showCloseButton) && (
                <div className="flex items-center justify-between p-medium border-b border-gray-200">
                  {title && <h2 className="text-h3 text-primary-charcoal">{title}</h2>}
                  {showCloseButton && (
                    <button
                      onClick={onClose}
                      className="ml-auto p-tiny rounded-button hover:bg-secondary-light-gray transition-colors duration-micro"
                      aria-label="Close modal"
                    >
                      <X className="w-5 h-5 text-secondary-gray" />
                    </button>
                  )}
                </div>
              )}
              <div className="flex-1 overflow-y-auto p-medium">{children}</div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

export interface ModalFooterProps {
  children: React.ReactNode;
  className?: string;
}

export function ModalFooter({ children, className = '' }: ModalFooterProps) {
  return (
    <div
      className={`flex items-center justify-end gap-small p-medium border-t border-gray-200 bg-background-offwhite ${className}`}
    >
      {children}
    </div>
  );
}