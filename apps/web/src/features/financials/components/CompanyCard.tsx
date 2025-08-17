import React from 'react';
import {
  Building2,
  Mail,
  Phone,
  MapPin,
  DollarSign,
  Edit,
  Clock,
  Shield,
  FileText,
} from 'lucide-react';
import { Button } from '@siteproof/design-system';
import { cn } from '@/lib/utils';

interface CompanyCardProps {
  company: any;
  onEdit?: (e?: React.MouseEvent) => void;
  onViewRates?: (e?: React.MouseEvent) => void;
  canManage?: boolean;
  showFinancials?: boolean;
}

export function CompanyCard({
  company,
  onEdit,
  onViewRates,
  canManage = false,
  showFinancials = false,
}: CompanyCardProps) {
  const typeConfig = {
    contractor: { label: 'Contractor', color: 'bg-blue-100 text-blue-700' },
    supplier: { label: 'Supplier', color: 'bg-green-100 text-green-700' },
    consultant: { label: 'Consultant', color: 'bg-purple-100 text-purple-700' },
    employee: { label: 'Employee', color: 'bg-gray-100 text-gray-700' },
  };

  const config =
    typeConfig[company.company_type as keyof typeof typeConfig] || typeConfig.contractor;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-gray-100 rounded-lg">
            <Building2 className="w-5 h-5 text-gray-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{company.company_name}</h3>
            <span className={cn('px-2 py-1 text-xs font-medium rounded-full', config.color)}>
              {config.label}
            </span>
          </div>
        </div>

        {canManage && (
          <Button variant="ghost" size="sm" onClick={onEdit}>
            <Edit className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Contact Information */}
      <div className="space-y-2 mb-4">
        {company.primary_contact_name && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span className="font-medium">{company.primary_contact_name}</span>
          </div>
        )}

        {company.primary_contact_email && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Mail className="w-4 h-4 text-gray-400" />
            <a href={`mailto:${company.primary_contact_email}`} className="hover:text-blue-600">
              {company.primary_contact_email}
            </a>
          </div>
        )}

        {company.primary_contact_phone && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Phone className="w-4 h-4 text-gray-400" />
            <a href={`tel:${company.primary_contact_phone}`} className="hover:text-blue-600">
              {company.primary_contact_phone}
            </a>
          </div>
        )}

        {company.city && company.state_province && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <MapPin className="w-4 h-4 text-gray-400" />
            <span>
              {company.city}, {company.state_province}
            </span>
          </div>
        )}
      </div>

      {/* Financial Information (if accessible) */}
      {showFinancials && (
        <div className="pt-4 border-t border-gray-200 space-y-2">
          {company.tax_rate !== null && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Tax Rate</span>
              <span className="font-medium">{company.tax_rate}%</span>
            </div>
          )}

          {company.payment_terms && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Payment Terms</span>
              <span className="font-medium">{company.payment_terms} days</span>
            </div>
          )}

          <Button variant="secondary" size="sm" onClick={onViewRates} fullWidth className="mt-3">
            <DollarSign className="w-4 h-4 mr-1" />
            View Rate History
          </Button>
        </div>
      )}

      {/* Compliance Status */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="grid grid-cols-2 gap-2">
          {company.insurance_details && Object.keys(company.insurance_details).length > 0 && (
            <div className="flex items-center gap-1 text-xs text-green-600">
              <Shield className="w-3 h-3" />
              <span>Insured</span>
            </div>
          )}

          {company.licenses && company.licenses.length > 0 && (
            <div className="flex items-center gap-1 text-xs text-green-600">
              <FileText className="w-3 h-3" />
              <span>Licensed</span>
            </div>
          )}

          {company.is_approved && (
            <div className="flex items-center gap-1 text-xs text-blue-600">
              <Clock className="w-3 h-3" />
              <span>Approved</span>
            </div>
          )}
        </div>
      </div>

      {/* Status */}
      {!company.is_active && (
        <div className="mt-4 p-3 bg-red-50 rounded-lg">
          <p className="text-sm text-red-700 font-medium">Inactive</p>
        </div>
      )}
    </div>
  );
}
