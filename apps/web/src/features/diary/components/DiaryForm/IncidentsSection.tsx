'use client';

import React from 'react';
import { Plus, Trash2, AlertTriangle, Clock } from 'lucide-react';
import { Button } from '@siteproof/design-system';

interface IncidentEntry {
  type: 'Near Miss' | 'Minor Injury' | 'Major Injury';
  description: string;
  action_taken: string;
  reported_to: string;
}

interface DelayEntry {
  type: 'Weather' | 'Equipment' | 'Material' | 'Labor' | 'Other';
  description: string;
  duration_hours: number;
  impact: 'Low' | 'Medium' | 'High';
}

interface IncidentsSectionProps {
  incidents: IncidentEntry[];
  delays: DelayEntry[];
  onIncidentsChange: (incidents: IncidentEntry[]) => void;
  onDelaysChange: (delays: DelayEntry[]) => void;
}

export function IncidentsSection({
  incidents,
  delays,
  onIncidentsChange,
  onDelaysChange,
}: IncidentsSectionProps) {
  const addIncident = () => {
    onIncidentsChange([
      ...incidents,
      {
        type: 'Near Miss',
        description: '',
        action_taken: '',
        reported_to: '',
      },
    ]);
  };

  const removeIncident = (index: number) => {
    onIncidentsChange(incidents.filter((_, i) => i !== index));
  };

  const updateIncident = (index: number, field: keyof IncidentEntry, value: string) => {
    const updated = [...incidents];
    updated[index] = { ...updated[index], [field]: value };
    onIncidentsChange(updated);
  };

  const addDelay = () => {
    onDelaysChange([
      ...delays,
      {
        type: 'Other',
        description: '',
        duration_hours: 0,
        impact: 'Low',
      },
    ]);
  };

  const removeDelay = (index: number) => {
    onDelaysChange(delays.filter((_, i) => i !== index));
  };

  const updateDelay = (index: number, field: keyof DelayEntry, value: string | number) => {
    const updated = [...delays];
    updated[index] = { ...updated[index], [field]: value };
    onDelaysChange(updated);
  };

  return (
    <div className="space-y-6">
      {/* Safety Incidents */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <h4 className="text-lg font-medium text-gray-900">Safety Incidents</h4>
            <span className="px-2 py-1 text-xs font-medium text-red-600 bg-red-100 rounded-full">
              {incidents.length}
            </span>
          </div>
          <Button size="sm" onClick={addIncident} variant="secondary">
            <Plus className="w-4 h-4 mr-1" />
            Add Incident
          </Button>
        </div>

        {incidents.length === 0 ? (
          <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
            No safety incidents reported
          </div>
        ) : (
          <div className="space-y-4">
            {incidents.map((incident, index) => (
              <div key={index} className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-600" />
                    <span className="font-medium text-red-900">Incident #{index + 1}</span>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => removeIncident(index)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Incident Type
                    </label>
                    <select
                      value={incident.type}
                      onChange={(e) => updateIncident(index, 'type', e.target.value as any)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                    >
                      <option value="Near Miss">Near Miss</option>
                      <option value="Minor Injury">Minor Injury</option>
                      <option value="Major Injury">Major Injury</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Reported To
                    </label>
                    <input
                      type="text"
                      value={incident.reported_to}
                      onChange={(e) => updateIncident(index, 'reported_to', e.target.value)}
                      placeholder="Who was this reported to?"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={incident.description}
                    onChange={(e) => updateIncident(index, 'description', e.target.value)}
                    rows={2}
                    placeholder="Describe what happened..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Action Taken
                  </label>
                  <textarea
                    value={incident.action_taken}
                    onChange={(e) => updateIncident(index, 'action_taken', e.target.value)}
                    rows={2}
                    placeholder="What action was taken?"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delays */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-orange-600" />
            <h4 className="text-lg font-medium text-gray-900">Delays & Issues</h4>
            <span className="px-2 py-1 text-xs font-medium text-orange-600 bg-orange-100 rounded-full">
              {delays.length}
            </span>
          </div>
          <Button size="sm" onClick={addDelay} variant="secondary">
            <Plus className="w-4 h-4 mr-1" />
            Add Delay
          </Button>
        </div>

        {delays.length === 0 ? (
          <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
            No delays reported
          </div>
        ) : (
          <div className="space-y-4">
            {delays.map((delay, index) => (
              <div key={index} className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-orange-600" />
                    <span className="font-medium text-orange-900">Delay #{index + 1}</span>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => removeDelay(index)}
                    className="text-orange-600 hover:text-orange-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Delay Type
                    </label>
                    <select
                      value={delay.type}
                      onChange={(e) => updateDelay(index, 'type', e.target.value as any)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    >
                      <option value="Weather">Weather</option>
                      <option value="Equipment">Equipment</option>
                      <option value="Material">Material</option>
                      <option value="Labor">Labor</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Duration (Hours)
                    </label>
                    <input
                      type="number"
                      value={delay.duration_hours}
                      onChange={(e) =>
                        updateDelay(index, 'duration_hours', parseFloat(e.target.value) || 0)
                      }
                      min="0"
                      step="0.5"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Impact</label>
                    <select
                      value={delay.impact}
                      onChange={(e) => updateDelay(index, 'impact', e.target.value as any)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    >
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                    </select>
                  </div>
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={delay.description}
                    onChange={(e) => updateDelay(index, 'description', e.target.value)}
                    rows={2}
                    placeholder="Describe the delay or issue..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
