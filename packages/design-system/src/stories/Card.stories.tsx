import type { Meta, StoryObj } from '@storybook/react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '../components/ui/card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/badge';

const meta = {
  title: 'Components/Card',
  component: Card,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'elevated', 'interactive'],
    },
  },
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Card className="w-[350px]">
      <CardHeader>
        <CardTitle>Card Title</CardTitle>
        <CardDescription>Card description goes here</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-600">
          This is the main content of the card. You can put any content here.
        </p>
      </CardContent>
    </Card>
  ),
};

export const WithFooter: Story = {
  render: () => (
    <Card className="w-[350px]">
      <CardHeader>
        <CardTitle>Create Project</CardTitle>
        <CardDescription>Deploy your new project in one-click.</CardDescription>
      </CardHeader>
      <CardContent>
        <form>
          <div className="grid w-full items-center gap-4">
            <div className="flex flex-col space-y-1.5">
              <label htmlFor="name" className="text-sm font-medium">
                Name
              </label>
              <input
                id="name"
                placeholder="Name of your project"
                className="rounded-md border px-3 py-2"
              />
            </div>
            <div className="flex flex-col space-y-1.5">
              <label htmlFor="framework" className="text-sm font-medium">
                Framework
              </label>
              <select id="framework" className="rounded-md border px-3 py-2">
                <option>Next.js</option>
                <option>React</option>
                <option>Vue</option>
              </select>
            </div>
          </div>
        </form>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="secondary">Cancel</Button>
        <Button variant="primary">Deploy</Button>
      </CardFooter>
    </Card>
  ),
};

export const Elevated: Story = {
  render: () => (
    <Card variant="elevated" className="w-[350px]">
      <CardHeader>
        <CardTitle>Elevated Card</CardTitle>
        <CardDescription>This card has enhanced shadow</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-600">
          The elevated variant provides a more prominent appearance with enhanced shadows.
        </p>
      </CardContent>
    </Card>
  ),
};

export const Interactive: Story = {
  render: () => (
    <Card variant="interactive" className="w-[350px]">
      <CardHeader>
        <CardTitle>Interactive Card</CardTitle>
        <CardDescription>Click to interact</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-600">
          This card responds to hover and click interactions.
        </p>
      </CardContent>
    </Card>
  ),
};

export const WithBadge: Story = {
  render: () => (
    <Card className="w-[350px]">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Premium Plan</CardTitle>
          <Badge variant="success">Popular</Badge>
        </div>
        <CardDescription>For professional teams</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <p className="text-3xl font-bold">$29/month</p>
          <ul className="space-y-2 text-sm text-gray-600">
            <li>✓ Unlimited projects</li>
            <li>✓ Advanced analytics</li>
            <li>✓ 24/7 support</li>
            <li>✓ Custom domains</li>
          </ul>
        </div>
      </CardContent>
      <CardFooter>
        <Button variant="primary" className="w-full">
          Subscribe
        </Button>
      </CardFooter>
    </Card>
  ),
};

export const Grid: Story = {
  render: () => (
    <div className="grid grid-cols-3 gap-4">
      {[1, 2, 3].map((i) => (
        <Card key={i} className="w-[250px]">
          <CardHeader>
            <CardTitle>Card {i}</CardTitle>
            <CardDescription>Description for card {i}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">
              Content for card number {i}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  ),
};

export const WithImage: Story = {
  render: () => (
    <Card className="w-[350px] overflow-hidden">
      <div className="h-[200px] bg-gradient-to-r from-blue-500 to-purple-500" />
      <CardHeader>
        <CardTitle>Beautiful Gradient</CardTitle>
        <CardDescription>Card with header image</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-600">
          This card demonstrates how to include images or visual elements.
        </p>
      </CardContent>
      <CardFooter>
        <Button variant="primary">Learn More</Button>
      </CardFooter>
    </Card>
  ),
};
