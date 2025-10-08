import type { Meta, StoryObj } from '@storybook/react';
import { Toggle } from '../components/ui/Toggle';
import { Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight } from 'lucide-react';
import { useState } from 'react';

const meta = {
  title: 'Components/Toggle',
  component: Toggle,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    disabled: {
      control: 'boolean',
    },
    pressed: {
      control: 'boolean',
    },
  },
} satisfies Meta<typeof Toggle>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Toggle aria-label="Toggle bold">
      <Bold className="h-4 w-4" />
    </Toggle>
  ),
};

export const WithText: Story = {
  render: () => (
    <Toggle aria-label="Toggle bold">Bold</Toggle>
  ),
};

export const Disabled: Story = {
  render: () => (
    <Toggle disabled aria-label="Toggle bold">
      <Bold className="h-4 w-4" />
    </Toggle>
  ),
};

export const Pressed: Story = {
  render: () => (
    <Toggle defaultPressed aria-label="Toggle bold">
      <Bold className="h-4 w-4" />
    </Toggle>
  ),
};

export const Group: Story = {
  render: () => (
    <div className="flex gap-1">
      <Toggle aria-label="Toggle bold">
        <Bold className="h-4 w-4" />
      </Toggle>
      <Toggle aria-label="Toggle italic">
        <Italic className="h-4 w-4" />
      </Toggle>
      <Toggle aria-label="Toggle underline">
        <Underline className="h-4 w-4" />
      </Toggle>
    </div>
  ),
};

export const Alignment: Story = {
  render: () => (
    <div className="flex gap-1">
      <Toggle aria-label="Align left">
        <AlignLeft className="h-4 w-4" />
      </Toggle>
      <Toggle aria-label="Align center">
        <AlignCenter className="h-4 w-4" />
      </Toggle>
      <Toggle aria-label="Align right">
        <AlignRight className="h-4 w-4" />
      </Toggle>
    </div>
  ),
};

export const Controlled: Story = {
  render: () => {
    const [pressed, setPressed] = useState(false);

    return (
      <div className="space-y-4">
        <Toggle
          pressed={pressed}
          onPressedChange={setPressed}
          aria-label="Toggle bold"
        >
          <Bold className="h-4 w-4" />
        </Toggle>
        <p className="text-sm">
          Status: {pressed ? 'Pressed' : 'Not pressed'}
        </p>
      </div>
    );
  },
};

export const TextEditor: Story = {
  render: () => {
    const [format, setFormat] = useState({
      bold: false,
      italic: false,
      underline: false,
    });

    return (
      <div className="w-96 space-y-4">
        <div className="flex gap-1 rounded-lg border p-2">
          <Toggle
            pressed={format.bold}
            onPressedChange={(pressed) =>
              setFormat({ ...format, bold: pressed })
            }
            aria-label="Toggle bold"
          >
            <Bold className="h-4 w-4" />
          </Toggle>
          <Toggle
            pressed={format.italic}
            onPressedChange={(pressed) =>
              setFormat({ ...format, italic: pressed })
            }
            aria-label="Toggle italic"
          >
            <Italic className="h-4 w-4" />
          </Toggle>
          <Toggle
            pressed={format.underline}
            onPressedChange={(pressed) =>
              setFormat({ ...format, underline: pressed })
            }
            aria-label="Toggle underline"
          >
            <Underline className="h-4 w-4" />
          </Toggle>
        </div>
        <div className="rounded-lg border p-4">
          <p
            className={`text-sm ${format.bold ? 'font-bold' : ''} ${
              format.italic ? 'italic' : ''
            } ${format.underline ? 'underline' : ''}`}
          >
            This is sample text with formatting.
          </p>
        </div>
      </div>
    );
  },
};

export const MultipleGroups: Story = {
  render: () => {
    const [alignment, setAlignment] = useState('left');

    return (
      <div className="space-y-4">
        <div className="flex gap-4">
          <div className="flex gap-1 rounded-lg border p-2">
            <Toggle aria-label="Toggle bold">
              <Bold className="h-4 w-4" />
            </Toggle>
            <Toggle aria-label="Toggle italic">
              <Italic className="h-4 w-4" />
            </Toggle>
            <Toggle aria-label="Toggle underline">
              <Underline className="h-4 w-4" />
            </Toggle>
          </div>

          <div className="flex gap-1 rounded-lg border p-2">
            <Toggle
              pressed={alignment === 'left'}
              onPressedChange={() => setAlignment('left')}
              aria-label="Align left"
            >
              <AlignLeft className="h-4 w-4" />
            </Toggle>
            <Toggle
              pressed={alignment === 'center'}
              onPressedChange={() => setAlignment('center')}
              aria-label="Align center"
            >
              <AlignCenter className="h-4 w-4" />
            </Toggle>
            <Toggle
              pressed={alignment === 'right'}
              onPressedChange={() => setAlignment('right')}
              aria-label="Align right"
            >
              <AlignRight className="h-4 w-4" />
            </Toggle>
          </div>
        </div>
      </div>
    );
  },
};

export const WithLabels: Story = {
  render: () => (
    <div className="flex gap-2">
      <Toggle aria-label="Toggle bold">
        <Bold className="mr-2 h-4 w-4" />
        Bold
      </Toggle>
      <Toggle aria-label="Toggle italic">
        <Italic className="mr-2 h-4 w-4" />
        Italic
      </Toggle>
      <Toggle aria-label="Toggle underline">
        <Underline className="mr-2 h-4 w-4" />
        Underline
      </Toggle>
    </div>
  ),
};
