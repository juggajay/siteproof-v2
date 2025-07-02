import { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import NewProjectForm from './new-project-form';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'New Project - SiteProof',
  description: 'Create a new construction project',
};

export default async function NewProjectPage() {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect('/auth/login');
  }

  // Check if user has an organization
  const { data: membership } = await supabase
    .from('organization_members')
    .select('organization_id, organizations(name)')
    .eq('user_id', user.id)
    .single();

  if (!membership?.organization_id) {
    // User needs to create or join an organization first
    // For now, redirect to dashboard with a message
    redirect('/dashboard?setup=organization');
  }

  return <NewProjectForm organizationId={membership.organization_id} />;
}