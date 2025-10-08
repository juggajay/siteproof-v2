'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button, Input, useToast } from '@siteproof/design-system';
import { Plus, Building2 } from 'lucide-react';

export function ClientWrapper() {
  const [showCreateOrg, setShowCreateOrg] = useState(false);
  const [orgName, setOrgName] = useState('');
  const [orgDescription, setOrgDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const { showSuccess, showError } = useToast();

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
        setIsRedirecting(true);
        // Use window.location for a full page reload to ensure state is updated
        setTimeout(() => {
          window.location.href = '/dashboard';
        }, 1000);
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
          disabled={isCreating || isRedirecting}
        />
        <Input
          label="Description (Optional)"
          value={orgDescription}
          onChange={(e) => setOrgDescription(e.target.value)}
          placeholder="Brief description of your organization"
          disabled={isCreating || isRedirecting}
        />
        <div className="flex gap-2">
          <Button
            onClick={handleCreateOrganization}
            loading={isCreating || isRedirecting}
            disabled={!orgName.trim() || isRedirecting}
          >
            <Building2 className="mr-2 h-4 w-4" />
            {isRedirecting ? 'Redirecting...' : 'Create Organization'}
          </Button>
          <Button
            variant="secondary"
            onClick={() => setShowCreateOrg(false)}
            disabled={isCreating || isRedirecting}
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
