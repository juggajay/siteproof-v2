import type { Meta, StoryObj } from '@storybook/react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/Button';

const meta = {
  title: 'Components/Tabs',
  component: Tabs,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Tabs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Tabs defaultValue="account" className="w-[400px]">
      <TabsList>
        <TabsTrigger value="account">Account</TabsTrigger>
        <TabsTrigger value="password">Password</TabsTrigger>
      </TabsList>
      <TabsContent value="account">
        <p className="text-sm text-gray-600">
          Make changes to your account here.
        </p>
      </TabsContent>
      <TabsContent value="password">
        <p className="text-sm text-gray-600">
          Change your password here.
        </p>
      </TabsContent>
    </Tabs>
  ),
};

export const WithCards: Story = {
  render: () => (
    <Tabs defaultValue="account" className="w-[400px]">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="account">Account</TabsTrigger>
        <TabsTrigger value="password">Password</TabsTrigger>
      </TabsList>
      <TabsContent value="account">
        <Card>
          <CardHeader>
            <CardTitle>Account</CardTitle>
            <CardDescription>
              Make changes to your account here. Click save when you're done.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="space-y-1">
              <label htmlFor="name" className="text-sm font-medium">
                Name
              </label>
              <input
                id="name"
                defaultValue="Pedro Duarte"
                className="w-full rounded-md border px-3 py-2"
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="username" className="text-sm font-medium">
                Username
              </label>
              <input
                id="username"
                defaultValue="@peduarte"
                className="w-full rounded-md border px-3 py-2"
              />
            </div>
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="password">
        <Card>
          <CardHeader>
            <CardTitle>Password</CardTitle>
            <CardDescription>
              Change your password here. After saving, you'll be logged out.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="space-y-1">
              <label htmlFor="current" className="text-sm font-medium">
                Current password
              </label>
              <input
                id="current"
                type="password"
                className="w-full rounded-md border px-3 py-2"
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="new" className="text-sm font-medium">
                New password
              </label>
              <input
                id="new"
                type="password"
                className="w-full rounded-md border px-3 py-2"
              />
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  ),
};

export const Multiple: Story = {
  render: () => (
    <Tabs defaultValue="overview" className="w-[600px]">
      <TabsList>
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="analytics">Analytics</TabsTrigger>
        <TabsTrigger value="reports">Reports</TabsTrigger>
        <TabsTrigger value="notifications">Notifications</TabsTrigger>
      </TabsList>
      <TabsContent value="overview" className="space-y-4">
        <h3 className="text-lg font-semibold">Overview</h3>
        <p className="text-sm text-gray-600">
          View your account overview and recent activity.
        </p>
      </TabsContent>
      <TabsContent value="analytics" className="space-y-4">
        <h3 className="text-lg font-semibold">Analytics</h3>
        <p className="text-sm text-gray-600">
          Track your performance with detailed analytics.
        </p>
      </TabsContent>
      <TabsContent value="reports" className="space-y-4">
        <h3 className="text-lg font-semibold">Reports</h3>
        <p className="text-sm text-gray-600">
          Generate and download custom reports.
        </p>
      </TabsContent>
      <TabsContent value="notifications" className="space-y-4">
        <h3 className="text-lg font-semibold">Notifications</h3>
        <p className="text-sm text-gray-600">
          Manage your notification preferences.
        </p>
      </TabsContent>
    </Tabs>
  ),
};

export const Vertical: Story = {
  render: () => (
    <div className="flex gap-4">
      <Tabs defaultValue="tab1" orientation="vertical" className="w-[600px]">
        <TabsList className="flex flex-col h-full">
          <TabsTrigger value="tab1" className="w-full">Tab 1</TabsTrigger>
          <TabsTrigger value="tab2" className="w-full">Tab 2</TabsTrigger>
          <TabsTrigger value="tab3" className="w-full">Tab 3</TabsTrigger>
        </TabsList>
        <TabsContent value="tab1">Content for Tab 1</TabsContent>
        <TabsContent value="tab2">Content for Tab 2</TabsContent>
        <TabsContent value="tab3">Content for Tab 3</TabsContent>
      </Tabs>
    </div>
  ),
};

export const Disabled: Story = {
  render: () => (
    <Tabs defaultValue="account" className="w-[400px]">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="account">Account</TabsTrigger>
        <TabsTrigger value="password">Password</TabsTrigger>
        <TabsTrigger value="settings" disabled>
          Settings
        </TabsTrigger>
      </TabsList>
      <TabsContent value="account">
        <p className="text-sm text-gray-600">Account content</p>
      </TabsContent>
      <TabsContent value="password">
        <p className="text-sm text-gray-600">Password content</p>
      </TabsContent>
    </Tabs>
  ),
};
