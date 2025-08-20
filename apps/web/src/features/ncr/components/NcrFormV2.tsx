'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

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
  });

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

      // Log what we're sending (for debugging)
      console.log('Sending NCR data:');
      for (const [key, value] of formDataToSend.entries()) {
        console.log(`  ${key}: ${value}`);
      }

      const response = await fetch('/api/ncrs-v2', {
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
        <Label htmlFor="title">Title *</Label>
        <Input
          id="title"
          value={formData.title}
          onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
          placeholder="Brief description of the non-conformance"
          required
          disabled={isSubmitting}
        />
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description">Description *</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
          placeholder="Detailed description of the issue"
          rows={4}
          required
          disabled={isSubmitting}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Severity */}
        <div className="space-y-2">
          <Label htmlFor="severity">Severity *</Label>
          <Select
            value={formData.severity}
            onValueChange={(value) => setFormData((prev) => ({ ...prev, severity: value }))}
            disabled={isSubmitting}
          >
            <SelectTrigger id="severity">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Category */}
        <div className="space-y-2">
          <Label htmlFor="category">Category *</Label>
          <Select
            value={formData.category}
            onValueChange={(value) => setFormData((prev) => ({ ...prev, category: value }))}
            disabled={isSubmitting}
          >
            <SelectTrigger id="category">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Quality">Quality</SelectItem>
              <SelectItem value="Safety">Safety</SelectItem>
              <SelectItem value="Environmental">Environmental</SelectItem>
              <SelectItem value="Compliance">Compliance</SelectItem>
              <SelectItem value="Documentation">Documentation</SelectItem>
              <SelectItem value="Other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Priority */}
        <div className="space-y-2">
          <Label htmlFor="priority">Priority</Label>
          <Select
            value={formData.priority}
            onValueChange={(value) => setFormData((prev) => ({ ...prev, priority: value }))}
            disabled={isSubmitting}
          >
            <SelectTrigger id="priority">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="normal">Normal</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Due Date */}
        <div className="space-y-2">
          <Label htmlFor="due_date">Due Date</Label>
          <Input
            id="due_date"
            type="date"
            value={formData.due_date}
            onChange={(e) => setFormData((prev) => ({ ...prev, due_date: e.target.value }))}
            disabled={isSubmitting}
          />
        </div>

        {/* Location */}
        <div className="space-y-2">
          <Label htmlFor="location">Location</Label>
          <Input
            id="location"
            value={formData.location}
            onChange={(e) => setFormData((prev) => ({ ...prev, location: e.target.value }))}
            placeholder="e.g., Building A, Floor 2"
            disabled={isSubmitting}
          />
        </div>

        {/* Trade */}
        <div className="space-y-2">
          <Label htmlFor="trade">Trade</Label>
          <Input
            id="trade"
            value={formData.trade}
            onChange={(e) => setFormData((prev) => ({ ...prev, trade: e.target.value }))}
            placeholder="e.g., Electrical, Plumbing"
            disabled={isSubmitting}
          />
        </div>

        {/* Estimated Cost */}
        <div className="space-y-2">
          <Label htmlFor="estimated_cost">Estimated Cost</Label>
          <Input
            id="estimated_cost"
            type="number"
            step="0.01"
            value={formData.estimated_cost}
            onChange={(e) => setFormData((prev) => ({ ...prev, estimated_cost: e.target.value }))}
            placeholder="0.00"
            disabled={isSubmitting}
          />
        </div>

        {/* Cost Notes */}
        <div className="space-y-2">
          <Label htmlFor="cost_notes">Cost Notes</Label>
          <Input
            id="cost_notes"
            value={formData.cost_notes}
            onChange={(e) => setFormData((prev) => ({ ...prev, cost_notes: e.target.value }))}
            placeholder="Additional cost information"
            disabled={isSubmitting}
          />
        </div>
      </div>

      {/* Tags */}
      <div className="space-y-2">
        <Label htmlFor="tags">Tags</Label>
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
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
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
