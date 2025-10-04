'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Building2, Users, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { Input, Badge, Button, Modal, ModalFooter } from '@siteproof/design-system';

interface Contractor {
  id: string;
  name: string;
  type: 'labor' | 'plant';
  contact_email?: string;
  contact_phone?: string;
  is_active: boolean;
  created_at: string;
}

export default function ContractorsPage() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null);
  const [type, setType] = useState<'labor' | 'plant' | 'all'>('all');
  const queryClient = useQueryClient();

  // Fetch contractors
  const { data: contractors = [], isLoading } = useQuery<Contractor[]>({
    queryKey: ['contractors', type],
    queryFn: async () => {
      const url = type === 'all' ? '/api/contractors' : `/api/contractors?type=${type}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch contractors');
      return res.json();
    },
  });

  // Delete contractor
  const deleteContractor = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/contractors/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete contractor');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contractors'] });
    },
  });

  const laborContractors = contractors.filter((c) => c.type === 'labor');
  const plantContractors = contractors.filter((c) => c.type === 'plant');

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Contractors</h1>
          <p className="text-gray-600 mt-1">Manage labor contractors and plant suppliers</p>
        </div>
        <Button
          onClick={() => setShowAddModal(true)}
          leftIcon={<Plus className="w-5 h-5" />}
        >
          Add Contractor
        </Button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6 border-b">
        <button
          onClick={() => setType('all')}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
            type === 'all'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          All ({contractors.length})
        </button>
        <button
          onClick={() => setType('labor')}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
            type === 'labor'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          Labor ({laborContractors.length})
        </button>
        <button
          onClick={() => setType('plant')}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
            type === 'plant'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          Plant ({plantContractors.length})
        </button>
      </div>

      {/* Contractors grid */}
      {isLoading ? (
        <div className="text-center py-12">Loading...</div>
      ) : contractors.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No contractors found</p>
          <button
            onClick={() => setShowAddModal(true)}
            className="mt-4 text-blue-600 hover:text-blue-700 font-medium"
          >
            Add your first contractor
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {contractors.map((contractor) => (
            <div
              key={contractor.id}
              className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold text-lg">{contractor.name}</h3>
                    <Badge
                      variant={contractor.type === 'labor' ? 'info' : 'success'}
                      size="small"
                    >
                      {contractor.type}
                    </Badge>
                  </div>
                  {contractor.contact_email && (
                    <p className="text-sm text-gray-600">{contractor.contact_email}</p>
                  )}
                  {contractor.contact_phone && (
                    <p className="text-sm text-gray-600">{contractor.contact_phone}</p>
                  )}
                </div>
                <button
                  onClick={() => setDeleteConfirm({ id: contractor.id, name: contractor.name })}
                  className="text-red-600 hover:text-red-700"
                  aria-label="Delete contractor"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>

              <Link
                href={`/dashboard/contractors/${contractor.id}`}
                className="flex items-center justify-center gap-2 w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                {contractor.type === 'labor' ? (
                  <>
                    <Users className="w-4 h-4" />
                    Manage Workers
                  </>
                ) : (
                  <>
                    <Building2 className="w-4 h-4" />
                    Manage Plant
                  </>
                )}
              </Link>
            </div>
          ))}
        </div>
      )}

      {/* Add Contractor Modal */}
      {showAddModal && (
        <AddContractorModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            queryClient.invalidateQueries({ queryKey: ['contractors'] });
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="Delete Contractor"
        size="small"
      >
        <p className="text-gray-700">
          Are you sure you want to delete <strong>{deleteConfirm?.name}</strong>? This action cannot be undone.
        </p>
        <ModalFooter>
          <Button variant="secondary" onClick={() => setDeleteConfirm(null)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            loading={deleteContractor.isPending}
            onClick={() => {
              if (deleteConfirm) {
                deleteContractor.mutate(deleteConfirm.id);
                setDeleteConfirm(null);
              }
            }}
          >
            Delete
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}

function AddContractorModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [formData, setFormData] = useState({
    name: '',
    type: 'labor' as 'labor' | 'plant',
    contact_email: '',
    contact_phone: '',
  });

  const createContractor = useMutation({
    mutationFn: async (data: typeof formData & { organization_id: string }) => {
      const res = await fetch('/api/contractors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to create contractor');
      }
      return res.json();
    },
    onSuccess,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Get organization_id from the current user's organization
    const orgRes = await fetch('/api/organization/role');
    const orgData = await orgRes.json();

    createContractor.mutate({
      ...formData,
      organization_id: orgData.organization_id,
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <h2 className="text-2xl font-bold mb-4">Add Contractor</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Contractor Name"
            type="text"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="ABC Construction Ltd"
            fullWidth
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type *</label>
            <select
              required
              value={formData.type}
              onChange={(e) =>
                setFormData({ ...formData, type: e.target.value as 'labor' | 'plant' })
              }
              className="w-full min-h-[48px] px-4 py-3 text-base border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="labor">Labor Contractor</option>
              <option value="plant">Plant/Equipment Supplier</option>
            </select>
          </div>

          <Input
            label="Contact Email"
            type="email"
            value={formData.contact_email}
            onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
            placeholder="contact@contractor.com"
            fullWidth
          />

          <Input
            label="Contact Phone"
            type="tel"
            value={formData.contact_phone}
            onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
            placeholder="+1 234 567 8900"
            fullWidth
          />

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              onClick={onClose}
              variant="secondary"
              fullWidth
            >
              Cancel
            </Button>
            <Button
              type="submit"
              loading={createContractor.isPending}
              fullWidth
            >
              Create Contractor
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
