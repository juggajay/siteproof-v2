import type { Meta, StoryObj } from '@storybook/react';
import { Progress } from '../components/ui/progress';
import { useState, useEffect } from 'react';
import { Button } from '../components/ui/Button';

const meta = {
  title: 'Components/Progress',
  component: Progress,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    value: {
      control: { type: 'range', min: 0, max: 100, step: 1 },
    },
    variant: {
      control: 'select',
      options: ['linear', 'circular'],
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
    },
    indeterminate: {
      control: 'boolean',
    },
  },
} satisfies Meta<typeof Progress>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    value: 60,
  },
  render: (args) => (
    <div className="w-[400px]">
      <Progress {...args} />
    </div>
  ),
};

export const LinearSizes: Story = {
  render: () => (
    <div className="w-[400px] space-y-4">
      <div>
        <p className="text-sm mb-2">Small</p>
        <Progress value={60} size="sm" />
      </div>
      <div>
        <p className="text-sm mb-2">Medium</p>
        <Progress value={60} size="md" />
      </div>
      <div>
        <p className="text-sm mb-2">Large</p>
        <Progress value={60} size="lg" />
      </div>
    </div>
  ),
};

export const LinearValues: Story = {
  render: () => (
    <div className="w-[400px] space-y-4">
      <div>
        <p className="text-sm mb-2">25%</p>
        <Progress value={25} />
      </div>
      <div>
        <p className="text-sm mb-2">50%</p>
        <Progress value={50} />
      </div>
      <div>
        <p className="text-sm mb-2">75%</p>
        <Progress value={75} />
      </div>
      <div>
        <p className="text-sm mb-2">100%</p>
        <Progress value={100} />
      </div>
    </div>
  ),
};

export const Circular: Story = {
  render: () => (
    <div className="flex gap-8">
      <div className="flex flex-col items-center gap-2">
        <Progress value={25} variant="circular" size="sm" />
        <p className="text-sm">Small</p>
      </div>
      <div className="flex flex-col items-center gap-2">
        <Progress value={50} variant="circular" size="md" />
        <p className="text-sm">Medium</p>
      </div>
      <div className="flex flex-col items-center gap-2">
        <Progress value={75} variant="circular" size="lg" />
        <p className="text-sm">Large</p>
      </div>
    </div>
  ),
};

export const Indeterminate: Story = {
  render: () => (
    <div className="space-y-8">
      <div className="w-[400px]">
        <p className="text-sm mb-2">Linear Indeterminate</p>
        <Progress indeterminate />
      </div>
      <div className="flex justify-center">
        <div className="flex flex-col items-center gap-2">
          <Progress variant="circular" indeterminate />
          <p className="text-sm">Circular Indeterminate</p>
        </div>
      </div>
    </div>
  ),
};

export const WithLabel: Story = {
  render: () => {
    const progress = 65;
    return (
      <div className="w-[400px] space-y-2">
        <div className="flex justify-between text-sm">
          <span>Uploading...</span>
          <span>{progress}%</span>
        </div>
        <Progress value={progress} />
      </div>
    );
  },
};

export const Animated: Story = {
  render: () => {
    const [progress, setProgress] = useState(0);

    useEffect(() => {
      const timer = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 100) return 0;
          return prev + 1;
        });
      }, 50);

      return () => clearInterval(timer);
    }, []);

    return (
      <div className="w-[400px] space-y-4">
        <div className="flex justify-between text-sm">
          <span>Processing...</span>
          <span>{progress}%</span>
        </div>
        <Progress value={progress} />
      </div>
    );
  },
};

export const FileUpload: Story = {
  render: () => {
    const [progress, setProgress] = useState(0);
    const [isUploading, setIsUploading] = useState(false);

    const startUpload = () => {
      setIsUploading(true);
      setProgress(0);

      const timer = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 100) {
            clearInterval(timer);
            setIsUploading(false);
            return 100;
          }
          return prev + 2;
        });
      }, 50);
    };

    return (
      <div className="w-[400px] space-y-4">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium">document.pdf</span>
          <span className="text-sm text-gray-500">{progress}%</span>
        </div>
        <Progress value={progress} />
        <Button
          variant="primary"
          onClick={startUpload}
          disabled={isUploading}
        >
          {isUploading ? 'Uploading...' : 'Upload File'}
        </Button>
      </div>
    );
  },
};

export const CircularWithText: Story = {
  render: () => {
    const progress = 75;
    return (
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <Progress value={progress} variant="circular" size="lg" />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-lg font-semibold">{progress}%</span>
          </div>
        </div>
        <p className="text-sm text-gray-600">Download Progress</p>
      </div>
    );
  },
};
