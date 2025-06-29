'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Cloud,
  CloudOff,
  Loader2,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@siteproof/design-system';
import { useInspectionSync } from '../hooks/useInspectionSync';
import { db } from '../offline/db';

interface SyncStatus {
  isOnline: boolean;
  unsyncedCount: number;
  pendingUploads: number;
  lastSyncTime: Date | null;
  hasConflicts: boolean;
}

export function SyncStatusIndicator() {
  const { syncAll, isSyncing, syncError } = useInspectionSync();
  const [status, setStatus] = useState<SyncStatus>({
    isOnline: true,
    unsyncedCount: 0,
    pendingUploads: 0,
    lastSyncTime: null,
    hasConflicts: false,
  });
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    // Monitor online status
    const updateOnlineStatus = () => {
      setStatus(prev => ({ ...prev, isOnline: navigator.onLine }));
    };

    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    // Initial check
    updateOnlineStatus();

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
    };
  }, []);

  useEffect(() => {
    // Monitor sync status
    const checkSyncStatus = async () => {
      const unsynced = await db.getUnsyncedInspections();
      const pendingUploads = await db.getPendingUploads();
      const conflicts = await db.conflicts
        .where('resolved')
        .equals(0)  // Use 0 for false in Dexie
        .count();

      setStatus(prev => ({
        ...prev,
        unsyncedCount: unsynced.length,
        pendingUploads: pendingUploads.length,
        hasConflicts: conflicts > 0,
      }));
    };

    // Check initially and periodically
    checkSyncStatus();
    const interval = setInterval(checkSyncStatus, 5000);

    return () => clearInterval(interval);
  }, []);

  // Auto-sync when coming back online
  useEffect(() => {
    if (status.isOnline && status.unsyncedCount > 0 && !isSyncing) {
      syncAll();
    }
  }, [status.isOnline, status.unsyncedCount, syncAll, isSyncing]);

  const getSyncIcon = () => {
    if (!status.isOnline) {
      return <CloudOff className="w-5 h-5 text-gray-500" />;
    }
    if (isSyncing) {
      return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
    }
    if (status.hasConflicts) {
      return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
    }
    if (status.unsyncedCount > 0 || status.pendingUploads > 0) {
      return <Cloud className="w-5 h-5 text-orange-500" />;
    }
    return <CheckCircle className="w-5 h-5 text-green-500" />;
  };

  const getSyncStatus = () => {
    if (!status.isOnline) {
      return 'Offline';
    }
    if (isSyncing) {
      return 'Syncing...';
    }
    if (status.hasConflicts) {
      return 'Conflicts';
    }
    if (status.unsyncedCount > 0 || status.pendingUploads > 0) {
      return `${status.unsyncedCount + status.pendingUploads} pending`;
    }
    return 'Synced';
  };

  const getStatusColor = () => {
    if (!status.isOnline) return 'bg-gray-100';
    if (isSyncing) return 'bg-blue-100';
    if (status.hasConflicts) return 'bg-yellow-100';
    if (status.unsyncedCount > 0 || status.pendingUploads > 0) return 'bg-orange-100';
    return 'bg-green-100';
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`
          flex items-center gap-2 px-3 py-2 rounded-lg transition-colors
          ${getStatusColor()} hover:opacity-90
        `}
      >
        {getSyncIcon()}
        <span className="text-sm font-medium">{getSyncStatus()}</span>
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 p-4 z-50"
          >
            <h3 className="font-semibold text-gray-900 mb-3">Sync Status</h3>
            
            <div className="space-y-3">
              {/* Connection Status */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Connection</span>
                <span className="flex items-center gap-1 text-sm">
                  {status.isOnline ? (
                    <>
                      <div className="w-2 h-2 bg-green-500 rounded-full" />
                      Online
                    </>
                  ) : (
                    <>
                      <div className="w-2 h-2 bg-gray-500 rounded-full" />
                      Offline
                    </>
                  )}
                </span>
              </div>

              {/* Unsynced Items */}
              {(status.unsyncedCount > 0 || status.pendingUploads > 0) && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Pending Sync</span>
                  <span className="text-sm font-medium">
                    {status.unsyncedCount} inspections, {status.pendingUploads} files
                  </span>
                </div>
              )}

              {/* Conflicts */}
              {status.hasConflicts && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Conflicts</span>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      // Navigate to conflict resolver
                      window.location.href = '/dashboard/inspections/conflicts';
                    }}
                  >
                    Resolve
                  </Button>
                </div>
              )}

              {/* Last Sync */}
              {status.lastSyncTime && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Last Sync</span>
                  <span className="text-sm">
                    {status.lastSyncTime.toLocaleTimeString()}
                  </span>
                </div>
              )}

              {/* Sync Error */}
              {syncError && (
                <div className="p-3 bg-red-50 rounded-lg">
                  <p className="text-sm text-red-800">
                    Sync failed: {syncError.message}
                  </p>
                </div>
              )}

              {/* Manual Sync Button */}
              <div className="pt-3 border-t">
                <Button
                  variant="secondary"
                  size="sm"
                  fullWidth
                  onClick={() => syncAll()}
                  loading={isSyncing}
                  disabled={!status.isOnline}
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Sync Now
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}