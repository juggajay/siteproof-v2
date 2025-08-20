'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Input, Textarea } from '@siteproof/design-system';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface NcrFormV2Props {
  projectId: string;
  lotId?: string;
  inspectionId?: string;
  onSuccess?: (ncr: any) => void;
  onCancel?: () => void;
}

export function NcrFormV2({ projectId, lotId, inspectionId, onSuccess, onCancel }: NcrFormV2Props) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [contractors, setContractors] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    severity: 'medium',
    category: 'Quality',
    location: '',
    trade: '',
    priority: 'normal',
    due_date: '',
    estimated_cost: '',
    cost_notes: '',
    tags: [] as string[],
    assigned_to: '',
    contractor_id: '',
  });

  // Fetch users and contractors on mount
  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient();

      try {
        // Get project details to find organization
        const { data: project } = await supabase
          .from('projects')
          .select('organization_id')
          .eq('id', projectId)
          .single();

        if (project) {
          // Fetch users in the same organization
          const { data: orgMembers } = await supabase
            .from('organization_members')
            .select(`
              user_id,
              users!inner(
                id,
                email,
                display_name,
                full_name
              )
            `)
            .eq('organization_id', project.organization_id);

          if (orgMembers) {
            const userList = orgMembers.map((member: any) => ({
              id: member.users.id,
              email: member.users.email,
              name: member.users.display_name || member.users.full_name || member.users.email,
            }));
            setUsers(userList);
          }

          // Fetch contractors (organizations of type 'contractor')
          const { data: contractorOrgs } = await supabase
            .from('organizations')
            .select('id, name')
            .eq('type', 'contractor')
            .order('name');

          if (contractorOrgs) {
            setContractors(contractorOrgs);
          }
        }
      } catch (error) {
        console.error('Error fetching users and contractors:', error);
      } finally {
        setLoadingData(false);
      }
    };

    fetchData();
  }, [projectId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      toast.error('Title is required');
      return;
    }

    if (!formData.description.trim()) {
      toast.error('Description is required');
      return;
    }

    setIsSubmitting(true);

    try {
      const formDataToSend = new FormData();

      // Required fields
      formDataToSend.append('project_id', projectId);
      formDataToSend.append('title', formData.title.trim());
      formDataToSend.append('description', formData.description.trim());
      formDataToSend.append('severity', formData.severity);
      formDataToSend.append('category', formData.category);
      formDataToSend.append('priority', formData.priority);

      // Optional fields - only append if they have values
      if (lotId) {
        formDataToSend.append('lot_id', lotId);
      }

      if (inspectionId) {
        formDataToSend.append('inspection_id', inspectionId);
      }

      if (formData.location.trim()) {
        formDataToSend.append('location', formData.location.trim());
      }

      if (formData.trade.trim()) {
        formDataToSend.append('trade', formData.trade.trim());
      }

      if (formData.due_date) {
        formDataToSend.append('due_date', formData.due_date);
      }

      if (formData.estimated_cost) {
        formDataToSend.append('estimated_cost', formData.estimated_cost);
      }

      if (formData.cost_notes.trim()) {
        formDataToSend.append('cost_notes', formData.cost_notes.trim());
      }

      if (formData.tags.length > 0) {
        formDataToSend.append('tags', JSON.stringify(formData.tags));
      }

      // Add assignee and contractor if selected
      if (formData.assigned_to) {
        formDataToSend.append('assigned_to', formData.assigned_to);
      }

      if (formData.contractor_id) {
        formDataToSend.append('contractor_id', formData.contractor_id);
      }

      // Log what we're sending (for debugging)
      console.log('Sending NCR data:');
      for (const [key, value] of formDataToSend.entries()) {
        console.log(`  ${key}: ${value}`);
      }

      const response = await fetch('/api/ncrs-direct', {
        method: 'POST',
        body: formDataToSend,
      });

      const result = await response.json();

      if (!response.ok) {
        console.error('NCR creation failed:', result);

        // Show detailed error messages
        if (result.details && Array.isArray(result.details)) {
          result.details.forEach((detail: any) => {
            toast.error(`${detail.field}: ${detail.message}`);
          });
        } else {
          toast.error(result.error || 'Failed to create NCR');
        }
        return;
      }

      toast.success('NCR created successfully!');

      if (onSuccess) {
        onSuccess(result.data);
      } else {
        // Navigate to the NCR detail page or list
        router.push(`/dashboard/ncrs/${result.data.id}`);
      }
    } catch (error) {
      console.error('Error creating NCR:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTagInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const input = e.currentTarget;
      const tag = input.value.trim();

      if (tag && !formData.tags.includes(tag)) {
        setFormData((prev) => ({
          ...prev,
          tags: [...prev.tags, tag],
        }));
        input.value = '';
      }
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.filter((tag) => tag !== tagToRemove),
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Title */}
      <div className="space-y-2">
        <label htmlFor="title" className="block text-sm font-medium">
          Title *
        </label>
        <Input
          id="title"
          value={formData.title}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setFormData((prev) => ({ ...prev, title: e.target.value }))
          }
          placeholder="Brief description of the non-conformance"
          required
          disabled={isSubmitting}
        />
      </div>

      {/* Description */}
      <div className="space-y-2">
        <label htmlFor="description" className="block text-sm font-medium">
          Description *
        </label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
            setFormData((prev) => ({ ...prev, description: e.target.value }))
          }
          placeholder="Detailed description of the issue"
          rows={4}
          required
          disabled={isSubmitting}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Severity */}
        <div className="space-y-2">
          <label htmlFor="severity" className="block text-sm font-medium">
            Severity *
          </label>
          <select
            id="severity"
            value={formData.severity}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
              setFormData((prev) => ({ ...prev, severity: e.target.value }))
            }
            disabled={isSubmitting}
            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
        </div>

        {/* Category */}
        <div className="space-y-2">
          <label htmlFor="category" className="block text-sm font-medium">
            Category *
          </label>
          <select
            id="category"
            value={formData.category}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
              setFormData((prev) => ({ ...prev, category: e.target.value }))
            }
            disabled={isSubmitting}
            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="Quality">Quality</option>
            <option value="Safety">Safety</option>
            <option value="Environmental">Environmental</option>
            <option value="Compliance">Compliance</option>
            <option value="Documentation">Documentation</option>
            <option value="Other">Other</option>
          </select>
        </div>

        {/* Priority */}
        <div className="space-y-2">
          <label htmlFor="priority" className="block text-sm font-medium">
            Priority
          </label>
          <select
            id="priority"
            value={formData.priority}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
              setFormData((prev) => ({ ...prev, priority: e.target.value }))
            }
            disabled={isSubmitting}
            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="low">Low</option>
            <option value="normal">Normal</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>

        {/* Due Date */}
        <div className="space-y-2">
          <label htmlFor="due_date" className="block text-sm font-medium">
            Due Date
          </label>
          <Input
            id="due_date"
            type="date"
            value={formData.due_date}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setFormData((prev) => ({ ...prev, due_date: e.target.value }))
            }
            disabled={isSubmitting}
          />
        </div>

        {/* Location */}
        <div className="space-y-2">
          <label htmlFor="location" className="block text-sm font-medium">
            Location
          </label>
          <Input
            id="location"
            value={formData.location}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setFormData((prev) => ({ ...prev, location: e.target.value }))
            }
            placeholder="e.g., Building A, Floor 2"
            disabled={isSubmitting}
          />
        </div>

        {/* Trade */}
        <div className="space-y-2">
          <label htmlFor="trade" className="block text-sm font-medium">
            Trade
          </label>
          <Input
            id="trade"
            value={formData.trade}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setFormData((prev) => ({ ...prev, trade: e.target.value }))
            }
            placeholder="e.g., Electrical, Plumbing"
            disabled={isSubmitting}
          />
        </div>

        {/* Estimated Cost */}
        <div className="space-y-2">
          <label htmlFor="estimated_cost" className="block text-sm font-medium">
            Estimated Cost
          </label>
          <Input
            id="estimated_cost"
            type="number"
            step="0.01"
            value={formData.estimated_cost}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setFormData((prev) => ({ ...prev, estimated_cost: e.target.value }))
            }
            placeholder="0.00"
            disabled={isSubmitting}
          />
        </div>

        {/* Cost Notes */}
        <div className="space-y-2">
          <label htmlFor="cost_notes" className="block text-sm font-medium">
            Cost Notes
          </label>
          <Input
            id="cost_notes"
            value={formData.cost_notes}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setFormData((prev) => ({ ...prev, cost_notes: e.target.value }))
            }
            placeholder="Additional cost information"
            disabled={isSubmitting}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Assignee */}
        <div className="space-y-2">
          <label htmlFor="assigned_to" className="block text-sm font-medium">
            Assign To
          </label>
          <select
            id="assigned_to"
            value={formData.assigned_to}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
              setFormData((prev) => ({ ...prev, assigned_to: e.target.value }))
            }
            disabled={isSubmitting || loadingData}
            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">No one assigned</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name}
              </option>
            ))}
          </select>
        </div>

        {/* Contractor */}
        <div className="space-y-2">
          <label htmlFor="contractor_id" className="block text-sm font-medium">
            Contractor
          </label>
          <select
            id="contractor_id"
            value={formData.contractor_id}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
              setFormData((prev) => ({ ...prev, contractor_id: e.target.value }))
            }
            disabled={isSubmitting || loadingData}
            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">No contractor selected</option>
            {contractors.map((contractor) => (
              <option key={contractor.id} value={contractor.id}>
                {contractor.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Tags */}
      <div className="space-y-2">
        <label htmlFor="tags" className="block text-sm font-medium">
          Tags
        </label>
        <Input
          id="tags"
          onKeyDown={handleTagInput}
          placeholder="Type a tag and press Enter"
          disabled={isSubmitting}
        />
        {formData.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {formData.tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 px-2 py-1 text-sm bg-gray-100 rounded-md"
              >
                {tag}
                <button
                  type="button"
                  onClick={() => removeTag(tag)}
                  className="text-gray-500 hover:text-gray-700"
                  disabled={isSubmitting}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3 justify-end pt-4 border-t">
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating...
            </>
          ) : (
            'Create NCR'
          )}
        </Button>
      </div>
    </form>
  );
}
// Force rebuild - Wed Aug 20 17:54:54 AEST 2025
