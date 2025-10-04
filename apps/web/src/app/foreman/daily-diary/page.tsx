'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Calendar, Save, RotateCcw } from 'lucide-react';
import { LaborSection } from '@/components/foreman/LaborSection';
import { PlantSection } from '@/components/foreman/PlantSection';
import { MaterialsSection } from '@/components/foreman/MaterialsSection';

// TODO: Replace with dynamic project selection from user's assigned projects
// For MVP testing, using hardcoded project ID from environment or fallback
const PROJECT_ID =
  process.env.NEXT_PUBLIC_DEFAULT_PROJECT_ID || '217523b8-6dd7-4d94-b876-e41879d07970';

export default function DailyDiaryPage() {
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [weatherNotes, setWeatherNotes] = useState('');
  const [progressNotes, setProgressNotes] = useState('');
  const [laborEntries, setLaborEntries] = useState<any[]>([]);
  const [plantEntries, setPlantEntries] = useState<any[]>([]);
  const [materialEntries, setMaterialEntries] = useState<any[]>([]);

  const queryClient = useQueryClient();

  // Fetch diary for selected date (if it exists)
  const { data: diary } = useQuery({
    queryKey: ['diary', PROJECT_ID, selectedDate],
    queryFn: async () => {
      const res = await fetch(`/api/daily-diary?project_id=${PROJECT_ID}&date=${selectedDate}`);
      if (res.status === 404) return null; // No diary for this date yet
      if (!res.ok) throw new Error('Failed to fetch diary');
      const data = await res.json();

      // Update local state with fetched data
      if (data) {
        setWeatherNotes(data.weather_notes || '');
        setProgressNotes(data.progress_notes || '');
        setLaborEntries(data.labor || []);
        setPlantEntries(data.plant || []);
        setMaterialEntries(data.materials || []);
      }

      return data;
    },
  });

  // Fetch previous day's data for auto-populate
  const { data: previousDayData, refetch: refetchPreviousDay } = useQuery({
    queryKey: ['previous-day', PROJECT_ID, selectedDate],
    queryFn: async () => {
      const res = await fetch(`/api/daily-diary/previous-day/${PROJECT_ID}?date=${selectedDate}`);
      if (!res.ok) throw new Error('Failed to fetch previous day data');
      return res.json();
    },
    enabled: !!selectedDate,
  });

  // Save diary mutation - unified API call
  const saveDiary = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/daily-diary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: PROJECT_ID,
          diary_date: selectedDate,
          weather_notes: weatherNotes,
          progress_notes: progressNotes,
          labor: laborEntries,
          plant: plantEntries,
          materials: materialEntries,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Failed to save diary');
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['diary', PROJECT_ID, selectedDate] });
      alert('Diary saved successfully!');
    },
    onError: (error: Error) => {
      alert(`Failed to save diary: ${error.message}`);
    },
  });

  const handleAutoPopulate = () => {
    if (previousDayData?.labor) {
      setLaborEntries(
        previousDayData.labor.map((entry: any) => ({
          worker_id: entry.worker_id,
          hours_worked: entry.hours_worked,
          notes: '',
        }))
      );
    }
    if (previousDayData?.plant) {
      setPlantEntries(
        previousDayData.plant.map((entry: any) => ({
          plant_id: entry.plant_id,
          hours_used: entry.hours_used,
          notes: '',
        }))
      );
    }
    if (previousDayData?.materials) {
      setMaterialEntries(
        previousDayData.materials.map((entry: any) => ({
          material_id: entry.material_id,
          material_name: entry.material_name,
          quantity: entry.quantity,
          unit: entry.unit,
          supplier_name: entry.supplier_name,
          notes: '',
        }))
      );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
        <h1 className="text-2xl font-bold mb-4">Daily Diary</h1>

        {/* Date Selector */}
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="w-5 h-5 text-gray-600" />
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
          />
        </div>

        {/* Auto-populate button */}
        <button
          onClick={handleAutoPopulate}
          disabled={!previousDayData?.labor?.length}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          <RotateCcw className="w-5 h-5" />
          Auto-populate from Previous Day
        </button>
      </div>

      {/* Weather & Progress Notes */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">Weather Notes</label>
        <textarea
          value={weatherNotes}
          onChange={(e) => setWeatherNotes(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-4"
          rows={2}
          placeholder="Weather conditions..."
        />

        <label className="block text-sm font-medium text-gray-700 mb-2">Progress Notes</label>
        <textarea
          value={progressNotes}
          onChange={(e) => setProgressNotes(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          rows={3}
          placeholder="Work progress and activities..."
        />
      </div>

      {/* Labor Section */}
      <LaborSection
        entries={laborEntries}
        onChange={setLaborEntries}
        organizationId={
          process.env.NEXT_PUBLIC_DEFAULT_ORG_ID || '470d6cc4-2565-46d9-967e-c6b148f81954'
        }
      />

      {/* Plant Section */}
      <PlantSection
        entries={plantEntries}
        onChange={setPlantEntries}
        organizationId={
          process.env.NEXT_PUBLIC_DEFAULT_ORG_ID || '470d6cc4-2565-46d9-967e-c6b148f81954'
        }
      />

      {/* Materials Section */}
      <MaterialsSection
        entries={materialEntries}
        onChange={setMaterialEntries}
        organizationId={
          process.env.NEXT_PUBLIC_DEFAULT_ORG_ID || '470d6cc4-2565-46d9-967e-c6b148f81954'
        }
      />

      {/* Save Button */}
      <button
        onClick={() => saveDiary.mutate()}
        disabled={saveDiary.isPending}
        className="fixed bottom-20 right-4 flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-full shadow-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
      >
        <Save className="w-5 h-5" />
        {saveDiary.isPending ? 'Saving...' : 'Save Diary'}
      </button>
    </div>
  );
}
