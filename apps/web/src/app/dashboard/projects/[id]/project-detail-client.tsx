'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  Building,
  Calendar,
  Mail,
  Phone,
  Users,
  FileText,
  Plus,
  Edit,
  MoreVertical,
} from 'lucide-react';
import { Button } from '@siteproof/design-system';
import { CreateLotModal } from '@/features/lots/components/CreateLotModal';
import { LotList } from '@/features/lots/components/LotList';
import { DiaryListForProject } from '@/components/diary/DiaryListForProject';
import { ComplianceCheckButton } from '@/components/compliance/ComplianceCheckButton';
import { Shield } from 'lucide-react';

const SECTIONS = ['overview', 'lots', 'diaries', 'documents', 'team', 'compliance'] as const;

type Section = (typeof SECTIONS)[number];

interface Project {
  id: string;
  name: string;
  description?: string;
  status: 'active' | 'completed' | 'archived';
  organization_id: string;
  client_name?: string;
  client_email?: string;
  client_phone?: string;
  client_company?: string;
  start_date?: string;
  due_date?: string;
  created_at: string;
  updated_at: string;
  organizations: {
    id: string;
    name: string;
  };
}

interface ProjectDetailClientProps {
  project: Project;
  userRole: 'owner' | 'admin' | 'member' | 'viewer';
}

export default function ProjectDetailClient({ project, userRole }: ProjectDetailClientProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sectionParam = searchParams?.get('section');

  const getInitialSection = (): Section => {
    if (sectionParam && (SECTIONS as readonly string[]).includes(sectionParam)) {
      return sectionParam as Section;
    }
    return 'overview';
  };

  const [activeSection, setActiveSection] = useState<Section>(getInitialSection());
  const [showCreateLotModal, setShowCreateLotModal] = useState(false);
  const [_showUploadDocumentModal, setShowUploadDocumentModal] = useState(false);
  const [refreshLotsFn, setRefreshLotsFn] = useState<(() => Promise<void>) | null>(null);

  // Simple refresh function that calls the LotList's fetchLots
  const refreshLots = async () => {
    if (refreshLotsFn) {
      await refreshLotsFn();
    }
  };

  useEffect(() => {
    if (
      sectionParam &&
      (SECTIONS as readonly string[]).includes(sectionParam) &&
      sectionParam !== activeSection
    ) {
      setActiveSection(sectionParam as Section);
    }
  }, [sectionParam, activeSection]);

  const handleSectionChange = (section: Section) => {
    setActiveSection(section);
    router.replace('/dashboard/projects/' + project.id + '?section=' + section, { scroll: false });
  };

  const canEdit = ['owner', 'admin', 'member'].includes(userRole);

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const statusColors = {
    active: 'bg-green-100 text-green-800',
    completed: 'bg-blue-100 text-blue-800',
    archived: 'bg-gray-100 text-gray-800',
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="mb-4">
            <Link href="/dashboard/projects">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Projects
              </Button>
            </Link>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
                {project.description && <p className="mt-2 text-gray-600">{project.description}</p>}
                <div className="mt-4 flex items-center gap-4">
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${statusColors[project.status]}`}
                  >
                    {project.status}
                  </span>
                  <span className="text-sm text-gray-500">
                    Organization: {project.organizations.name}
                  </span>
                </div>
              </div>
              {canEdit && (
                <div className="flex items-center gap-2">
                  <Button variant="secondary" size="sm">
                    <Edit className="mr-2 h-4 w-4" />
                    Edit
                  </Button>
                  <Button variant="ghost" size="sm">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Section Navigation */}
        <div className="border-b border-gray-200 mb-8">
          <nav className="-mb-px flex space-x-8">
            {SECTIONS.map((section) => {
              const getIcon = () => {
                switch (section) {
                  case 'overview':
                    return null;
                  case 'lots':
                    return <Users className="h-4 w-4 mr-1" />;
                  case 'diaries':
                    return <Calendar className="h-4 w-4 mr-1" />;
                  case 'documents':
                    return <FileText className="h-4 w-4 mr-1" />;
                  case 'team':
                    return <Users className="h-4 w-4 mr-1" />;
                  case 'compliance':
                    return <Shield className="h-4 w-4 mr-1" />;
                  default:
                    return null;
                }
              };

              return (
                <button
                  key={section}
                  onClick={() => handleSectionChange(section)}
                  className={`
                    py-2 px-1 border-b-2 font-medium text-sm capitalize flex items-center
                    ${
                      activeSection === section
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }
                  `}
                >
                  {getIcon()}
                  {section}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Content Sections */}
        {activeSection === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Project Details */}
            <div className="lg:col-span-2 space-y-6">
              {/* Timeline */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Timeline</h2>
                <div className="space-y-4">
                  <div className="flex items-center">
                    <Calendar className="h-5 w-5 text-gray-400 mr-3" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Start Date</p>
                      <p className="text-sm text-gray-600">{formatDate(project.start_date)}</p>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <Calendar className="h-5 w-5 text-gray-400 mr-3" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Due Date</p>
                      <p className="text-sm text-gray-600">{formatDate(project.due_date)}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent Activity */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h2>
                <p className="text-sm text-gray-500">No activity yet</p>
              </div>
            </div>

            {/* Client Information */}
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Client Information</h2>
                {project.client_name ? (
                  <div className="space-y-4">
                    <div className="flex items-start">
                      <Building className="h-5 w-5 text-gray-400 mr-3 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{project.client_name}</p>
                        {project.client_company && (
                          <p className="text-sm text-gray-600">{project.client_company}</p>
                        )}
                      </div>
                    </div>
                    {project.client_email && (
                      <div className="flex items-center">
                        <Mail className="h-5 w-5 text-gray-400 mr-3" />
                        <a
                          href={`mailto:${project.client_email}`}
                          className="text-sm text-blue-600 hover:text-blue-700"
                        >
                          {project.client_email}
                        </a>
                      </div>
                    )}
                    {project.client_phone && (
                      <div className="flex items-center">
                        <Phone className="h-5 w-5 text-gray-400 mr-3" />
                        <a href={`tel:${project.client_phone}`} className="text-sm text-gray-900">
                          {project.client_phone}
                        </a>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No client information added</p>
                )}
              </div>

              {/* Quick Actions */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
                <div className="space-y-2">
                  <Button size="sm" fullWidth onClick={() => setShowCreateLotModal(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Lot
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    fullWidth
                    onClick={() => setShowUploadDocumentModal(true)}
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    Upload Document
                  </Button>
                  <Button size="sm" variant="secondary" fullWidth>
                    <Users className="mr-2 h-4 w-4" />
                    Invite Team Member
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeSection === 'lots' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Project Lots</h2>
              {canEdit && (
                <Button size="sm" onClick={() => setShowCreateLotModal(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Lot
                </Button>
              )}
            </div>
            <LotList
              projectId={project.id}
              canEdit={canEdit}
              onRefreshNeeded={(fn) => setRefreshLotsFn(() => fn)}
            />
          </div>
        )}

        {activeSection === 'diaries' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Daily Diaries</h2>
              <Link href={'/dashboard/projects/' + project.id + '/diaries/new'}>
                <Button size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  New Diary Entry
                </Button>
              </Link>
            </div>
            <div className="p-6">
              <DiaryListForProject projectId={project.id} />
            </div>
          </div>
        )}

        {activeSection === 'documents' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Documents</h2>
              {canEdit && (
                <Button size="sm">
                  <FileText className="mr-2 h-4 w-4" />
                  Upload Document
                </Button>
              )}
            </div>
            <p className="text-sm text-gray-500">No documents have been uploaded yet.</p>
          </div>
        )}

        {activeSection === 'team' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Team Members</h2>
              {canEdit && (
                <Button size="sm">
                  <Users className="mr-2 h-4 w-4" />
                  Invite Member
                </Button>
              )}
            </div>
            <p className="text-sm text-gray-500">Team member management coming soon.</p>
          </div>
        )}

        {activeSection === 'compliance' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Compliance Section */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Shield className="h-6 w-6 text-blue-600" />
                  <h2 className="text-xl font-semibold text-gray-900">AI Compliance Assistant</h2>
                </div>

                <p className="text-gray-700 mb-6">
                  Run an automated compliance check using AI to analyze your project against
                  Australian Standards and identify potential issues before they become expensive
                  problems.
                </p>

                <ComplianceCheckButton projectId={project.id} />
              </div>
            </div>

            {/* Side Panel with Information */}
            <div className="lg:col-span-1">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">What Gets Checked</h3>

                <ul className="space-y-3 text-sm">
                  <li className="flex items-start gap-2">
                    <div className="mt-0.5 h-5 w-5 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-green-600 text-xs">✓</span>
                    </div>
                    <div>
                      <span className="font-medium">AS 3798</span>
                      <p className="text-gray-600">
                        Earthworks for commercial and residential developments
                      </p>
                    </div>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="mt-0.5 h-5 w-5 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-green-600 text-xs">✓</span>
                    </div>
                    <div>
                      <span className="font-medium">AS/NZS 3500.3</span>
                      <p className="text-gray-600">Plumbing and drainage - Stormwater</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="mt-0.5 h-5 w-5 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-green-600 text-xs">✓</span>
                    </div>
                    <div>
                      <span className="font-medium">AS 2870</span>
                      <p className="text-gray-600">Residential slabs and footings</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="mt-0.5 h-5 w-5 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-green-600 text-xs">✓</span>
                    </div>
                    <div>
                      <span className="font-medium">Council Approvals</span>
                      <p className="text-gray-600">Timeline risks and approval requirements</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="mt-0.5 h-5 w-5 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-green-600 text-xs">✓</span>
                    </div>
                    <div>
                      <span className="font-medium">Weather Impact</span>
                      <p className="text-gray-600">Material-specific weather restrictions</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="mt-0.5 h-5 w-5 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-green-600 text-xs">✓</span>
                    </div>
                    <div>
                      <span className="font-medium">Financial Risk</span>
                      <p className="text-gray-600">Remediation costs and potential penalties</p>
                    </div>
                  </li>
                </ul>

                <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    <span className="font-semibold">💡 Tip:</span> Run compliance checks regularly,
                    especially before major milestones or council submissions to catch issues early.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {showCreateLotModal && (
        <CreateLotModal
          projectId={project.id}
          onClose={() => setShowCreateLotModal(false)}
          onSuccess={async () => {
            console.log('[ProjectDetail] Lot created successfully, refreshing data');
            await refreshLots(); // Properly refresh the lot list
            setShowCreateLotModal(false);
          }}
        />
      )}
    </div>
  );
}
