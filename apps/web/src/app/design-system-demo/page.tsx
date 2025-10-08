'use client';

import React, { useState } from 'react';
import {
  Button,
  Input,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
  Badge,
  Select,
  useToast,
  Textarea,
  Checkbox,
  CheckboxGroup,
  Toggle,
  RadioGroup,
  Modal,
  ModalFooter,
  Skeleton,
  SkeletonGroup,
  ProgressBar,
  ProgressRing,
  FAB,
  FABGroup,
} from '@siteproof/design-system';
import { Plus, Settings, Home, User, Bell } from 'lucide-react';

export default function DesignSystemDemoPage() {
  const { showSuccess, showError, showWarning, showInfo } = useToast();
  const [inputValue, setInputValue] = useState('');
  const [textareaValue, setTextareaValue] = useState('');
  const [selectValue, setSelectValue] = useState('');
  const [checked, setChecked] = useState(false);
  const [toggled, setToggled] = useState(false);
  const [radioValue, setRadioValue] = useState('option1');
  const [showModal, setShowModal] = useState(false);
  const [checkboxGroupValues, setCheckboxGroupValues] = useState<string[]>([]);

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="mx-auto max-w-7xl space-y-8">
        {/* Header */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-4xl font-bold">Design System Demo</CardTitle>
                <p className="text-muted-foreground mt-2">
                  Showcasing all components from @siteproof/design-system
                </p>
              </div>
              {/* ThemeToggle component not exported yet - using placeholder */}
              <div className="text-sm text-muted-foreground">
                Theme Toggle (Add to exports)
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Buttons Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-semibold">Buttons</CardTitle>
            <p className="text-muted-foreground text-sm">
              Various button variants and states
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Button Variants */}
            <div>
              <h3 className="text-lg font-medium mb-3">Variants</h3>
              <div className="flex flex-wrap gap-4">
                <Button variant="primary">Primary</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="danger">Danger</Button>
              </div>
            </div>

            {/* Button Sizes */}
            <div>
              <h3 className="text-lg font-medium mb-3">Sizes</h3>
              <div className="flex flex-wrap items-center gap-4">
                <Button size="sm">Small</Button>
                <Button size="md">Medium</Button>
                <Button size="lg">Large</Button>
              </div>
            </div>

            {/* Button States */}
            <div>
              <h3 className="text-lg font-medium mb-3">States</h3>
              <div className="flex flex-wrap gap-4">
                <Button loading>Loading...</Button>
                <Button disabled>Disabled</Button>
                <Button fullWidth>Full Width Button</Button>
              </div>
            </div>

            {/* Button with Icons */}
            <div>
              <h3 className="text-lg font-medium mb-3">With Icons</h3>
              <div className="flex flex-wrap gap-4">
                <Button leftIcon={<Plus className="w-4 h-4" />}>Add Item</Button>
                <Button rightIcon={<Settings className="w-4 h-4" />}>Settings</Button>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <p className="text-sm text-muted-foreground">
              All buttons support variants, sizes, loading, and disabled states
            </p>
          </CardFooter>
        </Card>

        {/* Form Inputs Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-semibold">Form Inputs</CardTitle>
            <p className="text-muted-foreground text-sm">
              Various input components for forms
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Input Field */}
            <div className="space-y-2">
              <label htmlFor="input-demo" className="text-sm font-medium">
                Input Field
              </label>
              <Input
                id="input-demo"
                placeholder="Enter text..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Current value: {inputValue || '(empty)'}
              </p>
            </div>

            {/* Textarea */}
            <div className="space-y-2">
              <label htmlFor="textarea-demo" className="text-sm font-medium">
                Textarea
              </label>
              <Textarea
                id="textarea-demo"
                placeholder="Enter multi-line text..."
                value={textareaValue}
                onChange={(e) => setTextareaValue(e.target.value)}
                rows={4}
              />
            </div>

            {/* Select */}
            <div className="space-y-2">
              <label htmlFor="select-demo" className="text-sm font-medium">
                Select Dropdown
              </label>
              <Select
                value={selectValue}
                onChange={setSelectValue}
                options={[
                  { value: '', label: 'Select an option...' },
                  { value: 'option1', label: 'Option 1' },
                  { value: 'option2', label: 'Option 2' },
                  { value: 'option3', label: 'Option 3' },
                  { value: 'option4', label: 'Option 4' },
                ]}
              />
              <p className="text-xs text-muted-foreground">
                Selected: {selectValue || '(none)'}
              </p>
            </div>

            {/* Checkbox */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="checkbox-demo"
                  checked={checked}
                  onChange={(e) => setChecked(e.target.checked)}
                />
                <label htmlFor="checkbox-demo" className="text-sm font-medium">
                  I agree to the terms and conditions
                </label>
              </div>
            </div>

            {/* Checkbox Group */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Checkbox Group</label>
              <CheckboxGroup
                options={[
                  { value: 'email', label: 'Email notifications' },
                  { value: 'sms', label: 'SMS notifications' },
                  { value: 'push', label: 'Push notifications' },
                ]}
                values={checkboxGroupValues}
                onChange={setCheckboxGroupValues}
              />
              <p className="text-xs text-muted-foreground">
                Selected: {checkboxGroupValues.join(', ') || '(none)'}
              </p>
            </div>

            {/* Toggle */}
            <div className="space-y-2">
              <Toggle
                label="Enable dark mode"
                labelPosition="right"
                toggleSize="medium"
                checked={toggled}
                onChange={(e) => setToggled(e.target.checked)}
              />
              <p className="text-xs text-muted-foreground">
                Toggled: {toggled ? 'On' : 'Off'}
              </p>
            </div>

            {/* Radio Group */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Radio Group</label>
              <RadioGroup
                name="demo-radio"
                options={[
                  { value: 'option1', label: 'Option 1' },
                  { value: 'option2', label: 'Option 2' },
                  { value: 'option3', label: 'Option 3' },
                ]}
                value={radioValue}
                onChange={setRadioValue}
              />
              <p className="text-xs text-muted-foreground">
                Selected: {radioValue}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Badges Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-semibold">Badges</CardTitle>
            <p className="text-muted-foreground text-sm">
              Status indicators and labels
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Badge Variants */}
            <div>
              <h3 className="text-lg font-medium mb-3">Variants</h3>
              <div className="flex flex-wrap gap-4">
                <Badge variant="default">Default</Badge>
                <Badge variant="primary">Primary</Badge>
                <Badge variant="success">Success</Badge>
                <Badge variant="warning">Warning</Badge>
                <Badge variant="error">Error</Badge>
                <Badge variant="info">Info</Badge>
              </div>
            </div>

            {/* Badge Sizes */}
            <div>
              <h3 className="text-lg font-medium mb-3">Sizes</h3>
              <div className="flex flex-wrap items-center gap-4">
                <Badge size="small">Small</Badge>
                <Badge size="medium">Medium</Badge>
                <Badge size="large">Large</Badge>
              </div>
            </div>

            {/* Rounded Badges */}
            <div>
              <h3 className="text-lg font-medium mb-3">Rounded</h3>
              <div className="flex flex-wrap gap-4">
                <Badge rounded variant="success">Approved</Badge>
                <Badge rounded variant="warning">Pending</Badge>
                <Badge rounded variant="error">Rejected</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Toast & Modal Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-semibold">
              Toast Notifications & Modals
            </CardTitle>
            <p className="text-muted-foreground text-sm">
              Interactive feedback components
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Toast Buttons */}
            <div>
              <h3 className="text-lg font-medium mb-3">Toast Notifications</h3>
              <div className="flex flex-wrap gap-4">
                <Button
                  variant="primary"
                  onClick={() => showSuccess('Success!', 'Operation completed successfully')}
                >
                  Show Success Toast
                </Button>
                <Button
                  variant="danger"
                  onClick={() => showError('Error!', 'Something went wrong')}
                >
                  Show Error Toast
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => showWarning('Warning', 'Please review this action')}
                >
                  Show Warning Toast
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => showInfo('Info', 'Here is some information')}
                >
                  Show Info Toast
                </Button>
              </div>
            </div>

            {/* Modal */}
            <div>
              <h3 className="text-lg font-medium mb-3">Modal Dialog</h3>
              <Button onClick={() => setShowModal(true)}>Open Modal</Button>

              {showModal && (
                <Modal
                  isOpen={showModal}
                  onClose={() => setShowModal(false)}
                  title="Example Modal"
                >
                  <div className="space-y-4">
                    <p>This is an example modal dialog.</p>
                    <p className="text-sm text-muted-foreground">
                      Modals are great for focused interactions that require user attention.
                    </p>
                  </div>
                  <ModalFooter>
                    <Button variant="ghost" onClick={() => setShowModal(false)}>
                      Cancel
                    </Button>
                    <Button variant="primary" onClick={() => setShowModal(false)}>
                      Confirm
                    </Button>
                  </ModalFooter>
                </Modal>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Progress Indicators Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-semibold">
              Progress Indicators
            </CardTitle>
            <p className="text-muted-foreground text-sm">
              Visual feedback for loading and progress states
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Progress Bar */}
            <div>
              <h3 className="text-lg font-medium mb-3">Progress Bar</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-sm mb-2">25% Complete</p>
                  <ProgressBar value={25} />
                </div>
                <div>
                  <p className="text-sm mb-2">50% Complete</p>
                  <ProgressBar value={50} />
                </div>
                <div>
                  <p className="text-sm mb-2">75% Complete</p>
                  <ProgressBar value={75} />
                </div>
              </div>
            </div>

            {/* Progress Ring */}
            <div>
              <h3 className="text-lg font-medium mb-3">Progress Ring</h3>
              <div className="flex flex-wrap gap-8">
                <div className="text-center">
                  <ProgressRing value={25} size="lg" />
                  <p className="text-sm mt-2">25%</p>
                </div>
                <div className="text-center">
                  <ProgressRing value={50} size="lg" />
                  <p className="text-sm mt-2">50%</p>
                </div>
                <div className="text-center">
                  <ProgressRing value={75} size="lg" />
                  <p className="text-sm mt-2">75%</p>
                </div>
                <div className="text-center">
                  <ProgressRing value={100} size="lg" />
                  <p className="text-sm mt-2">100%</p>
                </div>
              </div>
            </div>

            {/* Skeleton Loaders */}
            <div>
              <h3 className="text-lg font-medium mb-3">Skeleton Loaders</h3>
              <div className="space-y-4">
                <Skeleton width="100%" height="20px" />
                <Skeleton width="80%" height="20px" />
                <Skeleton width="60%" height="20px" />
                <SkeletonGroup count={3} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* FAB (Floating Action Buttons) Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-semibold">
              Floating Action Buttons (FAB)
            </CardTitle>
            <p className="text-muted-foreground text-sm">
              Quick access action buttons
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="text-lg font-medium mb-3">Single FAB</h3>
              <div className="relative h-32 bg-gray-100 rounded-lg">
                <FAB
                  icon={<Plus />}
                  label="Add"
                  onClick={() => showSuccess('FAB Clicked!', 'Floating action button was clicked')}
                  aria-label="Add new item"
                />
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium mb-3">FAB Group</h3>
              <div className="relative h-48 bg-gray-100 rounded-lg">
                <FABGroup>
                  <FAB icon={<Home />} label="Home" onClick={() => showInfo('Home', 'Navigate to home')} aria-label="Home" />
                  <FAB icon={<User />} label="Profile" onClick={() => showInfo('Profile', 'View profile')} aria-label="Profile" />
                  <FAB icon={<Bell />} label="Notifications" onClick={() => showInfo('Notifications', 'View notifications')} aria-label="Notifications" />
                  <FAB icon={<Settings />} label="Settings" onClick={() => showInfo('Settings', 'Open settings')} aria-label="Settings" />
                </FABGroup>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card Component Example */}
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-semibold">
              Card Component Structure
            </CardTitle>
            <p className="text-muted-foreground text-sm">
              Compound component pattern demonstration
            </p>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              This entire page is built with Card components! Each section demonstrates
              the compound component pattern with CardHeader, CardTitle, CardContent, and
              CardFooter.
            </p>
            <div className="bg-muted p-4 rounded-lg">
              <pre className="text-sm overflow-x-auto">
{`<Card>
  <CardHeader>
    <CardTitle>Title Here</CardTitle>
    <p>Description text</p>
  </CardHeader>
  <CardContent>
    Main content goes here
  </CardContent>
  <CardFooter>
    Footer actions
  </CardFooter>
</Card>`}
              </pre>
            </div>
          </CardContent>
          <CardFooter>
            <div className="flex gap-4">
              <Button variant="primary">Primary Action</Button>
              <Button variant="secondary">Secondary Action</Button>
            </div>
          </CardFooter>
        </Card>

        {/* Footer Info */}
        <Card>
          <CardContent className="text-center">
            <p className="text-sm text-muted-foreground">
              Design System Demo - Showcasing components from @siteproof/design-system
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Navigate to{' '}
              <code className="bg-muted px-2 py-1 rounded">/design-system-demo</code> to
              view this page
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
