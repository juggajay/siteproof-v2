'use client';
import {
  PageLayout,
  Section,
  Grid,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Badge,
} from '@siteproof/design-system';

export default function DesignBasicPage() {
  return (
    <PageLayout>
      <Section title="Basic Design System Components">
        <Grid columns={2} gap="large">
          <Card>
            <CardHeader>
              <CardTitle>Card Example</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4">This is a basic card with content.</p>
              <Button>Primary Button</Button>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <h3 className="text-xl font-semibold mb-4">Badges</h3>
              <div className="flex gap-2">
                <Badge>Default</Badge>
                <Badge variant="primary">Primary</Badge>
                <Badge variant="success">Success</Badge>
                <Badge variant="error">Error</Badge>
              </div>
            </CardContent>
          </Card>
        </Grid>
      </Section>
    </PageLayout>
  );
}