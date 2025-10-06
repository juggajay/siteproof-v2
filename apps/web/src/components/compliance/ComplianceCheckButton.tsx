'use client';

import { useState } from 'react';
import { Button } from '@siteproof/design-system';
import {
  AlertTriangle,
  CheckCircle,
  Shield,
  Loader2,
  XCircle,
  DollarSign,
  Calendar,
  AlertCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { toast } from 'sonner';

interface ComplianceCheckButtonProps {
  projectId: string;
  additionalData?: {
    test_results?: Array<{
      test_type: string;
      value: number;
      requirement: number;
      unit: string;
    }>;
    weather_conditions?: {
      current_temp?: number;
      rainfall_7days?: number;
      forecast_rain?: boolean;
    };
  };
}

interface ComplianceAnalysis {
  compliance_status: 'COMPLIANT' | 'NON_COMPLIANT' | 'CONDITIONAL';
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  issues: Array<{
    category: string;
    standard: string;
    section?: string;
    description: string;
    severity: 'CRITICAL' | 'MAJOR' | 'MINOR';
    remediation_required: boolean;
  }>;
  financial_impact: {
    estimated_remediation_cost: number;
    potential_penalties: number;
    delay_costs: number;
    total_risk: number;
  };
  timeline_impact: {
    estimated_delay_days: number;
    critical_path_affected: boolean;
    weather_risk_days: number;
  };
  recommendations: Array<{
    priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
    action: string;
    standard_reference?: string;
    cost_estimate?: number;
  }>;
  analysis: string;
  tool_calls_made: number;
  timestamp: string;
}

export function ComplianceCheckButton({ projectId, additionalData }: ComplianceCheckButtonProps) {
  const [isChecking, setIsChecking] = useState(false);
  const [result, setResult] = useState<ComplianceAnalysis | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    issues: true,
    financial: false,
    timeline: false,
    recommendations: true,
    fullAnalysis: false,
  });

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const runComplianceCheck = async () => {
    setIsChecking(true);

    try {
      const response = await fetch('/api/ai/compliance-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          additionalData,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setResult(data.analysis);
        setShowDetails(true);

        // Show appropriate toast based on risk level
        if (data.analysis.risk_level === 'CRITICAL' || data.analysis.risk_level === 'HIGH') {
          toast.error(`High risk compliance issues detected!`, {
            description: `${data.analysis.issues.filter((i: any) => i.severity === 'CRITICAL').length} critical issues found`,
          });
        } else if (data.analysis.compliance_status === 'COMPLIANT') {
          toast.success('Project is compliant with all standards!');
        } else {
          toast.warning('Compliance issues found - review recommendations');
        }
      } else {
        toast.error(data.error || 'Failed to run compliance check');
      }
    } catch (error) {
      console.error('Compliance check error:', error);
      toast.error('Failed to run compliance check');
    } finally {
      setIsChecking(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLIANT':
        return 'text-green-600 bg-green-50';
      case 'NON_COMPLIANT':
        return 'text-red-600 bg-red-50';
      case 'CONDITIONAL':
        return 'text-yellow-600 bg-yellow-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'LOW':
        return 'text-green-600 bg-green-50';
      case 'MEDIUM':
        return 'text-yellow-600 bg-yellow-50';
      case 'HIGH':
        return 'text-orange-600 bg-orange-50';
      case 'CRITICAL':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'MAJOR':
        return <AlertTriangle className="h-4 w-4 text-orange-600" />;
      case 'MINOR':
        return <AlertCircle className="h-4 w-4 text-yellow-600" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-600" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'CRITICAL':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'HIGH':
        return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'MEDIUM':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'LOW':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="space-y-4">
      <Button
        onClick={runComplianceCheck}
        disabled={isChecking}
        className="w-full"
        variant={result && result.risk_level === 'CRITICAL' ? 'danger' : 'primary'}
      >
        {isChecking ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Analyzing Compliance...
          </>
        ) : (
          <>
            <Shield className="mr-2 h-4 w-4" />
            Run AI Compliance Check
          </>
        )}
      </Button>

      {result && showDetails && (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          {/* Header with Status */}
          <div className="p-4 bg-gray-50 border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Shield className="h-6 w-6 text-blue-600" />
                <div>
                  <h3 className="text-lg font-semibold">Compliance Analysis</h3>
                  <p className="text-sm text-gray-500">
                    Analyzed on {new Date(result.timestamp).toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(result.compliance_status)}`}
                >
                  {result.compliance_status.replace('_', ' ')}
                </span>
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium ${getRiskColor(result.risk_level)}`}
                >
                  {result.risk_level} RISK
                </span>
              </div>
            </div>
          </div>

          {/* Issues Section */}
          {result.issues.length > 0 && (
            <div className="border-b">
              <button
                onClick={() => toggleSection('issues')}
                className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-orange-600" />
                  <span className="font-medium">Compliance Issues ({result.issues.length})</span>
                </div>
                {expandedSections.issues ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </button>
              {expandedSections.issues && (
                <div className="px-4 pb-4 space-y-3">
                  {result.issues.map((issue, index) => (
                    <div key={index} className="bg-gray-50 rounded-lg p-3">
                      <div className="flex items-start gap-2">
                        {getSeverityIcon(issue.severity)}
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{issue.category}</span>
                            <span className="text-xs text-gray-500">
                              {issue.standard} {issue.section && `§${issue.section}`}
                            </span>
                          </div>
                          <p className="text-sm text-gray-700 mt-1">{issue.description}</p>
                          {issue.remediation_required && (
                            <span className="inline-block mt-2 px-2 py-1 bg-red-100 text-red-700 text-xs rounded">
                              Remediation Required
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Financial Impact Section */}
          <div className="border-b">
            <button
              onClick={() => toggleSection('financial')}
              className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-green-600" />
                <span className="font-medium">Financial Impact</span>
                <span className="text-sm text-gray-500">
                  Total Risk: {formatCurrency(result.financial_impact.total_risk)}
                </span>
              </div>
              {expandedSections.financial ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>
            {expandedSections.financial && (
              <div className="px-4 pb-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-sm text-gray-600">Remediation Cost</p>
                    <p className="text-lg font-semibold text-orange-600">
                      {formatCurrency(result.financial_impact.estimated_remediation_cost)}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-sm text-gray-600">Potential Penalties</p>
                    <p className="text-lg font-semibold text-red-600">
                      {formatCurrency(result.financial_impact.potential_penalties)}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-sm text-gray-600">Delay Costs</p>
                    <p className="text-lg font-semibold text-yellow-600">
                      {formatCurrency(result.financial_impact.delay_costs)}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-sm text-gray-600">Total Risk Exposure</p>
                    <p className="text-lg font-semibold text-purple-600">
                      {formatCurrency(result.financial_impact.total_risk)}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Timeline Impact Section */}
          <div className="border-b">
            <button
              onClick={() => toggleSection('timeline')}
              className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-blue-600" />
                <span className="font-medium">Timeline Impact</span>
                <span className="text-sm text-gray-500">
                  {result.timeline_impact.estimated_delay_days} days delay
                </span>
              </div>
              {expandedSections.timeline ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>
            {expandedSections.timeline && (
              <div className="px-4 pb-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Estimated Delay</span>
                    <span className="font-medium">
                      {result.timeline_impact.estimated_delay_days} days
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Weather Risk Days</span>
                    <span className="font-medium">
                      {result.timeline_impact.weather_risk_days} days
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Critical Path Affected</span>
                    <span
                      className={`font-medium ${result.timeline_impact.critical_path_affected ? 'text-red-600' : 'text-green-600'}`}
                    >
                      {result.timeline_impact.critical_path_affected ? 'Yes' : 'No'}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Recommendations Section */}
          {result.recommendations.length > 0 && (
            <div className="border-b">
              <button
                onClick={() => toggleSection('recommendations')}
                className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span className="font-medium">
                    Recommendations ({result.recommendations.length})
                  </span>
                </div>
                {expandedSections.recommendations ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </button>
              {expandedSections.recommendations && (
                <div className="px-4 pb-4 space-y-3">
                  {result.recommendations.map((rec, index) => (
                    <div
                      key={index}
                      className={`border rounded-lg p-3 ${getPriorityColor(rec.priority)}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-medium uppercase">{rec.priority}</span>
                            {rec.standard_reference && (
                              <span className="text-xs opacity-75">{rec.standard_reference}</span>
                            )}
                          </div>
                          <p className="text-sm">{rec.action}</p>
                        </div>
                        {rec.cost_estimate && (
                          <span className="text-sm font-medium ml-3">
                            {formatCurrency(rec.cost_estimate)}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Full Analysis Text */}
          <div>
            <button
              onClick={() => toggleSection('fullAnalysis')}
              className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <span className="font-medium">Full Analysis Report</span>
              {expandedSections.fullAnalysis ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>
            {expandedSections.fullAnalysis && (
              <div className="px-4 pb-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <pre className="whitespace-pre-wrap text-sm text-gray-700 font-mono">
                    {result.analysis}
                  </pre>
                </div>
              </div>
            )}
          </div>

          {/* Footer Metadata */}
          <div className="px-4 py-3 bg-gray-50 text-xs text-gray-500 flex items-center justify-between">
            <span>Tool calls: {result.tool_calls_made}</span>
            <span>Analysis ID: {result.timestamp}</span>
          </div>
        </div>
      )}
    </div>
  );
}
