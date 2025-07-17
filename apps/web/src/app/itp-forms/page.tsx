'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@siteproof/design-system';
import { FileText, Download, Wifi, WifiOff } from 'lucide-react';
import { FORM_TYPE_LABELS } from '@/features/itp-forms/types/form.types';
import { offlineStorage } from '@/features/itp-forms/utils/offline-storage';
import { syncService } from '@/features/itp-forms/utils/sync-service';
import { pdfGenerator } from '@/features/itp-forms/utils/pdf-generator';

export default function ITPFormsPage() {
  const router = useRouter();
  const [isOnline, setIsOnline] = useState(typeof window !== 'undefined' ? navigator.onLine : true);
  const [forms, setForms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Monitor online status
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Start auto-sync
    syncService.startAutoSync();
    
    // Load forms
    loadForms();
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      syncService.stopAutoSync();
    };
  }, []);

  const loadForms = async () => {
    try {
      const localForms = await offlineStorage.getAllForms();
      setForms(localForms);
    } catch (error) {
      console.error('Error loading forms:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNewForm = (formType: string) => {
    router.push(`/itp-forms/new?type=${formType}`);
  };

  const handleDownloadPDF = async (form: any) => {
    await pdfGenerator.downloadPDF(form);
  };

  const formTypes = Object.entries(FORM_TYPE_LABELS);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">ITP Forms</h1>
          <p className="text-gray-600 mt-2">
            Create and manage inspection test plans
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            {isOnline ? (
              <>
                <Wifi className="h-5 w-5 text-green-600" />
                <span className="text-sm text-green-600">Online</span>
              </>
            ) : (
              <>
                <WifiOff className="h-5 w-5 text-red-600" />
                <span className="text-sm text-red-600">Offline</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Form Types Grid */}
      <div className="mb-12">
        <h2 className="text-xl font-semibold mb-4">Create New Form</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {formTypes.map(([type, label]) => (
            <button
              key={type}
              onClick={() => handleNewForm(type)}
              className="p-4 border rounded-lg hover:bg-gray-50 transition-colors text-left"
            >
              <FileText className="h-8 w-8 text-blue-600 mb-2" />
              <h3 className="font-medium text-gray-900">{label}</h3>
              <p className="text-sm text-gray-600 mt-1">
                Create new {label.toLowerCase()} form
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Recent Forms */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Recent Forms</h2>
        {loading ? (
          <div className="text-center py-8">
            <p className="text-gray-600">Loading forms...</p>
          </div>
        ) : forms.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 rounded-lg">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600">No forms created yet</p>
            <p className="text-sm text-gray-500 mt-1">
              Create your first form using the options above
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {forms.map((form) => (
              <div
                key={form.localId}
                className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium text-gray-900">
                      {FORM_TYPE_LABELS[form.formType]}
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Inspector: {form.inspectorName} • 
                      Date: {new Date(form.inspectionDate).toLocaleDateString()}
                    </p>
                    <div className="flex items-center gap-3 mt-2">
                      <span className={`text-sm px-2 py-1 rounded-full ${
                        form.inspectionStatus === 'approved' 
                          ? 'bg-green-100 text-green-800'
                          : form.inspectionStatus === 'rejected'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {form.inspectionStatus}
                      </span>
                      {form.syncStatus === 'pending' && (
                        <span className="text-sm text-gray-500">
                          Pending sync
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDownloadPDF(form)}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}