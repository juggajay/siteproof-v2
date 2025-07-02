'use client';

import { Card, CardContent, Button } from '@siteproof/design-system';

export default function DesignSimplePage() {
  return (
    <div className="p-8">
      <h1 className="text-4xl font-bold mb-8">Simple Design System Test</h1>
      
      <Card>
        <CardContent>
          <p className="mb-4">Testing basic components</p>
          <Button>Click me</Button>
        </CardContent>
      </Card>
    </div>
  );
}