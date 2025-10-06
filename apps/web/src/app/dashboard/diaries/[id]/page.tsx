import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

interface PageProps {
  params: Promise<{ id: string }>;
}

export const dynamic = 'force-dynamic';

export default async function LegacyDiaryDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  const { data: diary } = await supabase
    .from('daily_diaries')
    .select('project_id')
    .eq('id', id)
    .single();

  if (!diary?.project_id) {
    redirect('/dashboard/projects');
  }

  redirect('/dashboard/projects/' + diary.project_id + '/diaries/' + id);
}
