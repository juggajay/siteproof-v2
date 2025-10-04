'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardBody,
  CardFooter,
} from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Progress, CircularProgress } from '@/components/ui/Progress';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Select } from '@/components/ui/Select';
import { Modal, ModalFooter } from '@/components/ui/Modal';
import { Toast } from '@/components/ui/Toast';
import { FAB } from '@/components/ui/FAB';
import { TopNav } from '@/components/navigation/TopNav';
import { BottomNav } from '@/components/navigation/BottomNav';
import { ITPStatusButtons } from '@/components/construction/ITPStatusButtons';

export default function ComponentsShowcase() {
  const [modalOpen, setModalOpen] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [itpStatus, setItpStatus] = useState<'pass' | 'fail' | 'na' | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [inputError, setInputError] = useState('');
  const [activeNavItem, setActiveNavItem] = useState('home');
  const [textareaValue, setTextareaValue] = useState('');
  const [selectValue, setSelectValue] = useState('');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);

    if (value.length < 3 && value.length > 0) {
      setInputError('Must be at least 3 characters');
    } else {
      setInputError('');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto space-y-12">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-h1 font-bold text-gray-900">SiteProof Design System</h1>
          <p className="text-body-large text-gray-600 max-w-2xl mx-auto">
            Professional B2B construction platform components - Mobile-first, field-optimized, WCAG
            AA compliant
          </p>
        </div>

        {/* Buttons Section */}
        <section className="space-y-6">
          <div>
            <h2 className="text-h2 font-semibold text-gray-900 mb-2">Buttons</h2>
            <p className="text-body text-gray-600">
              Touch-optimized buttons with 48px minimum height for field workers
            </p>
          </div>

          <Card>
            <CardHeader withBorder>
              <CardTitle>Button Variants</CardTitle>
              <CardDescription>
                All button styles with hover states and accessibility features
              </CardDescription>
            </CardHeader>
            <CardBody>
              <div className="space-y-6">
                {/* Primary Buttons */}
                <div className="space-y-3">
                  <h3 className="text-h5 font-medium text-gray-700">Primary Variants</h3>
                  <div className="flex flex-wrap gap-3">
                    <Button variant="primary">Primary</Button>
                    <Button variant="secondary">Secondary</Button>
                    <Button variant="success">Success</Button>
                    <Button variant="error">Error</Button>
                    <Button variant="warning">Warning</Button>
                    <Button variant="neutral">Neutral</Button>
                    <Button variant="ghost">Ghost</Button>
                    <Button variant="outline">Outline</Button>
                  </div>
                </div>

                {/* Sizes */}
                <div className="space-y-3">
                  <h3 className="text-h5 font-medium text-gray-700">Sizes</h3>
                  <div className="flex flex-wrap items-center gap-3">
                    <Button size="sm">Small</Button>
                    <Button size="md">Medium</Button>
                    <Button size="lg">Large</Button>
                  </div>
                </div>

                {/* States */}
                <div className="space-y-3">
                  <h3 className="text-h5 font-medium text-gray-700">States</h3>
                  <div className="flex flex-wrap gap-3">
                    <Button loading>Loading</Button>
                    <Button disabled>Disabled</Button>
                    <Button icon={<span>📋</span>}>With Icon</Button>
                    <Button icon={<span>→</span>} iconPosition="right">
                      Icon Right
                    </Button>
                    <Button fullWidth>Full Width</Button>
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>
        </section>

        {/* Cards Section */}
        <section className="space-y-6">
          <div>
            <h2 className="text-h2 font-semibold text-gray-900 mb-2">Cards</h2>
            <p className="text-body text-gray-600">
              Flexible container components with multiple variants
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card variant="default" hover>
              <CardHeader withBorder>
                <CardTitle>Default Card</CardTitle>
                <CardDescription>Standard card with shadow</CardDescription>
              </CardHeader>
              <CardBody>
                <p className="text-body text-gray-600">
                  This is a default card with hover effects and shadow elevation.
                </p>
              </CardBody>
              <CardFooter withBorder>
                <Button size="sm" variant="ghost">
                  View Details
                </Button>
              </CardFooter>
            </Card>

            <Card variant="elevated">
              <CardHeader withBorder>
                <CardTitle>Elevated Card</CardTitle>
                <CardDescription>Higher elevation shadow</CardDescription>
              </CardHeader>
              <CardBody>
                <p className="text-body text-gray-600">
                  This card has increased shadow for emphasis and hierarchy.
                </p>
              </CardBody>
            </Card>

            <Card variant="project">
              <CardHeader>
                <CardTitle>Project Card</CardTitle>
                <CardDescription>With colored left border</CardDescription>
              </CardHeader>
              <CardBody>
                <div className="space-y-2">
                  <p className="text-body-small text-gray-600">Construction Site Alpha</p>
                  <Progress value={67} variant="success" showLabel label="Completion" />
                </div>
              </CardBody>
            </Card>
          </div>
        </section>

        {/* Badges Section */}
        <section className="space-y-6">
          <div>
            <h2 className="text-h2 font-semibold text-gray-900 mb-2">Badges & Status Indicators</h2>
            <p className="text-body text-gray-600">
              Color-blind safe status badges using Okabe-Ito palette
            </p>
          </div>

          <Card>
            <CardHeader withBorder>
              <CardTitle>Badge Variants</CardTitle>
              <CardDescription>Semantic status indicators with icons</CardDescription>
            </CardHeader>
            <CardBody>
              <div className="space-y-6">
                <div className="space-y-3">
                  <h3 className="text-h5 font-medium text-gray-700">With Icons</h3>
                  <div className="flex flex-wrap gap-3">
                    <Badge variant="success">Approved</Badge>
                    <Badge variant="error">Rejected</Badge>
                    <Badge variant="warning">Pending</Badge>
                    <Badge variant="neutral">On Hold</Badge>
                    <Badge variant="info">In Review</Badge>
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="text-h5 font-medium text-gray-700">With Dots</h3>
                  <div className="flex flex-wrap gap-3">
                    <Badge variant="success" dot withIcon={false}>
                      Active
                    </Badge>
                    <Badge variant="error" dot withIcon={false}>
                      Inactive
                    </Badge>
                    <Badge variant="warning" dot withIcon={false}>
                      Warning
                    </Badge>
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="text-h5 font-medium text-gray-700">Sizes</h3>
                  <div className="flex flex-wrap items-center gap-3">
                    <Badge size="sm" variant="success">
                      Small
                    </Badge>
                    <Badge size="md" variant="success">
                      Medium
                    </Badge>
                    <Badge size="lg" variant="success">
                      Large
                    </Badge>
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>
        </section>

        {/* Progress Indicators Section */}
        <section className="space-y-6">
          <div>
            <h2 className="text-h2 font-semibold text-gray-900 mb-2">Progress Indicators</h2>
            <p className="text-body text-gray-600">
              Linear and circular progress indicators for tracking completion
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader withBorder>
                <CardTitle>Linear Progress</CardTitle>
                <CardDescription>Horizontal progress bars with labels</CardDescription>
              </CardHeader>
              <CardBody>
                <div className="space-y-6">
                  <Progress value={25} variant="primary" showLabel label="ITP Completion" />
                  <Progress value={60} variant="success" showLabel label="Quality Checks" />
                  <Progress value={85} variant="warning" showLabel label="Documentation" />
                  <Progress value={100} variant="success" showLabel label="Safety Review" />
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardHeader withBorder>
                <CardTitle>Circular Progress</CardTitle>
                <CardDescription>Radial progress indicators</CardDescription>
              </CardHeader>
              <CardBody>
                <div className="flex flex-wrap justify-around gap-6">
                  <CircularProgress value={33} variant="primary" size={100} />
                  <CircularProgress value={67} variant="success" size={100} />
                  <CircularProgress value={100} variant="success" size={100} />
                </div>
              </CardBody>
            </Card>
          </div>
        </section>

        {/* Input Components Section */}
        <section className="space-y-6">
          <div>
            <h2 className="text-h2 font-semibold text-gray-900 mb-2">Input Components</h2>
            <p className="text-body text-gray-600">
              Touch-optimized form inputs with validation states
            </p>
          </div>

          <Card>
            <CardHeader withBorder>
              <CardTitle>Form Inputs</CardTitle>
              <CardDescription>
                Text inputs with labels, validation, and helper text
              </CardDescription>
            </CardHeader>
            <CardBody>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input
                  label="Project Name"
                  placeholder="Enter project name"
                  required
                  helperText="Minimum 3 characters required"
                  value={inputValue}
                  onChange={handleInputChange}
                  error={inputError}
                  fullWidth
                />
                <Input
                  label="Location"
                  placeholder="Project location"
                  success={true}
                  fullWidth
                  leftIcon={<span>📍</span>}
                />
                <Input
                  label="Budget"
                  type="number"
                  placeholder="0.00"
                  fullWidth
                  leftIcon={<span>$</span>}
                />
                <Input label="Disabled Field" placeholder="Cannot edit" disabled fullWidth />

                <div className="md:col-span-2">
                  <Textarea
                    label="Project Description"
                    placeholder="Enter project details..."
                    helperText="Provide a detailed description of the project scope"
                    value={textareaValue}
                    onChange={(e) => setTextareaValue(e.target.value)}
                    fullWidth
                    rows={4}
                  />
                </div>

                <Select
                  label="Project Status"
                  placeholder="Select status..."
                  options={[
                    { value: 'planning', label: 'Planning' },
                    { value: 'in-progress', label: 'In Progress' },
                    { value: 'on-hold', label: 'On Hold' },
                    { value: 'completed', label: 'Completed' },
                  ]}
                  value={selectValue}
                  onChange={setSelectValue}
                  fullWidth
                />

                <Select
                  label="Priority Level"
                  placeholder="Select priority..."
                  options={[
                    { value: 'low', label: 'Low Priority' },
                    { value: 'medium', label: 'Medium Priority' },
                    { value: 'high', label: 'High Priority' },
                    { value: 'urgent', label: 'Urgent' },
                  ]}
                  success={true}
                  fullWidth
                />
              </div>
            </CardBody>
          </Card>
        </section>

        {/* Construction-Specific Components */}
        <section className="space-y-6">
          <div>
            <h2 className="text-h2 font-semibold text-gray-900 mb-2">
              Construction-Specific Components
            </h2>
            <p className="text-body text-gray-600">
              ITP status buttons optimized for field workers in gloves
            </p>
          </div>

          <Card>
            <CardHeader withBorder>
              <CardTitle>ITP Status Buttons</CardTitle>
              <CardDescription>
                Large touch targets (48x48px) for Pass/Fail/N/A selection
              </CardDescription>
            </CardHeader>
            <CardBody>
              <div className="space-y-6">
                <ITPStatusButtons
                  label="Inspection Status"
                  value={itpStatus}
                  onChange={setItpStatus}
                  required
                  fullWidth
                />

                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-body-small text-gray-600">
                    <strong>Selected Status:</strong> {itpStatus ? itpStatus.toUpperCase() : 'None'}
                  </p>
                </div>

                <div className="space-y-3">
                  <h3 className="text-h5 font-medium text-gray-700">Different Sizes</h3>
                  <ITPStatusButtons value="pass" size="sm" fullWidth />
                  <ITPStatusButtons value="fail" size="md" fullWidth />
                  <ITPStatusButtons value="na" size="lg" fullWidth />
                </div>
              </div>
            </CardBody>
          </Card>
        </section>

        {/* Navigation Components */}
        <section className="space-y-6">
          <div>
            <h2 className="text-h2 font-semibold text-gray-900 mb-2">Navigation Components</h2>
            <p className="text-body text-gray-600">
              Mobile-optimized navigation with safe area support
            </p>
          </div>

          <Card>
            <CardHeader withBorder>
              <CardTitle>Top Navigation</CardTitle>
              <CardDescription>Sticky header with title and actions</CardDescription>
            </CardHeader>
            <CardBody>
              <div className="border-2 border-gray-200 rounded-lg overflow-hidden">
                <TopNav
                  title="Project Dashboard"
                  leftAction={
                    <Button variant="ghost" size="sm">
                      ←
                    </Button>
                  }
                  rightActions={
                    <>
                      <Button variant="ghost" size="sm">
                        🔍
                      </Button>
                      <Button variant="ghost" size="sm">
                        ⚙️
                      </Button>
                    </>
                  }
                  sticky={false}
                />
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader withBorder>
              <CardTitle>Bottom Navigation</CardTitle>
              <CardDescription>Mobile navigation bar with badges</CardDescription>
            </CardHeader>
            <CardBody>
              <div
                className="border-2 border-gray-200 rounded-lg overflow-hidden relative"
                style={{ height: '80px' }}
              >
                <BottomNav
                  items={[
                    { id: 'home', icon: '🏠', label: 'Home' },
                    { id: 'projects', icon: '📋', label: 'Projects', badge: 5 },
                    { id: 'inspections', icon: '✓', label: 'Inspections' },
                    { id: 'reports', icon: '📊', label: 'Reports' },
                    { id: 'profile', icon: '👤', label: 'Profile' },
                  ]}
                  activeItemId={activeNavItem}
                  onItemClick={setActiveNavItem}
                />
              </div>
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-body-small text-gray-600">
                  <strong>Active Tab:</strong> {activeNavItem}
                </p>
              </div>
            </CardBody>
          </Card>
        </section>

        {/* FAB Section */}
        <section className="space-y-6">
          <div>
            <h2 className="text-h2 font-semibold text-gray-900 mb-2">
              Floating Action Button (FAB)
            </h2>
            <p className="text-body text-gray-600">
              Quick actions accessible from anywhere on the page
            </p>
          </div>

          <Card>
            <CardHeader withBorder>
              <CardTitle>FAB Variants</CardTitle>
              <CardDescription>
                Floating action buttons in different styles and positions
              </CardDescription>
            </CardHeader>
            <CardBody>
              <div className="space-y-4">
                <div className="flex flex-wrap gap-4">
                  <div className="relative border-2 border-gray-200 rounded-lg p-8 w-48 h-48">
                    <FAB
                      icon="+"
                      variant="primary"
                      position="bottom-right"
                      onClick={() => setToastVisible(true)}
                    />
                  </div>
                  <div className="relative border-2 border-gray-200 rounded-lg p-8 w-48 h-48">
                    <FAB
                      icon="+"
                      label="Add New"
                      extended
                      variant="success"
                      position="bottom-center"
                      onClick={() => setToastVisible(true)}
                    />
                  </div>
                </div>
                <p className="text-body-small text-gray-600">
                  Click the FAB buttons above to test their functionality. In production, these
                  would be positioned fixed on the screen.
                </p>
              </div>
            </CardBody>
          </Card>
        </section>

        {/* Modal & Toast Section */}
        <section className="space-y-6">
          <div>
            <h2 className="text-h2 font-semibold text-gray-900 mb-2">Overlays & Notifications</h2>
            <p className="text-body text-gray-600">
              Modals and toast notifications for user feedback
            </p>
          </div>

          <Card>
            <CardHeader withBorder>
              <CardTitle>Modal & Toast Demo</CardTitle>
              <CardDescription>Click buttons to test overlay components</CardDescription>
            </CardHeader>
            <CardBody>
              <div className="flex flex-wrap gap-4">
                <Button onClick={() => setModalOpen(true)}>Open Modal</Button>
                <Button variant="success" onClick={() => setToastVisible(true)}>
                  Show Success Toast
                </Button>
              </div>
            </CardBody>
          </Card>
        </section>

        {/* Design Tokens Reference */}
        <section className="space-y-6">
          <div>
            <h2 className="text-h2 font-semibold text-gray-900 mb-2">Design Tokens</h2>
            <p className="text-body text-gray-600">Core color palette and spacing system</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader withBorder>
                <CardTitle>Color-Blind Safe Status Colors</CardTitle>
                <CardDescription>Okabe-Ito palette for accessibility</CardDescription>
              </CardHeader>
              <CardBody>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded bg-[#117733] border-2 border-gray-300" />
                    <div>
                      <p className="font-medium text-gray-900">Success</p>
                      <p className="text-body-small text-gray-600">#117733</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded bg-[#D55E00] border-2 border-gray-300" />
                    <div>
                      <p className="font-medium text-gray-900">Error</p>
                      <p className="text-body-small text-gray-600">#D55E00</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded bg-[#E69F00] border-2 border-gray-300" />
                    <div>
                      <p className="font-medium text-gray-900">Warning</p>
                      <p className="text-body-small text-gray-600">#E69F00</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded bg-[#888888] border-2 border-gray-300" />
                    <div>
                      <p className="font-medium text-gray-900">Neutral</p>
                      <p className="text-body-small text-gray-600">#888888</p>
                    </div>
                  </div>
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardHeader withBorder>
                <CardTitle>Typography Scale</CardTitle>
                <CardDescription>Inter font family with systematic sizing</CardDescription>
              </CardHeader>
              <CardBody>
                <div className="space-y-3">
                  <p className="text-h1">Heading 1 - 32px</p>
                  <p className="text-h2">Heading 2 - 28px</p>
                  <p className="text-h3">Heading 3 - 24px</p>
                  <p className="text-h4">Heading 4 - 20px</p>
                  <p className="text-h5">Heading 5 - 18px</p>
                  <p className="text-body-large">Body Large - 17px</p>
                  <p className="text-body">Body - 15px</p>
                  <p className="text-body-small">Body Small - 13px</p>
                  <p className="text-caption">Caption - 12px</p>
                </div>
              </CardBody>
            </Card>
          </div>
        </section>
      </div>

      {/* Modal Component */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Example Modal"
        description="This is a demonstration of the modal component with all features."
        size="md"
      >
        <div className="space-y-4">
          <p className="text-body text-gray-600">
            This modal includes a backdrop, smooth animations, keyboard navigation (ESC to close),
            and click-outside-to-close functionality.
          </p>
          <Input label="Example Input" placeholder="Type something..." fullWidth />
        </div>
        <ModalFooter>
          <Button variant="ghost" onClick={() => setModalOpen(false)}>
            Cancel
          </Button>
          <Button onClick={() => setModalOpen(false)}>Confirm</Button>
        </ModalFooter>
      </Modal>

      {/* Toast Component */}
      {toastVisible && (
        <Toast
          title="Success!"
          message="Component created successfully. All accessibility features enabled."
          variant="success"
          duration={5000}
          onClose={() => setToastVisible(false)}
          position="top-right"
        />
      )}
    </div>
  );
}
