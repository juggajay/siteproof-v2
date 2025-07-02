'use client';

import { useState } from 'react';
import {
  PageLayout,
  Section,
  Grid,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
  Button,
  Input,
  Textarea,
  Select,
  RadioGroup,
  CheckboxGroup,
  Toggle,
  Badge,
  BadgeGroup,
  Modal,
  ModalFooter,
  FAB,
  TopNav,
  BottomNav,
  useToast,
} from '@siteproof/design-system';
import { Plus, Home, Search, User, Settings, Bell } from 'lucide-react';

export default function DesignSystemPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedValue, setSelectedValue] = useState('');
  const [radioValue, setRadioValue] = useState('option1');
  const [checkboxValues, setCheckboxValues] = useState<string[]>(['option1']);
  const [toggleValue, setToggleValue] = useState(false);
  const { showSuccess, showError, showWarning, showInfo } = useToast();

  const selectOptions = [
    { value: 'option1', label: 'Option 1' },
    { value: 'option2', label: 'Option 2' },
    { value: 'option3', label: 'Option 3', disabled: true },
  ];

  const radioOptions = [
    { value: 'option1', label: 'Radio Option 1' },
    { value: 'option2', label: 'Radio Option 2' },
    { value: 'option3', label: 'Radio Option 3' },
  ];

  const checkboxOptions = [
    { value: 'option1', label: 'Checkbox Option 1' },
    { value: 'option2', label: 'Checkbox Option 2' },
    { value: 'option3', label: 'Checkbox Option 3' },
  ];

  const bottomNavItems = [
    { id: 'home', label: 'Home', icon: <Home className="w-6 h-6" />, href: '/' },
    { id: 'search', label: 'Search', icon: <Search className="w-6 h-6" />, onClick: () => {} },
    { id: 'profile', label: 'Profile', icon: <User className="w-6 h-6" />, onClick: () => {}, badge: 3 },
    { id: 'settings', label: 'Settings', icon: <Settings className="w-6 h-6" />, onClick: () => {} },
  ];

  return (
    <>
      <TopNav
        title="Design System Showcase"
        showMenuButton
        onMenuClick={() => {}}
        rightActions={[
          {
            icon: <Bell className="w-6 h-6" />,
            onClick: () => showInfo('Notifications clicked'),
            label: 'Notifications',
            badge: 5,
          },
        ]}
      />

      <PageLayout hasTopNav hasBottomNav>
        <Section
          title="Component Library"
          description="A comprehensive showcase of all design system components"
          actions={
            <Button onClick={() => setIsModalOpen(true)}>Open Modal</Button>
          }
        >
          <Grid columns={3} gap="large">
            {/* Cards Section */}
            <Card>
              <CardHeader>
                <CardTitle>Default Card</CardTitle>
              </CardHeader>
              <CardContent>
                This is a standard card with header, content, and footer sections.
              </CardContent>
              <CardFooter>
                <Button variant="secondary" size="sm">Action</Button>
              </CardFooter>
            </Card>

            <Card variant="interactive" onClick={() => showSuccess('Interactive card clicked!')}>
              <CardContent>
                <h3 className="text-h4 mb-2">Interactive Card</h3>
                <p>Click me to see the toast notification!</p>
              </CardContent>
            </Card>

            <Card padding="large">
              <CardContent>
                <BadgeGroup>
                  <Badge variant="primary">Primary</Badge>
                  <Badge variant="success">Success</Badge>
                  <Badge variant="warning">Warning</Badge>
                  <Badge variant="error">Error</Badge>
                  <Badge variant="info">Info</Badge>
                </BadgeGroup>
              </CardContent>
            </Card>
          </Grid>
        </Section>

        <Section title="Form Components" spacing="large">
          <Grid columns={2} gap="large">
            <Card>
              <CardContent>
                <div className="space-y-4">
                  <Input
                    label="Text Input"
                    placeholder="Enter some text"
                    helperText="This is helper text"
                  />
                  
                  <Input
                    label="Error Input"
                    placeholder="This has an error"
                    error="This field is required"
                    helperText="Please fill in this field"
                  />

                  <Textarea
                    label="Textarea"
                    placeholder="Enter multiple lines of text"
                    showCount
                    maxLength={200}
                  />

                  <Select
                    options={selectOptions}
                    value={selectedValue}
                    onChange={setSelectedValue}
                    placeholder="Select an option"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <div className="space-y-6">
                  <RadioGroup
                    name="demo-radio"
                    label="Radio Group"
                    options={radioOptions}
                    value={radioValue}
                    onChange={setRadioValue}
                  />

                  <CheckboxGroup
                    label="Checkbox Group"
                    options={checkboxOptions}
                    values={checkboxValues}
                    onChange={setCheckboxValues}
                    orientation="vertical"
                  />

                  <div className="space-y-3">
                    <Toggle
                      label="Toggle Switch"
                      checked={toggleValue}
                      onChange={(e) => setToggleValue(e.target.checked)}
                    />
                    
                    <Toggle
                      label="Small Toggle"
                      toggleSize="small"
                      checked={toggleValue}
                      onChange={(e) => setToggleValue(e.target.checked)}
                    />
                    
                    <Toggle
                      label="Large Toggle"
                      toggleSize="large"
                      checked={toggleValue}
                      onChange={(e) => setToggleValue(e.target.checked)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </Grid>
        </Section>

        <Section title="Button Variants">
          <Card>
            <CardContent>
              <div className="flex flex-wrap gap-4">
                <Button>Primary Button</Button>
                <Button variant="secondary">Secondary Button</Button>
                <Button variant="danger">Danger Button</Button>
                <Button size="sm">Small Button</Button>
                <Button size="lg">Large Button</Button>
                <Button disabled>Disabled Button</Button>
                <Button loading>Loading Button</Button>
              </div>
            </CardContent>
          </Card>
        </Section>

        <Section title="Toast Notifications">
          <Card>
            <CardContent>
              <div className="flex flex-wrap gap-4">
                <Button onClick={() => showSuccess('Success message!')}>
                  Show Success
                </Button>
                <Button onClick={() => showError('Error message!')}>
                  Show Error
                </Button>
                <Button onClick={() => showWarning('Warning message!')}>
                  Show Warning
                </Button>
                <Button onClick={() => showInfo('Info message!')}>
                  Show Info
                </Button>
              </div>
            </CardContent>
          </Card>
        </Section>
      </PageLayout>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Example Modal"
        size="medium"
      >
        <div className="space-y-4">
          <p>This is a modal dialog demonstrating the modal component.</p>
          <p>It supports different sizes, can be closed by clicking outside, and has smooth animations.</p>
        </div>
        <ModalFooter>
          <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
            Cancel
          </Button>
          <Button onClick={() => {
            setIsModalOpen(false);
            showSuccess('Modal action completed!');
          }}>
            Confirm
          </Button>
        </ModalFooter>
      </Modal>

      <FAB
        icon={<Plus />}
        onClick={() => showInfo('FAB clicked!')}
        label="Add new item"
      />

      <BottomNav
        items={bottomNavItems}
        activeItemId="home"
      />
    </>
  );
}