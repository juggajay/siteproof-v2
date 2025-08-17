'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Users, Save, Truck, Package } from 'lucide-react';
import { Button, Input } from '@siteproof/design-system';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { Project, DailyDiary } from '@siteproof/database';
import { LabourSection } from './DiaryForm/LabourSection';
import { PlantSection } from './DiaryForm/PlantSection';
import { MaterialsSection } from './DiaryForm/MaterialsSection';
import { LiveSummaryPanel } from './DiaryForm/LiveSummaryPanel';
import { SimplifiedWeatherSection } from './DiaryForm/SimplifiedWeatherSection';
import { WorkSummaryTabs } from './DiaryForm/WorkSummaryTabs';

const diarySchema = z.object({
  diary_date: z.string().min(1, 'Date is required'),
  work_summary: z.string().min(10, 'Work summary must be at least 10 characters'),
  // Simplified weather fields
  weather_conditions: z.string().optional(),
  temperature_min: z.number().optional(),
  temperature_max: z.number().optional(),
  wind_conditions: z.string().optional(),
  site_conditions: z.string().optional(),
  access_issues: z.string().optional(),
  // Keep some optional fields for future use
  delays: z
    .array(
      z.object({
        type: z.enum(['Weather', 'Equipment', 'Material', 'Labor', 'Other']),
        description: z.string(),
        duration_hours: z.number(),
        impact: z.enum(['Low', 'Medium', 'High']),
      })
    )
    .default([]),
  safety_incidents: z
    .array(
      z.object({
        type: z.enum(['Near Miss', 'Minor Injury', 'Major Injury']),
        description: z.string(),
        action_taken: z.string(),
        reported_to: z.string(),
      })
    )
    .default([]),
  general_notes: z.string().optional(),
  tomorrow_planned_work: z.string().optional(),
  notes_for_tomorrow: z.string().optional(),
  // New fields for cost tracking
  labour_entries: z.array(z.any()).optional(),
  plant_entries: z.array(z.any()).optional(),
  material_entries: z.array(z.any()).optional(),
});

type DiaryFormData = z.infer<typeof diarySchema>;

interface DiaryFormProps {
  project: Project;
  diary?: DailyDiary & {
    labour_entries?: any[];
    plant_entries?: any[];
    material_entries?: any[];
  };
  date?: Date;
  onSuccess?: (diaryId: string) => void;
  onCancel?: () => void;
}

export function DiaryForm({
  project,
  diary,
  date = new Date(),
  onSuccess,
  onCancel,
}: DiaryFormProps) {
  const [costTab, setCostTab] = useState<'labour' | 'plant' | 'materials'>('labour');

  // State for the new sections - initialize from diary if editing
  const [labourEntries, setLabourEntries] = useState<any[]>(() => diary?.labour_entries || []);
  const [plantEntries, setPlantEntries] = useState<any[]>(() => diary?.plant_entries || []);
  const [materialEntries, setMaterialEntries] = useState<any[]>(
    () => diary?.material_entries || []
  );

  // State for incidents and delays
  const [incidents, setIncidents] = useState<any[]>(() => diary?.safety_incidents || []);
  const [delays, setDelays] = useState<any[]>(() => diary?.delays || []);

  // State for previous day notes (will be populated by API call)
  const [previousDayNotes, setPreviousDayNotes] = useState<string>('');
  const [isClient, setIsClient] = useState(false);

  // Ensure we're on the client before running effects that could cause hydration mismatches
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Fetch previous day's notes
  useEffect(() => {
    // Only run on client side to avoid hydration issues
    if (!isClient) return;

    const fetchPreviousDayNotes = async () => {
      // Ensure project.id exists before making the API call
      if (!project?.id) {
        return;
      }

      try {
        const currentDate = new Date(date);
        const previousDate = new Date(currentDate);
        previousDate.setDate(currentDate.getDate() - 1);

        const formattedDate = previousDate.toISOString().split('T')[0];

        const response = await fetch(
          `/api/diaries/by-date?project_id=${project.id}&date=${formattedDate}`
        );

        if (response.ok) {
          const data = await response.json();
          if (data.diary && data.diary.notes_for_tomorrow) {
            setPreviousDayNotes(data.diary.notes_for_tomorrow);
          }
        }
      } catch (error) {
        console.error('Failed to fetch previous day notes:', error);
      }
    };

    // Only fetch if we're not editing an existing diary and project exists
    if (!diary && project?.id) {
      fetchPreviousDayNotes();
    }
  }, [isClient, project?.id, date, diary]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<DiaryFormData>({
    resolver: zodResolver(diarySchema),
    defaultValues: {
      diary_date: (() => {
        try {
          return date.toISOString().split('T')[0];
        } catch {
          return new Date().toISOString().split('T')[0];
        }
      })(),
      delays: [],
      safety_incidents: [],
      ...(diary
        ? {
            ...diary,
            // Convert null values to undefined for form compatibility
            site_conditions: diary.site_conditions || undefined,
            access_issues: diary.access_issues || undefined,
            general_notes: diary.general_notes || undefined,
            tomorrow_planned_work: diary.tomorrow_planned_work || undefined,
          }
        : {}),
    },
  });

  const createDiary = useMutation({
    mutationFn: async (data: DiaryFormData) => {
      // Ensure project.id exists
      if (!project?.id) {
        throw new Error('Project ID is required');
      }

      const response = await fetch('/api/diaries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          project_id: project.id,
          labour_entries: labourEntries,
          plant_entries: plantEntries,
          material_entries: materialEntries,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create diary');
      }

      return response.json();
    },
    onSuccess: (data) => {
      toast.success('Daily diary created successfully');
      onSuccess?.(data.diary.id);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const updateDiary = useMutation({
    mutationFn: async (data: DiaryFormData) => {
      const response = await fetch(`/api/diaries/${diary?.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          labour_entries: labourEntries,
          plant_entries: plantEntries,
          material_entries: materialEntries,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update diary');
      }

      return response.json();
    },
    onSuccess: () => {
      toast.success('Daily diary updated successfully');
      onSuccess?.(diary!.id);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const onSubmit = (data: DiaryFormData) => {
    // Validate that project exists
    if (!project?.id) {
      toast.error('Project information is missing. Please refresh the page.');
      return;
    }

    // Include the incidents and delays in the form data
    const completeData = {
      ...data,
      safety_incidents: incidents,
      delays: delays,
    };

    if (diary) {
      updateDiary.mutate(completeData);
    } else {
      createDiary.mutate(completeData);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Header Row - Date & Project Details */}
      <div className="flex justify-between items-start gap-6 mb-6">
        {/* Date Section - Left */}
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Daily Diary for {project?.name || 'Project'}
          </h3>
          <div className="max-w-xs">
            <Input
              type="date"
              label="Date"
              {...register('diary_date')}
              error={errors.diary_date?.message}
              required
              fullWidth
            />
          </div>
        </div>

        {/* Project Details Box - Top Right */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 min-w-80">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Project Details</h4>
          <div className="space-y-2 text-sm text-gray-600">
            <p>
              <strong>Client:</strong> {project?.client_name || 'N/A'}
            </p>
            <p>
              <strong>Location:</strong> {project?.client_company || 'N/A'}
            </p>
            <p>
              <strong>Project Manager:</strong> John Smith
            </p>
          </div>
        </div>
      </div>

      {/* Daily Summary Panel - Top Position */}
      <LiveSummaryPanel
        labourEntries={labourEntries}
        plantEntries={plantEntries}
        materialEntries={materialEntries}
        showFinancials={true}
      />

      {/* Simplified Weather Section */}
      <SimplifiedWeatherSection register={register} errors={errors} />

      {/* Main Content: Large Prominent Tabs */}
      <div className="bg-white rounded-lg border border-gray-200">
        {/* Tab Headers */}
        <div className="border-b border-gray-200">
          <div className="flex">
            <button
              type="button"
              onClick={() => setCostTab('labour')}
              className={`flex-1 px-6 py-4 text-left font-medium transition-colors ${
                costTab === 'labour'
                  ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-3">
                <Users className="w-5 h-5" />
                <div>
                  <div className="text-lg">Labour</div>
                  <div className="text-sm opacity-75">{labourEntries.length} workers</div>
                </div>
              </div>
            </button>
            <button
              type="button"
              onClick={() => setCostTab('plant')}
              className={`flex-1 px-6 py-4 text-left font-medium transition-colors ${
                costTab === 'plant'
                  ? 'bg-orange-50 text-orange-700 border-b-2 border-orange-600'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-3">
                <Truck className="w-5 h-5" />
                <div>
                  <div className="text-lg">Plant & Equipment</div>
                  <div className="text-sm opacity-75">{plantEntries.length} items</div>
                </div>
              </div>
            </button>
            <button
              type="button"
              onClick={() => setCostTab('materials')}
              className={`flex-1 px-6 py-4 text-left font-medium transition-colors ${
                costTab === 'materials'
                  ? 'bg-green-50 text-green-700 border-b-2 border-green-600'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-3">
                <Package className="w-5 h-5" />
                <div>
                  <div className="text-lg">Materials</div>
                  <div className="text-sm opacity-75">{materialEntries.length} deliveries</div>
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {costTab === 'labour' && (
            <LabourSection
              entries={labourEntries}
              onChange={setLabourEntries}
              showFinancials={true}
            />
          )}
          {costTab === 'plant' && (
            <PlantSection entries={plantEntries} onChange={setPlantEntries} showFinancials={true} />
          )}
          {costTab === 'materials' && (
            <MaterialsSection
              entries={materialEntries}
              onChange={setMaterialEntries}
              showFinancials={true}
            />
          )}
        </div>
      </div>

      {/* Work Summary Tabs */}
      <WorkSummaryTabs
        register={register}
        errors={errors}
        incidents={incidents}
        delays={delays}
        onIncidentsChange={setIncidents}
        onDelaysChange={setDelays}
        previousDayNotes={previousDayNotes}
      />

      {/* Actions */}
      <div className="flex justify-end gap-3">
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          loading={isSubmitting || createDiary.isPending || updateDiary.isPending}
          disabled={isSubmitting || createDiary.isPending || updateDiary.isPending}
        >
          <Save className="w-4 h-4 mr-2" />
          {diary ? 'Update' : 'Save'} Daily Diary
        </Button>
      </div>
    </form>
  );
}
