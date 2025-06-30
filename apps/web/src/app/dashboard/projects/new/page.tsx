import { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import NewProjectForm from './new-project-form';

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
  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single();

  if (!profile?.organization_id) {
    // User needs to set up organization first
    redirect('/dashboard/organization/setup');
  }

  return <NewProjectForm organizationId={profile.organization_id} />;
}