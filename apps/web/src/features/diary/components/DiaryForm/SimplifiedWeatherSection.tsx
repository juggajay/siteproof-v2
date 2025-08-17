'use client';

import React from 'react';
import { Cloud } from 'lucide-react';

interface SimplifiedWeatherSectionProps {
  register: any;
  errors: any;
}

export function SimplifiedWeatherSection({ register, errors }: SimplifiedWeatherSectionProps) {
  const weatherConditions = [
    'Sunny',
    'Partly Cloudy',
    'Cloudy',
    'Overcast',
    'Light Rain',
    'Heavy Rain',
    'Snow',
    'Fog',
    'Windy',
    'Storm',
  ];

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center gap-3 mb-4">
        <Cloud className="w-5 h-5 text-blue-600" />
        <h3 className="text-lg font-medium text-gray-900">Weather & Site Conditions</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        {/* Weather Conditions */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Weather Conditions</label>
          <select
            {...register('weather_conditions')}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select conditions...</option>
            {weatherConditions.map((condition) => (
              <option key={condition} value={condition}>
                {condition}
              </option>
            ))}
          </select>
        </div>

        {/* Temperature */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Temperature (°C)</label>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              placeholder="Min"
              {...register('temperature_min', { valueAsNumber: true })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="number"
              placeholder="Max"
              {...register('temperature_max', { valueAsNumber: true })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Wind */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Wind Conditions</label>
          <select
            {...register('wind_conditions')}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select...</option>
            <option value="Calm">Calm</option>
            <option value="Light">Light</option>
            <option value="Moderate">Moderate</option>
            <option value="Strong">Strong</option>
            <option value="Very Strong">Very Strong</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Site Conditions */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Site Conditions</label>
          <textarea
            {...register('site_conditions')}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="How did weather affect site conditions? (e.g., muddy, dry, icy...)"
          />
          {errors.site_conditions && (
            <p className="mt-1 text-sm text-red-600">{errors.site_conditions.message}</p>
          )}
        </div>

        {/* Access Issues */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Access Issues</label>
          <textarea
            {...register('access_issues')}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Any access issues due to weather or other factors..."
          />
          {errors.access_issues && (
            <p className="mt-1 text-sm text-red-600">{errors.access_issues.message}</p>
          )}
        </div>
      </div>
    </div>
  );
}
