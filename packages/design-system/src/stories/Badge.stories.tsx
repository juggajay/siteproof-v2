import type { Meta, StoryObj } from '@storybook/react';
import { Badge } from '../components/ui/badge';

const meta = {
  title: 'Components/Badge',
  component: Badge,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'success', 'error', 'warning', 'info', 'outline'],
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
    },
    dot: {
      control: 'boolean',
    },
  },
} satisfies Meta<typeof Badge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: 'Badge',
  },
};

export const Variants: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Badge variant="default">Default</Badge>
      <Badge variant="success">Success</Badge>
      <Badge variant="error">Error</Badge>
      <Badge variant="warning">Warning</Badge>
      <Badge variant="info">Info</Badge>
      <Badge variant="outline">Outline</Badge>
    </div>
  ),
};

export const Sizes: Story = {
  render: () => (
    <div className="flex items-center gap-2">
      <Badge size="sm">Small</Badge>
      <Badge size="md">Medium</Badge>
      <Badge size="lg">Large</Badge>
    </div>
  ),
};

export const WithDot: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Badge variant="default" dot>Default</Badge>
      <Badge variant="success" dot>Success</Badge>
      <Badge variant="error" dot>Error</Badge>
      <Badge variant="warning" dot>Warning</Badge>
      <Badge variant="info" dot>Info</Badge>
    </div>
  ),
};

export const StatusBadges: Story = {
  render: () => (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <span className="text-sm">Online:</span>
        <Badge variant="success" dot>Active</Badge>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm">Offline:</span>
        <Badge variant="error" dot>Inactive</Badge>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm">Away:</span>
        <Badge variant="warning" dot>Idle</Badge>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm">Busy:</span>
        <Badge variant="info" dot>In Meeting</Badge>
      </div>
    </div>
  ),
};

export const InText: Story = {
  render: () => (
    <div className="max-w-md space-y-4">
      <p className="text-sm">
        This feature is <Badge variant="success">New</Badge> and available in the latest version.
      </p>
      <p className="text-sm">
        Your subscription <Badge variant="warning">Expires Soon</Badge>. Please renew.
      </p>
      <p className="text-sm">
        System status: <Badge variant="error" dot>Critical Error</Badge>
      </p>
    </div>
  ),
};

export const Counts: Story = {
  render: () => (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <span className="text-sm">Notifications</span>
        <Badge variant="error">5</Badge>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm">Messages</span>
        <Badge variant="info">12</Badge>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm">Tasks</span>
        <Badge variant="warning">3</Badge>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm">Completed</span>
        <Badge variant="success">42</Badge>
      </div>
    </div>
  ),
};

export const Labels: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Badge variant="outline">React</Badge>
      <Badge variant="outline">TypeScript</Badge>
      <Badge variant="outline">Tailwind</Badge>
      <Badge variant="outline">Storybook</Badge>
      <Badge variant="outline">Jest</Badge>
    </div>
  ),
};
