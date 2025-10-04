'use client';

import { DashboardNav } from '@/components/DashboardNav';
import { BottomNav } from '@siteproof/design-system';
import { usePathname, useRouter } from 'next/navigation';
import { Home, Building2, Calendar, ClipboardList, FileText, Settings } from 'lucide-react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const navItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: <Home />,
      href: '/dashboard',
    },
    {
      id: 'projects',
      label: 'Projects',
      icon: <Building2 />,
      href: '/dashboard/projects',
    },
    {
      id: 'diaries',
      label: 'Diaries',
      icon: <Calendar />,
      href: '/dashboard/diaries',
    },
    {
      id: 'ncrs',
      label: 'NCRs',
      icon: <ClipboardList />,
      href: '/dashboard/ncrs',
    },
    {
      id: 'reports',
      label: 'Reports',
      icon: <FileText />,
      href: '/dashboard/reports',
    },
    {
      id: 'admin',
      label: 'Admin',
      icon: <Settings />,
      href: '/dashboard/admin',
    },
  ];

  const activeId = navItems.find(item => pathname === item.href || pathname.startsWith(item.href + '/'))?.id || 'dashboard';

  return (
    <div className="min-h-screen flex flex-col">
      <DashboardNav />

      {/* Main content with bottom padding for nav on mobile */}
      <main className="flex-1 pb-20 md:pb-0">
        {children}
      </main>

      {/* Bottom navigation - only on mobile */}
      <div className="md:hidden">
        <BottomNav
          items={navItems}
          activeItemId={activeId}
          onItemClick={(item) => router.push(item.href)}
        />
      </div>
    </div>
  );
}
