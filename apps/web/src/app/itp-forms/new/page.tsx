'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@siteproof/design-system';
import { FORM_TYPE_LABELS } from '@/features/itp-forms/types/form.types';
import { EarthworksPreconstructionForm } from '@/features/itp-forms/components/forms/EarthworksPreconstructionForm';
import { createClient } from '@/lib/supabase/client';

function NewITPFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const formType = searchParams.get('type') || '';
  const [projects, setProjects] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('projects')
        .select('id, name')
        .order('name');
      
      if (error) throw error;
      setProjects(data || []);
    } catch (error) {
      console.error('Error loading projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFormSubmit = (data: any) => {
    console.log('Form submitted:', data);
    router.push('/itp-forms');
  };

  const renderForm = () => {
    if (loading) {
      return <div className="text-center py-8">Loading...</div>;
    }

    switch (formType) {
      case 'earthworks_preconstruction':
        return (
          <EarthworksPreconstructionForm
            projects={projects}
            onSubmit={handleFormSubmit}
          />
        );
      // Add other form types here as they are created
      default:
        return (
          <div className="text-center py-8">
            <p className="text-gray-600">Invalid form type</p>
          </div>
        );
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        
        <h1 className="text-2xl font-bold text-gray-900">
          New {FORM_TYPE_LABELS[formType] || 'Form'}
        </h1>
        <p className="text-gray-600 mt-1">
          Complete all required fields and submit for inspection
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border p-6">
        {renderForm()}
      </div>
    </div>
  );
}

export default function NewITPFormPage() {
  return (
    <Suspense fallback={<div className="container mx-auto px-4 py-8">Loading...</div>}>
      <NewITPFormContent />
    </Suspense>
  );
}