import type { Meta, StoryObj } from '@storybook/react';
import { Input } from '../components/ui/Input';
import { Label } from '../components/ui/label';
import { Button } from '../components/ui/Button';
import { Mail, Lock, Search, Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';

const meta = {
  title: 'Components/Input',
  component: Input,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    type: {
      control: 'select',
      options: ['text', 'email', 'password', 'number', 'tel', 'url'],
    },
    disabled: {
      control: 'boolean',
    },
    placeholder: {
      control: 'text',
    },
  },
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    type: 'text',
    placeholder: 'Enter text...',
  },
  render: (args) => (
    <div className="w-96">
      <Input {...args} />
    </div>
  ),
};

export const WithLabel: Story = {
  render: () => (
    <div className="grid w-96 gap-1.5">
      <Label htmlFor="email">Email</Label>
      <Input type="email" id="email" placeholder="Email" />
    </div>
  ),
};

export const Disabled: Story = {
  render: () => (
    <div className="w-96">
      <Input disabled type="text" placeholder="Disabled input" />
    </div>
  ),
};

export const WithIcon: Story = {
  render: () => (
    <div className="w-96 space-y-4">
      <div className="relative">
        <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
        <Input type="email" placeholder="Email" className="pl-10" />
      </div>
      <div className="relative">
        <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
        <Input type="password" placeholder="Password" className="pl-10" />
      </div>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
        <Input type="text" placeholder="Search..." className="pl-10" />
      </div>
    </div>
  ),
};

export const PasswordToggle: Story = {
  render: () => {
    const [showPassword, setShowPassword] = useState(false);

    return (
      <div className="w-96">
        <Label htmlFor="password">Password</Label>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? 'text' : 'password'}
            placeholder="Enter password"
            className="pr-10"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>
    );
  },
};

export const WithButton: Story = {
  render: () => (
    <div className="flex w-96 space-x-2">
      <Input type="email" placeholder="Enter your email" />
      <Button variant="primary">Subscribe</Button>
    </div>
  ),
};

export const Types: Story = {
  render: () => (
    <div className="w-96 space-y-4">
      <div className="grid gap-1.5">
        <Label htmlFor="text">Text</Label>
        <Input id="text" type="text" placeholder="Text input" />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="email-type">Email</Label>
        <Input id="email-type" type="email" placeholder="name@example.com" />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="password-type">Password</Label>
        <Input id="password-type" type="password" placeholder="Password" />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="number">Number</Label>
        <Input id="number" type="number" placeholder="123" />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="tel">Phone</Label>
        <Input id="tel" type="tel" placeholder="(555) 123-4567" />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="url">URL</Label>
        <Input id="url" type="url" placeholder="https://example.com" />
      </div>
    </div>
  ),
};

export const WithValidation: Story = {
  render: () => {
    const [email, setEmail] = useState('');
    const [error, setError] = useState('');

    const validate = (value: string) => {
      if (!value) {
        setError('Email is required');
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        setError('Please enter a valid email');
      } else {
        setError('');
      }
    };

    return (
      <div className="grid w-96 gap-1.5">
        <Label htmlFor="validation-email">Email</Label>
        <Input
          id="validation-email"
          type="email"
          placeholder="name@example.com"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            validate(e.target.value);
          }}
          className={error ? 'border-red-500 focus-visible:ring-red-500' : ''}
        />
        {error && <p className="text-sm text-red-500">{error}</p>}
      </div>
    );
  },
};

export const Form: Story = {
  render: () => {
    const [formData, setFormData] = useState({
      name: '',
      email: '',
      phone: '',
    });

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      alert(JSON.stringify(formData, null, 2));
    };

    return (
      <form onSubmit={handleSubmit} className="w-96 space-y-4">
        <div className="grid gap-1.5">
          <Label htmlFor="form-name">Name</Label>
          <Input
            id="form-name"
            type="text"
            placeholder="John Doe"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="form-email">Email</Label>
          <Input
            id="form-email"
            type="email"
            placeholder="john@example.com"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            required
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="form-phone">Phone</Label>
          <Input
            id="form-phone"
            type="tel"
            placeholder="(555) 123-4567"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          />
        </div>
        <Button type="submit" variant="primary" className="w-full">
          Submit
        </Button>
      </form>
    );
  },
};

export const Search: Story = {
  render: () => {
    const [query, setQuery] = useState('');

    return (
      <div className="w-96">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
          <Input
            type="search"
            placeholder="Search..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        {query && (
          <p className="mt-2 text-sm text-gray-500">
            Searching for: <strong>{query}</strong>
          </p>
        )}
      </div>
    );
  },
};
