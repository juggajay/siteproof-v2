'use client';

import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { motion } from 'framer-motion';
import { 
  GripVertical, 
  ChevronUp, 
  ChevronDown, 
  Trash2, 
  Edit, 
  CheckSquare,
  FileText,
  Calendar,
  Camera,
  Hash,
  Type,
  ToggleLeft
} from 'lucide-react';
import { Button } from '@siteproof/design-system';
import type { TemplateItem as TemplateItemType } from '../../types/template.types';

interface TemplateItemProps {
  item: TemplateItemType;
  index: number;
  totalItems: number;
  onEdit: (item: TemplateItemType) => void;
  onDelete: (id: string) => void;
  onMove: (id: string, direction: 'up' | 'down') => void;
}

const fieldIcons: Record<string, React.ElementType> = {
  text: Type,
  number: Hash,
  checkbox: CheckSquare,
  select: ToggleLeft,
  date: Calendar,
  signature: FileText,
  photo: Camera,
  textarea: FileText,
};

export function TemplateItem({ 
  item, 
  index, 
  totalItems, 
  onEdit, 
  onDelete, 
  onMove
}: TemplateItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ 
    id: item.id,
    disabled: false,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const isFirstItem = index === 0;
  const isLastItem = index === totalItems - 1;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowUp' && !isFirstItem) {
      e.preventDefault();
      onMove(item.id, 'up');
    } else if (e.key === 'ArrowDown' && !isLastItem) {
      e.preventDefault();
      onMove(item.id, 'down');
    }
  };

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      initial={{ opacity: 0, y: 20 }}
      animate={{ 
        opacity: isSortableDragging ? 0.5 : 1, 
        y: 0,
        scale: isSortableDragging ? 1.05 : 1,
      }}
      exit={{ opacity: 0, x: -100 }}
      transition={{ 
        type: 'spring', 
        stiffness: 300, 
        damping: 30 
      }}
      className={`
        relative bg-white rounded-lg border-2 transition-colors
        ${isSortableDragging ? 'border-blue-500 shadow-2xl z-50' : 'border-gray-200 hover:border-gray-300'}
      `}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="listitem"
      aria-label={`${item.title}. Item ${index + 1} of ${totalItems}. Press up or down arrow to reorder.`}
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Drag Handle */}
          <button
            {...attributes}
            {...listeners}
            className="mt-1 p-1 text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
            aria-label="Drag to reorder"
          >
            <GripVertical className="w-5 h-5" />
          </button>

          {/* Content */}
          <div className="flex-1">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="text-base font-medium text-gray-900">
                  {item.title}
                  {item.required && (
                    <span className="ml-1 text-red-500" aria-label="Required">*</span>
                  )}
                </h4>
                {item.description && (
                  <p className="mt-1 text-sm text-gray-500">{item.description}</p>
                )}
              </div>
              
              {/* Actions */}
              <div className="flex items-center gap-1 ml-4">
                {/* Keyboard Navigation Buttons */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onMove(item.id, 'up')}
                  disabled={isFirstItem}
                  aria-label="Move up"
                  className="p-1"
                >
                  <ChevronUp className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onMove(item.id, 'down')}
                  disabled={isLastItem}
                  aria-label="Move down"
                  className="p-1"
                >
                  <ChevronDown className="w-4 h-4" />
                </Button>
                
                <div className="w-px h-4 bg-gray-300 mx-1" />
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onEdit(item)}
                  aria-label="Edit item"
                  className="p-1"
                >
                  <Edit className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDelete(item.id)}
                  aria-label="Delete item"
                  className="p-1 text-red-600 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Fields Preview */}
            {item.fields.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {item.fields.map((field) => {
                  const Icon = fieldIcons[field.type] || Type;
                  return (
                    <span
                      key={field.id}
                      className="inline-flex items-center px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded"
                    >
                      <Icon className="w-3 h-3 mr-1" />
                      {field.label}
                      {field.required && <span className="ml-0.5 text-red-500">*</span>}
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}