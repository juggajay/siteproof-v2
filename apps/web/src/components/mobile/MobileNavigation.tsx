'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  Home,
  FileText,
  ClipboardList,
  BarChart3,
  Menu,
  X,
  ChevronLeft,
  Settings,
  User,
  Moon,
} from 'lucide-react';
import { DarkModeToggle } from '@/components/theme/DarkModeToggle';

interface MobileNavigationProps {
  user?: {
    name?: string;
    email?: string;
    avatar?: string;
  };
}

/**
 * Mobile-optimized navigation with bottom tab bar and slide-out menu
 */
export function MobileNavigation({ user }: MobileNavigationProps) {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const navItems = [
    { href: '/dashboard', icon: Home, label: 'Home' },
    { href: '/dashboard/projects', icon: FileText, label: 'Projects' },
    { href: '/dashboard/diaries', icon: ClipboardList, label: 'Diaries' },
    { href: '/dashboard/reports', icon: BarChart3, label: 'Reports' },
  ];

  const isActive = (href: string) => pathname.startsWith(href);

  return (
    <>
      {/* Top Navigation Bar - Mobile Only */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-white border-b border-gray-200">
        <div className="flex items-center justify-between px-4 h-14">
          {/* Back button or menu */}
          <button
            onClick={() => window.history.back()}
            className="inline-flex items-center justify-center w-10 h-10 rounded-lg hover:bg-gray-100 active:bg-gray-200"
            aria-label="Go back"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>

          {/* Page title */}
          <h1 className="font-semibold text-lg truncate flex-1 text-center">
            {navItems.find((item) => isActive(item.href))?.label || 'SiteProof'}
          </h1>

          {/* Menu button */}
          <button
            onClick={() => setIsMenuOpen(true)}
            className="inline-flex items-center justify-center w-10 h-10 rounded-lg hover:bg-gray-100 active:bg-gray-200"
            aria-label="Open menu"
          >
            <Menu className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Bottom Tab Bar - Mobile Only */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 safe-area-bottom">
        <div className="grid grid-cols-4 h-16">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center gap-1',
                'transition-colors duration-150',
                'active:bg-gray-100',
                isActive(item.href) ? 'text-blue-600' : 'text-gray-600 hover:text-gray-900'
              )}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-xs font-medium">{item.label}</span>
            </Link>
          ))}
        </div>
      </nav>

      {/* Slide-out Menu - Mobile Only */}
      {isMenuOpen && (
        <>
          {/* Backdrop */}
          <div
            className="lg:hidden fixed inset-0 z-50 bg-black bg-opacity-50"
            onClick={() => setIsMenuOpen(false)}
          />

          {/* Menu Panel */}
          <div
            className={cn(
              'lg:hidden fixed right-0 top-0 bottom-0 z-50 w-80 max-w-[85vw] bg-white shadow-xl',
              'transform transition-transform duration-300',
              isMenuOpen ? 'translate-x-0' : 'translate-x-full'
            )}
          >
            {/* Menu Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold">Menu</h2>
              <button
                onClick={() => setIsMenuOpen(false)}
                className="inline-flex items-center justify-center w-10 h-10 rounded-lg hover:bg-gray-100 active:bg-gray-200"
                aria-label="Close menu"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* User Info */}
            {user && (
              <div className="p-4 border-b border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
                    {user.avatar ? (
                      <img
                        src={user.avatar}
                        alt={user.name}
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      <User className="w-6 h-6 text-gray-600" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{user.name}</p>
                    <p className="text-sm text-gray-500 truncate">{user.email}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Menu Items */}
            <div className="p-4 space-y-2">
              {/* Dark Mode Toggle for Mobile */}
              <div className="flex items-center justify-between px-4 py-3 rounded-lg bg-gray-50">
                <div className="flex items-center gap-3">
                  <Moon className="w-5 h-5 text-gray-600" />
                  <span className="font-medium">Dark Mode</span>
                </div>
                <DarkModeToggle />
              </div>

              <Link
                href="/dashboard/settings"
                className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-100 active:bg-gray-200"
                onClick={() => setIsMenuOpen(false)}
              >
                <Settings className="w-5 h-5 text-gray-600" />
                <span className="font-medium">Settings</span>
              </Link>

              <button
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-100 active:bg-gray-200 text-red-600"
                onClick={() => {
                  // Handle logout
                  setIsMenuOpen(false);
                }}
              >
                <span className="font-medium">Sign Out</span>
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}

/**
 * CSS for safe area handling (add to global styles)
 */
export const safeAreaStyles = `
  .safe-area-bottom {
    padding-bottom: env(safe-area-inset-bottom);
  }
  
  .safe-area-top {
    padding-top: env(safe-area-inset-top);
  }
`;
