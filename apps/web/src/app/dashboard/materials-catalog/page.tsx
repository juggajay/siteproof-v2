'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Package, Trash2, Building2 } from 'lucide-react';

interface MaterialSupplier {
  id: string;
  name: string;
  contact_email?: string;
  contact_phone?: string;
  is_active: boolean;
}

interface Material {
  id: string;
  name: string;
  unit?: string;
  is_preloaded: boolean;
  supplier?: MaterialSupplier;
  supplier_id?: string;
}

export default function MaterialsCatalogPage() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const queryClient = useQueryClient();

  // Get organization ID
  const { data: orgData } = useQuery({
    queryKey: ['org-role'],
    queryFn: async () => {
      const res = await fetch('/api/organization/role');
      return res.json();
    },
  });

  // Fetch materials
  const { data: materials = [], isLoading } = useQuery<Material[]>({
    queryKey: ['materials', orgData?.organization_id],
    queryFn: async () => {
      const res = await fetch(`/api/materials?organization_id=${orgData?.organization_id}`);
      if (!res.ok) throw new Error('Failed to fetch materials');
      return res.json();
    },
    enabled: !!orgData?.organization_id,
  });

  // Fetch suppliers
  const { data: suppliers = [] } = useQuery<MaterialSupplier[]>({
    queryKey: ['material-suppliers', orgData?.organization_id],
    queryFn: async () => {
      const res = await fetch(
        `/api/material-suppliers?organization_id=${orgData?.organization_id}`
      );
      if (!res.ok) throw new Error('Failed to fetch suppliers');
      return res.json();
    },
    enabled: !!orgData?.organization_id,
  });

  // Delete material
  const deleteMaterial = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/materials/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete material');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['materials'] });
    },
  });

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Materials Catalog</h1>
          <p className="text-gray-600 mt-1">Manage preloaded materials for quick diary entry</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowSupplierModal(true)}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            <Building2 className="w-5 h-5" />
            Manage Suppliers
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-5 h-5" />
            Add Material
          </button>
        </div>
      </div>

      {/* Materials list */}
      {isLoading ? (
        <div className="text-center py-12">Loading...</div>
      ) : materials.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No materials in catalog</p>
          <button
            onClick={() => setShowAddModal(true)}
            className="mt-4 text-blue-600 hover:text-blue-700 font-medium"
          >
            Add your first material
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left py-3 px-4 font-medium text-gray-700">Material Name</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">Unit</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">Supplier</th>
                <th className="w-20"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {materials.map((material) => (
                <tr key={material.id} className="hover:bg-gray-50">
                  <td className="py-3 px-4 font-medium">{material.name}</td>
                  <td className="py-3 px-4 text-gray-600">{material.unit || '-'}</td>
                  <td className="py-3 px-4 text-gray-600">{material.supplier?.name || '-'}</td>
                  <td className="py-3 px-4">
                    <button
                      onClick={() => {
                        if (confirm(`Delete material "${material.name}"?`)) {
                          deleteMaterial.mutate(material.id);
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

      {/* Add Material Modal */}
      {showAddModal && (
        <AddMaterialModal
          suppliers={suppliers}
          organizationId={orgData?.organization_id}
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            queryClient.invalidateQueries({ queryKey: ['materials'] });
          }}
        />
      )}

      {/* Suppliers Management Modal */}
      {showSupplierModal && (
        <SuppliersModal
          organizationId={orgData?.organization_id}
          onClose={() => setShowSupplierModal(false)}
        />
      )}
    </div>
  );
}

function AddMaterialModal({
  suppliers,
  organizationId,
  onClose,
  onSuccess,
}: {
  suppliers: MaterialSupplier[];
  organizationId: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [formData, setFormData] = useState({
    name: '',
    unit: '',
    supplier_id: '',
  });

  const createMaterial = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch('/api/materials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to create material');
      }
      return res.json();
    },
    onSuccess,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMaterial.mutate({
      organization_id: organizationId,
      name: formData.name,
      unit: formData.unit || null,
      supplier_id: formData.supplier_id || null,
      is_preloaded: true,
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <h2 className="text-2xl font-bold mb-4">Add Material</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Material Name *</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Concrete C30/37"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Unit of Measure</label>
            <input
              type="text"
              value={formData.unit}
              onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="m³, kg, tonnes, etc."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Supplier (optional)
            </label>
            <select
              value={formData.supplier_id}
              onChange={(e) => setFormData({ ...formData, supplier_id: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">No supplier</option>
              {suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </option>
              ))}
            </select>
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
              disabled={createMaterial.isPending}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300"
            >
              {createMaterial.isPending ? 'Creating...' : 'Create Material'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function SuppliersModal({
  organizationId,
  onClose,
}: {
  organizationId: string;
  onClose: () => void;
}) {
  const [showAddSupplier, setShowAddSupplier] = useState(false);
  const queryClient = useQueryClient();

  const { data: suppliers = [] } = useQuery<MaterialSupplier[]>({
    queryKey: ['material-suppliers', organizationId],
    queryFn: async () => {
      const res = await fetch(`/api/material-suppliers?organization_id=${organizationId}`);
      if (!res.ok) throw new Error('Failed to fetch suppliers');
      return res.json();
    },
  });

  const deleteSupplier = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/material-suppliers/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete supplier');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['material-suppliers'] });
    },
  });

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full p-6 max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">Material Suppliers</h2>
          <button
            onClick={() => setShowAddSupplier(true)}
            className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
          >
            <Plus className="w-4 h-4" />
            Add Supplier
          </button>
        </div>

        <div className="space-y-2">
          {suppliers.map((supplier) => (
            <div
              key={supplier.id}
              className="flex items-center justify-between p-3 border rounded-lg"
            >
              <div>
                <div className="font-medium">{supplier.name}</div>
                {supplier.contact_email && (
                  <div className="text-sm text-gray-600">{supplier.contact_email}</div>
                )}
              </div>
              <button
                onClick={() => {
                  if (confirm(`Delete supplier "${supplier.name}"?`)) {
                    deleteSupplier.mutate(supplier.id);
                  }
                }}
                className="text-red-600 hover:text-red-700"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        {showAddSupplier && (
          <AddSupplierForm
            organizationId={organizationId}
            onClose={() => setShowAddSupplier(false)}
            onSuccess={() => {
              setShowAddSupplier(false);
              queryClient.invalidateQueries({ queryKey: ['material-suppliers'] });
            }}
          />
        )}

        <button
          onClick={onClose}
          className="w-full mt-4 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
        >
          Close
        </button>
      </div>
    </div>
  );
}

function AddSupplierForm({
  organizationId,
  onClose,
  onSuccess,
}: {
  organizationId: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [formData, setFormData] = useState({
    name: '',
    contact_email: '',
    contact_phone: '',
  });

  const createSupplier = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch('/api/material-suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to create supplier');
      return res.json();
    },
    onSuccess,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createSupplier.mutate({
      organization_id: organizationId,
      ...formData,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="mt-4 p-4 bg-gray-50 rounded-lg space-y-3">
      <h3 className="font-medium">New Supplier</h3>
      <input
        type="text"
        required
        value={formData.name}
        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
        placeholder="Supplier name"
      />
      <input
        type="email"
        value={formData.contact_email}
        onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
        placeholder="Contact email"
      />
      <input
        type="tel"
        value={formData.contact_phone}
        onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
        placeholder="Contact phone"
      />
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-white"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={createSupplier.isPending}
          className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300"
        >
          Add
        </button>
      </div>
    </form>
  );
}
