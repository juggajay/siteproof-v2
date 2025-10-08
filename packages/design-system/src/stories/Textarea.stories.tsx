import type { Meta, StoryObj } from '@storybook/react';
import { Textarea } from '../components/ui/Textarea';
import { Label } from '../components/ui/label';
import { Button } from '../components/ui/Button';
import { useState } from 'react';

const meta = {
  title: 'Components/Textarea',
  component: Textarea,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    disabled: {
      control: 'boolean',
    },
    placeholder: {
      control: 'text',
    },
  },
} satisfies Meta<typeof Textarea>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    placeholder: 'Type your message here.',
  },
  render: (args) => (
    <div className="w-96">
      <Textarea {...args} />
    </div>
  ),
};

export const WithLabel: Story = {
  render: () => (
    <div className="grid w-96 gap-1.5">
      <Label htmlFor="message">Your message</Label>
      <Textarea placeholder="Type your message here." id="message" />
    </div>
  ),
};

export const WithText: Story = {
  render: () => (
    <div className="grid w-96 gap-1.5">
      <Label htmlFor="message-2">Your message</Label>
      <Textarea placeholder="Type your message here." id="message-2" />
      <p className="text-sm text-gray-500">
        Your message will be copied to the support team.
      </p>
    </div>
  ),
};

export const Disabled: Story = {
  render: () => (
    <div className="w-96">
      <Textarea disabled placeholder="This textarea is disabled" />
    </div>
  ),
};

export const WithCharacterCount: Story = {
  render: () => {
    const [value, setValue] = useState('');
    const maxLength = 200;

    return (
      <div className="grid w-96 gap-1.5">
        <Label htmlFor="bio">Bio</Label>
        <Textarea
          id="bio"
          placeholder="Tell us about yourself"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          maxLength={maxLength}
        />
        <p className="text-xs text-gray-500 text-right">
          {value.length}/{maxLength}
        </p>
      </div>
    );
  },
};

export const Resizable: Story = {
  render: () => (
    <div className="w-96 space-y-4">
      <div className="grid gap-1.5">
        <Label>Resizable (Default)</Label>
        <Textarea placeholder="This textarea can be resized" />
      </div>
      <div className="grid gap-1.5">
        <Label>Non-resizable</Label>
        <Textarea placeholder="This textarea cannot be resized" className="resize-none" />
      </div>
      <div className="grid gap-1.5">
        <Label>Resize Vertical Only</Label>
        <Textarea placeholder="Resize vertically only" className="resize-y" />
      </div>
    </div>
  ),
};

export const DifferentSizes: Story = {
  render: () => (
    <div className="w-96 space-y-4">
      <div className="grid gap-1.5">
        <Label>Small (2 rows)</Label>
        <Textarea placeholder="Small textarea" rows={2} />
      </div>
      <div className="grid gap-1.5">
        <Label>Medium (4 rows)</Label>
        <Textarea placeholder="Medium textarea" rows={4} />
      </div>
      <div className="grid gap-1.5">
        <Label>Large (8 rows)</Label>
        <Textarea placeholder="Large textarea" rows={8} />
      </div>
    </div>
  ),
};

export const Form: Story = {
  render: () => {
    const [value, setValue] = useState('');

    return (
      <form
        className="w-96 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          alert(`Submitted: ${value}`);
        }}
      >
        <div className="grid gap-1.5">
          <Label htmlFor="feedback">Feedback</Label>
          <Textarea
            id="feedback"
            placeholder="Share your thoughts..."
            value={value}
            onChange={(e) => setValue(e.target.value)}
            required
            rows={5}
          />
          <p className="text-xs text-gray-500">
            Please provide detailed feedback
          </p>
        </div>
        <Button type="submit" variant="primary">
          Submit Feedback
        </Button>
      </form>
    );
  },
};

export const WithError: Story = {
  render: () => (
    <div className="grid w-96 gap-1.5">
      <Label htmlFor="error-example">Comment</Label>
      <Textarea
        id="error-example"
        placeholder="Type your comment..."
        className="border-red-500 focus-visible:ring-red-500"
      />
      <p className="text-sm text-red-500">
        This field is required
      </p>
    </div>
  ),
};
