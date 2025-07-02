import { DashboardNav } from '@/components/DashboardNav';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <DashboardNav />
      <main>{children}</main>
    </>
  );
}
