'use client';

import React, { useState, useEffect } from 'react';
import { Bell, BellOff, Check, Loader2, Smartphone } from 'lucide-react';
import { Button } from '@siteproof/design-system';
import { pushNotifications } from '@/lib/push-notifications';
import { toast } from 'sonner';
import { useSession } from '@/features/auth/hooks/useSession';

interface NotificationPreferences {
  ncrAssignments: boolean;
  inspectionDueDates: boolean;
  reportCompletion: boolean;
  systemAlerts: boolean;
  weeklyDigest: boolean;
  pushEnabled: boolean;
  emailEnabled: boolean;
}

export function NotificationSettings() {
  const { user } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    ncrAssignments: true,
    inspectionDueDates: true,
    reportCompletion: true,
    systemAlerts: true,
    weeklyDigest: false,
    pushEnabled: false,
    emailEnabled: true,
  });

  useEffect(() => {
    checkNotificationStatus();
    loadPreferences();
  }, []);

  const checkNotificationStatus = async () => {
    const status = await pushNotifications.checkPermissionStatus();
    setPermission(status);

    if (status === 'granted') {
      // Check if subscribed
      const response = await fetch('/api/notifications/status');
      if (response.ok) {
        const data = await response.json();
        setIsSubscribed(data.subscribed);
        setPreferences((prev) => ({ ...prev, pushEnabled: data.subscribed }));
      }
    }
  };

  const loadPreferences = async () => {
    try {
      const response = await fetch('/api/notifications/preferences');
      if (response.ok) {
        const data = await response.json();
        setPreferences(data);
      }
    } catch (error) {
      console.error('Failed to load preferences:', error);
    }
  };

  const enablePushNotifications = async () => {
    setIsLoading(true);
    try {
      // Request permission
      const permission = await pushNotifications.requestPermission();
      setPermission(permission);

      if (permission === 'granted' && user) {
        // Initialize and subscribe
        await pushNotifications.initialize();
        const subscription = await pushNotifications.subscribe(user.id);

        if (subscription) {
          setIsSubscribed(true);
          setPreferences((prev) => ({ ...prev, pushEnabled: true }));
          toast.success('Push notifications enabled successfully');

          // Send test notification
          await pushNotifications.sendTestNotification();
        } else {
          toast.error('Failed to enable push notifications');
        }
      }
    } catch (error) {
      console.error('Failed to enable push notifications:', error);
      toast.error('Failed to enable push notifications');
    } finally {
      setIsLoading(false);
    }
  };

  const disablePushNotifications = async () => {
    setIsLoading(true);
    try {
      if (user) {
        const success = await pushNotifications.unsubscribe(user.id);
        if (success) {
          setIsSubscribed(false);
          setPreferences((prev) => ({ ...prev, pushEnabled: false }));
          toast.success('Push notifications disabled');
        }
      }
    } catch (error) {
      console.error('Failed to disable push notifications:', error);
      toast.error('Failed to disable push notifications');
    } finally {
      setIsLoading(false);
    }
  };

  const updatePreference = async (key: keyof NotificationPreferences, value: boolean) => {
    const newPreferences = { ...preferences, [key]: value };
    setPreferences(newPreferences);

    try {
      const response = await fetch('/api/notifications/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPreferences),
      });

      if (!response.ok) {
        throw new Error('Failed to update preferences');
      }

      toast.success('Preferences updated');
    } catch (error) {
      console.error('Failed to update preferences:', error);
      toast.error('Failed to update preferences');
      // Revert on error
      setPreferences(preferences);
    }
  };

  const sendTestNotification = async () => {
    setIsLoading(true);
    try {
      if (!user) return;

      const response = await fetch('/api/notifications/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          title: 'Test Notification',
          body: 'This is a test notification from SiteProof',
          requireInteraction: false,
        }),
      });

      if (response.ok) {
        toast.success('Test notification sent');
      } else {
        throw new Error('Failed to send test notification');
      }
    } catch (error) {
      console.error('Failed to send test notification:', error);
      toast.error('Failed to send test notification');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Push Notification Status */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Push Notifications</h3>
          {isSubscribed ? (
            <Bell className="w-5 h-5 text-green-500" />
          ) : (
            <BellOff className="w-5 h-5 text-gray-400" />
          )}
        </div>

        {permission === 'denied' ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-700 text-sm">
              Push notifications are blocked. Please enable them in your browser settings.
            </p>
          </div>
        ) : isSubscribed ? (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-green-700 text-sm flex items-center">
                <Check className="w-4 h-4 mr-2" />
                Push notifications are enabled
              </p>
            </div>

            <div className="flex gap-2">
              <Button variant="secondary" onClick={sendTestNotification} disabled={isLoading}>
                Send Test
              </Button>
              <Button variant="ghost" onClick={disablePushNotifications} disabled={isLoading}>
                Disable
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-gray-600 text-sm">
              Enable push notifications to receive alerts about NCRs, inspections, and other
              important updates.
            </p>

            <Button
              onClick={enablePushNotifications}
              disabled={isLoading}
              className="w-full sm:w-auto"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Enabling...
                </>
              ) : (
                <>
                  <Bell className="w-4 h-4 mr-2" />
                  Enable Push Notifications
                </>
              )}
            </Button>
          </div>
        )}
      </div>

      {/* Notification Preferences */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Notification Preferences</h3>

        <div className="space-y-3">
          <label className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg cursor-pointer">
            <div className="flex-1">
              <p className="font-medium">NCR Assignments</p>
              <p className="text-sm text-gray-600">Get notified when NCRs are assigned to you</p>
            </div>
            <input
              type="checkbox"
              checked={preferences.ncrAssignments}
              onChange={(e) => updatePreference('ncrAssignments', e.target.checked)}
              className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
            />
          </label>

          <label className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg cursor-pointer">
            <div className="flex-1">
              <p className="font-medium">Inspection Due Dates</p>
              <p className="text-sm text-gray-600">Reminders for upcoming inspection deadlines</p>
            </div>
            <input
              type="checkbox"
              checked={preferences.inspectionDueDates}
              onChange={(e) => updatePreference('inspectionDueDates', e.target.checked)}
              className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
            />
          </label>

          <label className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg cursor-pointer">
            <div className="flex-1">
              <p className="font-medium">Report Completion</p>
              <p className="text-sm text-gray-600">Notifications when reports are ready</p>
            </div>
            <input
              type="checkbox"
              checked={preferences.reportCompletion}
              onChange={(e) => updatePreference('reportCompletion', e.target.checked)}
              className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
            />
          </label>

          <label className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg cursor-pointer">
            <div className="flex-1">
              <p className="font-medium">System Alerts</p>
              <p className="text-sm text-gray-600">Important system updates and maintenance</p>
            </div>
            <input
              type="checkbox"
              checked={preferences.systemAlerts}
              onChange={(e) => updatePreference('systemAlerts', e.target.checked)}
              className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
            />
          </label>

          <label className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg cursor-pointer">
            <div className="flex-1">
              <p className="font-medium">Weekly Digest</p>
              <p className="text-sm text-gray-600">Summary of weekly activity</p>
            </div>
            <input
              type="checkbox"
              checked={preferences.weeklyDigest}
              onChange={(e) => updatePreference('weeklyDigest', e.target.checked)}
              className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
            />
          </label>
        </div>
      </div>

      {/* Delivery Methods */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Delivery Methods</h3>

        <div className="space-y-3">
          <label className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg cursor-pointer">
            <div className="flex items-center flex-1">
              <Smartphone className="w-5 h-5 mr-3 text-gray-600" />
              <div>
                <p className="font-medium">Push Notifications</p>
                <p className="text-sm text-gray-600">Browser and mobile notifications</p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={preferences.pushEnabled}
              disabled={!isSubscribed}
              onChange={(e) => {
                if (e.target.checked && !isSubscribed) {
                  enablePushNotifications();
                } else if (!e.target.checked && isSubscribed) {
                  disablePushNotifications();
                }
              }}
              className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 disabled:opacity-50"
            />
          </label>

          <label className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg cursor-pointer">
            <div className="flex items-center flex-1">
              <Bell className="w-5 h-5 mr-3 text-gray-600" />
              <div>
                <p className="font-medium">Email Notifications</p>
                <p className="text-sm text-gray-600">Email alerts and summaries</p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={preferences.emailEnabled}
              onChange={(e) => updatePreference('emailEnabled', e.target.checked)}
              className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
            />
          </label>
        </div>
      </div>
    </div>
  );
}
