'use client';

import React from 'react';
import { Input } from '@siteproof/design-system';
import type { TemplateField } from '@/features/templates/types/template.types';

interface FieldRendererProps {
  field: TemplateField;
  value: any;
  onChange: (value: any) => void;
  error?: string;
}

export function FieldRenderer({
  field,
  value,
  onChange,
  error,
}: FieldRendererProps) {
  switch (field.type) {
    case 'text':
      return (
        <Input
          label={field.label}
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          required={field.required}
          error={error}
          fullWidth
        />
      );

    case 'textarea':
      return (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {field.label}
            {field.required && <span className="ml-1 text-red-500">*</span>}
          </label>
          <textarea
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            required={field.required}
            rows={4}
            className={`
              w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2
              ${error
                ? 'border-red-300 focus:ring-red-500'
                : 'border-gray-300 focus:ring-blue-500'
              }
            `}
          />
          {error && (
            <p className="mt-1 text-sm text-red-600">{error}</p>
          )}
        </div>
      );

    case 'number':
      return (
        <Input
          type="number"
          label={field.label}
          value={value || ''}
          onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
          placeholder={field.placeholder}
          required={field.required}
          error={error}
          fullWidth
          min={field.validation?.min}
          max={field.validation?.max}
        />
      );

    case 'checkbox':
      return (
        <div>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={value || false}
              onChange={(e) => onChange(e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <span className="ml-2 text-sm text-gray-700">
              {field.label}
              {field.required && <span className="ml-1 text-red-500">*</span>}
            </span>
          </label>
          {error && (
            <p className="mt-1 text-sm text-red-600">{error}</p>
          )}
        </div>
      );

    case 'select':
      return (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {field.label}
            {field.required && <span className="ml-1 text-red-500">*</span>}
          </label>
          <select
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            required={field.required}
            className={`
              w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2
              ${error
                ? 'border-red-300 focus:ring-red-500'
                : 'border-gray-300 focus:ring-blue-500'
              }
            `}
          >
            <option value="">Select an option</option>
            {field.options?.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          {error && (
            <p className="mt-1 text-sm text-red-600">{error}</p>
          )}
        </div>
      );

    case 'date':
      return (
        <Input
          type="date"
          label={field.label}
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          required={field.required}
          error={error}
          fullWidth
        />
      );

    default:
      return (
        <div className="text-sm text-gray-500">
          Unsupported field type: {field.type}
        </div>
      );
  }
}