'use client';

/**
 * Code Split Component Wrappers
 * Use these to lazy load heavy components
 */

import dynamic from 'next/dynamic';

// ITP Components - Heavy, rarely used on initial load
export const EnhancedITPForm = dynamic(
  () => import('@/components/itp/enhanced-itp-form').then(mod => ({ default: mod.EnhancedITPForm })),
  {
    loading: () => <div className="animate-pulse bg-gray-200 h-96 rounded-lg" />,
    ssr: false,
  }
);

export const BasicITPManager = dynamic(
  () => import('@/components/itp/basic-itp-manager').then(mod => ({ default: mod.BasicItpManager })),
  {
    loading: () => <div className="animate-pulse bg-gray-200 h-96 rounded-lg" />,
    ssr: false,
  }
);

export const ForemanITPManager = dynamic(
  () => import('@/components/itp/foreman-itp-manager').then(mod => ({ default: mod.ForemanItpManager })),
  {
    loading: () => <div className="animate-pulse bg-gray-200 h-96 rounded-lg" />,
    ssr: false,
  }
);

export const OptimizedMobileITPManager = dynamic(
  () => import('@/components/itp/optimized-mobile-itp-manager').then(mod => ({ default: mod.OptimizedMobileItpManager })),
  {
    loading: () => <div className="animate-pulse bg-gray-200 h-96 rounded-lg" />,
    ssr: false,
  }
);

export const BulkOperations = dynamic(
  () => import('@/components/itp/BulkOperations').then(mod => ({ default: mod.BulkOperations })),
  {
    loading: () => <div className="animate-pulse bg-gray-200 h-64 rounded-lg" />,
    ssr: false,
  }
);

// Diary Components
export const ProjectDiaryForm: any = dynamic(
  () => import('@/components/diary/ProjectDiaryFormClient').then(mod => ({ default: mod.ProjectDiaryFormClient })),
  {
    loading: () => <div className="animate-pulse bg-gray-200 h-96 rounded-lg" />,
    ssr: false,
  }
);

// Reports - Heavy components
export const BrandedPDFExport = dynamic(
  () => import('@/components/reports/BrandedPDFExport').then(mod => ({ default: mod.BrandedPDFExport })),
  {
    loading: () => <div className="animate-pulse bg-gray-200 h-64 rounded-lg" />,
    ssr: false,
  }
);

// Photo upload - Uses camera, should be lazy loaded
export const PhotoUpload = dynamic(
  () => import('@/components/photo/PhotoUpload').then(mod => ({ default: mod.PhotoUpload })),
  {
    loading: () => <div className="animate-pulse bg-gray-200 h-64 rounded-lg" />,
    ssr: false,
  }
);

// Signature capture - Heavy canvas component
export const SignatureCapture = dynamic(
  () => import('@/components/signature/SignatureCapture').then(mod => ({ default: mod.SignatureCapture })),
  {
    loading: () => <div className="animate-pulse bg-gray-200 h-64 rounded-lg" />,
    ssr: false,
  }
);
