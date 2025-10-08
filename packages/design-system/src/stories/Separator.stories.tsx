import type { Meta, StoryObj } from '@storybook/react';
import { Separator } from '../components/ui/separator';

const meta = {
  title: 'Components/Separator',
  component: Separator,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    orientation: {
      control: 'select',
      options: ['horizontal', 'vertical'],
    },
    decorative: {
      control: 'boolean',
    },
  },
} satisfies Meta<typeof Separator>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Horizontal: Story = {
  render: () => (
    <div className="w-96 space-y-4">
      <div>
        <h4 className="text-sm font-medium leading-none">Section 1</h4>
        <p className="text-sm text-gray-500">Content for section 1</p>
      </div>
      <Separator />
      <div>
        <h4 className="text-sm font-medium leading-none">Section 2</h4>
        <p className="text-sm text-gray-500">Content for section 2</p>
      </div>
    </div>
  ),
};

export const Vertical: Story = {
  render: () => (
    <div className="flex h-20 items-center space-x-4">
      <div className="text-sm">
        <h4 className="font-medium">Item 1</h4>
        <p className="text-gray-500">Details</p>
      </div>
      <Separator orientation="vertical" />
      <div className="text-sm">
        <h4 className="font-medium">Item 2</h4>
        <p className="text-gray-500">Details</p>
      </div>
      <Separator orientation="vertical" />
      <div className="text-sm">
        <h4 className="font-medium">Item 3</h4>
        <p className="text-gray-500">Details</p>
      </div>
    </div>
  ),
};

export const InContent: Story = {
  render: () => (
    <div className="w-96">
      <div className="space-y-1">
        <h4 className="text-sm font-medium leading-none">Radix Primitives</h4>
        <p className="text-sm text-gray-500">
          An open-source UI component library.
        </p>
      </div>
      <Separator className="my-4" />
      <div className="flex h-5 items-center space-x-4 text-sm">
        <div>Blog</div>
        <Separator orientation="vertical" />
        <div>Docs</div>
        <Separator orientation="vertical" />
        <div>Source</div>
      </div>
    </div>
  ),
};

export const InMenu: Story = {
  render: () => (
    <div className="w-64 rounded-lg border p-2">
      <div className="px-2 py-1.5 text-sm font-semibold">Menu</div>
      <Separator className="my-1" />
      <div className="space-y-1">
        <div className="rounded-sm px-2 py-1.5 text-sm hover:bg-gray-100">
          Profile
        </div>
        <div className="rounded-sm px-2 py-1.5 text-sm hover:bg-gray-100">
          Settings
        </div>
      </div>
      <Separator className="my-1" />
      <div className="space-y-1">
        <div className="rounded-sm px-2 py-1.5 text-sm hover:bg-gray-100">
          Help
        </div>
        <div className="rounded-sm px-2 py-1.5 text-sm text-red-600 hover:bg-red-50">
          Logout
        </div>
      </div>
    </div>
  ),
};

export const CustomColor: Story = {
  render: () => (
    <div className="w-96 space-y-4">
      <div>
        <h4 className="text-sm font-medium">Default Gray</h4>
      </div>
      <Separator />
      <div>
        <h4 className="text-sm font-medium">Custom Blue</h4>
      </div>
      <Separator className="bg-blue-500" />
      <div>
        <h4 className="text-sm font-medium">Custom Red</h4>
      </div>
      <Separator className="bg-red-500" />
    </div>
  ),
};

export const DifferentWidths: Story = {
  render: () => (
    <div className="w-96 space-y-4">
      <Separator className="h-px" />
      <Separator className="h-0.5" />
      <Separator className="h-1" />
      <Separator className="h-2" />
    </div>
  ),
};
