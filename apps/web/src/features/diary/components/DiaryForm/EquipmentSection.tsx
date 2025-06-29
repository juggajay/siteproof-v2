'use client';

import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@siteproof/design-system';

interface EquipmentSectionProps {
  register: any;
  deliveriesField: any;
  equipmentField: any;
}

export function EquipmentSection({
  register,
  deliveriesField,
  equipmentField,
}: EquipmentSectionProps) {
  return (
    <div className="space-y-6">
      {/* Equipment on Site */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-medium text-gray-700">Equipment on Site</h4>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => equipmentField.append({
              type: '',
              description: '',
              supplier: '',
              hours_used: 8,
            })}
          >
            <Plus className="w-4 h-4 mr-1" />
            Add Equipment
          </Button>
        </div>
        
        <div className="space-y-3">
          {equipmentField.fields.map((field: any, index: number) => (
            <div key={field.id} className="p-4 bg-gray-50 rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Type
                  </label>
                  <input
                    {...register(`equipment_on_site.${index}.type`)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    placeholder="e.g., Crane, Excavator"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <input
                    {...register(`equipment_on_site.${index}.description`)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    placeholder="50-ton mobile crane"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Supplier
                  </label>
                  <input
                    {...register(`equipment_on_site.${index}.supplier`)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    placeholder="Equipment supplier"
                  />
                </div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Hours Used
                    </label>
                    <input
                      type="number"
                      {...register(`equipment_on_site.${index}.hours_used`, { valueAsNumber: true })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      min="0"
                      step="0.5"
                    />
                  </div>
                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={() => equipmentField.remove(index)}
                      className="p-2 text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Material Deliveries */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-medium text-gray-700">Material Deliveries</h4>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => deliveriesField.append({
              material: '',
              quantity: '',
              supplier: '',
              time: '',
              location: '',
            })}
          >
            <Plus className="w-4 h-4 mr-1" />
            Add Delivery
          </Button>
        </div>
        
        <div className="space-y-3">
          {deliveriesField.fields.map((field: any, index: number) => (
            <div key={field.id} className="p-4 bg-gray-50 rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Material
                  </label>
                  <input
                    {...register(`material_deliveries.${index}.material`)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    placeholder="e.g., Concrete"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Quantity
                  </label>
                  <input
                    {...register(`material_deliveries.${index}.quantity`)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    placeholder="e.g., 50m³"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Supplier
                  </label>
                  <input
                    {...register(`material_deliveries.${index}.supplier`)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    placeholder="Supplier name"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Time
                  </label>
                  <input
                    type="time"
                    {...register(`material_deliveries.${index}.time`)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Location
                    </label>
                    <input
                      {...register(`material_deliveries.${index}.location`)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      placeholder="Delivery location"
                    />
                  </div>
                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={() => deliveriesField.remove(index)}
                      className="p-2 text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}