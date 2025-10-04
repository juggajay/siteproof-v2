import { ForemanBottomNav } from '@/components/ForemanBottomNav';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export default function ForemanLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="pb-16">
      {children}
      <ForemanBottomNav />
    </div>
  );
}
