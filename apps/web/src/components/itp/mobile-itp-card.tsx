'use client';

import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  XCircle,
  MinusCircle,
  Camera,
  MessageSquare,
  Trash2,
} from 'lucide-react';
import { PhotoUpload } from '@/components/photo/PhotoUpload';
import { SignatureCapture } from '@/components/signature/SignatureCapture';

interface MobileItpCardProps {
  itp: {
    id: string;
    name: string;
    description?: string;
    status: string;
    completion_percentage?: number;
    items?: any[];
    data?: any; // Include the JSONB data from database
    template_id?: string;
    itp_templates?: {
      id: string;
      name: string;
      description?: string;
      structure: any; // Template structure with inspection items
      organization_id: string;
    };
  };
  projectId?: string;
  onStatusChange: (sectionId: string, itemId: string, status: 'pass' | 'fail' | 'na') => void;
  onAddComment: (itemId: string, comment: string) => void;
  onAddPhoto: (itemId: string) => void;
  onDeleteItp?: (itpId: string) => void;
  onSubmitForReview?: (itpId: string) => void;
}

export function MobileItpCard({
  itp,
  projectId,
  onStatusChange,
  onAddComment,
  onAddPhoto,
  onDeleteItp,
  onSubmitForReview,
}: MobileItpCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeCommentItem, setActiveCommentItem] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  const [showPhotoUpload, setShowPhotoUpload] = useState<string | null>(null);
  const [showSignature, setShowSignature] = useState(false);

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleCommentSubmit = (itemId: string) => {
    if (commentText.trim()) {
      onAddComment(itemId, commentText.trim());
      setCommentText('');
      setActiveCommentItem(null);
    }
  };

  // Get inspection items from template structure, with status from section-based data
  const getItpItems = () => {
    console.log('🔍 getItpItems called for ITP:', itp.id);
    console.log('📋 ITP data:', {
      hasTemplates: !!(itp as any).itp_templates,
      hasStructure: !!(itp as any).itp_templates?.structure,
      hasData: !!itp.data,
      currentData: itp.data,
    });

    // Get inspection items from template structure
    if ((itp as any).itp_templates?.structure) {
      const structure = (itp as any).itp_templates.structure;
      let templateItems: any[] = [];

      console.log('📋 Template structure keys:', Object.keys(structure));

      // Handle sections-based template structure
      if (structure.sections && Array.isArray(structure.sections)) {
        console.log(`📑 Found ${structure.sections.length} sections`);

        structure.sections.forEach((section: any) => {
          console.log(`📄 Processing section: ${section.id} - ${section.title}`);

          if (section.items && Array.isArray(section.items)) {
            console.log(`  ➤ Section has ${section.items.length} items`);

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

              console.log(
                `    • Item: ${item.id} - ${itemData.title} (status: ${itemData.status})`
              );
              templateItems.push(itemData);
            });
          }
        });
      }

      // Handle inspection_items array structure (like the current template)
      else if (structure.inspection_items && Array.isArray(structure.inspection_items)) {
        console.log(`📑 Found ${structure.inspection_items.length} inspection items`);
        const defaultSectionId = 'inspection_items';

        templateItems = structure.inspection_items.map((item: any) => {
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

          console.log(`    • Item: ${item.id} - ${itemData.title} (status: ${itemData.status})`);
          return itemData;
        });
      }

      // Handle simple items array structure (create a default section)
      else if (structure.items && Array.isArray(structure.items)) {
        console.log(`📑 Found ${structure.items.length} items`);
        const defaultSectionId = 'default_section';
        templateItems = structure.items.map((item: any) => ({
          id: item.id,
          sectionId: defaultSectionId, // ✅ Include section context
          title: item.title || item.label || `Item ${item.id}`,
          category: item.category || 'inspection',
          description: item.description,
          required: item.required || false,
          status: getItemStatus(defaultSectionId, item.id),
        }));
      }

      console.log(`✅ Total items extracted: ${templateItems.length}`);
      return templateItems;
    }

    console.log('❌ No template structure found, returning empty array');

    // Fallback: use mock items for demonstration (but include sectionId!)
    console.log('🔧 Using mock items - no template structure found');
    const defaultSectionId = 'mock_section';
    return [
      {
        id: 'AS001',
        sectionId: defaultSectionId, // ✅ Add missing sectionId
        title: 'Existing pavement surface cleaned and prepared',
        category: 'preparation',
        status: null,
      },
      {
        id: 'AS002',
        sectionId: defaultSectionId, // ✅ Add missing sectionId
        title: 'Surface defects repaired',
        category: 'preparation',
        status: null,
      },
      {
        id: 'AS003',
        sectionId: defaultSectionId, // ✅ Add missing sectionId
        title: 'Prime coat application rate (L/m²)',
        category: 'application',
        status: null,
      },
      {
        id: 'AS004',
        sectionId: defaultSectionId, // ✅ Add missing sectionId
        title: 'Aggregate spread rate (m²/m³)',
        category: 'application',
        status: null,
      },
      {
        id: 'AS005',
        sectionId: defaultSectionId, // ✅ Add missing sectionId
        title: 'Aggregate size and grading conformance',
        category: 'materials',
        status: null,
      },
    ];
  };

  // Helper function to get item status from section-based data structure
  const getItemStatus = (sectionId: string, itemId: string) => {
    if (itp.data && typeof itp.data === 'object') {
      const sectionData = itp.data[sectionId];
      if (sectionData && typeof sectionData === 'object') {
        const itemData = sectionData[itemId];
        return itemData?.result || null;
      }
    }
    return null;
  };

  const itpItems = getItpItems();

  // Calculate status counts
  const statusCounts = itpItems.reduce(
    (acc, item) => {
      if (item.status === 'pass') acc.pass++;
      else if (item.status === 'fail') acc.fail++;
      else if (item.status === 'na') acc.na++;
      else acc.pending++;
      return acc;
    },
    { pass: 0, fail: 0, na: 0, pending: 0 }
  );

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
            {/* Status Summary */}
            <div className="flex items-center gap-3 mt-2 text-sm">
              <span className="flex items-center gap-1 text-green-600">
                <CheckCircle2 className="h-4 w-4" />
                {statusCounts.pass}
              </span>
              <span className="flex items-center gap-1 text-red-600">
                <XCircle className="h-4 w-4" />
                {statusCounts.fail}
              </span>
              <span className="flex items-center gap-1 text-gray-600">
                <MinusCircle className="h-4 w-4" />
                {statusCounts.na}
              </span>
            </div>
          </div>
          <div className="ml-4 flex items-center gap-2">
            {onDeleteItp && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (
                    confirm(
                      'Are you sure you want to delete this ITP? This action cannot be undone.'
                    )
                  ) {
                    onDeleteItp(itp.id);
                  }
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
              <div key={item.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                {/* Item Header */}
                <div className="mb-4">
                  <h4 className="font-medium text-gray-900 text-base leading-tight">
                    {item.title}
                  </h4>
                  <span className="inline-block mt-2 px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded">
                    {item.category}
                  </span>
                </div>

                {/* Large Touch-Friendly Buttons */}
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      console.log('🟢 PASS button clicked');
                      console.log('  Section ID:', item.sectionId);
                      console.log('  Item ID:', item.id);
                      console.log('  Current status:', item.status);
                      onStatusChange(item.sectionId, item.id, 'pass');
                    }}
                    className={`h-16 rounded-lg border-2 transition-all flex flex-col items-center justify-center ${
                      item.status === 'pass'
                        ? 'bg-green-500 border-green-500 text-white shadow-lg'
                        : 'bg-white border-green-200 text-green-600 hover:bg-green-50'
                    }`}
                  >
                    <CheckCircle2 className="h-6 w-6 mb-1" />
                    <span className="text-sm font-medium">PASS</span>
                  </button>

                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      console.log('🔴 FAIL button clicked');
                      console.log('  Section ID:', item.sectionId);
                      console.log('  Item ID:', item.id);
                      console.log('  Current status:', item.status);
                      onStatusChange(item.sectionId, item.id, 'fail');
                    }}
                    className={`h-16 rounded-lg border-2 transition-all flex flex-col items-center justify-center ${
                      item.status === 'fail'
                        ? 'bg-red-500 border-red-500 text-white shadow-lg'
                        : 'bg-white border-red-200 text-red-600 hover:bg-red-50'
                    }`}
                  >
                    <XCircle className="h-6 w-6 mb-1" />
                    <span className="text-sm font-medium">FAIL</span>
                  </button>

                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      console.log('⚪ N/A button clicked');
                      console.log('  Section ID:', item.sectionId);
                      console.log('  Item ID:', item.id);
                      console.log('  Current status:', item.status);
                      onStatusChange(item.sectionId, item.id, 'na');
                    }}
                    className={`h-16 rounded-lg border-2 transition-all flex flex-col items-center justify-center ${
                      item.status === 'na'
                        ? 'bg-gray-500 border-gray-500 text-white shadow-lg'
                        : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <MinusCircle className="h-6 w-6 mb-1" />
                    <span className="text-sm font-medium">N/A</span>
                  </button>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={() =>
                      setActiveCommentItem(activeCommentItem === item.id ? null : item.id)
                    }
                    className="flex-1 h-10 bg-white border border-gray-300 rounded-lg flex items-center justify-center text-gray-700 hover:bg-gray-50"
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    <span className="text-sm">Comment</span>
                  </button>

                  <button
                    onClick={() => setShowPhotoUpload(showPhotoUpload === item.id ? null : item.id)}
                    className="flex-1 h-10 bg-white border border-gray-300 rounded-lg flex items-center justify-center text-gray-700 hover:bg-gray-50"
                  >
                    <Camera className="h-4 w-4 mr-2" />
                    <span className="text-sm">Photo</span>
                  </button>
                </div>

                {/* Comment Input */}
                {activeCommentItem === item.id && (
                  <div className="mt-3 p-3 bg-white rounded-lg border border-gray-200">
                    <textarea
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      placeholder="Add a comment..."
                      rows={3}
                      className="w-full p-2 border border-gray-300 rounded text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={() => handleCommentSubmit(item.id)}
                        disabled={!commentText.trim()}
                        className="px-4 py-2 bg-blue-600 text-white rounded text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Add Comment
                      </button>
                      <button
                        onClick={() => {
                          setActiveCommentItem(null);
                          setCommentText('');
                        }}
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded text-sm font-medium"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* Photo Upload */}
                {showPhotoUpload === item.id && (
                  <div className="mt-3 p-3 bg-white rounded-lg border border-gray-200">
                    <PhotoUpload
                      onUpload={async (files) => {
                        const formData = new FormData();
                        formData.append('project_id', projectId || '');
                        formData.append('item_id', item.id);
                        formData.append('item_type', 'itp');

                        files.forEach((file) => {
                          formData.append('photos', file);
                        });

                        const response = await fetch('/api/photos/upload', {
                          method: 'POST',
                          body: formData,
                        });

                        if (response.ok) {
                          await onAddPhoto(item.id);
                          setShowPhotoUpload(null);
                        }
                      }}
                      maxFiles={5}
                      compress={true}
                      projectId={projectId}
                      itemId={item.id}
                      itemType="itp"
                    />
                    <button
                      onClick={() => setShowPhotoUpload(null)}
                      className="mt-2 text-sm text-gray-500 hover:text-gray-700"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Submit Section with Signature */}
          <div className="border-t border-gray-200 p-4">
            {!showSignature ? (
              <button
                onClick={() => setShowSignature(true)}
                className="w-full h-12 bg-blue-600 text-white rounded-lg font-medium text-lg hover:bg-blue-700 transition-colors"
              >
                Sign & Submit ITP for Review
              </button>
            ) : (
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">Sign to Submit</h3>
                <SignatureCapture
                  onSave={async (signature) => {
                    // Save signature and submit
                    console.log('Signature captured:', signature);
                    await onSubmitForReview?.(itp.id);
                    setShowSignature(false);
                  }}
                  onCancel={() => setShowSignature(false)}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
