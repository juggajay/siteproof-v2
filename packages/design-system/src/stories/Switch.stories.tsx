import type { Meta, StoryObj } from '@storybook/react';
import { Switch } from '../components/ui/switch';
import { Label } from '../components/ui/label';
import { useState } from 'react';

const meta = {
  title: 'Components/Switch',
  component: Switch,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    disabled: {
      control: 'boolean',
    },
    checked: {
      control: 'boolean',
    },
  },
} satisfies Meta<typeof Switch>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => <Switch />,
};

export const WithLabel: Story = {
  render: () => (
    <div className="flex items-center space-x-2">
      <Switch id="airplane-mode" />
      <Label htmlFor="airplane-mode">Airplane Mode</Label>
    </div>
  ),
};

export const Checked: Story = {
  render: () => (
    <div className="flex items-center space-x-2">
      <Switch id="checked" defaultChecked />
      <Label htmlFor="checked">Enabled by default</Label>
    </div>
  ),
};

export const Disabled: Story = {
  render: () => (
    <div className="flex items-center space-x-2">
      <Switch id="disabled" disabled />
      <Label htmlFor="disabled" className="opacity-50">
        Disabled
      </Label>
    </div>
  ),
};

export const DisabledChecked: Story = {
  render: () => (
    <div className="flex items-center space-x-2">
      <Switch id="disabled-checked" disabled checked />
      <Label htmlFor="disabled-checked" className="opacity-50">
        Disabled and Checked
      </Label>
    </div>
  ),
};

export const Multiple: Story = {
  render: () => (
    <div className="space-y-4">
      <div className="flex items-center space-x-2">
        <Switch id="notifications" defaultChecked />
        <Label htmlFor="notifications">Enable notifications</Label>
      </div>
      <div className="flex items-center space-x-2">
        <Switch id="marketing" />
        <Label htmlFor="marketing">Marketing emails</Label>
      </div>
      <div className="flex items-center space-x-2">
        <Switch id="updates" defaultChecked />
        <Label htmlFor="updates">Product updates</Label>
      </div>
    </div>
  ),
};

export const WithDescription: Story = {
  render: () => (
    <div className="flex items-start space-x-2">
      <Switch id="security" className="mt-1" />
      <div className="grid gap-1.5 leading-none">
        <Label htmlFor="security">Two-factor authentication</Label>
        <p className="text-sm text-gray-500">
          Require a verification code in addition to your password
        </p>
      </div>
    </div>
  ),
};

export const Controlled: Story = {
  render: () => {
    const [enabled, setEnabled] = useState(false);

    return (
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <Switch
            id="controlled"
            checked={enabled}
            onCheckedChange={setEnabled}
          />
          <Label htmlFor="controlled">
            {enabled ? 'Enabled' : 'Disabled'}
          </Label>
        </div>
        <button
          className="rounded-md bg-blue-500 px-4 py-2 text-sm text-white"
          onClick={() => setEnabled(!enabled)}
        >
          Toggle
        </button>
      </div>
    );
  },
};

export const Settings: Story = {
  render: () => {
    const [settings, setSettings] = useState({
      notifications: true,
      darkMode: false,
      autoSave: true,
      analytics: false,
    });

    const updateSetting = (key: keyof typeof settings) => {
      setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
    };

    return (
      <div className="w-96 space-y-6">
        <div className="space-y-4">
          <h3 className="font-semibold">Preferences</h3>

          <div className="flex items-center justify-between">
            <div className="flex-1">
              <Label htmlFor="s-notifications" className="font-medium">
                Notifications
              </Label>
              <p className="text-sm text-gray-500">
                Receive push notifications
              </p>
            </div>
            <Switch
              id="s-notifications"
              checked={settings.notifications}
              onCheckedChange={() => updateSetting('notifications')}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex-1">
              <Label htmlFor="s-dark-mode" className="font-medium">
                Dark Mode
              </Label>
              <p className="text-sm text-gray-500">
                Use dark theme
              </p>
            </div>
            <Switch
              id="s-dark-mode"
              checked={settings.darkMode}
              onCheckedChange={() => updateSetting('darkMode')}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex-1">
              <Label htmlFor="s-auto-save" className="font-medium">
                Auto-save
              </Label>
              <p className="text-sm text-gray-500">
                Automatically save changes
              </p>
            </div>
            <Switch
              id="s-auto-save"
              checked={settings.autoSave}
              onCheckedChange={() => updateSetting('autoSave')}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex-1">
              <Label htmlFor="s-analytics" className="font-medium">
                Analytics
              </Label>
              <p className="text-sm text-gray-500">
                Help improve our product
              </p>
            </div>
            <Switch
              id="s-analytics"
              checked={settings.analytics}
              onCheckedChange={() => updateSetting('analytics')}
            />
          </div>
        </div>

        <div className="rounded-lg bg-gray-100 p-4">
          <p className="text-sm font-medium">Current Settings:</p>
          <pre className="mt-2 text-xs">{JSON.stringify(settings, null, 2)}</pre>
        </div>
      </div>
    );
  },
};

export const InCard: Story = {
  render: () => (
    <div className="w-96 rounded-lg border p-6">
      <div className="space-y-4">
        <div>
          <h3 className="font-semibold">Privacy Settings</h3>
          <p className="text-sm text-gray-500">
            Manage how your data is used
          </p>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="profile-visible">Profile visible</Label>
            <Switch id="profile-visible" defaultChecked />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="show-email">Show email</Label>
            <Switch id="show-email" />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="show-activity">Show activity</Label>
            <Switch id="show-activity" defaultChecked />
          </div>
        </div>
      </div>
    </div>
  ),
};
