'use client';

import React from 'react';
import { Bell, User, Shield, Palette } from 'lucide-react';
import { NotificationSettings } from '@/components/notifications/NotificationSettings';

export default function SettingsPage() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="mt-2 text-gray-600">
          Manage your account and application preferences
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Sidebar */}
        <div className="lg:col-span-1">
          <nav className="space-y-1">
            <button className="w-full flex items-center gap-3 px-4 py-2 text-sm font-medium rounded-lg bg-blue-50 text-blue-700 border border-blue-200">
              <Bell className="w-4 h-4" />
              Notifications
            </button>
            <button className="w-full flex items-center gap-3 px-4 py-2 text-sm font-medium rounded-lg text-gray-700 hover:bg-gray-50">
              <User className="w-4 h-4" />
              Profile
            </button>
            <button className="w-full flex items-center gap-3 px-4 py-2 text-sm font-medium rounded-lg text-gray-700 hover:bg-gray-50">
              <Shield className="w-4 h-4" />
              Security
            </button>
            <button className="w-full flex items-center gap-3 px-4 py-2 text-sm font-medium rounded-lg text-gray-700 hover:bg-gray-50">
              <Palette className="w-4 h-4" />
              Appearance
            </button>
          </nav>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">
              Notification Preferences
            </h2>
            <NotificationSettings />
          </div>
        </div>
      </div>
    </div>
  );
}