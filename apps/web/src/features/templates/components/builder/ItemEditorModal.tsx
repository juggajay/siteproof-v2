'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Trash2, GripVertical } from 'lucide-react';
import { Button, Input } from '@siteproof/design-system';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import type { TemplateItem, TemplateField, FieldType } from '../../types/template.types';

interface ItemEditorModalProps {
  item: TemplateItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: TemplateItem) => void;
}

const fieldTypes: { value: FieldType; label: string; description: string }[] = [
  { value: 'text', label: 'Text Input', description: 'Single line text' },
  { value: 'textarea', label: 'Text Area', description: 'Multi-line text' },
  { value: 'number', label: 'Number', description: 'Numeric input' },
  { value: 'checkbox', label: 'Checkbox', description: 'Yes/No selection' },
  { value: 'select', label: 'Dropdown', description: 'Select from options' },
  { value: 'date', label: 'Date', description: 'Date picker' },
  { value: 'signature', label: 'Signature', description: 'Digital signature' },
  { value: 'photo', label: 'Photo', description: 'Image upload' },
];

export function ItemEditorModal({ item, isOpen, onClose, onSave }: ItemEditorModalProps) {
  const focusTrapRef = useFocusTrap(isOpen);
  const [formData, setFormData] = useState<TemplateItem>({
    id: '',
    type: 'checkpoint',
    title: '',
    description: '',
    order: 0,
    required: false,
    fields: [],
  });

  useEffect(() => {
    if (item) {
      setFormData(item);
    }
  }, [item]);

  const handleAddField = () => {
    const newField: TemplateField = {
      id: `field-${Date.now()}`,
      type: 'text',
      label: '',
      required: false,
    };
    setFormData(prev => ({
      ...prev,
      fields: [...prev.fields, newField],
    }));
  };

  const handleUpdateField = (fieldId: string, updates: Partial<TemplateField>) => {
    setFormData(prev => ({
      ...prev,
      fields: prev.fields.map(field =>
        field.id === fieldId ? { ...field, ...updates } : field
      ),
    }));
  };

  const handleDeleteField = (fieldId: string) => {
    setFormData(prev => ({
      ...prev,
      fields: prev.fields.filter(field => field.id !== fieldId),
    }));
  };

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
            className="relative w-full max-w-3xl bg-white rounded-lg shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-xl font-semibold text-gray-900">
                {item ? 'Edit Checkpoint' : 'Add Checkpoint'}
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
              <div className="space-y-6">
                {/* Basic Info */}
                <div>
                  <Input
                    label="Title"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="e.g., Foundation Inspection"
                    required
                    fullWidth
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description (Optional)
                  </label>
                  <textarea
                    value={formData.description || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Provide additional context or instructions..."
                  />
                </div>

                <div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.required || false}
                      onChange={(e) => setFormData(prev => ({ ...prev, required: e.target.checked }))}
                      className="h-4 w-4 text-blue-600 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700">Required checkpoint</span>
                  </label>
                </div>

                {/* Fields */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-gray-900">Fields</h3>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={handleAddField}
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Add Field
                    </Button>
                  </div>

                  <div className="space-y-3">
                    {formData.fields.length === 0 ? (
                      <p className="text-sm text-gray-500 text-center py-4">
                        No fields added yet. Click "Add Field" to create inspection fields.
                      </p>
                    ) : (
                      formData.fields.map((field) => (
                        <motion.div
                          key={field.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="p-4 bg-gray-50 rounded-lg border border-gray-200"
                        >
                          <div className="flex items-start gap-3">
                            <GripVertical className="w-5 h-5 text-gray-400 mt-1" />
                            
                            <div className="flex-1 space-y-3">
                              <div className="grid grid-cols-2 gap-3">
                                <Input
                                  label="Field Label"
                                  value={field.label}
                                  onChange={(e) => handleUpdateField(field.id, { label: e.target.value })}
                                  placeholder="e.g., Depth (meters)"
                                  fullWidth
                                />
                                
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Field Type
                                  </label>
                                  <select
                                    value={field.type}
                                    onChange={(e) => handleUpdateField(field.id, { type: e.target.value as FieldType })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                  >
                                    {fieldTypes.map(type => (
                                      <option key={type.value} value={type.value}>
                                        {type.label}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              </div>

                              {field.type === 'select' && (
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Options (comma separated)
                                  </label>
                                  <input
                                    type="text"
                                    value={field.options?.join(', ') || ''}
                                    onChange={(e) => handleUpdateField(field.id, {
                                      options: e.target.value.split(',').map(o => o.trim()).filter(Boolean)
                                    })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                    placeholder="Option 1, Option 2, Option 3"
                                  />
                                </div>
                              )}

                              <label className="flex items-center">
                                <input
                                  type="checkbox"
                                  checked={field.required || false}
                                  onChange={(e) => handleUpdateField(field.id, { required: e.target.checked })}
                                  className="h-4 w-4 text-blue-600 rounded"
                                />
                                <span className="ml-2 text-sm text-gray-700">Required field</span>
                              </label>
                            </div>

                            <button
                              onClick={() => handleDeleteField(field.id)}
                              className="p-1 text-red-600 hover:text-red-700"
                              aria-label="Delete field"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </motion.div>
                      ))
                    )}
                  </div>
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
                {item ? 'Update' : 'Create'} Checkpoint
              </Button>
            </div>
          </motion.div>
        </div>
      </div>
    </AnimatePresence>
  );
}