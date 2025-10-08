import type { Meta, StoryObj } from '@storybook/react';
import { ThemeToggle } from '../theme-toggle';

const meta: Meta<typeof ThemeToggle> = {
  title: 'Theme/ThemeToggle',
  component: ThemeToggle,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof ThemeToggle>;

export const Default: Story = {
  render: () => (
    <div className="p-8 bg-surface rounded-lg">
      <div className="flex items-center gap-4">
        <span className="text-foreground">Toggle theme:</span>
        <ThemeToggle />
      </div>
    </div>
  ),
};

export const WithDarkBackground: Story = {
  render: () => (
    <div className="p-8 bg-gray-900 rounded-lg">
      <div className="flex items-center gap-4">
        <span className="text-white">Toggle theme:</span>
        <ThemeToggle />
      </div>
    </div>
  ),
};

export const InNavbar: Story = {
  render: () => (
    <nav className="flex items-center justify-between p-4 bg-surface-container border-b border-gray-200 dark:border-gray-800">
      <h1 className="text-h4 text-foreground">SiteProof</h1>
      <div className="flex items-center gap-4">
        <span className="text-foreground-muted">Settings</span>
        <ThemeToggle />
      </div>
    </nav>
  ),
};
