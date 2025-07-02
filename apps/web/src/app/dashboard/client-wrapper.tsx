'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button, Input, useToast } from '@siteproof/design-system';
import { Plus, Building2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function ClientWrapper() {
  const [showCreateOrg, setShowCreateOrg] = useState(false);
  const [orgName, setOrgName] = useState('');
  const [orgDescription, setOrgDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const { showSuccess, showError } = useToast();
  const router = useRouter();

  const handleCreateOrganization = async () => {
    if (!orgName.trim()) {
      showError('Organization name is required');
      return;
    }

    setIsCreating(true);
    try {
      const response = await fetch('/api/organizations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: orgName.trim(),
          description: orgDescription.trim(),
        }),
      });

      if (response.ok) {
        showSuccess('Organization created successfully!');
        router.refresh(); // Refresh the page to show the dashboard
      } else {
        const error = await response.json();
        console.error('Organization creation failed:', error);
        showError(error.error || 'Failed to create organization');
      }
    } catch (error) {
      console.error('Network error:', error);
      showError('An error occurred while creating the organization');
    } finally {
      setIsCreating(false);
    }
  };

  if (showCreateOrg) {
    return (
      <div className="space-y-4">
        <Input
          label="Organization Name"
          value={orgName}
          onChange={(e) => setOrgName(e.target.value)}
          placeholder="Enter your organization name"
          required
        />
        <Input
          label="Description (Optional)"
          value={orgDescription}
          onChange={(e) => setOrgDescription(e.target.value)}
          placeholder="Brief description of your organization"
        />
        <div className="flex gap-2">
          <Button 
            onClick={handleCreateOrganization} 
            loading={isCreating}
            disabled={!orgName.trim()}
          >
            <Building2 className="mr-2 h-4 w-4" />
            Create Organization
          </Button>
          <Button 
            variant="secondary" 
            onClick={() => setShowCreateOrg(false)}
            disabled={isCreating}
          >
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <Button onClick={() => setShowCreateOrg(true)}>
        <Building2 className="mr-2 h-4 w-4" />
        Create Organization
      </Button>
      <p className="text-body-small text-secondary-gray">or</p>
      <Link href="/dashboard/projects/new">
        <Button variant="secondary">
          <Plus className="mr-2 h-4 w-4" />
          New Project
        </Button>
      </Link>
    </div>
  );
}