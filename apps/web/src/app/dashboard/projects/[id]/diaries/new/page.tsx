import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ProjectDiaryFormClient } from '@/components/diary/ProjectDiaryFormClient';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function NewProjectDiaryPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  const { data: project } = await supabase
    .from('projects')
    .select('*, organizations ( id, name )')
    .eq('id', id)
    .single();

  if (!project) {
    redirect('/dashboard/projects');
  }

  const { data: membership } = await supabase
    .from('organization_members')
    .select('role')
    .eq('organization_id', project.organization_id)
    .eq('user_id', user.id)
    .single();

  if (!membership) {
    redirect('/dashboard/projects');
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <ProjectDiaryFormClient project={project} />
    </div>
  );
}
