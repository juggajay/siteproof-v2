import type { Meta, StoryObj } from '@storybook/react';
import { Checkbox } from '../components/ui/Checkbox';
import { Label } from '../components/ui/label';
import { useState } from 'react';

const meta = {
  title: 'Components/Checkbox',
  component: Checkbox,
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
} satisfies Meta<typeof Checkbox>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => <Checkbox />,
};

export const WithText: Story = {
  render: () => (
    <div className="flex items-center space-x-2">
      <Checkbox id="terms" />
      <label
        htmlFor="terms"
        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
      >
        Accept terms and conditions
      </label>
    </div>
  ),
};

export const WithLabel: Story = {
  render: () => (
    <div className="flex items-center space-x-2">
      <Checkbox id="terms2" />
      <Label htmlFor="terms2">Accept terms and conditions</Label>
    </div>
  ),
};

export const Disabled: Story = {
  render: () => (
    <div className="flex items-center space-x-2">
      <Checkbox id="disabled" disabled />
      <Label htmlFor="disabled" className="opacity-50">
        Disabled checkbox
      </Label>
    </div>
  ),
};

export const DisabledChecked: Story = {
  render: () => (
    <div className="flex items-center space-x-2">
      <Checkbox id="disabled-checked" disabled checked />
      <Label htmlFor="disabled-checked" className="opacity-50">
        Disabled and checked
      </Label>
    </div>
  ),
};

export const Multiple: Story = {
  render: () => (
    <div className="space-y-3">
      <div className="flex items-center space-x-2">
        <Checkbox id="option1" />
        <Label htmlFor="option1">Option 1</Label>
      </div>
      <div className="flex items-center space-x-2">
        <Checkbox id="option2" />
        <Label htmlFor="option2">Option 2</Label>
      </div>
      <div className="flex items-center space-x-2">
        <Checkbox id="option3" />
        <Label htmlFor="option3">Option 3</Label>
      </div>
    </div>
  ),
};

export const Controlled: Story = {
  render: () => {
    const [checked, setChecked] = useState(false);

    return (
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="controlled"
            checked={checked}
            onCheckedChange={(value) => setChecked(value as boolean)}
          />
          <Label htmlFor="controlled">
            Click me (Checked: {checked ? 'Yes' : 'No'})
          </Label>
        </div>
        <button
          className="rounded-md bg-blue-500 px-4 py-2 text-sm text-white"
          onClick={() => setChecked(!checked)}
        >
          Toggle
        </button>
      </div>
    );
  },
};

export const WithDescription: Story = {
  render: () => (
    <div className="flex items-start space-x-2">
      <Checkbox id="marketing" className="mt-1" />
      <div className="grid gap-1.5 leading-none">
        <Label htmlFor="marketing">Marketing emails</Label>
        <p className="text-sm text-gray-500">
          Receive emails about new products, features, and more.
        </p>
      </div>
    </div>
  ),
};

export const List: Story = {
  render: () => {
    const items = [
      { id: 'item1', label: 'Secure password', checked: true },
      { id: 'item2', label: 'At least 8 characters', checked: true },
      { id: 'item3', label: 'Contains a number', checked: false },
      { id: 'item4', label: 'Contains a special character', checked: false },
    ];

    return (
      <div className="space-y-3">
        <div className="font-semibold">Password Requirements</div>
        {items.map((item) => (
          <div key={item.id} className="flex items-center space-x-2">
            <Checkbox id={item.id} defaultChecked={item.checked} />
            <Label
              htmlFor={item.id}
              className={item.checked ? 'line-through text-gray-500' : ''}
            >
              {item.label}
            </Label>
          </div>
        ))}
      </div>
    );
  },
};

export const Form: Story = {
  render: () => {
    const [formData, setFormData] = useState({
      marketing: false,
      updates: false,
      newsletter: true,
    });

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      console.log('Form submitted:', formData);
      alert(JSON.stringify(formData, null, 2));
    };

    return (
      <form onSubmit={handleSubmit} className="space-y-4 w-72">
        <div className="font-semibold">Email Preferences</div>
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="marketing"
              checked={formData.marketing}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, marketing: checked as boolean })
              }
            />
            <Label htmlFor="marketing">Marketing emails</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="updates"
              checked={formData.updates}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, updates: checked as boolean })
              }
            />
            <Label htmlFor="updates">Product updates</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="newsletter"
              checked={formData.newsletter}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, newsletter: checked as boolean })
              }
            />
            <Label htmlFor="newsletter">Weekly newsletter</Label>
          </div>
        </div>
        <button
          type="submit"
          className="w-full rounded-md bg-blue-500 px-4 py-2 text-sm text-white hover:bg-blue-600"
        >
          Save Preferences
        </button>
      </form>
    );
  },
};
