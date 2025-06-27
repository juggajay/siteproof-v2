'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { Button, Input } from '@siteproof/design-system';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import type { TemplateSection } from '../../types/template.types';

interface SectionEditorModalProps {
  section: TemplateSection | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (section: TemplateSection) => void;
}

export function SectionEditorModal({ section, isOpen, onClose, onSave }: SectionEditorModalProps) {
  const focusTrapRef = useFocusTrap(isOpen);
  const [formData, setFormData] = useState<TemplateSection>({
    id: '',
    type: 'section',
    title: '',
    description: '',
    order: 0,
    items: [],
  });

  useEffect(() => {
    if (section) {
      setFormData(section);
    }
  }, [section]);

  const handleSave = () => {
    if (!formData.title.trim()) return;
    onSave(formData);
  };

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
            className="relative w-full max-w-md bg-white rounded-lg shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-xl font-semibold text-gray-900">
                {section ? 'Edit Section' : 'Add Section'}
              </h2>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-500"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="px-6 py-4">
              <div className="space-y-4">
                <Input
                  label="Section Title"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g., Foundation Work"
                  required
                  fullWidth
                />

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description (Optional)
                  </label>
                  <textarea
                    value={formData.description || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Describe what this section covers..."
                  />
                </div>

                <div className="rounded-lg bg-blue-50 p-4">
                  <p className="text-sm text-blue-800">
                    <strong>Note:</strong> After creating this section, you can add checkpoints to it from the main builder interface.
                  </p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t">
              <Button variant="ghost" onClick={onClose}>
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={!formData.title.trim()}
              >
                {section ? 'Update' : 'Create'} Section
              </Button>
            </div>
          </motion.div>
        </div>
      </div>
    </AnimatePresence>
  );
}