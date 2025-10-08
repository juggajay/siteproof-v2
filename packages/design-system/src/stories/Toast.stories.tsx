import type { Meta, StoryObj } from '@storybook/react';
import { Toaster } from '../components/ui/toast';
import { useToast } from '../hooks/use-toast';
import { Button } from '../components/ui/Button';

// Wrapper component to use the toast hook
const ToastDemo = ({ title, description, variant, action }: any) => {
  const { toast } = useToast();

  return (
    <div>
      <Button
        variant="secondary"
        onClick={() => {
          toast({
            title,
            description,
            variant,
            action,
          });
        }}
      >
        Show Toast
      </Button>
      <Toaster />
    </div>
  );
};

const meta = {
  title: 'Components/Toast',
  component: Toaster,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Toaster>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <ToastDemo
      title="Notification"
      description="This is a toast notification."
    />
  ),
};

export const Success: Story = {
  render: () => (
    <ToastDemo
      variant="success"
      title="Success"
      description="Your changes have been saved successfully."
    />
  ),
};

export const Error: Story = {
  render: () => (
    <ToastDemo
      variant="destructive"
      title="Error"
      description="Something went wrong. Please try again."
    />
  ),
};

export const Warning: Story = {
  render: () => (
    <ToastDemo
      variant="warning"
      title="Warning"
      description="Your session will expire in 5 minutes."
    />
  ),
};

export const WithAction: Story = {
  render: () => {
    const { toast } = useToast();

    return (
      <div>
        <Button
          variant="secondary"
          onClick={() => {
            toast({
              title: "Undo Available",
              description: "File has been deleted.",
              action: (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => console.log('Undo clicked')}
                >
                  Undo
                </Button>
              ),
            });
          }}
        >
          Delete File
        </Button>
        <Toaster />
      </div>
    );
  },
};

export const LongContent: Story = {
  render: () => (
    <ToastDemo
      title="Update Available"
      description="A new version of the application is available. It includes bug fixes, performance improvements, and new features. Would you like to update now?"
    />
  ),
};

export const TitleOnly: Story = {
  render: () => (
    <ToastDemo title="Saved!" />
  ),
};

export const Multiple: Story = {
  render: () => {
    const { toast } = useToast();

    return (
      <div>
        <Button
          variant="secondary"
          onClick={() => {
            toast({
              title: "First notification",
              description: "This is the first toast.",
            });

            setTimeout(() => {
              toast({
                title: "Second notification",
                description: "This is the second toast.",
                variant: "success",
              });
            }, 1000);

            setTimeout(() => {
              toast({
                title: "Third notification",
                description: "This is the third toast.",
                variant: "warning",
              });
            }, 2000);
          }}
        >
          Show Multiple Toasts
        </Button>
        <Toaster />
      </div>
    );
  },
};

export const Persistent: Story = {
  render: () => {
    const { toast } = useToast();

    return (
      <div>
        <Button
          variant="secondary"
          onClick={() => {
            toast({
              title: "Important Update",
              description: "This toast will stay until you close it.",
              duration: Infinity,
            });
          }}
        >
          Show Persistent Toast
        </Button>
        <Toaster />
      </div>
    );
  },
};
