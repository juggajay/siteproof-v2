'use client';

import React, { useState, useCallback } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { AnimatePresence, motion } from 'framer-motion';
import { Plus, Save, Layers } from 'lucide-react';
import { Button } from '@siteproof/design-system';
import { TemplateItem } from './builder/TemplateItem';
import { ItemEditorModal } from './builder/ItemEditorModal';
import { SectionEditorModal } from './builder/SectionEditorModal';
import type { 
  TemplateStructureItem, 
  TemplateSection, 
  TemplateItem as TemplateItemType 
} from '../types/template.types';

interface TemplateBuilderProps {
  initialStructure?: TemplateStructureItem[];
  onSave: (structure: TemplateStructureItem[]) => void;
  isSaving?: boolean;
}

export function TemplateBuilder({ 
  initialStructure = [], 
  onSave,
  isSaving = false 
}: TemplateBuilderProps) {
  const [structure, setStructure] = useState<TemplateStructureItem[]>(initialStructure);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<TemplateItemType | null>(null);
  const [editingSection, setEditingSection] = useState<TemplateSection | null>(null);
  const [isAddingSection, setIsAddingSection] = useState(false);
  const [isAddingItem, setIsAddingItem] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (over && active.id !== over.id) {
      setStructure((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        
        const newItems = arrayMove(items, oldIndex, newIndex);
        // Update order values
        return newItems.map((item, index) => ({ ...item, order: index }));
      });
    }
  };

  const handleMove = useCallback((id: string, direction: 'up' | 'down') => {
    setStructure((items) => {
      const index = items.findIndex((item) => item.id === id);
      if (index === -1) return items;
      
      const newIndex = direction === 'up' ? index - 1 : index + 1;
      if (newIndex < 0 || newIndex >= items.length) return items;
      
      const newItems = arrayMove(items, index, newIndex);
      // Update order values
      return newItems.map((item, index) => ({ ...item, order: index }));
    });
  }, []);

  const handleDelete = useCallback((id: string) => {
    setStructure((items) => {
      const filtered = items.filter((item) => item.id !== id);
      // Update order values
      return filtered.map((item, index) => ({ ...item, order: index }));
    });
  }, []);

  const handleEdit = useCallback((item: TemplateItemType) => {
    setEditingItem(item);
  }, []);

  const handleEditSection = useCallback((section: TemplateSection) => {
    setEditingSection(section);
  }, []);

  const handleSaveItem = (updatedItem: TemplateItemType) => {
    if (editingItem) {
      setStructure((items) =>
        items.map((item) =>
          item.id === updatedItem.id ? updatedItem : item
        )
      );
    } else {
      setStructure((items) => [...items, { ...updatedItem, order: items.length }]);
    }
    setEditingItem(null);
    setIsAddingItem(false);
  };

  const handleSaveSection = (updatedSection: TemplateSection) => {
    if (editingSection) {
      setStructure((items) =>
        items.map((item) =>
          item.id === updatedSection.id ? updatedSection : item
        )
      );
    } else {
      setStructure((items) => [...items, { ...updatedSection, order: items.length }]);
    }
    setEditingSection(null);
    setIsAddingSection(false);
  };

  const handleAddItem = () => {
    const newItem: TemplateItemType = {
      id: `item-${Date.now()}`,
      type: 'checkpoint',
      title: '',
      description: '',
      order: structure.length,
      required: false,
      fields: [],
    };
    setEditingItem(newItem);
    setIsAddingItem(true);
  };

  const handleAddSection = () => {
    const newSection: TemplateSection = {
      id: `section-${Date.now()}`,
      type: 'section',
      title: '',
      description: '',
      order: structure.length,
      items: [],
    };
    setEditingSection(newSection);
    setIsAddingSection(true);
  };

  const activeItem = activeId ? structure.find((item) => item.id === activeId) : null;

  // TODO: Implement flattened items display if needed

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Template Builder</h2>
          <p className="mt-1 text-sm text-gray-500">
            Drag and drop to reorder items, or use keyboard arrows for accessibility
          </p>
        </div>
        <Button
          onClick={() => onSave(structure)}
          loading={isSaving}
          disabled={structure.length === 0}
        >
          <Save className="w-4 h-4 mr-2" />
          Save Template
        </Button>
      </div>

      {/* Action Buttons */}
      <div className="mb-6 flex gap-3">
        <Button
          variant="secondary"
          onClick={handleAddSection}
        >
          <Layers className="w-4 h-4 mr-2" />
          Add Section
        </Button>
        <Button
          variant="secondary"
          onClick={handleAddItem}
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Checkpoint
        </Button>
      </div>

      {/* Template Structure */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        modifiers={[restrictToVerticalAxis]}
      >
        <SortableContext
          items={structure.map((item) => item.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-3" role="list">
            <AnimatePresence>
              {structure.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300"
                >
                  <p className="text-gray-500">No items yet. Add a section or checkpoint to get started.</p>
                </motion.div>
              ) : (
                structure.map((item, index) => {
                  if (item.type === 'section') {
                    return (
                      <motion.div
                        key={item.id}
                        layout
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -100 }}
                      >
                        <div className="bg-blue-50 rounded-lg p-4 border-2 border-blue-200">
                          <div className="flex items-center justify-between mb-3">
                            <h3 className="text-lg font-semibold text-blue-900">{item.title}</h3>
                            <div className="flex gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditSection(item)}
                              >
                                Edit
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(item.id)}
                                className="text-red-600"
                              >
                                Delete
                              </Button>
                            </div>
                          </div>
                          {item.description && (
                            <p className="text-sm text-blue-700 mb-3">{item.description}</p>
                          )}
                          <div className="space-y-2">
                            {item.items.map((subItem, subIndex) => (
                              <TemplateItem
                                key={subItem.id}
                                item={subItem}
                                index={subIndex}
                                totalItems={item.items.length}
                                onEdit={handleEdit}
                                onDelete={handleDelete}
                                onMove={handleMove}
                              />
                            ))}
                          </div>
                        </div>
                      </motion.div>
                    );
                  }
                  
                  return (
                    <TemplateItem
                      key={item.id}
                      item={item}
                      index={index}
                      totalItems={structure.filter(i => i.type === 'checkpoint').length}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                      onMove={handleMove}
                    />
                  );
                })
              )}
            </AnimatePresence>
          </div>
        </SortableContext>

        {/* Drag Overlay */}
        <DragOverlay>
          {activeItem && activeItem.type === 'checkpoint' && (
            <div className="bg-white rounded-lg border-2 border-blue-500 shadow-2xl p-4 opacity-90">
              <h4 className="font-medium">{activeItem.title}</h4>
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {/* Edit Modals */}
      {(editingItem || isAddingItem) && (
        <ItemEditorModal
          item={editingItem}
          isOpen={true}
          onClose={() => {
            setEditingItem(null);
            setIsAddingItem(false);
          }}
          onSave={handleSaveItem}
        />
      )}

      {(editingSection || isAddingSection) && (
        <SectionEditorModal
          section={editingSection}
          isOpen={true}
          onClose={() => {
            setEditingSection(null);
            setIsAddingSection(false);
          }}
          onSave={handleSaveSection}
        />
      )}
    </div>
  );
}