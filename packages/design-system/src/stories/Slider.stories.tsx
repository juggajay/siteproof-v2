import type { Meta, StoryObj } from '@storybook/react';
import { Slider } from '../components/ui/slider';
import { Label } from '../components/ui/label';
import { useState } from 'react';

const meta = {
  title: 'Components/Slider',
  component: Slider,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    disabled: {
      control: 'boolean',
    },
    min: {
      control: 'number',
    },
    max: {
      control: 'number',
    },
    step: {
      control: 'number',
    },
  },
} satisfies Meta<typeof Slider>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <div className="w-96">
      <Slider defaultValue={[50]} max={100} step={1} />
    </div>
  ),
};

export const WithLabel: Story = {
  render: () => (
    <div className="w-96 space-y-2">
      <Label>Volume</Label>
      <Slider defaultValue={[75]} max={100} step={1} />
    </div>
  ),
};

export const WithValue: Story = {
  render: () => {
    const [value, setValue] = useState([50]);

    return (
      <div className="w-96 space-y-2">
        <div className="flex justify-between">
          <Label>Brightness</Label>
          <span className="text-sm text-gray-500">{value[0]}%</span>
        </div>
        <Slider value={value} onValueChange={setValue} max={100} step={1} />
      </div>
    );
  },
};

export const Range: Story = {
  render: () => {
    const [value, setValue] = useState([25, 75]);

    return (
      <div className="w-96 space-y-2">
        <div className="flex justify-between">
          <Label>Price Range</Label>
          <span className="text-sm text-gray-500">
            ${value[0]} - ${value[1]}
          </span>
        </div>
        <Slider
          value={value}
          onValueChange={setValue}
          max={100}
          step={1}
          minStepsBetweenThumbs={1}
        />
      </div>
    );
  },
};

export const Steps: Story = {
  render: () => {
    const [value, setValue] = useState([50]);

    return (
      <div className="w-96 space-y-2">
        <div className="flex justify-between">
          <Label>Temperature</Label>
          <span className="text-sm text-gray-500">{value[0]}°F</span>
        </div>
        <Slider
          value={value}
          onValueChange={setValue}
          min={60}
          max={80}
          step={5}
        />
        <div className="flex justify-between text-xs text-gray-500">
          <span>60°F</span>
          <span>70°F</span>
          <span>80°F</span>
        </div>
      </div>
    );
  },
};

export const Disabled: Story = {
  render: () => (
    <div className="w-96 space-y-2">
      <Label className="opacity-50">Disabled Slider</Label>
      <Slider defaultValue={[50]} max={100} step={1} disabled />
    </div>
  ),
};

export const Multiple: Story = {
  render: () => {
    const [volume, setVolume] = useState([75]);
    const [brightness, setBrightness] = useState([50]);
    const [bass, setBass] = useState([30]);

    return (
      <div className="w-96 space-y-6">
        <div className="space-y-2">
          <div className="flex justify-between">
            <Label>Volume</Label>
            <span className="text-sm text-gray-500">{volume[0]}%</span>
          </div>
          <Slider value={volume} onValueChange={setVolume} max={100} />
        </div>

        <div className="space-y-2">
          <div className="flex justify-between">
            <Label>Brightness</Label>
            <span className="text-sm text-gray-500">{brightness[0]}%</span>
          </div>
          <Slider value={brightness} onValueChange={setBrightness} max={100} />
        </div>

        <div className="space-y-2">
          <div className="flex justify-between">
            <Label>Bass</Label>
            <span className="text-sm text-gray-500">{bass[0]}%</span>
          </div>
          <Slider value={bass} onValueChange={setBass} max={100} />
        </div>
      </div>
    );
  },
};

export const WithMarks: Story = {
  render: () => {
    const [value, setValue] = useState([50]);

    return (
      <div className="w-96 space-y-2">
        <div className="flex justify-between">
          <Label>Quality</Label>
          <span className="text-sm text-gray-500">
            {value[0] < 33 ? 'Low' : value[0] < 67 ? 'Medium' : 'High'}
          </span>
        </div>
        <Slider value={value} onValueChange={setValue} max={100} step={1} />
        <div className="flex justify-between text-xs text-gray-500">
          <span>Low</span>
          <span>Medium</span>
          <span>High</span>
        </div>
      </div>
    );
  },
};

export const ColorPicker: Story = {
  render: () => {
    const [red, setRed] = useState([128]);
    const [green, setGreen] = useState([128]);
    const [blue, setBlue] = useState([128]);

    const color = `rgb(${red[0]}, ${green[0]}, ${blue[0]})`;

    return (
      <div className="w-96 space-y-6">
        <div
          className="h-24 rounded-lg border-2"
          style={{ backgroundColor: color }}
        />

        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label>Red</Label>
              <span className="text-sm text-gray-500">{red[0]}</span>
            </div>
            <Slider
              value={red}
              onValueChange={setRed}
              max={255}
              className="[&_[role=slider]]:bg-red-500"
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between">
              <Label>Green</Label>
              <span className="text-sm text-gray-500">{green[0]}</span>
            </div>
            <Slider
              value={green}
              onValueChange={setGreen}
              max={255}
              className="[&_[role=slider]]:bg-green-500"
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between">
              <Label>Blue</Label>
              <span className="text-sm text-gray-500">{blue[0]}</span>
            </div>
            <Slider
              value={blue}
              onValueChange={setBlue}
              max={255}
              className="[&_[role=slider]]:bg-blue-500"
            />
          </div>
        </div>

        <div className="rounded-lg bg-gray-100 p-3 text-center font-mono text-sm">
          {color}
        </div>
      </div>
    );
  },
};
