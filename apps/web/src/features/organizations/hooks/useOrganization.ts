import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from '@/features/auth/hooks/useSession';
import { toast } from 'sonner';

export function useOrganization() {
  const { user } = useSession();

  return useQuery({
    queryKey: ['organization'],
    queryFn: async () => {
      const response = await fetch('/api/organization');
      if (!response.ok) {
        throw new Error('Failed to fetch organization');
      }
      return response.json();
    },
    enabled: !!user,
  });
}

export function useOrganizationRole() {
  const { user } = useSession();

  return useQuery({
    queryKey: ['organization-role'],
    queryFn: async () => {
      const response = await fetch('/api/organization/role');
      if (!response.ok) {
        throw new Error('Failed to fetch organization role');
      }
      return response.json();
    },
    enabled: !!user,
  });
}

export function useOrganizationMembers() {
  return useQuery({
    queryKey: ['organization-members'],
    queryFn: async () => {
      const response = await fetch('/api/organization/members');
      if (!response.ok) {
        throw new Error('Failed to fetch organization members');
      }
      return response.json();
    },
  });
}

export function useUpdateOrganization() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch('/api/organization', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update organization');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization'] });
      toast.success('Organization updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useInviteMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { email: string; role: string }) => {
      const response = await fetch('/api/organization/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to send invitation');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization-members'] });
      toast.success('Invitation sent successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useUpdateMemberRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ memberId, role }: { memberId: string; role: string }) => {
      const response = await fetch(`/api/organization/members/${memberId}/role`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update member role');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization-members'] });
      toast.success('Member role updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useRemoveMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (memberId: string) => {
      const response = await fetch(`/api/organization/members/${memberId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to remove member');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization-members'] });
      toast.success('Member removed successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}