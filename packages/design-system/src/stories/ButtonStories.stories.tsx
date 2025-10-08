import type { Meta, StoryObj } from '@storybook/react';
import { Button } from '../components/ui/Button';
import { Mail, Download, ArrowRight, Loader2 } from 'lucide-react';

const meta = {
  title: 'Components/Button',
  component: Button,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'ghost', 'danger'],
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
    },
    disabled: {
      control: 'boolean',
    },
    loading: {
      control: 'boolean',
    },
    fullWidth: {
      control: 'boolean',
    },
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

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

export const Sizes: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <Button size="sm">Small</Button>
      <Button size="md">Medium</Button>
      <Button size="lg">Large</Button>
    </div>
  ),
};

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <div className="flex gap-4">
        <Button variant="primary">Primary</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="danger">Danger</Button>
      </div>
    </div>
  ),
};

export const WithIcons: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <Button leftIcon={<Mail />}>Send Email</Button>
      <Button rightIcon={<Download />}>Download</Button>
      <Button leftIcon={<Mail />} rightIcon={<ArrowRight />}>
        Continue
      </Button>
    </div>
  ),
};

export const Loading: Story = {
  args: {
    children: 'Loading',
    loading: true,
  },
};

export const LoadingVariants: Story = {
  render: () => (
    <div className="flex gap-4">
      <Button variant="primary" loading>
        Loading...
      </Button>
      <Button variant="secondary" loading>
        Loading...
      </Button>
      <Button variant="danger" loading>
        Loading...
      </Button>
    </div>
  ),
};

export const Disabled: Story = {
  render: () => (
    <div className="flex gap-4">
      <Button variant="primary" disabled>
        Disabled Primary
      </Button>
      <Button variant="secondary" disabled>
        Disabled Secondary
      </Button>
      <Button variant="danger" disabled>
        Disabled Danger
      </Button>
    </div>
  ),
};

export const FullWidth: Story = {
  render: () => (
    <div className="w-96 space-y-4">
      <Button fullWidth variant="primary">
        Full Width Primary
      </Button>
      <Button fullWidth variant="secondary">
        Full Width Secondary
      </Button>
    </div>
  ),
};

export const AsLink: Story = {
  render: () => (
    <div className="flex gap-4">
      <Button variant="ghost">
        <a href="https://example.com" className="flex items-center gap-2">
          Visit Website <ArrowRight className="h-4 w-4" />
        </a>
      </Button>
    </div>
  ),
};

export const Group: Story = {
  render: () => (
    <div className="flex gap-2">
      <Button variant="secondary">Left</Button>
      <Button variant="secondary">Center</Button>
      <Button variant="secondary">Right</Button>
    </div>
  ),
};

export const IconOnly: Story = {
  render: () => (
    <div className="flex gap-4">
      <Button variant="secondary" className="px-3">
        <Mail className="h-4 w-4" />
      </Button>
      <Button variant="secondary" className="px-3">
        <Download className="h-4 w-4" />
      </Button>
      <Button variant="danger" className="px-3">
        ×
      </Button>
    </div>
  ),
};

export const Interactive: Story = {
  render: () => (
    <div className="space-y-4">
      <div className="flex gap-4">
        <Button
          variant="primary"
          onClick={() => alert('Primary clicked!')}
        >
          Click Me
        </Button>
        <Button
          variant="secondary"
          onClick={() => alert('Secondary clicked!')}
        >
          Click Me Too
        </Button>
      </div>
    </div>
  ),
};
