import type { Meta, StoryObj } from '@storybook/react';
import { Label } from '../components/ui/label';
import { Input } from '../components/ui/Input';
import { Checkbox } from '../components/ui/Checkbox';

const meta = {
  title: 'Components/Label',
  component: Label,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Label>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => <Label>Label Text</Label>,
};

export const WithInput: Story = {
  render: () => (
    <div className="grid w-full max-w-sm items-center gap-1.5">
      <Label htmlFor="email">Email</Label>
      <Input type="email" id="email" placeholder="Email" />
    </div>
  ),
};

export const WithCheckbox: Story = {
  render: () => (
    <div className="flex items-center space-x-2">
      <Checkbox id="terms" />
      <Label
        htmlFor="terms"
        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
      >
        Accept terms and conditions
      </Label>
    </div>
  ),
};

export const Required: Story = {
  render: () => (
    <div className="grid w-full max-w-sm items-center gap-1.5">
      <Label htmlFor="name">
        Name <span className="text-red-500">*</span>
      </Label>
      <Input type="text" id="name" placeholder="Your name" required />
    </div>
  ),
};

export const WithDescription: Story = {
  render: () => (
    <div className="grid w-full max-w-sm items-center gap-1.5">
      <Label htmlFor="password">Password</Label>
      <Input type="password" id="password" />
      <p className="text-xs text-gray-500">
        Must be at least 8 characters long
      </p>
    </div>
  ),
};

export const Multiple: Story = {
  render: () => (
    <div className="space-y-4 w-full max-w-sm">
      <div className="grid items-center gap-1.5">
        <Label htmlFor="first-name">First Name</Label>
        <Input type="text" id="first-name" placeholder="John" />
      </div>
      <div className="grid items-center gap-1.5">
        <Label htmlFor="last-name">Last Name</Label>
        <Input type="text" id="last-name" placeholder="Doe" />
      </div>
      <div className="grid items-center gap-1.5">
        <Label htmlFor="email-multi">Email</Label>
        <Input type="email" id="email-multi" placeholder="john@example.com" />
      </div>
    </div>
  ),
};

export const Disabled: Story = {
  render: () => (
    <div className="grid w-full max-w-sm items-center gap-1.5">
      <Label htmlFor="disabled" className="opacity-50">
        Disabled Field
      </Label>
      <Input type="text" id="disabled" disabled placeholder="Cannot edit" />
    </div>
  ),
};

export const CustomStyling: Story = {
  render: () => (
    <div className="space-y-4 w-full max-w-sm">
      <div className="grid items-center gap-1.5">
        <Label htmlFor="bold" className="font-bold">
          Bold Label
        </Label>
        <Input type="text" id="bold" />
      </div>
      <div className="grid items-center gap-1.5">
        <Label htmlFor="large" className="text-lg">
          Large Label
        </Label>
        <Input type="text" id="large" />
      </div>
      <div className="grid items-center gap-1.5">
        <Label htmlFor="colored" className="text-blue-600">
          Colored Label
        </Label>
        <Input type="text" id="colored" />
      </div>
    </div>
  ),
};
