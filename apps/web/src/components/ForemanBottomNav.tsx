'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ClipboardList, Layers, FileCheck, AlertTriangle } from 'lucide-react';

export function ForemanBottomNav() {
  const pathname = usePathname();

  const links = [
    { href: '/foreman/daily-diary', label: 'Diary', icon: ClipboardList },
    { href: '/foreman/lots', label: 'Lots', icon: Layers },
    { href: '/foreman/itps', label: 'ITPs', icon: FileCheck },
    { href: '/foreman/ncrs', label: 'NCRs', icon: AlertTriangle },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
      <div className="grid grid-cols-4">
        {links.map((link) => {
          const Icon = link.icon;
          const isActive = pathname?.startsWith(link.href);

          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex flex-col items-center justify-center h-16 space-y-1 ${
                isActive ? 'text-blue-600' : 'text-gray-600'
              }`}
            >
              <Icon className="w-6 h-6" />
              <span className="text-xs font-medium">{link.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
