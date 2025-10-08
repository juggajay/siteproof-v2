import type { Meta, StoryObj } from '@storybook/react';
import { Input } from '../components/ui/input-new';
import { Mail, Lock, Search, User, Phone, CreditCard } from 'lucide-react';

const meta = {
  title: 'Components/Input',
  component: Input,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'An accessible, mobile-optimized input component with label, error states, helper text, icons, and password toggle functionality.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    type: {
      control: 'select',
      options: ['text', 'email', 'password', 'number', 'tel', 'url', 'search'],
      description: 'Input type',
    },
    fullWidth: {
      control: 'boolean',
      description: 'Make input full width',
    },
    disabled: {
      control: 'boolean',
      description: 'Disable input',
    },
    error: {
      control: 'text',
      description: 'Error message',
    },
    success: {
      control: 'boolean',
      description: 'Show success state',
    },
  },
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

// Default
export const Default: Story = {
  args: {
    placeholder: 'Enter text...',
  },
};

// With Label
export const WithLabel: Story = {
  args: {
    label: 'Email Address',
    type: 'email',
    placeholder: 'you@example.com',
  },
};

// With Helper Text
export const WithHelperText: Story = {
  args: {
    label: 'Username',
    placeholder: 'johndoe',
    helperText: 'Choose a unique username',
  },
};

// Error State
export const WithError: Story = {
  args: {
    label: 'Email',
    type: 'email',
    defaultValue: 'invalid-email',
    error: 'Please enter a valid email address',
  },
};

// Success State
export const WithSuccess: Story = {
  args: {
    label: 'Email',
    type: 'email',
    defaultValue: 'valid@email.com',
    success: true,
  },
};

// Disabled
export const Disabled: Story = {
  args: {
    label: 'Disabled Input',
    placeholder: 'Cannot edit',
    disabled: true,
    defaultValue: 'Some value',
  },
};

// Full Width
export const FullWidth: Story = {
  args: {
    label: 'Full Width Input',
    placeholder: 'This spans the full width',
    fullWidth: true,
  },
  parameters: {
    layout: 'padded',
  },
};

// With Left Icon
export const WithLeftIcon: Story = {
  args: {
    label: 'Email',
    type: 'email',
    placeholder: 'you@example.com',
    leftIcon: <Mail className="h-5 w-5" />,
  },
};

// With Right Icon
export const WithRightIcon: Story = {
  args: {
    label: 'Search',
    type: 'search',
    placeholder: 'Search...',
    rightIcon: <Search className="h-5 w-5" />,
  },
};

// Password with Toggle
export const PasswordWithToggle: Story = {
  args: {
    label: 'Password',
    type: 'password',
    placeholder: 'Enter your password',
    showPasswordToggle: true,
  },
};

// Password with Toggle and Icon
export const PasswordComplete: Story = {
  args: {
    label: 'Password',
    type: 'password',
    placeholder: 'Enter your password',
    leftIcon: <Lock className="h-5 w-5" />,
    showPasswordToggle: true,
    helperText: 'Must be at least 8 characters',
  },
};

// Login Form Example
export const LoginForm: Story = {
  render: () => (
    <div className="space-y-4 w-full max-w-sm">
      <Input
        label="Email"
        type="email"
        placeholder="you@example.com"
        leftIcon={<Mail className="h-5 w-5" />}
        fullWidth
      />
      <Input
        label="Password"
        type="password"
        placeholder="Enter your password"
        leftIcon={<Lock className="h-5 w-5" />}
        showPasswordToggle
        fullWidth
      />
    </div>
  ),
  parameters: {
    layout: 'padded',
  },
};

// Form with Validation
export const FormWithValidation: Story = {
  render: () => (
    <div className="space-y-4 w-full max-w-sm">
      <Input
        label="Email"
        type="email"
        defaultValue="valid@email.com"
        success
        leftIcon={<Mail className="h-5 w-5" />}
        fullWidth
      />
      <Input
        label="Phone Number"
        type="tel"
        defaultValue="123"
        error="Phone number must be at least 10 digits"
        leftIcon={<Phone className="h-5 w-5" />}
        fullWidth
      />
      <Input
        label="Full Name"
        type="text"
        placeholder="John Doe"
        leftIcon={<User className="h-5 w-5" />}
        helperText="Enter your first and last name"
        fullWidth
      />
    </div>
  ),
  parameters: {
    layout: 'padded',
  },
};

// All Input Types
export const AllInputTypes: Story = {
  render: () => (
    <div className="space-y-4 w-full max-w-md">
      <Input label="Text" type="text" placeholder="Text input" fullWidth />
      <Input label="Email" type="email" placeholder="email@example.com" fullWidth />
      <Input label="Password" type="password" placeholder="Password" showPasswordToggle fullWidth />
      <Input label="Number" type="number" placeholder="123" fullWidth />
      <Input label="Tel" type="tel" placeholder="(555) 123-4567" fullWidth />
      <Input label="URL" type="url" placeholder="https://example.com" fullWidth />
      <Input label="Search" type="search" placeholder="Search..." fullWidth />
    </div>
  ),
  parameters: {
    layout: 'padded',
  },
};

// Different States
export const DifferentStates: Story = {
  render: () => (
    <div className="space-y-4 w-full max-w-md">
      <Input label="Default" placeholder="Default state" fullWidth />
      <Input label="With Value" defaultValue="Some value" fullWidth />
      <Input label="Success" defaultValue="Validated" success fullWidth />
      <Input label="Error" defaultValue="Invalid" error="This field is required" fullWidth />
      <Input label="Disabled" defaultValue="Cannot edit" disabled fullWidth />
    </div>
  ),
  parameters: {
    layout: 'padded',
  },
};

// Mobile Optimized
export const MobileOptimized: Story = {
  render: () => (
    <div className="space-y-4 w-full">
      <Input
        label="Email"
        type="email"
        placeholder="you@example.com"
        leftIcon={<Mail className="h-5 w-5" />}
        helperText="Uses 16px font to prevent zoom on iOS"
        fullWidth
      />
      <Input
        label="Phone"
        type="tel"
        placeholder="(555) 123-4567"
        leftIcon={<Phone className="h-5 w-5" />}
        helperText="48px min height for easy tapping"
        fullWidth
      />
      <Input
        label="Password"
        type="password"
        placeholder="Password"
        leftIcon={<Lock className="h-5 w-5" />}
        showPasswordToggle
        helperText="Password toggle for easy viewing"
        fullWidth
      />
    </div>
  ),
  parameters: {
    layout: 'padded',
    viewport: {
      defaultViewport: 'mobile1',
    },
  },
};

// Payment Form Example
export const PaymentForm: Story = {
  render: () => (
    <div className="space-y-4 w-full max-w-md">
      <Input
        label="Cardholder Name"
        type="text"
        placeholder="John Doe"
        leftIcon={<User className="h-5 w-5" />}
        fullWidth
      />
      <Input
        label="Card Number"
        type="text"
        placeholder="1234 5678 9012 3456"
        leftIcon={<CreditCard className="h-5 w-5" />}
        fullWidth
      />
      <div className="grid grid-cols-2 gap-4">
        <Input label="Expiry" type="text" placeholder="MM/YY" />
        <Input label="CVV" type="text" placeholder="123" />
      </div>
    </div>
  ),
  parameters: {
    layout: 'padded',
  },
};

// Search Input
export const SearchInput: Story = {
  args: {
    type: 'search',
    placeholder: 'Search...',
    leftIcon: <Search className="h-5 w-5" />,
    fullWidth: true,
  },
  parameters: {
    layout: 'padded',
  },
};

// Required Field
export const RequiredField: Story = {
  render: () => (
    <div className="space-y-4 w-full max-w-sm">
      <Input
        label={
          <>
            Email <span className="text-error">*</span>
          </>
        }
        type="email"
        placeholder="you@example.com"
        required
        fullWidth
      />
    </div>
  ),
  parameters: {
    layout: 'padded',
  },
};
