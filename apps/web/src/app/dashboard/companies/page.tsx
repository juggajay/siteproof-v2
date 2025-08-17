'use client';

export const dynamic = 'force-dynamic';

import React, { useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { Button, StateDisplay } from '@siteproof/design-system';
import { useQuery } from '@tanstack/react-query';
import { useOrganizationRole } from '@/features/organizations/hooks/useOrganization';
import { CompanyCard } from '@/features/financials/components/CompanyCard';
import { CompanyForm } from '@/features/financials/components/CompanyForm';
import { RateHistoryModal } from '@/features/financials/components/RateHistoryModal';
import { CompanyDetailModal } from '@/features/financials/components/CompanyDetailModal';

export default function CompaniesPage() {
  const { data: role } = useOrganizationRole();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<any | null>(null);
  const [showRateHistory, setShowRateHistory] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [filter, setFilter] = useState({
    type: '',
    search: '',
    activeOnly: true,
  });

  const hasFinancialAccess = ['owner', 'admin', 'finance_manager', 'accountant'].includes(
    role?.role || ''
  );
  const canManage = ['owner', 'admin'].includes(role?.role || '');

  const {
    data: companies,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['companies', filter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filter.activeOnly) params.append('active', 'true');
      if (filter.type) params.append('type', filter.type);

      const response = await fetch(`/api/companies?${params}`);
      if (!response.ok) throw new Error('Failed to fetch companies');
      return response.json();
    },
  });

  const filteredCompanies = companies?.filter((company: any) => {
    if (!filter.search) return true;
    const searchLower = filter.search.toLowerCase();
    return (
      company.company_name.toLowerCase().includes(searchLower) ||
      company.primary_contact_name?.toLowerCase().includes(searchLower) ||
      company.primary_contact_email?.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Company Management</h1>
            <p className="mt-2 text-gray-600">Manage contractors, suppliers, and their rates</p>
          </div>
          {canManage && (
            <Button onClick={() => setShowCreateForm(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Company
            </Button>
          )}
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search companies..."
                value={filter.search}
                onChange={(e) => setFilter((prev) => ({ ...prev, search: e.target.value }))}
                className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <select
              value={filter.type}
              onChange={(e) => setFilter((prev) => ({ ...prev, type: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Types</option>
              <option value="contractor">Contractors</option>
              <option value="supplier">Suppliers</option>
              <option value="consultant">Consultants</option>
              <option value="employee">Employees</option>
            </select>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={filter.activeOnly}
                onChange={(e) => setFilter((prev) => ({ ...prev, activeOnly: e.target.checked }))}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Active only</span>
            </label>
          </div>
        </div>
      </div>

      {/* Company List */}
      <StateDisplay
        loading={isLoading}
        error={error}
        empty={!filteredCompanies?.length}
        onRetry={refetch}
        emptyTitle="No companies found"
        emptyDescription="Add your first company to start tracking workforce and costs"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCompanies?.map((company: any) => (
            <div
              key={company.id}
              onClick={() => {
                setSelectedCompany(company);
                setShowDetailModal(true);
              }}
              className="cursor-pointer"
            >
              <CompanyCard
                company={company}
                onEdit={(e) => {
                  e?.stopPropagation();
                  setSelectedCompany(company.id);
                  setShowCreateForm(true);
                }}
                onViewRates={(e) => {
                  e?.stopPropagation();
                  setSelectedCompany(company.id);
                  setShowRateHistory(true);
                }}
                canManage={canManage}
                showFinancials={hasFinancialAccess}
              />
            </div>
          ))}
        </div>
      </StateDisplay>

      {/* Create/Edit Form Modal */}
      {showCreateForm && (
        <CompanyForm
          companyId={selectedCompany}
          onClose={() => {
            setShowCreateForm(false);
            setSelectedCompany(null);
          }}
          onSuccess={() => {
            setShowCreateForm(false);
            setSelectedCompany(null);
            refetch();
          }}
        />
      )}

      {/* Rate History Modal */}
      {showRateHistory && selectedCompany && (
        <RateHistoryModal
          companyId={selectedCompany}
          onClose={() => {
            setShowRateHistory(false);
            setSelectedCompany(null);
          }}
        />
      )}

      {/* Company Detail Modal */}
      {showDetailModal && selectedCompany && (
        <CompanyDetailModal
          company={selectedCompany}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedCompany(null);
          }}
          canManage={canManage}
          showFinancials={hasFinancialAccess}
        />
      )}
    </div>
  );
}
