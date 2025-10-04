'use client';

import { use, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Plus, Trash2, DollarSign } from 'lucide-react';
import Link from 'next/link';

interface Worker {
  id: string;
  name: string;
  job_title: string;
  hourly_rate: number;
  certifications?: string[] | string;
  contact_phone?: string;
  contact_email?: string;
  is_active: boolean;
}

interface PlantItem {
  id: string;
  name: string;
  hourly_rate: number;
  contact_phone?: string;
  contact_email?: string;
  is_active: boolean;
}

export default function ContractorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [showAddModal, setShowAddModal] = useState(false);
  const queryClient = useQueryClient();

  // Fetch contractor details
  const { data: contractor } = useQuery({
    queryKey: ['contractor', id],
    queryFn: async () => {
      const res = await fetch(`/api/contractors/${id}`);
      if (!res.ok) throw new Error('Failed to fetch contractor');
      return res.json();
    },
  });

  // Fetch workers or plant items
  const { data: items = [], isLoading } = useQuery<Worker[] | PlantItem[]>({
    queryKey: ['contractor-items', id, contractor?.type],
    queryFn: async () => {
      if (!contractor) return [];
      const endpoint = contractor.type === 'labor' ? 'workers' : 'plant';
      const res = await fetch(`/api/contractors/${id}/${endpoint}`);
      if (!res.ok) throw new Error(`Failed to fetch ${endpoint}`);
      return res.json();
    },
    enabled: !!contractor,
  });

  // Delete item
  const deleteItem = useMutation({
    mutationFn: async (itemId: string) => {
      const endpoint = contractor?.type === 'labor' ? 'workers' : 'plant';
      const res = await fetch(`/api/contractors/${id}/${endpoint}/${itemId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`Failed to delete ${endpoint}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contractor-items', id] });
    },
  });

  if (!contractor) {
    return <div className="container mx-auto py-6 px-4">Loading...</div>;
  }

  const isLabor = contractor.type === 'labor';

  return (
    <div className="container mx-auto py-6 px-4">
      <Link
        href="/dashboard/contractors"
        className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Contractors
      </Link>

      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-3xl font-bold">{contractor.name}</h1>
          <p className="text-gray-600 mt-1">
            {isLabor ? 'Labor Contractor' : 'Plant/Equipment Supplier'}
          </p>
          {contractor.contact_email && (
            <p className="text-sm text-gray-500 mt-1">{contractor.contact_email}</p>
          )}
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-5 h-5" />
          {isLabor ? 'Add Worker' : 'Add Plant Item'}
        </button>
      </div>

      {/* Items list */}
      {isLoading ? (
        <div className="text-center py-12">Loading...</div>
      ) : items.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-600">No {isLabor ? 'workers' : 'plant items'} found</p>
          <button
            onClick={() => setShowAddModal(true)}
            className="mt-4 text-blue-600 hover:text-blue-700 font-medium"
          >
            Add your first {isLabor ? 'worker' : 'plant item'}
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left py-3 px-4 font-medium text-gray-700">
                  {isLabor ? 'Name' : 'Equipment'}
                </th>
                {isLabor && (
                  <>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Job Title</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Contact</th>
                  </>
                )}
                <th className="text-left py-3 px-4 font-medium text-gray-700">Hourly Rate</th>
                <th className="w-20"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="py-3 px-4">
                    <div className="font-medium">{item.name}</div>
                    {isLabor && 'certifications' in item && item.certifications ? (
                      <div className="text-xs text-gray-500 mt-1">
                        {Array.isArray(item.certifications)
                          ? item.certifications.join(', ')
                          : String(item.certifications)}
                      </div>
                    ) : null}
                  </td>
                  {isLabor && 'job_title' in item ? (
                    <>
                      <td className="py-3 px-4 text-gray-600">{String(item.job_title)}</td>
                      <td className="py-3 px-4">
                        <div className="text-sm text-gray-600">
                          {item.contact_phone && <div>{item.contact_phone}</div>}
                          {item.contact_email && (
                            <div className="text-xs">{item.contact_email}</div>
                          )}
                        </div>
                      </td>
                    </>
                  ) : null}
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1 text-gray-900">
                      <DollarSign className="w-4 h-4" />
                      {item.hourly_rate.toFixed(2)}/hr
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <button
                      onClick={() => {
                        if (confirm(`Delete ${item.name}?`)) {
                          deleteItem.mutate(item.id);
                        }
                      }}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Worker/Plant Modal */}
      {showAddModal && (
        <AddItemModal
          contractorId={id}
          contractorType={contractor.type}
          organizationId={contractor.organization_id}
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            queryClient.invalidateQueries({ queryKey: ['contractor-items', id] });
          }}
        />
      )}
    </div>
  );
}

function AddItemModal({
  contractorId,
  contractorType,
  organizationId,
  onClose,
  onSuccess,
}: {
  contractorId: string;
  contractorType: 'labor' | 'plant';
  organizationId: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const isLabor = contractorType === 'labor';

  const [formData, setFormData] = useState({
    name: '',
    job_title: '',
    hourly_rate: 0,
    certifications: '',
    contact_phone: '',
    contact_email: '',
  });

  const createItem = useMutation({
    mutationFn: async (data: any) => {
      const endpoint = isLabor ? 'workers' : 'plant';
      const res = await fetch(`/api/contractors/${contractorId}/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || `Failed to create ${endpoint}`);
      }
      return res.json();
    },
    onSuccess,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data: any = {
      organization_id: organizationId,
      name: formData.name,
      hourly_rate: formData.hourly_rate,
    };

    if (isLabor) {
      data.job_title = formData.job_title;
      data.certifications = formData.certifications
        .split(',')
        .map((c) => c.trim())
        .filter(Boolean);
      data.contact_phone = formData.contact_phone;
      data.contact_email = formData.contact_email;
    }

    createItem.mutate(data);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <h2 className="text-2xl font-bold mb-4">Add {isLabor ? 'Worker' : 'Plant Item'}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {isLabor ? 'Worker Name' : 'Equipment Name'} *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder={isLabor ? 'John Smith' : 'Excavator 20-ton'}
            />
          </div>

          {isLabor && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Job Title *</label>
                <input
                  type="text"
                  required
                  value={formData.job_title}
                  onChange={(e) => setFormData({ ...formData, job_title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Concrete Finisher"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Certifications (comma-separated)
                </label>
                <input
                  type="text"
                  value={formData.certifications}
                  onChange={(e) => setFormData({ ...formData, certifications: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="CSCS, CPCS, First Aid"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contact Phone
                </label>
                <input
                  type="tel"
                  value={formData.contact_phone}
                  onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="+1 234 567 8900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contact Email
                </label>
                <input
                  type="email"
                  value={formData.contact_email}
                  onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="worker@email.com"
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Hourly Rate (USD) *
            </label>
            <input
              type="number"
              required
              step="0.01"
              min="0"
              value={formData.hourly_rate}
              onChange={(e) =>
                setFormData({ ...formData, hourly_rate: parseFloat(e.target.value) })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="25.00"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createItem.isPending}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300"
            >
              {createItem.isPending ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
