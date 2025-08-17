'use client';

import React from 'react';
import { CalendarDays, FileText, ArrowRight } from 'lucide-react';

interface TomorrowNotesSectionProps {
  register: any;
  errors: any;
  previousDayNotes?: string;
}

export function TomorrowNotesSection({
  register,
  errors,
  previousDayNotes,
}: TomorrowNotesSectionProps) {
  return (
    <div className="space-y-6">
      {/* Previous Day Notes Display */}
      {previousDayNotes && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <ArrowRight className="w-5 h-5 text-blue-600" />
            <h4 className="text-lg font-medium text-blue-900">Notes from Previous Day</h4>
          </div>
          <div className="bg-white rounded p-3 border border-blue-100">
            <p className="text-gray-700 whitespace-pre-wrap">{previousDayNotes}</p>
          </div>
        </div>
      )}

      {/* Tomorrow's Planned Work */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <CalendarDays className="w-5 h-5 text-green-600" />
          <h4 className="text-lg font-medium text-gray-900">Tomorrow&apos;s Planned Work</h4>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Planned Activities</label>
          <textarea
            {...register('tomorrow_planned_work')}
            rows={4}
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
              errors.tomorrow_planned_work
                ? 'border-red-300 focus:ring-red-500'
                : 'border-gray-300 focus:ring-green-500'
            }`}
            placeholder="What work is planned for tomorrow? Include key activities, deliveries, inspections, etc."
          />
          {errors.tomorrow_planned_work && (
            <p className="mt-1 text-sm text-red-600">{errors.tomorrow_planned_work.message}</p>
          )}
        </div>
      </div>

      {/* Additional Notes for Tomorrow */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <FileText className="w-5 h-5 text-purple-600" />
          <h4 className="text-lg font-medium text-gray-900">Additional Notes for Tomorrow</h4>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Important Notes & Reminders
          </label>
          <textarea
            {...register('notes_for_tomorrow')}
            rows={4}
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
              errors.notes_for_tomorrow
                ? 'border-red-300 focus:ring-red-500'
                : 'border-gray-300 focus:ring-purple-500'
            }`}
            placeholder="Any specific notes, reminders, or important information for tomorrow's team..."
          />
          {errors.notes_for_tomorrow && (
            <p className="mt-1 text-sm text-red-600">{errors.notes_for_tomorrow.message}</p>
          )}
        </div>
      </div>

      {/* General Notes */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <FileText className="w-5 h-5 text-gray-600" />
          <h4 className="text-lg font-medium text-gray-900">General Notes</h4>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Additional Comments
          </label>
          <textarea
            {...register('general_notes')}
            rows={3}
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
              errors.general_notes
                ? 'border-red-300 focus:ring-red-500'
                : 'border-gray-300 focus:ring-gray-500'
            }`}
            placeholder="Any other notes or observations for this diary entry..."
          />
          {errors.general_notes && (
            <p className="mt-1 text-sm text-red-600">{errors.general_notes.message}</p>
          )}
        </div>
      </div>
    </div>
  );
}
