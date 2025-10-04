'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Users, Truck, Search } from 'lucide-react';
import { Input, Badge, Button } from '@siteproof/design-system';

interface Contractor {
  id: string;
  company_name: string;
  company_type: string;
  primary_contact_email?: string;
  primary_contact_phone?: string;
}

interface Worker {
  id: string;
  name: string;
  job_title: string;
  hourly_rate: number;
  contractor_id: string;
  certifications?: string[];
  contact_phone?: string;
  contact_email?: string;
}

interface PlantItem {
  id: string;
  name: string;
  hourly_rate: number;
  contractor_id: string;
  equipment_type?: string;
  registration_number?: string;
}

type TabType = 'contractors' | 'workers' | 'plant';

export default function AdminResourcesPage() {
  const [activeTab, setActiveTab] = useState<TabType>('contractors');
  const [searchTerm, setSearchTerm] = useState('');
  const queryClient = useQueryClient();

  // Fetch contractors
  const { data: contractors = [], isLoading: loadingContractors } = useQuery<Contractor[]>({
    queryKey: ['contractors'],
    queryFn: async () => {
      const res = await fetch('/api/contractors');
      if (!res.ok) throw new Error('Failed to fetch contractors');
      return res.json();
    },
  });

  // Fetch all workers
  const { data: allWorkers = [], isLoading: loadingWorkers } = useQuery<Worker[]>({
    queryKey: ['all-workers'],
    queryFn: async () => {
      const workers: Worker[] = [];
      for (const contractor of contractors) {
        const res = await fetch(`/api/contractors/${contractor.id}/workers`);
        if (res.ok) {
          const data = await res.json();
          workers.push(...data);
        }
      }
      return workers;
    },
    enabled: contractors.length > 0,
  });

  // Fetch all plant items
  const { data: allPlant = [], isLoading: loadingPlant } = useQuery<PlantItem[]>({
    queryKey: ['all-plant'],
    queryFn: async () => {
      const plant: PlantItem[] = [];
      for (const contractor of contractors) {
        const res = await fetch(`/api/contractors/${contractor.id}/plant`);
        if (res.ok) {
          const data = await res.json();
          plant.push(...data);
        }
      }
      return plant;
    },
    enabled: contractors.length > 0,
  });

  // Delete contractor
  const deleteContractor = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/contractors/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contractors'] });
    },
  });

  // Delete worker
  const deleteWorker = useMutation({
    mutationFn: async ({ contractorId, workerId }: { contractorId: string; workerId: string }) => {
      const res = await fetch(`/api/contractors/${contractorId}/workers/${workerId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-workers'] });
    },
  });

  // Delete plant item
  const deletePlant = useMutation({
    mutationFn: async ({ contractorId, plantId }: { contractorId: string; plantId: string }) => {
      const res = await fetch(`/api/contractors/${contractorId}/plant/${plantId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-plant'] });
    },
  });

  // Filter data based on search
  const filteredContractors = contractors.filter((c) =>
    c.company_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredWorkers = allWorkers.filter(
    (w) =>
      w.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      w.job_title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredPlant = allPlant.filter((p) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const tabs: { id: TabType; label: string; icon: any; count: number }[] = [
    { id: 'contractors', label: 'Contractors', icon: Users, count: contractors.length },
    { id: 'workers', label: 'Workers', icon: Users, count: allWorkers.length },
    { id: 'plant', label: 'Plant & Machinery', icon: Truck, count: allPlant.length },
  ];

  return (
    <div className="container mx-auto py-6 px-4">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Resource Management</h1>
        <p className="text-gray-600">
          Manage contractors, workers, and plant machinery for daily diary selection
        </p>
      </div>

      {/* Search and Add */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              type="text"
              placeholder="Search resources..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              fullWidth
            />
          </div>
        </div>
        <Button
          onClick={() => {
            if (activeTab === 'contractors') {
              window.location.href = '/dashboard/contractors';
            }
          }}
          leftIcon={<Plus className="w-5 h-5" />}
          className="ml-4"
        >
          Add{' '}
          {activeTab === 'contractors'
            ? 'Contractor'
            : activeTab === 'workers'
              ? 'Worker'
              : 'Plant'}
        </Button>
      </div>

      {/* Tabs */}
      <div className="border-b mb-6">
        <div className="flex gap-4">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                <Icon className="w-5 h-5" />
                {tab.label}
                <span
                  className={`px-2 py-0.5 text-xs rounded-full ${
                    activeTab === tab.id ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="bg-white rounded-lg shadow-sm">
        {activeTab === 'contractors' && (
          <ContractorsTable
            contractors={filteredContractors}
            loading={loadingContractors}
            onDelete={(id) => deleteContractor.mutate(id)}
          />
        )}
        {activeTab === 'workers' && (
          <WorkersTable
            workers={filteredWorkers}
            contractors={contractors}
            loading={loadingWorkers}
            onDelete={(contractorId, workerId) => deleteWorker.mutate({ contractorId, workerId })}
          />
        )}
        {activeTab === 'plant' && (
          <PlantTable
            plant={filteredPlant}
            contractors={contractors}
            loading={loadingPlant}
            onDelete={(contractorId, plantId) => deletePlant.mutate({ contractorId, plantId })}
          />
        )}
      </div>

      {/* Stats Summary */}
      <div className="mt-6 grid grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <div className="text-sm text-gray-600 mb-1">Total Contractors</div>
          <div className="text-2xl font-bold text-gray-900">{contractors.length}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <div className="text-sm text-gray-600 mb-1">Total Workers</div>
          <div className="text-2xl font-bold text-gray-900">{allWorkers.length}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <div className="text-sm text-gray-600 mb-1">Total Plant Items</div>
          <div className="text-2xl font-bold text-gray-900">{allPlant.length}</div>
        </div>
      </div>
    </div>
  );
}

// Contractors Table Component
function ContractorsTable({
  contractors,
  loading,
  onDelete,
}: {
  contractors: Contractor[];
  loading: boolean;
  onDelete: (id: string) => void;
}) {
  if (loading) return <div className="p-8 text-center">Loading...</div>;
  if (contractors.length === 0)
    return <div className="p-8 text-center text-gray-600">No contractors found</div>;

  return (
    <table className="w-full">
      <thead className="bg-gray-50 border-b">
        <tr>
          <th className="text-left py-3 px-4 font-medium text-gray-700">Company Name</th>
          <th className="text-left py-3 px-4 font-medium text-gray-700">Type</th>
          <th className="text-left py-3 px-4 font-medium text-gray-700">Contact</th>
          <th className="w-20"></th>
        </tr>
      </thead>
      <tbody className="divide-y">
        {contractors.map((contractor) => (
          <tr key={contractor.id} className="hover:bg-gray-50">
            <td className="py-3 px-4 font-medium">{contractor.company_name}</td>
            <td className="py-3 px-4">
              <Badge variant="info" size="small">
                {contractor.company_type}
              </Badge>
            </td>
            <td className="py-3 px-4 text-sm text-gray-600">
              {contractor.primary_contact_email || contractor.primary_contact_phone || 'N/A'}
            </td>
            <td className="py-3 px-4">
              <button
                onClick={() => {
                  if (confirm(`Delete ${contractor.company_name}?`)) {
                    onDelete(contractor.id);
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
  );
}

// Workers Table Component
function WorkersTable({
  workers,
  contractors,
  loading,
  onDelete,
}: {
  workers: Worker[];
  contractors: Contractor[];
  loading: boolean;
  onDelete: (contractorId: string, workerId: string) => void;
}) {
  if (loading) return <div className="p-8 text-center">Loading...</div>;
  if (workers.length === 0)
    return <div className="p-8 text-center text-gray-600">No workers found</div>;

  const getContractorName = (contractorId: string) => {
    const contractor = contractors.find((c) => c.id === contractorId);
    return contractor?.company_name || 'Unknown';
  };

  return (
    <table className="w-full">
      <thead className="bg-gray-50 border-b">
        <tr>
          <th className="text-left py-3 px-4 font-medium text-gray-700">Name</th>
          <th className="text-left py-3 px-4 font-medium text-gray-700">Job Title</th>
          <th className="text-left py-3 px-4 font-medium text-gray-700">Contractor</th>
          <th className="text-left py-3 px-4 font-medium text-gray-700">Hourly Rate</th>
          <th className="text-left py-3 px-4 font-medium text-gray-700">Certifications</th>
          <th className="w-20"></th>
        </tr>
      </thead>
      <tbody className="divide-y">
        {workers.map((worker) => (
          <tr key={worker.id} className="hover:bg-gray-50">
            <td className="py-3 px-4 font-medium">{worker.name}</td>
            <td className="py-3 px-4">{worker.job_title}</td>
            <td className="py-3 px-4 text-sm text-gray-600">
              {getContractorName(worker.contractor_id)}
            </td>
            <td className="py-3 px-4">${worker.hourly_rate.toFixed(2)}/hr</td>
            <td className="py-3 px-4 text-sm text-gray-600">
              {Array.isArray(worker.certifications) && worker.certifications.length > 0
                ? worker.certifications.join(', ')
                : 'None'}
            </td>
            <td className="py-3 px-4">
              <button
                onClick={() => {
                  if (confirm(`Delete ${worker.name}?`)) {
                    onDelete(worker.contractor_id, worker.id);
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
  );
}

// Plant Table Component
function PlantTable({
  plant,
  contractors,
  loading,
  onDelete,
}: {
  plant: PlantItem[];
  contractors: Contractor[];
  loading: boolean;
  onDelete: (contractorId: string, plantId: string) => void;
}) {
  if (loading) return <div className="p-8 text-center">Loading...</div>;
  if (plant.length === 0)
    return <div className="p-8 text-center text-gray-600">No plant items found</div>;

  const getContractorName = (contractorId: string) => {
    const contractor = contractors.find((c) => c.id === contractorId);
    return contractor?.company_name || 'Unknown';
  };

  return (
    <table className="w-full">
      <thead className="bg-gray-50 border-b">
        <tr>
          <th className="text-left py-3 px-4 font-medium text-gray-700">Equipment Name</th>
          <th className="text-left py-3 px-4 font-medium text-gray-700">Type</th>
          <th className="text-left py-3 px-4 font-medium text-gray-700">Contractor</th>
          <th className="text-left py-3 px-4 font-medium text-gray-700">Hourly Rate</th>
          <th className="text-left py-3 px-4 font-medium text-gray-700">Registration</th>
          <th className="w-20"></th>
        </tr>
      </thead>
      <tbody className="divide-y">
        {plant.map((item) => (
          <tr key={item.id} className="hover:bg-gray-50">
            <td className="py-3 px-4 font-medium">{item.name}</td>
            <td className="py-3 px-4">{item.equipment_type || 'N/A'}</td>
            <td className="py-3 px-4 text-sm text-gray-600">
              {getContractorName(item.contractor_id)}
            </td>
            <td className="py-3 px-4">${item.hourly_rate.toFixed(2)}/hr</td>
            <td className="py-3 px-4 text-sm text-gray-600">{item.registration_number || 'N/A'}</td>
            <td className="py-3 px-4">
              <button
                onClick={() => {
                  if (confirm(`Delete ${item.name}?`)) {
                    onDelete(item.contractor_id, item.id);
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
  );
}
