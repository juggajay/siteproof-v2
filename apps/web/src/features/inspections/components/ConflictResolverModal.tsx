'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  GitBranch,
  Server,
  Smartphone,
  AlertTriangle,
  Check,
} from 'lucide-react';
import { Button } from '@siteproof/design-system';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import type { SyncConflict } from '@siteproof/database';
import { db } from '../offline/db';

interface ConflictResolverModalProps {
  conflict: SyncConflict | null;
  isOpen: boolean;
  onClose: () => void;
  onResolve: (resolution: 'server_wins' | 'client_wins' | 'merged') => void;
}

export function ConflictResolverModal({
  conflict,
  isOpen,
  onClose,
  onResolve,
}: ConflictResolverModalProps) {
  const focusTrapRef = useFocusTrap(isOpen);
  const [selectedResolution, setSelectedResolution] = useState<
    'server_wins' | 'client_wins' | 'merged' | null
  >(null);
  const [mergedData, setMergedData] = useState<any>(null);
  const [isResolving, setIsResolving] = useState(false);

  if (!isOpen || !conflict) return null;

  const handleResolve = async () => {
    if (!selectedResolution) return;

    setIsResolving(true);
    try {
      // Update conflict record
      await db.conflicts.update(conflict.id, {
        resolved: true,
        resolved_at: new Date().toISOString(),
        resolved_by: 'current-user-id', // TODO: Get from auth context
        resolution: selectedResolution,
        merged_data: selectedResolution === 'merged' ? mergedData : null,
      });

      // Update inspection based on resolution
      const dataToUse =
        selectedResolution === 'server_wins'
          ? conflict.server_data
          : selectedResolution === 'client_wins'
          ? conflict.client_data
          : mergedData;

      await db.inspections.update(conflict.inspection_id, {
        data: dataToUse,
        _syncStatus: 'pending', // Mark for re-sync
        _isDirty: true,
      });

      onResolve(selectedResolution);
      onClose();
    } catch (error) {
      console.error('Failed to resolve conflict:', error);
    } finally {
      setIsResolving(false);
    }
  };

  const renderDataComparison = () => {
    const serverKeys = Object.keys(conflict.server_data);
    const clientKeys = Object.keys(conflict.client_data);
    const allKeys = Array.from(new Set([...serverKeys, ...clientKeys]));

    return (
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {allKeys.map((key) => {
          const serverValue = conflict.server_data[key];
          const clientValue = conflict.client_data[key];
          const hasConflict = JSON.stringify(serverValue) !== JSON.stringify(clientValue);

          if (!hasConflict) return null;

          return (
            <div key={key} className="border rounded-lg p-3">
              <h5 className="font-medium text-sm text-gray-700 mb-2">{key}</h5>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="flex items-center gap-1 text-gray-600 mb-1">
                    <Server className="w-3 h-3" />
                    <span>Server</span>
                  </div>
                  <div className="p-2 bg-blue-50 rounded">
                    {JSON.stringify(serverValue, null, 2)}
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-1 text-gray-600 mb-1">
                    <Smartphone className="w-3 h-3" />
                    <span>Local</span>
                  </div>
                  <div className="p-2 bg-green-50 rounded">
                    {JSON.stringify(clientValue, null, 2)}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

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
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <GitBranch className="w-5 h-5 text-yellow-700" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    Resolve Sync Conflict
                  </h2>
                  <p className="text-sm text-gray-500">
                    Choose how to resolve data conflicts
                  </p>
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
            <div className="px-6 py-4">
              {/* Warning */}
              <div className="mb-6 p-4 bg-yellow-50 rounded-lg flex gap-3">
                <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-yellow-800">
                    This inspection has been modified both locally and on the server.
                    Review the changes below and choose how to resolve the conflict.
                  </p>
                  <p className="text-sm text-yellow-700 mt-1">
                    Detected at: {new Date(conflict.detected_at).toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Data Comparison */}
              <div className="mb-6">
                <h3 className="font-medium text-gray-900 mb-3">Conflicting Fields</h3>
                {renderDataComparison()}
              </div>

              {/* Resolution Options */}
              <div className="space-y-3">
                <h3 className="font-medium text-gray-900 mb-3">Choose Resolution</h3>
                
                <label className="flex items-start gap-3 p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
                  <input
                    type="radio"
                    name="resolution"
                    value="server_wins"
                    checked={selectedResolution === 'server_wins'}
                    onChange={(e) => setSelectedResolution('server_wins')}
                    className="mt-1"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <Server className="w-4 h-4 text-blue-600" />
                      <span className="font-medium">Use Server Version</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      Discard local changes and use the version from the server
                    </p>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
                  <input
                    type="radio"
                    name="resolution"
                    value="client_wins"
                    checked={selectedResolution === 'client_wins'}
                    onChange={(e) => setSelectedResolution('client_wins')}
                    className="mt-1"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <Smartphone className="w-4 h-4 text-green-600" />
                      <span className="font-medium">Use Local Version</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      Keep your local changes and overwrite the server version
                    </p>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-4 border rounded-lg hover:bg-gray-50 cursor-pointer opacity-50">
                  <input
                    type="radio"
                    name="resolution"
                    value="merged"
                    disabled
                    className="mt-1"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <GitBranch className="w-4 h-4 text-purple-600" />
                      <span className="font-medium">Manual Merge</span>
                      <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded">Coming Soon</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      Manually merge changes from both versions
                    </p>
                  </div>
                </label>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t">
              <Button variant="ghost" onClick={onClose}>
                Cancel
              </Button>
              <Button
                onClick={handleResolve}
                loading={isResolving}
                disabled={!selectedResolution}
              >
                <Check className="w-4 h-4 mr-1" />
                Apply Resolution
              </Button>
            </div>
          </motion.div>
        </div>
      </div>
    </AnimatePresence>
  );
}