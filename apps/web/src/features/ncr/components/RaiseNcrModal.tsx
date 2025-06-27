'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertTriangle } from 'lucide-react';
import { Button } from '@siteproof/design-system';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { NcrForm } from './NcrForm';
import type { Inspection, Project } from '@siteproof/database';

interface RaiseNcrModalProps {
  isOpen: boolean;
  onClose: () => void;
  inspection?: Inspection;
  project: Project;
  inspectionItemRef?: string;
  failedItemTitle?: string;
}

export function RaiseNcrModal({
  isOpen,
  onClose,
  inspection,
  project,
  inspectionItemRef,
  failedItemTitle,
}: RaiseNcrModalProps) {
  const focusTrapRef = useFocusTrap(isOpen);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-25"
          onClick={onClose}
        />

        <div className="flex min-h-full items-center justify-center p-4">
          <motion.div
            ref={focusTrapRef}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative w-full max-w-3xl bg-white rounded-lg shadow-xl max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    Raise Non-Conformance Report
                  </h2>
                  {failedItemTitle && (
                    <p className="text-sm text-gray-500 mt-0.5">
                      For: {failedItemTitle}
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-500"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <NcrForm
                inspection={inspection}
                project={project}
                inspectionItemRef={inspectionItemRef}
                onSuccess={(ncrId) => {
                  onClose();
                  // Optionally navigate to NCR details
                  window.location.href = `/dashboard/ncrs/${ncrId}`;
                }}
                onCancel={onClose}
              />
            </div>
          </motion.div>
        </div>
      </div>
    </AnimatePresence>
  );
}