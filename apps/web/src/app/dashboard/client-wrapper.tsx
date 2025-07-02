'use client';

import Link from 'next/link';
import { Button } from '@siteproof/design-system';
import { Plus } from 'lucide-react';

export function ClientWrapper() {
  return (
    <Link href="/dashboard/projects/new">
      <Button>
        <Plus className="mr-2 h-4 w-4" />
        New Project
      </Button>
    </Link>
  );
}