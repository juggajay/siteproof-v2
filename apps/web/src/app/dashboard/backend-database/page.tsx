'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Users, Truck, Package, Plus } from 'lucide-react';

const ORG_ID = '470d6cc4-2565-46d9-967e-c6b148f81954'; // Hardcoded for MVP

type TabType = 'contractors' | 'workers' | 'plant' | 'materials';

export default function BackendDatabasePage() {
  const [activeTab, setActiveTab] = useState<TabType>('contractors');
  const [selectedContractor, setSelectedContractor] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);

  const queryClient = useQueryClient();

  // Fetch contractors
  const { data: contractors = [] } = useQuery({
    queryKey: ['contractors'],
    queryFn: async () => {
      const [laborRes, plantRes] = await Promise.all([
        fetch('/api/contractors?type=labor'),
        fetch('/api/contractors?type=plant'),
      ]);
      const labor = await laborRes.json();
      const plant = await plantRes.json();
      return [...labor, ...plant];
    },
  });

  // Fetch workers for selected contractor
  const { data: workers = [] } = useQuery({
    queryKey: ['workers', selectedContractor],
    queryFn: async () => {
      if (!selectedContractor) return [];
      const res = await fetch(`/api/contractors/${selectedContractor}/workers`);
      return res.json();
    },
    enabled: !!selectedContractor && activeTab === 'workers',
  });

  // Fetch plant for selected contractor
  const { data: plant = [] } = useQuery({
    queryKey: ['plant', selectedContractor],
    queryFn: async () => {
      if (!selectedContractor) return [];
      const res = await fetch(`/api/contractors/${selectedContractor}/plant`);
      return res.json();
    },
    enabled: !!selectedContractor && activeTab === 'plant',
  });

  // Create contractor
  const createContractor = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch('/api/contractors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, organization_id: ORG_ID }),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contractors'] });
      setShowModal(false);
    },
  });

  // Create worker
  const createWorker = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch(`/api/contractors/${selectedContractor}/workers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, organization_id: ORG_ID }),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workers'] });
      setShowModal(false);
    },
  });

  // Create plant
  const createPlant = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch(`/api/contractors/${selectedContractor}/plant`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, organization_id: ORG_ID }),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plant'] });
      setShowModal(false);
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());

    if (activeTab === 'contractors') {
      createContractor.mutate(data);
    } else if (activeTab === 'workers') {
      createWorker.mutate(data);
    } else if (activeTab === 'plant') {
      createPlant.mutate(data);
    }
  };

  const laborContractors = contractors.filter((c: any) => c.type === 'labor');
  const plantContractors = contractors.filter((c: any) => c.type === 'plant');

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Backend Database Management</h1>
        <p className="text-gray-600 mt-2">
          Manage contractors, workers, plant, and materials for the organization
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'contractors', label: 'Contractors', icon: Users },
            { id: 'workers', label: 'Workers', icon: Users },
            { id: 'plant', label: 'Plant', icon: Truck },
            { id: 'materials', label: 'Materials', icon: Package },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="w-5 h-5" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Contractors Tab */}
      {activeTab === 'contractors' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Contractors</h2>
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-5 h-5" />
              Add Contractor
            </button>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <h3 className="font-medium mb-2">Labor Contractors ({laborContractors.length})</h3>
              <div className="space-y-2">
                {laborContractors.map((contractor: any) => (
                  <div key={contractor.id} className="p-4 border rounded-lg hover:bg-gray-50">
                    <div className="font-medium">{contractor.name}</div>
                    {contractor.contact_email && (
                      <div className="text-sm text-gray-600">{contractor.contact_email}</div>
                    )}
                    {contractor.contact_phone && (
                      <div className="text-sm text-gray-600">{contractor.contact_phone}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="font-medium mb-2">Plant Contractors ({plantContractors.length})</h3>
              <div className="space-y-2">
                {plantContractors.map((contractor: any) => (
                  <div key={contractor.id} className="p-4 border rounded-lg hover:bg-gray-50">
                    <div className="font-medium">{contractor.name}</div>
                    {contractor.contact_email && (
                      <div className="text-sm text-gray-600">{contractor.contact_email}</div>
                    )}
                    {contractor.contact_phone && (
                      <div className="text-sm text-gray-600">{contractor.contact_phone}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Workers Tab */}
      {activeTab === 'workers' && (
        <div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Labor Contractor
            </label>
            <select
              value={selectedContractor || ''}
              onChange={(e) => setSelectedContractor(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="">-- Select Contractor --</option>
              {laborContractors.map((contractor: any) => (
                <option key={contractor.id} value={contractor.id}>
                  {contractor.name}
                </option>
              ))}
            </select>
          </div>

          {selectedContractor && (
            <>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Workers ({workers.length})</h2>
                <button
                  onClick={() => setShowModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <Plus className="w-5 h-5" />
                  Add Worker
                </button>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {workers.map((worker: any) => (
                  <div key={worker.id} className="p-4 border rounded-lg">
                    <div className="font-medium">{worker.name}</div>
                    <div className="text-sm text-gray-600">{worker.job_title}</div>
                    <div className="text-sm font-medium text-green-600 mt-1">
                      £{worker.hourly_rate}/hr
                    </div>
                    {worker.contact_phone && (
                      <div className="text-xs text-gray-500 mt-1">{worker.contact_phone}</div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Plant Tab */}
      {activeTab === 'plant' && (
        <div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Plant Contractor
            </label>
            <select
              value={selectedContractor || ''}
              onChange={(e) => setSelectedContractor(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="">-- Select Contractor --</option>
              {plantContractors.map((contractor: any) => (
                <option key={contractor.id} value={contractor.id}>
                  {contractor.name}
                </option>
              ))}
            </select>
          </div>

          {selectedContractor && (
            <>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Plant Items ({plant.length})</h2>
                <button
                  onClick={() => setShowModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <Plus className="w-5 h-5" />
                  Add Plant
                </button>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {plant.map((item: any) => (
                  <div key={item.id} className="p-4 border rounded-lg">
                    <div className="font-medium">{item.name}</div>
                    <div className="text-sm font-medium text-green-600 mt-1">
                      £{item.hourly_rate}/hr
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Materials Tab */}
      {activeTab === 'materials' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Materials</h2>
            <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              <Plus className="w-5 h-5" />
              Add Material
            </button>
          </div>
          <div className="text-gray-500">
            Materials management coming soon. Use custom materials in daily diary for now.
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-4">
              {activeTab === 'contractors' && 'Add Contractor'}
              {activeTab === 'workers' && 'Add Worker'}
              {activeTab === 'plant' && 'Add Plant Item'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              {activeTab === 'contractors' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Contractor Name
                    </label>
                    <input
                      type="text"
                      name="name"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                    <select
                      name="type"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="labor">Labor</option>
                      <option value="plant">Plant</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Contact Email
                    </label>
                    <input
                      type="email"
                      name="contact_email"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Contact Phone
                    </label>
                    <input
                      type="tel"
                      name="contact_phone"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                </>
              )}

              {activeTab === 'workers' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Worker Name
                    </label>
                    <input
                      type="text"
                      name="name"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Job Title
                    </label>
                    <input
                      type="text"
                      name="job_title"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Hourly Rate (£)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      name="hourly_rate"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Contact Phone
                    </label>
                    <input
                      type="tel"
                      name="contact_phone"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                </>
              )}

              {activeTab === 'plant' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Plant/Equipment Name
                    </label>
                    <input
                      type="text"
                      name="name"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Hourly Rate (£)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      name="hourly_rate"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                </>
              )}

              <div className="flex gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
