'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Edit,
  Download,
  MoreVertical,
  Clock,
  User,
  MapPin,
  Calendar,
  MessageSquare,
  Paperclip,
  TrendingUp,
  CheckCircle,
  XCircle,
  DollarSign,
  Tag,
  Camera,
  FileText,
  Send,
} from 'lucide-react';
import { Button, StateDisplay } from '@siteproof/design-system';
import { useNcr, useNcrActions } from '@/features/ncr/hooks/useNcr';
import { NcrStatusBadge } from '@/features/ncr/components/NcrStatusBadge';
import { NcrSeverityBadge } from '@/features/ncr/components/NcrSeverityBadge';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow, format } from 'date-fns';
import { toast } from 'sonner';
import Link from 'next/link';
import type { NCRComment, NCRHistory } from '@siteproof/database';

export default function NCRDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const ncrId = params?.id as string;

  const [activeTab, setActiveTab] = useState<'details' | 'comments' | 'history' | 'costs'>(
    'details'
  );
  const [showActionModal, setShowActionModal] = useState<string | null>(null);
  const [actionFormData, setActionFormData] = useState<any>({});
  const [commentText, setCommentText] = useState('');
  const [isInternalComment, setIsInternalComment] = useState(false);

  // Fetch NCR details
  const { data: ncr, isLoading, error, refetch } = useNcr(ncrId);

  // Fetch current user
  const { data: currentUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: async () => {
      const response = await fetch('/api/auth/me');
      if (!response.ok) {
        return { id: 'temp-user', email: 'user@example.com', full_name: 'Current User' };
      }
      return response.json();
    },
  });

  // Fetch comments
  const { data: comments } = useQuery({
    queryKey: ['ncr-comments', ncrId],
    queryFn: async () => {
      const response = await fetch(`/api/ncrs/${ncrId}/comments`);
      if (!response.ok) throw new Error('Failed to fetch comments');
      return response.json();
    },
  });

  // Fetch history
  const { data: history } = useQuery({
    queryKey: ['ncr-history', ncrId],
    queryFn: async () => {
      const response = await fetch(`/api/ncrs/${ncrId}/history`);
      if (!response.ok) throw new Error('Failed to fetch history');
      return response.json();
    },
  });

  // NCR actions
  const actions = useNcrActions(ncrId);

  // Add comment mutation
  const addComment = useMutation({
    mutationFn: async (data: { content: string; is_internal: boolean }) => {
      const response = await fetch(`/api/ncrs/${ncrId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to add comment');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ncr-comments', ncrId] });
      setCommentText('');
      toast.success('Comment added');
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !ncr) {
    return (
      <StateDisplay
        error={error}
        onRetry={refetch}
        emptyTitle="NCR not found"
        emptyDescription="The NCR you're looking for doesn't exist or has been deleted."
      >
        <div />
      </StateDisplay>
    );
  }

  // Determine user's role in this NCR
  const isRaisedBy = ncr.raised_by === currentUser?.id;
  const isAssignedTo = ncr.assigned_to === currentUser?.id;
  const canEdit = isRaisedBy && ncr.status === 'open';
  const canPerformActions = isRaisedBy || isAssignedTo;

  // Get available actions based on status and role
  const getAvailableActions = () => {
    const actions = [];

    if (ncr.status === 'open' && isAssignedTo) {
      actions.push({
        id: 'acknowledge',
        label: 'Acknowledge',
        icon: CheckCircle,
        variant: 'primary',
      });
    }
    if (ncr.status === 'acknowledged' && isAssignedTo) {
      actions.push({ id: 'start_work', label: 'Start Work', icon: TrendingUp, variant: 'primary' });
    }
    if (ncr.status === 'in_progress' && isAssignedTo) {
      actions.push({
        id: 'resolve',
        label: 'Mark Resolved',
        icon: CheckCircle,
        variant: 'success',
      });
    }
    if (ncr.status === 'resolved' && isRaisedBy) {
      actions.push({
        id: 'verify',
        label: 'Verify & Close',
        icon: CheckCircle,
        variant: 'success',
      });
      actions.push({ id: 'reopen', label: 'Reopen', icon: XCircle, variant: 'danger' });
    }
    if (['open', 'acknowledged', 'in_progress'].includes(ncr.status) && isAssignedTo) {
      actions.push({ id: 'dispute', label: 'Dispute', icon: XCircle, variant: 'danger' });
    }

    return actions;
  };

  const handleAction = async (actionId: string) => {
    if (actionId === 'acknowledge') {
      actions.acknowledge();
    } else if (actionId === 'start_work') {
      actions.startWork();
    } else if (actionId === 'resolve') {
      setShowActionModal('resolve');
    } else if (actionId === 'verify') {
      setShowActionModal('verify');
    } else if (actionId === 'dispute') {
      setShowActionModal('dispute');
    } else if (actionId === 'reopen') {
      setShowActionModal('reopen');
    }
  };

  const submitActionForm = (actionId: string) => {
    if (actionId === 'resolve') {
      actions.resolve(actionFormData);
    } else if (actionId === 'verify') {
      actions.verify(actionFormData);
    } else if (actionId === 'dispute') {
      actions.dispute(actionFormData);
    } else if (actionId === 'reopen') {
      actions.reopen(actionFormData);
    }
    setShowActionModal(null);
    setActionFormData({});
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <Link href="/dashboard/ncrs">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to NCRs
                </Button>
              </Link>
              <h1 className="text-2xl font-bold text-gray-900">{ncr.ncr_number}</h1>
              <NcrStatusBadge status={ncr.status} />
              <NcrSeverityBadge severity={ncr.severity} />
            </div>

            <div className="flex items-center gap-3">
              {canEdit && (
                <Button
                  variant="secondary"
                  onClick={() => router.push(`/dashboard/ncrs/${ncrId}/edit`)}
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Edit
                </Button>
              )}
              <Button variant="secondary">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
              <Button variant="ghost" size="sm">
                <MoreVertical className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* Quick Info Bar */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              <div>
                <p className="text-xs text-gray-500">Project</p>
                <p className="font-medium text-sm">{ncr.project?.name || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Raised By</p>
                <p className="font-medium text-sm flex items-center gap-1">
                  <User className="w-3 h-3" />
                  {ncr.raisedBy?.full_name || 'Unknown'}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Assigned To</p>
                <p className="font-medium text-sm flex items-center gap-1">
                  <User className="w-3 h-3" />
                  {ncr.assignedTo?.full_name || 'Unassigned'}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Due Date</p>
                <p className="font-medium text-sm flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {ncr.due_date ? format(new Date(ncr.due_date), 'PP') : 'No due date'}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Location</p>
                <p className="font-medium text-sm flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {ncr.location || 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Created</p>
                <p className="font-medium text-sm">
                  {formatDistanceToNow(new Date(ncr.created_at), { addSuffix: true })}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        {canPerformActions && getAvailableActions().length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-yellow-800 mb-3">Available Actions:</p>
            <div className="flex flex-wrap gap-3">
              {getAvailableActions().map((action) => {
                const Icon = action.icon;
                return (
                  <Button
                    key={action.id}
                    variant={action.variant as any}
                    onClick={() => handleAction(action.id)}
                    loading={actions.isLoading}
                  >
                    <Icon className="w-4 h-4 mr-2" />
                    {action.label}
                  </Button>
                );
              })}
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            {/* Tabs */}
            <div className="bg-white rounded-lg border border-gray-200">
              <div className="border-b border-gray-200">
                <nav className="flex -mb-px">
                  {[
                    { id: 'details', label: 'Details', icon: FileText },
                    {
                      id: 'comments',
                      label: `Comments (${comments?.length || 0})`,
                      icon: MessageSquare,
                    },
                    { id: 'history', label: 'History', icon: Clock },
                    { id: 'costs', label: 'Costs', icon: DollarSign },
                  ].map((tab) => {
                    const Icon = tab.icon;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                          activeTab === tab.id
                            ? 'text-blue-600 border-blue-600'
                            : 'text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        {tab.label}
                      </button>
                    );
                  })}
                </nav>
              </div>

              {/* Tab Content */}
              <div className="p-6">
                {activeTab === 'details' && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="font-medium text-gray-900 mb-2">Title</h3>
                      <p className="text-gray-700">{ncr.title}</p>
                    </div>

                    <div>
                      <h3 className="font-medium text-gray-900 mb-2">Description</h3>
                      <p className="text-gray-700 whitespace-pre-wrap">{ncr.description}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <h4 className="text-sm font-medium text-gray-700">Category</h4>
                        <p className="mt-1">{ncr.category}</p>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-gray-700">Trade</h4>
                        <p className="mt-1">{ncr.trade || 'N/A'}</p>
                      </div>
                    </div>

                    {ncr.tags && ncr.tags.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Tags</h4>
                        <div className="flex flex-wrap gap-2">
                          {ncr.tags.map((tag) => (
                            <span
                              key={tag}
                              className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 rounded-full text-sm"
                            >
                              <Tag className="w-3 h-3" />
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {ncr.evidence && Object.keys(ncr.evidence).length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Evidence</h4>
                        <div className="grid grid-cols-2 gap-2">
                          {Object.entries(ncr.evidence).map(([key, url]) => (
                            <a
                              key={key}
                              href={url as string}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 p-2 bg-gray-50 rounded hover:bg-gray-100"
                            >
                              <Camera className="w-4 h-4 text-gray-500" />
                              <span className="text-sm text-blue-600">View {key}</span>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    {ncr.root_cause && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-700">Root Cause</h4>
                        <p className="mt-1 text-gray-700">{ncr.root_cause}</p>
                      </div>
                    )}

                    {ncr.corrective_action && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-700">Corrective Action</h4>
                        <p className="mt-1 text-gray-700">{ncr.corrective_action}</p>
                      </div>
                    )}

                    {ncr.preventive_action && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-700">Preventive Action</h4>
                        <p className="mt-1 text-gray-700">{ncr.preventive_action}</p>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'comments' && (
                  <div className="space-y-4">
                    {/* Add Comment Form */}
                    <div className="border-b border-gray-200 pb-4">
                      <textarea
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        placeholder="Add a comment..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        rows={3}
                      />
                      <div className="flex items-center justify-between mt-2">
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={isInternalComment}
                            onChange={(e) => setIsInternalComment(e.target.checked)}
                            className="rounded"
                          />
                          <span className="text-sm text-gray-600">Internal comment</span>
                        </label>
                        <Button
                          size="sm"
                          onClick={() =>
                            addComment.mutate({
                              content: commentText,
                              is_internal: isInternalComment,
                            })
                          }
                          disabled={!commentText.trim() || addComment.isPending}
                        >
                          <Send className="w-4 h-4 mr-1" />
                          Post
                        </Button>
                      </div>
                    </div>

                    {/* Comments List */}
                    {comments?.map((comment: NCRComment) => (
                      <div key={comment.id} className="flex gap-3">
                        <div className="flex-shrink-0">
                          <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                            <User className="w-4 h-4 text-gray-600" />
                          </div>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-sm">
                              {comment.author?.full_name || 'Unknown'}
                            </span>
                            <span className="text-xs text-gray-500">
                              {formatDistanceToNow(new Date(comment.created_at), {
                                addSuffix: true,
                              })}
                            </span>
                            {comment.is_internal && (
                              <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">
                                Internal
                              </span>
                            )}
                          </div>
                          <p className="text-gray-700 text-sm">{comment.content}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {activeTab === 'history' && (
                  <div className="space-y-4">
                    {history?.map((item: NCRHistory) => (
                      <div key={item.id} className="flex gap-3">
                        <div className="flex-shrink-0">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                            <Clock className="w-4 h-4 text-blue-600" />
                          </div>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-sm">
                              {item.performedBy?.full_name || 'System'}
                            </span>
                            <span className="text-xs text-gray-500">
                              {format(new Date(item.performed_at), 'PPp')}
                            </span>
                          </div>
                          <p className="text-gray-700 text-sm">
                            {item.action.replace(/_/g, ' ')}
                            {item.from_status && item.to_status && (
                              <>
                                : <span className="font-medium">{item.from_status}</span> →{' '}
                                <span className="font-medium">{item.to_status}</span>
                              </>
                            )}
                          </p>
                          {item.comment && (
                            <p className="text-gray-600 text-sm mt-1">{item.comment}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {activeTab === 'costs' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-gray-50 rounded-lg p-4">
                        <h4 className="text-sm font-medium text-gray-700">Estimated Cost</h4>
                        <p className="text-2xl font-bold text-gray-900 mt-1">
                          ${ncr.estimated_cost?.toLocaleString() || '0'}
                        </p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <h4 className="text-sm font-medium text-gray-700">Actual Cost</h4>
                        <p className="text-2xl font-bold text-gray-900 mt-1">
                          ${ncr.actual_cost?.toLocaleString() || '0'}
                        </p>
                      </div>
                    </div>
                    {ncr.cost_notes && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-700">Cost Notes</h4>
                        <p className="mt-1 text-gray-700">{ncr.cost_notes}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Timeline */}
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h3 className="font-medium text-gray-900 mb-4">Timeline</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Created</p>
                    <p className="text-xs text-gray-500">
                      {format(new Date(ncr.created_at), 'PPp')}
                    </p>
                  </div>
                </div>
                {ncr.acknowledged_at && (
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">Acknowledged</p>
                      <p className="text-xs text-gray-500">
                        {format(new Date(ncr.acknowledged_at), 'PPp')}
                      </p>
                    </div>
                  </div>
                )}
                {ncr.resolved_at && (
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">Resolved</p>
                      <p className="text-xs text-gray-500">
                        {format(new Date(ncr.resolved_at), 'PPp')}
                      </p>
                    </div>
                  </div>
                )}
                {ncr.closed_at && (
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">Closed</p>
                      <p className="text-xs text-gray-500">
                        {format(new Date(ncr.closed_at), 'PPp')}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Related Items */}
            {(ncr.lot || ncr.inspection) && (
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <h3 className="font-medium text-gray-900 mb-4">Related Items</h3>
                <div className="space-y-2">
                  {ncr.lot && (
                    <Link
                      href={`/dashboard/projects/${ncr.project_id}/lots/${ncr.lot_id}`}
                      className="flex items-center gap-2 p-2 bg-gray-50 rounded hover:bg-gray-100"
                    >
                      <FileText className="w-4 h-4 text-gray-500" />
                      <span className="text-sm">Lot {ncr.lot.lot_number}</span>
                    </Link>
                  )}
                  {ncr.inspection && (
                    <Link
                      href={`/dashboard/inspections/${ncr.inspection_id}`}
                      className="flex items-center gap-2 p-2 bg-gray-50 rounded hover:bg-gray-100"
                    >
                      <Paperclip className="w-4 h-4 text-gray-500" />
                      <span className="text-sm">Inspection #{ncr.inspection.id?.slice(-6)}</span>
                    </Link>
                  )}
                </div>
              </div>
            )}

            {/* Attachments Summary */}
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h3 className="font-medium text-gray-900 mb-4">Attachments</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Evidence Files</span>
                  <span className="font-medium">{Object.keys(ncr.evidence || {}).length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Verification Files</span>
                  <span className="font-medium">
                    {Object.keys(ncr.verification_evidence || {}).length}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Modals */}
        {showActionModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <h3 className="text-lg font-medium mb-4">
                {showActionModal === 'resolve' && 'Resolve NCR'}
                {showActionModal === 'verify' && 'Verify & Close NCR'}
                {showActionModal === 'dispute' && 'Dispute NCR'}
                {showActionModal === 'reopen' && 'Reopen NCR'}
              </h3>

              <div className="space-y-4">
                {showActionModal === 'resolve' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Root Cause *
                      </label>
                      <textarea
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        rows={3}
                        value={actionFormData.root_cause || ''}
                        onChange={(e) =>
                          setActionFormData({ ...actionFormData, root_cause: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Corrective Action *
                      </label>
                      <textarea
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        rows={3}
                        value={actionFormData.corrective_action || ''}
                        onChange={(e) =>
                          setActionFormData({
                            ...actionFormData,
                            corrective_action: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Preventive Action *
                      </label>
                      <textarea
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        rows={3}
                        value={actionFormData.preventive_action || ''}
                        onChange={(e) =>
                          setActionFormData({
                            ...actionFormData,
                            preventive_action: e.target.value,
                          })
                        }
                      />
                    </div>
                  </>
                )}

                {showActionModal === 'verify' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Verification Notes *
                    </label>
                    <textarea
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      rows={3}
                      value={actionFormData.verification_notes || ''}
                      onChange={(e) =>
                        setActionFormData({ ...actionFormData, verification_notes: e.target.value })
                      }
                      placeholder="Describe how the issue was verified to be resolved..."
                    />
                  </div>
                )}

                {showActionModal === 'dispute' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Dispute Category *
                      </label>
                      <select
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={actionFormData.dispute_category || ''}
                        onChange={(e) =>
                          setActionFormData({ ...actionFormData, dispute_category: e.target.value })
                        }
                      >
                        <option value="">Select category...</option>
                        <option value="not_a_defect">Not a defect</option>
                        <option value="out_of_scope">Out of scope</option>
                        <option value="incorrect_assignment">Incorrect assignment</option>
                        <option value="duplicate">Duplicate</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Dispute Reason *
                      </label>
                      <textarea
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        rows={3}
                        value={actionFormData.dispute_reason || ''}
                        onChange={(e) =>
                          setActionFormData({ ...actionFormData, dispute_reason: e.target.value })
                        }
                      />
                    </div>
                  </>
                )}

                {showActionModal === 'reopen' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Reason for Reopening *
                    </label>
                    <textarea
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      rows={3}
                      value={actionFormData.reopened_reason || ''}
                      onChange={(e) =>
                        setActionFormData({ ...actionFormData, reopened_reason: e.target.value })
                      }
                    />
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <Button
                  variant="ghost"
                  onClick={() => {
                    setShowActionModal(null);
                    setActionFormData({});
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => submitActionForm(showActionModal)}
                  loading={actions.isLoading}
                >
                  Submit
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
