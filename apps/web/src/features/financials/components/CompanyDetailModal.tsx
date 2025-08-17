'use client';

import React, { useState } from 'react';
import { X, Users, Truck, Package, Building2 } from 'lucide-react';
import { EmployeeManagement } from './EmployeeManagement';
import { PlantEquipmentManagement } from './PlantEquipmentManagement';
import { MaterialsManagement } from './MaterialsManagement';

interface CompanyDetailModalProps {
  company: any;
  onClose: () => void;
  canManage: boolean;
  showFinancials: boolean;
}

export function CompanyDetailModal({
  company,
  onClose,
  canManage,
  showFinancials,
}: CompanyDetailModalProps) {
  const [activeTab, setActiveTab] = useState<'info' | 'employees' | 'plant' | 'materials'>('info');

  const tabs = [
    { id: 'info', label: 'Company Info', icon: Building2 },
    { id: 'employees', label: 'Employees', icon: Users },
    { id: 'plant', label: 'Plant & Equipment', icon: Truck },
    { id: 'materials', label: 'Materials', icon: Package },
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">{company.company_name}</h2>
            <p className="text-sm text-gray-500 mt-1">
              {company.company_type.charAt(0).toUpperCase() + company.company_type.slice(1)}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b">
          <div className="flex space-x-8 px-6">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`
                    flex items-center gap-2 py-4 border-b-2 transition-colors
                    ${
                      activeTab === tab.id
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }
                  `}
                >
                  <Icon className="w-4 h-4" />
                  <span className="font-medium">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          {activeTab === 'info' && (
            <CompanyInfo company={company} showFinancials={showFinancials} />
          )}

          {activeTab === 'employees' && (
            <EmployeeManagement
              companyId={company.id}
              companyName={company.company_name}
              canManage={canManage}
              showFinancials={showFinancials}
            />
          )}

          {activeTab === 'plant' && (
            <PlantEquipmentManagement
              companyId={company.id}
              companyName={company.company_name}
              canManage={canManage}
              showFinancials={showFinancials}
            />
          )}

          {activeTab === 'materials' && company.company_type === 'supplier' && (
            <MaterialsManagement
              supplierId={company.id}
              supplierName={company.company_name}
              canManage={canManage}
              showFinancials={showFinancials}
            />
          )}

          {activeTab === 'materials' && company.company_type !== 'supplier' && (
            <div className="text-center py-12">
              <Package className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500">Materials are only available for supplier companies</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Company Info Component
function CompanyInfo({ company, showFinancials }: { company: any; showFinancials: boolean }) {
  return (
    <div className="space-y-6">
      {/* Basic Information */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-500">Company Name</label>
            <p className="mt-1 text-gray-900">{company.company_name}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500">Type</label>
            <p className="mt-1 text-gray-900">
              {company.company_type.charAt(0).toUpperCase() + company.company_type.slice(1)}
            </p>
          </div>
          {company.tax_id && (
            <div>
              <label className="block text-sm font-medium text-gray-500">Tax ID</label>
              <p className="mt-1 text-gray-900">{company.tax_id}</p>
            </div>
          )}
          {company.registration_number && (
            <div>
              <label className="block text-sm font-medium text-gray-500">Registration Number</label>
              <p className="mt-1 text-gray-900">{company.registration_number}</p>
            </div>
          )}
        </div>
      </div>

      {/* Contact Information */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h3>
        <div className="grid grid-cols-2 gap-4">
          {company.primary_contact_name && (
            <div>
              <label className="block text-sm font-medium text-gray-500">Primary Contact</label>
              <p className="mt-1 text-gray-900">{company.primary_contact_name}</p>
            </div>
          )}
          {company.primary_contact_email && (
            <div>
              <label className="block text-sm font-medium text-gray-500">Email</label>
              <p className="mt-1 text-gray-900">{company.primary_contact_email}</p>
            </div>
          )}
          {company.primary_contact_phone && (
            <div>
              <label className="block text-sm font-medium text-gray-500">Phone</label>
              <p className="mt-1 text-gray-900">{company.primary_contact_phone}</p>
            </div>
          )}
        </div>
      </div>

      {/* Address */}
      {(company.address_line1 || company.city) && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Address</h3>
          <div className="space-y-2">
            {company.address_line1 && <p className="text-gray-900">{company.address_line1}</p>}
            {company.address_line2 && <p className="text-gray-900">{company.address_line2}</p>}
            <p className="text-gray-900">
              {[company.city, company.state_province, company.postal_code]
                .filter(Boolean)
                .join(', ')}
            </p>
            {company.country && <p className="text-gray-900">{company.country}</p>}
          </div>
        </div>
      )}

      {/* Financial Information */}
      {showFinancials && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Financial Information</h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-500">Currency</label>
              <p className="mt-1 text-gray-900">{company.default_currency || 'USD'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500">Payment Terms</label>
              <p className="mt-1 text-gray-900">{company.payment_terms || 30} days</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500">Tax Rate</label>
              <p className="mt-1 text-gray-900">{company.tax_rate || 0}%</p>
            </div>
          </div>
        </div>
      )}

      {/* Licenses */}
      {company.licenses && company.licenses.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Licenses</h3>
          <div className="space-y-3">
            {company.licenses.map((license: any, index: number) => (
              <div key={index} className="p-3 bg-gray-50 rounded-lg">
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500">Type</label>
                    <p className="mt-1 text-sm text-gray-900">{license.type}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500">Number</label>
                    <p className="mt-1 text-sm text-gray-900">{license.number}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500">Expiry</label>
                    <p className="mt-1 text-sm text-gray-900">{license.expiry_date || 'N/A'}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
