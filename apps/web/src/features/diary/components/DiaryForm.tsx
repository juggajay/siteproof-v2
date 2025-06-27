'use client';

import React, { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar,
  Cloud,
  Users,
  Truck,
  AlertTriangle,
  Shield,
  Eye,
  Camera,
  Plus,
  Trash2,
  Save,
  Loader2,
  MapPin,
  Clock,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Button, Input, StateDisplay } from '@siteproof/design-system';
import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { weatherService } from '../services/weatherService';
import type { Project, DailyDiary } from '@siteproof/database';
import { WorkforceEntry } from '@/features/financials/components/WorkforceEntry';

const diarySchema = z.object({
  diary_date: z.string().min(1, 'Date is required'),
  site_conditions: z.string().optional(),
  work_areas: z.array(z.string()).default([]),
  access_issues: z.string().optional(),
  work_summary: z.string().min(10, 'Work summary must be at least 10 characters'),
  trades_on_site: z.array(z.object({
    trade: z.string().min(1, 'Trade is required'),
    company: z.string().min(1, 'Company is required'),
    workers: z.number().min(1),
    start_time: z.string().optional(),
    end_time: z.string().optional(),
    total_hours: z.number().optional(),
    hourly_rate: z.number().optional(),
    daily_rate: z.number().optional(),
    total_cost: z.number().optional(),
    notes: z.string().optional(),
    activities: z.array(z.string()).default([]),
  })).default([]),
  total_workers: z.number().min(0),
  key_personnel: z.array(z.object({
    name: z.string().min(1, 'Name is required'),
    role: z.string().min(1, 'Role is required'),
    company: z.string(),
    hours: z.object({
      start: z.string(),
      end: z.string(),
    }),
  })).default([]),
  equipment_on_site: z.array(z.object({
    type: z.string(),
    description: z.string(),
    supplier: z.string(),
    hours_used: z.number(),
  })).default([]),
  material_deliveries: z.array(z.object({
    material: z.string(),
    quantity: z.string(),
    supplier: z.string(),
    time: z.string(),
    location: z.string(),
  })).default([]),
  delays: z.array(z.object({
    type: z.enum(['Weather', 'Equipment', 'Material', 'Labor', 'Other']),
    description: z.string(),
    duration_hours: z.number(),
    impact: z.enum(['Low', 'Medium', 'High']),
  })).default([]),
  safety_incidents: z.array(z.object({
    type: z.enum(['Near Miss', 'Minor Injury', 'Major Injury']),
    description: z.string(),
    action_taken: z.string(),
    reported_to: z.string(),
  })).default([]),
  inspections: z.array(z.object({
    type: z.enum(['Safety', 'Quality', 'Client', 'Authority']),
    inspector: z.string(),
    organization: z.string(),
    findings: z.string(),
    time: z.string(),
  })).default([]),
  visitors: z.array(z.object({
    name: z.string(),
    company: z.string(),
    purpose: z.string(),
    time_in: z.string(),
    time_out: z.string(),
  })).default([]),
  milestones_achieved: z.array(z.string()).default([]),
  general_notes: z.string().optional(),
  tomorrow_planned_work: z.string().optional(),
});

type DiaryFormData = z.infer<typeof diarySchema>;

interface DiaryFormProps {
  project: Project;
  diary?: DailyDiary;
  date?: Date;
  onSuccess?: (diaryId: string) => void;
  onCancel?: () => void;
}

const commonTrades = [
  'General Contractor',
  'Concrete',
  'Steel/Structural',
  'Electrical',
  'Plumbing',
  'HVAC',
  'Carpentry',
  'Masonry',
  'Roofing',
  'Flooring',
  'Painting',
  'Landscaping',
];

export function DiaryForm({
  project,
  diary,
  date = new Date(),
  onSuccess,
  onCancel,
}: DiaryFormProps) {
  const [expandedSections, setExpandedSections] = useState({
    weather: true,
    work: true,
    personnel: false,
    equipment: false,
    issues: false,
    inspections: false,
    progress: false,
  });
  const [weatherData, setWeatherData] = useState<any>(null);
  const [isLoadingWeather, setIsLoadingWeather] = useState(true);

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<DiaryFormData>({
    resolver: zodResolver(diarySchema),
    defaultValues: {
      diary_date: date.toISOString().split('T')[0],
      work_areas: [],
      trades_on_site: [],
      total_workers: 0,
      key_personnel: [],
      equipment_on_site: [],
      material_deliveries: [],
      delays: [],
      safety_incidents: [],
      inspections: [],
      visitors: [],
      milestones_achieved: [],
      ...diary,
    },
  });

  const tradesField = useFieldArray({ control, name: 'trades_on_site' });
  const personnelField = useFieldArray({ control, name: 'key_personnel' });
  const equipmentField = useFieldArray({ control, name: 'equipment_on_site' });
  const deliveriesField = useFieldArray({ control, name: 'material_deliveries' });
  const delaysField = useFieldArray({ control, name: 'delays' });
  const incidentsField = useFieldArray({ control, name: 'safety_incidents' });
  const inspectionsField = useFieldArray({ control, name: 'inspections' });
  const visitorsField = useFieldArray({ control, name: 'visitors' });

  // Auto-calculate total workers
  const trades = watch('trades_on_site');
  useEffect(() => {
    const total = trades.reduce((sum, trade) => sum + (trade.workers || 0), 0);
    setValue('total_workers', total);
  }, [trades, setValue]);

  // Fetch weather data when component mounts or date changes
  useEffect(() => {
    const fetchWeather = async () => {
      setIsLoadingWeather(true);
      try {
        // Get project location - in real app, this would come from project data
        const location = project.client_company || 'London, UK';
        const weather = await weatherService.getWeatherByLocation(location, date);
        
        if (weather) {
          setWeatherData(weather);
        }
      } catch (error) {
        console.error('Failed to fetch weather:', error);
      } finally {
        setIsLoadingWeather(false);
      }
    };

    fetchWeather();
  }, [project, date]);

  const createDiary = useMutation({
    mutationFn: async (data: DiaryFormData) => {
      const response = await fetch('/api/diaries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          project_id: project.id,
          weather: weatherData,
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

  const onSubmit = (data: DiaryFormData) => {
    createDiary.mutate(data);
  };

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Daily Diary for {project.name}
            </h3>
            <Input
              type="date"
              label="Date"
              {...register('diary_date')}
              error={errors.diary_date?.message}
              required
              fullWidth
            />
          </div>
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Project Details</h4>
            <div className="space-y-2 text-sm text-gray-600">
              <p><strong>Client:</strong> {project.client_name || 'N/A'}</p>
              <p><strong>Location:</strong> {project.client_company || 'N/A'}</p>
              <p><strong>Project Manager:</strong> John Smith</p>
            </div>
          </div>
        </div>
      </div>

      {/* Weather Section */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <button
          type="button"
          onClick={() => toggleSection('weather')}
          className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <Cloud className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-medium text-gray-900">Weather Conditions</h3>
            {weatherData && (
              <span className="text-sm text-gray-500">
                {weatherData.conditions} • {weatherData.temperature.max}°{weatherData.temperature.unit}
              </span>
            )}
          </div>
          {expandedSections.weather ? <ChevronUp /> : <ChevronDown />}
        </button>
        
        <AnimatePresence>
          {expandedSections.weather && (
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: 'auto' }}
              exit={{ height: 0 }}
              className="overflow-hidden"
            >
              <div className="px-6 pb-6 border-t">
                {isLoadingWeather ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                    <span className="ml-2 text-gray-500">Fetching weather data...</span>
                  </div>
                ) : weatherData ? (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs text-gray-500">Temperature</p>
                      <p className="text-lg font-semibold">
                        {weatherData.temperature.min}° - {weatherData.temperature.max}°{weatherData.temperature.unit}
                      </p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs text-gray-500">Conditions</p>
                      <p className="text-lg font-semibold">{weatherData.conditions}</p>
                      <p className="text-xs text-gray-600">{weatherData.description}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs text-gray-500">Wind</p>
                      <p className="text-lg font-semibold">
                        {weatherData.wind.speed} {weatherData.wind.unit} {weatherData.wind.direction}
                      </p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs text-gray-500">Humidity</p>
                      <p className="text-lg font-semibold">{weatherData.humidity}%</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs text-gray-500">Precipitation</p>
                      <p className="text-lg font-semibold">{weatherData.precipitation.probability}%</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs text-gray-500">UV Index</p>
                      <p className="text-lg font-semibold">{weatherData.uv_index}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs text-gray-500">Sunrise</p>
                      <p className="text-lg font-semibold">{weatherData.sunrise}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs text-gray-500">Sunset</p>
                      <p className="text-lg font-semibold">{weatherData.sunset}</p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    Weather data not available
                  </div>
                )}
                
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Site Conditions
                    </label>
                    <textarea
                      {...register('site_conditions')}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Describe how weather affected site conditions..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Access Issues
                    </label>
                    <textarea
                      {...register('access_issues')}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Any access issues due to weather or other factors..."
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Work Summary Section */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <button
          type="button"
          onClick={() => toggleSection('work')}
          className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5 text-green-600" />
            <h3 className="text-lg font-medium text-gray-900">Work Summary</h3>
            <span className="text-sm text-gray-500">
              {trades.length} trades • {watch('total_workers')} workers
            </span>
          </div>
          {expandedSections.work ? <ChevronUp /> : <ChevronDown />}
        </button>
        
        <AnimatePresence>
          {expandedSections.work && (
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: 'auto' }}
              exit={{ height: 0 }}
              className="overflow-hidden"
            >
              <div className="px-6 pb-6 border-t">
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Work Summary <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    {...register('work_summary')}
                    rows={4}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                      errors.work_summary
                        ? 'border-red-300 focus:ring-red-500'
                        : 'border-gray-300 focus:ring-blue-500'
                    }`}
                    placeholder="Summarize the day's work activities..."
                  />
                  {errors.work_summary && (
                    <p className="mt-1 text-sm text-red-600">{errors.work_summary.message}</p>
                  )}
                </div>

                {/* Trades on Site */}
                <div className="mt-6">
                  <WorkforceEntry
                    trades={watch('trades_on_site')}
                    onChange={(trades) => setValue('trades_on_site', trades)}
                    date={new Date(watch('diary_date'))}
                    projectId={project.id}
                    readOnly={false}
                  />
                </div>

                {/* Total Workers (auto-calculated) */}
                <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm font-medium text-blue-900">
                    Total Workers on Site: <span className="text-2xl">{watch('total_workers')}</span>
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3">
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          loading={isSubmitting}
          disabled={isSubmitting}
        >
          <Save className="w-4 h-4 mr-2" />
          Save Daily Diary
        </Button>
      </div>
    </form>
  );
}