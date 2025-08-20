'use client';

import React, { useState, useEffect } from 'react';
import {
  CheckSquare,
  XSquare,
  MinusSquare,
  RotateCcw,
  CheckCircle,
  XCircle,
  Loader2,
  Filter,
  ChevronDown,
} from 'lucide-react';
import { Button } from '@siteproof/design-system';
import { toast } from 'sonner';

interface BulkOperationsProps {
  itpId: string;
  items: Array<{
    id: string;
    title: string;
    status: 'pass' | 'fail' | 'na' | 'pending';
    category: string;
    sectionId: string;
  }>;
  onUpdate: () => void;
  projectId: string;
  lotId: string;
}

export function BulkOperations({ itpId, items, onUpdate, projectId, lotId }: BulkOperationsProps) {
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [isProcessing, setIsProcessing] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [selectAll, setSelectAll] = useState(false);

  // Get unique categories
  const categories = Array.from(new Set(items.map((item) => item.category)));

  // Filter items based on selected filters
  const filteredItems = items.filter((item) => {
    const categoryMatch = filterCategory === 'all' || item.category === filterCategory;
    const statusMatch = filterStatus === 'all' || item.status === filterStatus;
    return categoryMatch && statusMatch;
  });

  // Handle select all
  useEffect(() => {
    if (selectAll) {
      setSelectedItems(new Set(filteredItems.map((item) => item.id)));
    } else if (selectedItems.size === filteredItems.length && filteredItems.length > 0) {
      // If all filtered items are selected and user unchecks, clear selection
      setSelectedItems(new Set());
    }
  }, [selectAll, filterCategory, filterStatus]);

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedItems(new Set());
      setSelectAll(false);
    } else {
      setSelectedItems(new Set(filteredItems.map((item) => item.id)));
      setSelectAll(true);
    }
  };

  const handleItemSelect = (itemId: string) => {
    const newSelection = new Set(selectedItems);
    if (newSelection.has(itemId)) {
      newSelection.delete(itemId);
    } else {
      newSelection.add(itemId);
    }
    setSelectedItems(newSelection);

    // Update select all checkbox state
    setSelectAll(newSelection.size === filteredItems.length && filteredItems.length > 0);
  };

  const handleBulkStatusUpdate = async (status: 'pass' | 'fail' | 'na') => {
    if (selectedItems.size === 0) {
      toast.error('No items selected');
      return;
    }

    setIsProcessing(true);

    try {
      // Group items by section for batch update
      const itemsBySection = new Map<string, string[]>();
      selectedItems.forEach((itemId) => {
        const item = items.find((i) => i.id === itemId);
        if (item) {
          if (!itemsBySection.has(item.sectionId)) {
            itemsBySection.set(item.sectionId, []);
          }
          itemsBySection.get(item.sectionId)?.push(itemId);
        }
      });

      // Perform bulk update
      const updates = Array.from(itemsBySection.entries()).map(async ([sectionId, itemIds]) => {
        const response = await fetch(
          `/api/projects/${projectId}/lots/${lotId}/itp/${itpId}/bulk-update`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sectionId,
              itemIds,
              status,
              timestamp: new Date().toISOString(),
            }),
          }
        );

        if (!response.ok) {
          throw new Error(`Failed to update section ${sectionId}`);
        }

        return response.json();
      });

      await Promise.all(updates);

      toast.success(
        `Updated ${selectedItems.size} item${selectedItems.size > 1 ? 's' : ''} to ${status.toUpperCase()}`
      );

      // Clear selection
      setSelectedItems(new Set());
      setSelectAll(false);

      // Trigger parent update
      onUpdate();
    } catch (error) {
      console.error('Bulk update failed:', error);
      toast.error('Failed to update items. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleResetSelection = () => {
    handleBulkStatusUpdate('pending' as any);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pass':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'fail':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'na':
        return <MinusSquare className="w-4 h-4 text-gray-500" />;
      default:
        return <div className="w-4 h-4 rounded-full border-2 border-gray-300" />;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold">Bulk Operations</h3>
          <span className="text-sm text-gray-500">
            {selectedItems.size} of {filteredItems.length} selected
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => handleBulkStatusUpdate('pass')}
            disabled={selectedItems.size === 0 || isProcessing}
          >
            {isProcessing ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <CheckSquare className="w-4 h-4 mr-2" />
            )}
            Mark as Pass
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => handleBulkStatusUpdate('fail')}
            disabled={selectedItems.size === 0 || isProcessing}
          >
            <XSquare className="w-4 h-4 mr-2" />
            Mark as Fail
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => handleBulkStatusUpdate('na')}
            disabled={selectedItems.size === 0 || isProcessing}
          >
            <MinusSquare className="w-4 h-4 mr-2" />
            Mark as N/A
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleResetSelection}
            disabled={selectedItems.size === 0 || isProcessing}
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset
          </Button>

          <Button variant="ghost" size="sm" onClick={() => setShowFilters(!showFilters)}>
            <Filter className="w-4 h-4 mr-2" />
            Filter
            <ChevronDown
              className={`w-4 h-4 ml-1 transition-transform ${showFilters ? 'rotate-180' : ''}`}
            />
          </Button>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="mt-3 pt-3 border-t border-gray-200 flex flex-wrap gap-3">
            <div>
              <label className="block text-xs text-gray-600 mb-1">Category</label>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="px-3 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs text-gray-600 mb-1">Status</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="pass">Pass</option>
                <option value="fail">Fail</option>
                <option value="na">N/A</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Items List */}
      <div className="max-h-96 overflow-y-auto">
        {/* Select All */}
        <label className="flex items-center p-3 hover:bg-gray-50 border-b border-gray-100 cursor-pointer">
          <input
            type="checkbox"
            checked={selectAll}
            onChange={handleSelectAll}
            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
          />
          <span className="ml-3 text-sm font-medium">
            Select All ({filteredItems.length} items)
          </span>
        </label>

        {/* Items */}
        {filteredItems.map((item) => (
          <label
            key={item.id}
            className="flex items-center p-3 hover:bg-gray-50 border-b border-gray-100 cursor-pointer"
          >
            <input
              type="checkbox"
              checked={selectedItems.has(item.id)}
              onChange={() => handleItemSelect(item.id)}
              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
            />
            <div className="ml-3 flex-1">
              <p className="text-sm font-medium text-gray-900">{item.title}</p>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-xs text-gray-500">{item.category}</span>
                <div className="flex items-center gap-1">
                  {getStatusIcon(item.status)}
                  <span className="text-xs text-gray-600 capitalize">{item.status}</span>
                </div>
              </div>
            </div>
          </label>
        ))}

        {filteredItems.length === 0 && (
          <div className="p-8 text-center text-gray-500">
            <p>No items match the selected filters</p>
          </div>
        )}
      </div>

      {/* Footer */}
      {selectedItems.size > 0 && (
        <div className="p-3 bg-blue-50 border-t border-blue-200">
          <p className="text-sm text-blue-700">
            {selectedItems.size} item{selectedItems.size > 1 ? 's' : ''} selected for bulk action
          </p>
        </div>
      )}
    </div>
  );
}
