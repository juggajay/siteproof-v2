'use client';

import React, { useState, useMemo, memo, useCallback } from 'react';
import { ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import { ITPStatusButton, Modal, ModalFooter, Button } from '@siteproof/design-system';

interface OptimizedMobileItpCardProps {
  itp: {
    id: string;
    name: string;
    description?: string;
    status: string;
    completion_percentage?: number;
    data?: any;
    template_id?: string;
    itp_templates?: {
      id: string;
      name: string;
      description?: string;
      structure: any;
      organization_id: string;
    };
  };
  onStatusChange: (sectionId: string, itemId: string, status: 'pass' | 'fail' | 'na') => void;
  onDeleteItp?: (itpId: string) => void;
  onSubmitForReview?: (itpId: string) => void;
}

// Note: StatusButton is now imported from design system as ITPStatusButton

// Memoized ITP item component
const ItpItem = memo(
  ({
    item,
    onStatusChange,
  }: {
    item: any;
    onStatusChange: (sectionId: string, itemId: string, status: 'pass' | 'fail' | 'na') => void;
  }) => {
    const handleStatusClick = useCallback(
      (status: 'pass' | 'fail' | 'na') => {
        onStatusChange(item.sectionId, item.id, status);
      },
      [item.sectionId, item.id, onStatusChange]
    );

    return (
      <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
        {/* Item Header */}
        <div className="mb-4">
          <h4 className="font-medium text-gray-900 text-base leading-tight">{item.title}</h4>
          <span className="inline-block mt-2 px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded">
            {item.category}
          </span>
        </div>

        {/* Status Buttons - Using Design System */}
        <div className="grid grid-cols-3 gap-3">
          <ITPStatusButton
            status="pass"
            selected={item.status === 'pass'}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleStatusClick('pass');
            }}
            size="lg"
          />

          <ITPStatusButton
            status="fail"
            selected={item.status === 'fail'}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleStatusClick('fail');
            }}
            size="lg"
          />

          <ITPStatusButton
            status="na"
            selected={item.status === 'na'}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleStatusClick('na');
            }}
            size="lg"
          />
        </div>
      </div>
    );
  }
);

ItpItem.displayName = 'ItpItem';

export const OptimizedMobileItpCard = memo(function OptimizedMobileItpCard({
  itp,
  onStatusChange,
  onDeleteItp,
  onSubmitForReview,
}: OptimizedMobileItpCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const getStatusColor = useCallback((status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }, []);

  // Memoize ITP items extraction
  const itpItems = useMemo(() => {
    const items: any[] = [];

    if (itp.itp_templates?.structure) {
      const structure = itp.itp_templates.structure;

      // Handle sections-based template structure
      if (structure.sections && Array.isArray(structure.sections)) {
        structure.sections.forEach((section: any) => {
          if (section.items && Array.isArray(section.items)) {
            section.items.forEach((item: any) => {
              const itemData = {
                id: item.id,
                sectionId: section.id,
                title: item.title || item.name || 'Untitled Item',
                description: item.description,
                category: section.title || 'General',
                type: item.type || 'pass_fail',
                status: getItemStatus(section.id, item.id),
                required: item.required || false,
                fields: item.fields || [],
              };
              items.push(itemData);
            });
          }
        });
      }
      // Handle inspection_items array structure
      else if (structure.inspection_items && Array.isArray(structure.inspection_items)) {
        const defaultSectionId = 'inspection_items';
        structure.inspection_items.forEach((item: any) => {
          const itemData = {
            id: item.id,
            sectionId: defaultSectionId,
            title: item.title || item.name || item.description || `Item ${item.id}`,
            description: item.description,
            category: item.category || 'inspection',
            type: item.type || 'pass_fail',
            status: getItemStatus(defaultSectionId, item.id),
            required: item.required || false,
            fields: item.fields || [],
          };
          items.push(itemData);
        });
      }
      // Handle simple items array structure
      else if (structure.items && Array.isArray(structure.items)) {
        const defaultSectionId = 'default_section';
        structure.items.forEach((item: any) => {
          items.push({
            id: item.id,
            sectionId: defaultSectionId,
            title: item.title || item.label || `Item ${item.id}`,
            category: item.category || 'inspection',
            description: item.description,
            required: item.required || false,
            status: getItemStatus(defaultSectionId, item.id),
          });
        });
      }
    }

    // Fallback mock items if no structure
    if (items.length === 0) {
      const defaultSectionId = 'mock_section';
      return [
        {
          id: 'AS001',
          sectionId: defaultSectionId,
          title: 'Existing pavement surface cleaned and prepared',
          category: 'preparation',
          status: null,
        },
        {
          id: 'AS002',
          sectionId: defaultSectionId,
          title: 'Surface defects repaired',
          category: 'preparation',
          status: null,
        },
        {
          id: 'AS003',
          sectionId: defaultSectionId,
          title: 'Prime coat application rate (L/m²)',
          category: 'application',
          status: null,
        },
        {
          id: 'AS004',
          sectionId: defaultSectionId,
          title: 'Aggregate spread rate (m²/m³)',
          category: 'application',
          status: null,
        },
        {
          id: 'AS005',
          sectionId: defaultSectionId,
          title: 'Aggregate size and grading conformance',
          category: 'materials',
          status: null,
        },
      ];
    }

    return items;

    function getItemStatus(sectionId: string, itemId: string) {
      if (itp.data && typeof itp.data === 'object') {
        const sectionData = itp.data[sectionId];
        if (sectionData && typeof sectionData === 'object') {
          const itemData = sectionData[itemId];
          return itemData?.result || null;
        }
      }
      return null;
    }
  }, [itp]);

  const handleDelete = useCallback(() => {
    onDeleteItp?.(itp.id);
    setShowDeleteConfirm(false);
  }, [itp.id, onDeleteItp]);

  const handleSubmit = useCallback(() => {
    onSubmitForReview?.(itp.id);
  }, [itp.id, onSubmitForReview]);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-4">
      {/* Header - Always visible */}
      <div className="p-4 cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h3 className="font-medium text-gray-900 text-lg">{itp.name}</h3>
            {itp.description && <p className="text-sm text-gray-600 mt-1">{itp.description}</p>}
            <div className="flex items-center gap-3 mt-2">
              <span
                className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(itp.status)}`}
              >
                {itp.status?.charAt(0).toUpperCase() + itp.status?.slice(1) || 'Draft'}
              </span>
              {itp.completion_percentage !== undefined && (
                <span className="text-sm text-gray-500">{itp.completion_percentage}% complete</span>
              )}
            </div>
          </div>
          <div className="ml-4 flex items-center gap-2">
            {onDeleteItp && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDeleteConfirm(true);
                }}
                className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded"
                title="Delete ITP"
              >
                <Trash2 className="h-5 w-5" />
              </button>
            )}
            {isExpanded ? (
              <ChevronUp className="h-6 w-6 text-gray-400" />
            ) : (
              <ChevronDown className="h-6 w-6 text-gray-400" />
            )}
          </div>
        </div>
      </div>

      {/* Expandable Content */}
      {isExpanded && (
        <div className="border-t border-gray-200">
          <div className="p-4 space-y-4">
            {itpItems.map((item) => (
              <ItpItem key={item.id} item={item} onStatusChange={onStatusChange} />
            ))}
          </div>

          {/* Submit Section */}
          <div className="border-t border-gray-200 p-4">
            <button
              onClick={handleSubmit}
              className="w-full h-12 bg-blue-600 text-white rounded-lg font-medium text-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!onSubmitForReview}
            >
              Submit ITP for Review
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        title="Delete ITP"
        size="small"
      >
        <p className="text-gray-700">
          Are you sure you want to delete this ITP? This action cannot be undone.
        </p>
        <ModalFooter>
          <Button variant="secondary" onClick={() => setShowDeleteConfirm(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleDelete}>
            Delete
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
});
