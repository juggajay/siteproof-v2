import React from 'react';
import {
  Cloud,
  CloudRain,
  Sun,
  CloudSnow,
  Wind,
  Droplets,
  Thermometer,
  Eye,
} from 'lucide-react';

interface WeatherDisplayProps {
  weather: {
    temperature?: { min: number; max: number; unit: string };
    conditions?: string;
    description?: string;
    humidity?: number;
    wind?: { speed: number; direction: string; unit: string };
    precipitation?: { amount: number; probability: number };
    uv_index?: number;
    sunrise?: string;
    sunset?: string;
  };
  compact?: boolean;
}

export function WeatherDisplay({ weather, compact = false }: WeatherDisplayProps) {
  const getWeatherIcon = (conditions: string) => {
    const condition = conditions.toLowerCase();
    if (condition.includes('rain')) return CloudRain;
    if (condition.includes('snow')) return CloudSnow;
    if (condition.includes('cloud')) return Cloud;
    if (condition.includes('clear') || condition.includes('sun')) return Sun;
    return Cloud;
  };

  const WeatherIcon = weather.conditions ? getWeatherIcon(weather.conditions) : Cloud;

  if (compact) {
    return (
      <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
        <WeatherIcon className="w-8 h-8 text-blue-600" />
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-gray-900">
              {weather.temperature?.min}° - {weather.temperature?.max}°{weather.temperature?.unit}
            </span>
            <span className="text-gray-600">{weather.conditions}</span>
          </div>
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <span className="flex items-center gap-1">
              <Wind className="w-3 h-3" />
              {weather.wind?.speed} {weather.wind?.unit}
            </span>
            <span className="flex items-center gap-1">
              <Droplets className="w-3 h-3" />
              {weather.humidity}%
            </span>
            {weather.precipitation?.probability ? (
              <span className="flex items-center gap-1">
                <CloudRain className="w-3 h-3" />
                {weather.precipitation.probability}%
              </span>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-blue-50 to-sky-50 rounded-xl p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">Weather Conditions</h3>
          <p className="text-sm text-gray-600">{weather.description}</p>
        </div>
        <WeatherIcon className="w-12 h-12 text-blue-600" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white/80 backdrop-blur rounded-lg p-3">
          <div className="flex items-center gap-2 text-gray-600 mb-1">
            <Thermometer className="w-4 h-4" />
            <span className="text-xs font-medium">Temperature</span>
          </div>
          <p className="text-xl font-bold text-gray-900">
            {weather.temperature?.min}° - {weather.temperature?.max}°
            <span className="text-sm font-normal text-gray-600">{weather.temperature?.unit}</span>
          </p>
        </div>

        <div className="bg-white/80 backdrop-blur rounded-lg p-3">
          <div className="flex items-center gap-2 text-gray-600 mb-1">
            <Wind className="w-4 h-4" />
            <span className="text-xs font-medium">Wind</span>
          </div>
          <p className="text-xl font-bold text-gray-900">
            {weather.wind?.speed}
            <span className="text-sm font-normal text-gray-600 ml-1">
              {weather.wind?.unit} {weather.wind?.direction}
            </span>
          </p>
        </div>

        <div className="bg-white/80 backdrop-blur rounded-lg p-3">
          <div className="flex items-center gap-2 text-gray-600 mb-1">
            <Droplets className="w-4 h-4" />
            <span className="text-xs font-medium">Humidity</span>
          </div>
          <p className="text-xl font-bold text-gray-900">
            {weather.humidity}
            <span className="text-sm font-normal text-gray-600">%</span>
          </p>
        </div>

        <div className="bg-white/80 backdrop-blur rounded-lg p-3">
          <div className="flex items-center gap-2 text-gray-600 mb-1">
            <CloudRain className="w-4 h-4" />
            <span className="text-xs font-medium">Precipitation</span>
          </div>
          <p className="text-xl font-bold text-gray-900">
            {weather.precipitation?.probability || 0}
            <span className="text-sm font-normal text-gray-600">%</span>
          </p>
        </div>

        {weather.uv_index !== undefined && (
          <div className="bg-white/80 backdrop-blur rounded-lg p-3">
            <div className="flex items-center gap-2 text-gray-600 mb-1">
              <Sun className="w-4 h-4" />
              <span className="text-xs font-medium">UV Index</span>
            </div>
            <p className="text-xl font-bold text-gray-900">{weather.uv_index}</p>
          </div>
        )}

        {weather.sunrise && (
          <div className="bg-white/80 backdrop-blur rounded-lg p-3">
            <div className="flex items-center gap-2 text-gray-600 mb-1">
              <Sun className="w-4 h-4" />
              <span className="text-xs font-medium">Sunrise</span>
            </div>
            <p className="text-xl font-bold text-gray-900">{weather.sunrise}</p>
          </div>
        )}

        {weather.sunset && (
          <div className="bg-white/80 backdrop-blur rounded-lg p-3">
            <div className="flex items-center gap-2 text-gray-600 mb-1">
              <Eye className="w-4 h-4" />
              <span className="text-xs font-medium">Sunset</span>
            </div>
            <p className="text-xl font-bold text-gray-900">{weather.sunset}</p>
          </div>
        )}
      </div>
    </div>
  );
}