import { redirect } from 'next/navigation';

interface PageProps {
  searchParams?: { [key: string]: string | string[] | undefined };
}

export default function LegacyNewDiaryPage({ searchParams }: PageProps) {
  const projectIdParam = searchParams?.project_id;
  const projectId = Array.isArray(projectIdParam) ? projectIdParam[0] : projectIdParam;

  if (projectId) {
    redirect('/dashboard/projects/' + projectId + '/diaries/new');
  }

  redirect('/dashboard/projects');
}
