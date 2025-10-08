import type { Meta, StoryObj } from '@storybook/react';
import { ThemeToggle } from '../../components/theme-toggle';
import { Button } from '../../components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../../components/Card';
import { Badge } from '../../components/Badge';
import { Input } from '../../components/ui/Input';
import { Checkbox } from '../../components/ui/Checkbox';
import { Textarea } from '../../components/ui/Textarea';
import { useTheme } from '../../hooks/use-theme';

/**
 * Dark Mode Theme System
 *
 * This story demonstrates the complete dark mode implementation using semantic design tokens.
 * The theme system supports:
 * - Light mode (default)
 * - Dark mode
 * - System preference detection
 * - Smooth transitions between themes
 * - Colorblind-safe status colors (Okabe-Ito palette)
 */
const meta: Meta<typeof ThemeToggle> = {
  title: 'Themes/Dark Mode',
  component: ThemeToggle,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: `
## Theme System Overview

The design system uses CSS variables and Tailwind's dark mode class strategy to provide seamless theme switching.

### Semantic Tokens
- **Surface colors**: Background surfaces with elevation variants
- **Foreground colors**: Text colors with muted variants
- **Border colors**: Interactive border states
- **Status colors**: Colorblind-safe Okabe-Ito palette

### Usage
\`\`\`tsx
import { ThemeToggle, useTheme } from '@siteproof/design-system';

function MyComponent() {
  const { theme, setTheme, resolvedTheme } = useTheme();

  return (
    <div>
      <ThemeToggle showLabel />
      <p>Current theme: {theme}</p>
    </div>
  );
}
\`\`\`
        `,
      },
    },
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof ThemeToggle>;

const ThemeShowcase = () => {
  const { theme, resolvedTheme } = useTheme();

  return (
    <div className="min-h-screen bg-background p-8 transition-colors duration-200">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-foreground mb-2">
              Dark Mode Showcase
            </h1>
            <p className="text-foreground-muted">
              Current theme: <strong>{theme}</strong> (resolved: {resolvedTheme})
            </p>
          </div>
          <ThemeToggle showLabel />
        </div>

        {/* Color Palette */}
        <Card>
          <CardHeader>
            <CardTitle>Semantic Color Tokens</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div className="h-20 bg-surface border border-border rounded-lg mb-2" />
                <p className="text-sm text-foreground-muted">surface</p>
              </div>
              <div>
                <div className="h-20 bg-surface-container border border-border rounded-lg mb-2" />
                <p className="text-sm text-foreground-muted">surface-container</p>
              </div>
              <div>
                <div className="h-20 bg-surface-containerHigh border border-border rounded-lg mb-2" />
                <p className="text-sm text-foreground-muted">surface-high</p>
              </div>
              <div>
                <div className="h-20 bg-surface-elevated border border-border rounded-lg mb-2" />
                <p className="text-sm text-foreground-muted">surface-elevated</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Status Badges - Colorblind Safe */}
        <Card>
          <CardHeader>
            <CardTitle>Status Colors (Okabe-Ito Colorblind-Safe)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <Badge variant="success">Success</Badge>
              <Badge variant="error">Error</Badge>
              <Badge variant="warning">Warning</Badge>
              <Badge variant="info">Info</Badge>
              <Badge variant="primary">Primary</Badge>
              <Badge variant="default">Default</Badge>
              <Badge variant="outline">Outline</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Buttons */}
        <Card>
          <CardHeader>
            <CardTitle>Buttons</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <Button variant="primary">Primary Button</Button>
              <Button variant="secondary">Secondary Button</Button>
              <Button variant="ghost">Ghost Button</Button>
              <Button variant="danger">Danger Button</Button>
              <Button variant="primary" disabled>Disabled Button</Button>
            </div>
          </CardContent>
        </Card>

        {/* Form Elements */}
        <Card>
          <CardHeader>
            <CardTitle>Form Elements</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <Input
              label="Email Address"
              type="email"
              placeholder="Enter your email"
              helperText="We'll never share your email"
            />
            <Input
              label="Username"
              type="text"
              error="This username is already taken"
            />
            <Input
              label="Verification Code"
              type="text"
              success
              helperText="Code verified successfully"
            />
            <Textarea
              label="Description"
              placeholder="Enter a description"
              helperText="Maximum 500 characters"
              maxLength={500}
              showCount
            />
            <div className="space-y-2">
              <Checkbox label="Accept terms and conditions" />
              <Checkbox label="Subscribe to newsletter" />
              <Checkbox label="Enable notifications" />
            </div>
          </CardContent>
        </Card>

        {/* Card Variants */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card variant="default" padding="medium">
            <CardTitle>Default Card</CardTitle>
            <CardContent>
              Standard card with default styling
            </CardContent>
          </Card>
          <Card variant="interactive" padding="medium">
            <CardTitle>Interactive Card</CardTitle>
            <CardContent>
              Hover me to see interactive effects
            </CardContent>
          </Card>
          <Card variant="elevated" padding="medium">
            <CardTitle>Elevated Card</CardTitle>
            <CardContent>
              Card with elevated appearance
            </CardContent>
          </Card>
        </div>

        {/* Typography */}
        <Card>
          <CardHeader>
            <CardTitle>Typography</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <h1 className="text-h1 text-foreground">Heading 1</h1>
            <h2 className="text-h2 text-foreground">Heading 2</h2>
            <h3 className="text-h3 text-foreground">Heading 3</h3>
            <p className="text-body text-foreground">
              Body text with normal foreground color. This is the primary text color used throughout the application.
            </p>
            <p className="text-body text-foreground-muted">
              Muted text for secondary information and helper text.
            </p>
            <p className="text-body text-foreground-subtle">
              Subtle text for the least prominent text elements.
            </p>
          </CardContent>
        </Card>

        {/* Border Examples */}
        <Card>
          <CardHeader>
            <CardTitle>Border States</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 border-2 border-border rounded-lg">
                <p className="text-sm text-foreground-muted">Default Border</p>
              </div>
              <div className="p-4 border-2 border-border-hover rounded-lg">
                <p className="text-sm text-foreground-muted">Hover Border</p>
              </div>
              <div className="p-4 border-2 border-border-focus rounded-lg">
                <p className="text-sm text-foreground-muted">Focus Border</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

/**
 * Complete dark mode showcase demonstrating all semantic tokens,
 * components, and color combinations in both light and dark themes.
 */
export const Complete: Story = {
  render: () => <ThemeShowcase />,
};

/**
 * Simple theme toggle button with icon only
 */
export const IconOnly: Story = {
  render: () => (
    <div className="p-8 bg-background">
      <ThemeToggle />
    </div>
  ),
};

/**
 * Theme toggle with label showing current theme
 */
export const WithLabel: Story = {
  render: () => (
    <div className="p-8 bg-background">
      <ThemeToggle showLabel />
    </div>
  ),
};

/**
 * Demonstrates colorblind-safe status colors (Okabe-Ito palette)
 * These colors are optimized for various types of color vision deficiency
 */
export const ColorblindSafePalette: Story = {
  render: () => (
    <div className="min-h-screen bg-background p-8">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Colorblind-Safe Status Colors</CardTitle>
            <ThemeToggle showLabel />
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-3">
              Okabe-Ito Palette
            </h3>
            <p className="text-foreground-muted mb-4">
              This palette is scientifically designed to be distinguishable by people
              with various forms of color vision deficiency.
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-4">
              <Badge variant="success" size="large">Success</Badge>
              <span className="text-foreground-muted">
                #117733 - Bluish green, high contrast
              </span>
            </div>
            <div className="flex items-center gap-4">
              <Badge variant="error" size="large">Error</Badge>
              <span className="text-foreground-muted">
                #d55e00 - Vermillion, distinct from success
              </span>
            </div>
            <div className="flex items-center gap-4">
              <Badge variant="warning" size="large">Warning</Badge>
              <span className="text-foreground-muted">
                #e69f00 - Orange, clearly different from error
              </span>
            </div>
            <div className="flex items-center gap-4">
              <Badge variant="info" size="large">Info</Badge>
              <span className="text-foreground-muted">
                #0072b2 - Blue, accessible contrast
              </span>
            </div>
          </div>

          <div className="mt-6 p-4 bg-surface-container rounded-lg">
            <p className="text-sm text-foreground-muted">
              <strong>Note:</strong> These colors maintain WCAG AA contrast ratios
              in both light and dark modes, ensuring accessibility for all users.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  ),
};
