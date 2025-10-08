import type { Meta, StoryObj } from '@storybook/react';
import { Button } from '../components/ui/button-new';
import { Download, Send, Plus, Trash2, Settings } from 'lucide-react';

const meta = {
  title: 'Components/Button',
  component: Button,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'A versatile button component built with Radix UI and CVA, featuring 5 variants, 4 sizes, loading states, and icon support.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'outline', 'ghost', 'danger'],
      description: 'Button visual style variant',
    },
    size: {
      control: 'select',
      options: ['xs', 'sm', 'md', 'lg'],
      description: 'Button size',
    },
    fullWidth: {
      control: 'boolean',
      description: 'Make button full width',
    },
    loading: {
      control: 'boolean',
      description: 'Show loading spinner',
    },
    disabled: {
      control: 'boolean',
      description: 'Disable button',
    },
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

// Default story
export const Default: Story = {
  args: {
    children: 'Button',
    variant: 'primary',
    size: 'md',
  },
};

// Variants
export const Primary: Story = {
  args: {
    children: 'Primary Button',
    variant: 'primary',
  },
};

export const Secondary: Story = {
  args: {
    children: 'Secondary Button',
    variant: 'secondary',
  },
};

export const Outline: Story = {
  args: {
    children: 'Outline Button',
    variant: 'outline',
  },
};

export const Ghost: Story = {
  args: {
    children: 'Ghost Button',
    variant: 'ghost',
  },
};

export const Danger: Story = {
  args: {
    children: 'Danger Button',
    variant: 'danger',
  },
};

// Sizes
export const ExtraSmall: Story = {
  args: {
    children: 'Extra Small',
    size: 'xs',
  },
};

export const Small: Story = {
  args: {
    children: 'Small Button',
    size: 'sm',
  },
};

export const Medium: Story = {
  args: {
    children: 'Medium Button',
    size: 'md',
  },
};

export const Large: Story = {
  args: {
    children: 'Large Button',
    size: 'lg',
  },
};

// States
export const Loading: Story = {
  args: {
    children: 'Loading Button',
    loading: true,
  },
};

export const Disabled: Story = {
  args: {
    children: 'Disabled Button',
    disabled: true,
  },
};

export const FullWidth: Story = {
  args: {
    children: 'Full Width Button',
    fullWidth: true,
  },
  parameters: {
    layout: 'padded',
  },
};

// With Icons
export const WithLeftIcon: Story = {
  args: {
    children: 'Download',
    leftIcon: <Download className="h-4 w-4" />,
  },
};

export const WithRightIcon: Story = {
  args: {
    children: 'Send Message',
    rightIcon: <Send className="h-4 w-4" />,
  },
};

export const WithBothIcons: Story = {
  args: {
    children: 'Save',
    leftIcon: <Plus className="h-4 w-4" />,
    rightIcon: <Download className="h-4 w-4" />,
  },
};

// Icon Only
export const IconOnly: Story = {
  args: {
    children: <Settings className="h-5 w-5" />,
    size: 'md',
    variant: 'ghost',
    'aria-label': 'Settings',
  },
};

// All Variants Showcase
export const AllVariants: Story = {
  render: () => (
    <div className="space-y-4">
      <div className="flex gap-4 flex-wrap items-center">
        <Button variant="primary">Primary</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="outline">Outline</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="danger">Danger</Button>
      </div>
    </div>
  ),
};

// All Sizes Showcase
export const AllSizes: Story = {
  render: () => (
    <div className="space-y-4">
      <div className="flex gap-4 items-center flex-wrap">
        <Button size="xs">Extra Small</Button>
        <Button size="sm">Small</Button>
        <Button size="md">Medium</Button>
        <Button size="lg">Large</Button>
      </div>
    </div>
  ),
};

// Real-world Examples
export const ActionButtons: Story = {
  render: () => (
    <div className="space-y-4">
      <div className="flex gap-3 flex-wrap">
        <Button variant="primary" leftIcon={<Plus className="h-4 w-4" />}>
          Create New
        </Button>
        <Button variant="secondary" leftIcon={<Download className="h-4 w-4" />}>
          Export
        </Button>
        <Button variant="outline" leftIcon={<Settings className="h-4 w-4" />}>
          Settings
        </Button>
        <Button variant="danger" leftIcon={<Trash2 className="h-4 w-4" />}>
          Delete
        </Button>
      </div>
    </div>
  ),
};

// Loading States
export const LoadingStates: Story = {
  render: () => (
    <div className="space-y-4">
      <div className="flex gap-4 flex-wrap">
        <Button variant="primary" loading>
          Saving...
        </Button>
        <Button variant="secondary" loading>
          Loading...
        </Button>
        <Button variant="outline" loading>
          Processing...
        </Button>
      </div>
    </div>
  ),
};

// Form Buttons
export const FormButtons: Story = {
  render: () => (
    <div className="space-y-4 w-full max-w-md">
      <Button variant="primary" fullWidth>
        Submit Form
      </Button>
      <div className="flex gap-3">
        <Button variant="outline" fullWidth>
          Cancel
        </Button>
        <Button variant="primary" fullWidth>
          Save
        </Button>
      </div>
    </div>
  ),
  parameters: {
    layout: 'padded',
  },
};

// Mobile-optimized (all buttons meet 48px min height)
export const MobileOptimized: Story = {
  render: () => (
    <div className="space-y-4 max-w-sm">
      <Button variant="primary" size="md" fullWidth>
        Mobile Touch Target (48px)
      </Button>
      <Button variant="secondary" size="lg" fullWidth>
        Large Touch Target (56px)
      </Button>
      <div className="flex gap-3">
        <Button variant="outline" fullWidth>
          Cancel
        </Button>
        <Button variant="primary" fullWidth>
          Confirm
        </Button>
      </div>
    </div>
  ),
  parameters: {
    layout: 'padded',
    viewport: {
      defaultViewport: 'mobile1',
    },
  },
};
