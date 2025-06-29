'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  Clock,
  CheckCircle,
  XCircle,
  MessageSquare,
  User,
  Calendar,
  MapPin,
  Tag,
  ChevronRight,
  MoreVertical,
  FileText,
  Camera,
  Edit,
} from 'lucide-react';
import { Button } from '@siteproof/design-system';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { NCR, User as UserType } from '@siteproof/database';
import { formatDistanceToNow } from 'date-fns';

interface NcrWorkflowCardProps {
  ncr: NCR;
  currentUser: UserType;
  onViewDetails?: () => void;
  onEdit?: () => void;
  compact?: boolean;
}

const statusConfig = {
  open: {
    label: 'Open',
    color: 'bg-red-100 text-red-800',
    icon: AlertTriangle,
    actions: ['acknowledge', 'assign', 'dispute'],
  },
  acknowledged: {
    label: 'Acknowledged',
    color: 'bg-yellow-100 text-yellow-800',
    icon: Clock,
    actions: ['start_work', 'assign', 'dispute'],
  },
  in_progress: {
    label: 'In Progress',
    color: 'bg-blue-100 text-blue-800',
    icon: Clock,
    actions: ['resolve', 'request_info'],
  },
  resolved: {
    label: 'Resolved',
    color: 'bg-green-100 text-green-800',
    icon: CheckCircle,
    actions: ['verify', 'reopen'],
  },
  closed: {
    label: 'Closed',
    color: 'bg-gray-100 text-gray-800',
    icon: CheckCircle,
    actions: ['reopen'],
  },
  disputed: {
    label: 'Disputed',
    color: 'bg-purple-100 text-purple-800',
    icon: XCircle,
    actions: ['resolve_dispute', 'escalate'],
  },
};

const severityConfig = {
  low: { label: 'Low', color: 'text-blue-600' },
  medium: { label: 'Medium', color: 'text-yellow-600' },
  high: { label: 'High', color: 'text-orange-600' },
  critical: { label: 'Critical', color: 'text-red-600' },
};

const priorityConfig = {
  low: { label: 'Low', icon: '🔵' },
  normal: { label: 'Normal', icon: '🟢' },
  high: { label: 'High', icon: '🟠' },
  urgent: { label: 'Urgent', icon: '🔴' },
};

export function NcrWorkflowCard({
  ncr,
  currentUser,
  onViewDetails,
  onEdit,
  compact = false,
}: NcrWorkflowCardProps) {
  const [showActions, setShowActions] = useState(false);
  const [selectedAction, setSelectedAction] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const status = statusConfig[ncr.status];
  const severity = severityConfig[ncr.severity];
  const priority = priorityConfig[ncr.priority];
  const StatusIcon = status.icon;

  // Determine user's role in this NCR
  const isRaisedBy = ncr.raised_by === currentUser.id;
  const isAssignedTo = ncr.assigned_to === currentUser.id;
  const isAdmin = true; // TODO: Check actual role
  const canPerformActions = isRaisedBy || isAssignedTo || isAdmin;

  // Filter available actions based on user role
  const getAvailableActions = () => {
    const baseActions = status.actions;
    
    if (!canPerformActions) return [];
    
    // Role-specific filtering
    if (ncr.status === 'open' && !isAssignedTo && !isAdmin) {
      return baseActions.filter(a => a !== 'acknowledge');
    }
    
    if (ncr.status === 'resolved' && !isRaisedBy && !isAdmin) {
      return baseActions.filter(a => a !== 'verify');
    }
    
    return baseActions;
  };

  const performAction = useMutation({
    mutationFn: async ({ action, data }: { action: string; data?: any }) => {
      const response = await fetch(`/api/ncrs/${ncr.id}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data || {}),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || `Failed to ${action}`);
      }

      return response.json();
    },
    onSuccess: (_, { action }) => {
      toast.success(`NCR ${action.replace('_', ' ')} successfully`);
      queryClient.invalidateQueries({ queryKey: ['ncr', ncr.id] });
      queryClient.invalidateQueries({ queryKey: ['ncrs'] });
      setSelectedAction(null);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleAction = (action: string) => {
    // Some actions need additional input
    if (['assign', 'resolve', 'dispute', 'verify'].includes(action)) {
      setSelectedAction(action);
    } else {
      // Simple state transitions
      performAction.mutate({ action });
    }
  };

  const getActionLabel = (action: string): string => {
    const labels: Record<string, string> = {
      acknowledge: 'Acknowledge',
      assign: 'Assign',
      dispute: 'Dispute',
      start_work: 'Start Work',
      resolve: 'Mark Resolved',
      request_info: 'Request Info',
      verify: 'Verify & Close',
      reopen: 'Reopen',
      resolve_dispute: 'Resolve Dispute',
      escalate: 'Escalate',
    };
    return labels[action] || action;
  };

  const getActionVariant = (action: string): 'primary' | 'secondary' | 'danger' => {
    if (['acknowledge', 'start_work', 'resolve', 'verify'].includes(action)) {
      return 'primary';
    }
    if (['dispute', 'reopen', 'escalate'].includes(action)) {
      return 'danger';
    }
    return 'secondary';
  };

  if (compact) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer"
        onClick={onViewDetails}
      >
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-start gap-3">
            <div className={`p-2 rounded-lg ${status.color}`}>
              <StatusIcon className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-medium text-gray-900">{ncr.ncr_number}</h4>
              <p className="text-sm text-gray-600 mt-1 line-clamp-2">{ncr.title}</p>
            </div>
          </div>
          <span className={`text-xs font-medium ${severity.color}`}>
            {severity.label}
          </span>
        </div>
        
        <div className="flex items-center justify-between mt-3 text-xs text-gray-500">
          <div className="flex items-center gap-4">
            {ncr.assigned_to && (
              <div className="flex items-center gap-1">
                <User className="w-3 h-3" />
                <span>{ncr.assignedTo?.full_name || 'Assigned'}</span>
              </div>
            )}
            {ncr.due_date && (
              <div className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                <span>{new Date(ncr.due_date).toLocaleDateString()}</span>
              </div>
            )}
          </div>
          <ChevronRight className="w-4 h-4" />
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-lg border border-gray-200 shadow-sm"
    >
      {/* Header */}
      <div className="p-6 border-b">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-lg ${status.color}`}>
              <StatusIcon className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h3 className="text-lg font-semibold text-gray-900">
                  {ncr.ncr_number}
                </h3>
                <span className={`text-sm font-medium ${severity.color}`}>
                  {severity.label} Severity
                </span>
                <span className="text-sm">
                  {priority.icon} {priority.label} Priority
                </span>
              </div>
              <p className="text-gray-700">{ncr.title}</p>
              <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                <span>Category: {ncr.category}</span>
                {ncr.trade && <span>Trade: {ncr.trade}</span>}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <div className={`px-3 py-1 rounded-full text-sm font-medium ${status.color}`}>
              {status.label}
            </div>
            <button
              onClick={() => setShowActions(!showActions)}
              className="p-1 hover:bg-gray-100 rounded"
            >
              <MoreVertical className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Metadata */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Raised by</span>
            <p className="font-medium">{ncr.raisedBy?.full_name || 'Unknown'}</p>
            <p className="text-xs text-gray-500">
              {formatDistanceToNow(new Date(ncr.created_at), { addSuffix: true })}
            </p>
          </div>
          
          {ncr.assigned_to && (
            <div>
              <span className="text-gray-500">Assigned to</span>
              <p className="font-medium">{ncr.assignedTo?.full_name || 'Unknown'}</p>
            </div>
          )}
          
          {ncr.due_date && (
            <div>
              <span className="text-gray-500">Due date</span>
              <p className="font-medium">
                {new Date(ncr.due_date).toLocaleDateString()}
              </p>
              {new Date(ncr.due_date) < new Date() && ncr.status !== 'closed' && (
                <p className="text-xs text-red-600">Overdue</p>
              )}
            </div>
          )}
          
          {ncr.location && (
            <div>
              <span className="text-gray-500">Location</span>
              <p className="font-medium flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {ncr.location}
              </p>
            </div>
          )}
        </div>

        {/* Tags */}
        {ncr.tags.length > 0 && (
          <div className="flex items-center gap-2 mt-4">
            <Tag className="w-4 h-4 text-gray-500" />
            <div className="flex flex-wrap gap-1">
              {ncr.tags.map(tag => (
                <span
                  key={tag}
                  className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Description */}
      <div className="p-6 border-b">
        <h4 className="font-medium text-gray-900 mb-2">Description</h4>
        <p className="text-gray-700 whitespace-pre-wrap">{ncr.description}</p>
        
        {/* Evidence */}
        {ncr.evidence && Object.keys(ncr.evidence).length > 0 && (
          <div className="mt-4">
            <h5 className="text-sm font-medium text-gray-700 mb-2">Evidence</h5>
            <div className="flex flex-wrap gap-2">
              {/* Render evidence items */}
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      {canPerformActions && (
        <div className="p-6">
          <div className="flex flex-wrap gap-3">
            {getAvailableActions().map(action => (
              <Button
                key={action}
                variant={getActionVariant(action)}
                size="sm"
                onClick={() => handleAction(action)}
                loading={performAction.isPending && selectedAction === action}
              >
                {getActionLabel(action)}
              </Button>
            ))}
            
            <div className="flex-1" />
            
            <Button
              variant="ghost"
              size="sm"
              onClick={onViewDetails}
            >
              <FileText className="w-4 h-4 mr-1" />
              View Details
            </Button>
            
            {(isRaisedBy || isAdmin) && ncr.status === 'open' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onEdit}
              >
                <Edit className="w-4 h-4 mr-1" />
                Edit
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Quick Stats */}
      <div className="px-6 py-3 bg-gray-50 border-t flex items-center justify-between text-sm">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-gray-500" />
            <span className="text-gray-600">3 comments</span>
          </div>
          <div className="flex items-center gap-2">
            <Camera className="w-4 h-4 text-gray-500" />
            <span className="text-gray-600">2 photos</span>
          </div>
        </div>
        
        {ncr.estimated_cost && (
          <div className="text-gray-600">
            Est. Cost: <span className="font-medium">${ncr.estimated_cost.toLocaleString()}</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}