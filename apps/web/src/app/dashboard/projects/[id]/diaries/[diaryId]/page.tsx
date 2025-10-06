import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ProjectDiaryFormClient } from '@/components/diary/ProjectDiaryFormClient';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string; diaryId: string }>;
}

export default async function EditProjectDiaryPage({ params }: PageProps) {
  const { id, diaryId } = await params;
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

  const { data: diary } = await supabase
    .from('daily_diaries')
    .select('*')
    .eq('id', diaryId)
    .eq('project_id', id)
    .single();

  if (!diary) {
    redirect('/dashboard/projects/' + id + '?section=diaries');
  }

  const { data: labourEntries } = await supabase
    .from('diary_labor')
    .select('*')
    .eq('diary_id', diaryId);

  const { data: plantEntries } = await supabase
    .from('diary_plant')
    .select('*')
    .eq('diary_id', diaryId);

  const { data: materialEntries } = await supabase
    .from('diary_materials')
    .select('*')
    .eq('diary_id', diaryId);

  const diaryWithEntries = {
    ...diary,
    labour_entries: labourEntries ?? [],
    plant_entries: plantEntries ?? [],
    material_entries: materialEntries ?? [],
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <ProjectDiaryFormClient project={project} diary={diaryWithEntries} />
    </div>
  );
}
