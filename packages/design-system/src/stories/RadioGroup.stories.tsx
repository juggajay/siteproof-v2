import type { Meta, StoryObj } from '@storybook/react';
import { RadioGroup, RadioGroupItem } from '../components/ui/radio-group';
import { Label } from '../components/ui/label';
import { useState } from 'react';

const meta = {
  title: 'Components/RadioGroup',
  component: RadioGroup,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof RadioGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <RadioGroup defaultValue="option-one">
      <div className="flex items-center space-x-2">
        <RadioGroupItem value="option-one" id="option-one" />
        <Label htmlFor="option-one">Option One</Label>
      </div>
      <div className="flex items-center space-x-2">
        <RadioGroupItem value="option-two" id="option-two" />
        <Label htmlFor="option-two">Option Two</Label>
      </div>
    </RadioGroup>
  ),
};

export const Multiple: Story = {
  render: () => (
    <RadioGroup defaultValue="comfortable">
      <div className="flex items-center space-x-2">
        <RadioGroupItem value="default" id="r1" />
        <Label htmlFor="r1">Default</Label>
      </div>
      <div className="flex items-center space-x-2">
        <RadioGroupItem value="comfortable" id="r2" />
        <Label htmlFor="r2">Comfortable</Label>
      </div>
      <div className="flex items-center space-x-2">
        <RadioGroupItem value="compact" id="r3" />
        <Label htmlFor="r3">Compact</Label>
      </div>
    </RadioGroup>
  ),
};

export const WithDescriptions: Story = {
  render: () => (
    <RadioGroup defaultValue="card">
      <div className="flex items-start space-x-2">
        <RadioGroupItem value="card" id="card" className="mt-1" />
        <div className="grid gap-1.5 leading-none">
          <Label htmlFor="card">Credit Card</Label>
          <p className="text-sm text-gray-500">
            Pay with credit or debit card
          </p>
        </div>
      </div>
      <div className="flex items-start space-x-2">
        <RadioGroupItem value="paypal" id="paypal" className="mt-1" />
        <div className="grid gap-1.5 leading-none">
          <Label htmlFor="paypal">PayPal</Label>
          <p className="text-sm text-gray-500">
            Pay with your PayPal account
          </p>
        </div>
      </div>
      <div className="flex items-start space-x-2">
        <RadioGroupItem value="bank" id="bank" className="mt-1" />
        <div className="grid gap-1.5 leading-none">
          <Label htmlFor="bank">Bank Transfer</Label>
          <p className="text-sm text-gray-500">
            Direct bank transfer
          </p>
        </div>
      </div>
    </RadioGroup>
  ),
};

export const Disabled: Story = {
  render: () => (
    <RadioGroup defaultValue="option-one">
      <div className="flex items-center space-x-2">
        <RadioGroupItem value="option-one" id="d1" />
        <Label htmlFor="d1">Enabled Option</Label>
      </div>
      <div className="flex items-center space-x-2">
        <RadioGroupItem value="option-two" id="d2" disabled />
        <Label htmlFor="d2" className="opacity-50">
          Disabled Option
        </Label>
      </div>
      <div className="flex items-center space-x-2">
        <RadioGroupItem value="option-three" id="d3" />
        <Label htmlFor="d3">Another Enabled Option</Label>
      </div>
    </RadioGroup>
  ),
};

export const Controlled: Story = {
  render: () => {
    const [value, setValue] = useState('option-one');

    return (
      <div className="space-y-4">
        <RadioGroup value={value} onValueChange={setValue}>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="option-one" id="c1" />
            <Label htmlFor="c1">Option One</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="option-two" id="c2" />
            <Label htmlFor="c2">Option Two</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="option-three" id="c3" />
            <Label htmlFor="c3">Option Three</Label>
          </div>
        </RadioGroup>
        <div className="text-sm">
          Selected: <strong>{value}</strong>
        </div>
      </div>
    );
  },
};

export const InForm: Story = {
  render: () => {
    const [plan, setPlan] = useState('free');

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      alert(`Selected plan: ${plan}`);
    };

    return (
      <form onSubmit={handleSubmit} className="w-80 space-y-4">
        <div className="space-y-2">
          <h3 className="font-semibold">Choose a plan</h3>
          <RadioGroup value={plan} onValueChange={setPlan}>
            <div className="rounded-lg border p-4">
              <div className="flex items-start space-x-2">
                <RadioGroupItem value="free" id="free" className="mt-1" />
                <div className="flex-1">
                  <Label htmlFor="free" className="font-medium">
                    Free
                  </Label>
                  <p className="text-sm text-gray-500">
                    $0/month - Basic features
                  </p>
                </div>
              </div>
            </div>
            <div className="rounded-lg border p-4">
              <div className="flex items-start space-x-2">
                <RadioGroupItem value="pro" id="pro" className="mt-1" />
                <div className="flex-1">
                  <Label htmlFor="pro" className="font-medium">
                    Pro
                  </Label>
                  <p className="text-sm text-gray-500">
                    $19/month - All features
                  </p>
                </div>
              </div>
            </div>
            <div className="rounded-lg border p-4">
              <div className="flex items-start space-x-2">
                <RadioGroupItem value="enterprise" id="enterprise" className="mt-1" />
                <div className="flex-1">
                  <Label htmlFor="enterprise" className="font-medium">
                    Enterprise
                  </Label>
                  <p className="text-sm text-gray-500">
                    Custom pricing - Advanced support
                  </p>
                </div>
              </div>
            </div>
          </RadioGroup>
        </div>
        <button
          type="submit"
          className="w-full rounded-md bg-blue-500 px-4 py-2 text-sm text-white hover:bg-blue-600"
        >
          Continue
        </button>
      </form>
    );
  },
};

export const Cards: Story = {
  render: () => {
    const [selected, setSelected] = useState('1');

    return (
      <RadioGroup value={selected} onValueChange={setSelected} className="grid gap-4">
        {['1', '2', '3'].map((value) => (
          <label
            key={value}
            htmlFor={`card-${value}`}
            className={`flex cursor-pointer items-center space-x-3 rounded-lg border-2 p-4 transition-colors ${
              selected === value
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <RadioGroupItem value={value} id={`card-${value}`} />
            <div className="flex-1">
              <div className="font-medium">Option {value}</div>
              <div className="text-sm text-gray-500">
                Description for option {value}
              </div>
            </div>
          </label>
        ))}
      </RadioGroup>
    );
  },
};
