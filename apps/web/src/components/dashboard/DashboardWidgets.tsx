'use client';

import React, { useState, useEffect } from 'react';
import { Responsive, WidthProvider, Layout } from 'react-grid-layout';
import {
  Plus,
  X,
  Settings,
  Move,
  BarChart3,
  CheckCircle2,
  AlertTriangle,
  Clock,
  TrendingUp,
  Users,
  FileText,
  Calendar,
} from 'lucide-react';
import { Button } from '@siteproof/design-system';
import { toast } from 'sonner';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

const ResponsiveGridLayout = WidthProvider(Responsive);

interface WidgetData {
  id: string;
  type: string;
  title: string;
  data?: any;
}

interface DashboardWidgetsProps {
  userId: string;
  organizationId: string;
}

// Available widget types
const WIDGET_TYPES = [
  { id: 'project-summary', title: 'Project Summary', icon: BarChart3 },
  { id: 'active-itps', title: 'Active ITPs', icon: CheckCircle2 },
  { id: 'ncr-overview', title: 'NCR Overview', icon: AlertTriangle },
  { id: 'upcoming-inspections', title: 'Upcoming Inspections', icon: Clock },
  { id: 'performance-metrics', title: 'Performance Metrics', icon: TrendingUp },
  { id: 'team-activity', title: 'Team Activity', icon: Users },
  { id: 'recent-reports', title: 'Recent Reports', icon: FileText },
  { id: 'calendar', title: 'Calendar', icon: Calendar },
];

export function DashboardWidgets({ userId, organizationId }: DashboardWidgetsProps) {
  const [layouts, setLayouts] = useState<any>({});
  const [widgets, setWidgets] = useState<WidgetData[]>([]);
  const [isEditMode, setIsEditMode] = useState(false);
  const [showAddWidget, setShowAddWidget] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load saved layout and widgets
  useEffect(() => {
    loadDashboard();
  }, [userId]);

  const loadDashboard = async () => {
    try {
      const response = await fetch(`/api/dashboard/layout?userId=${userId}`);
      if (response.ok) {
        const data = await response.json();
        setLayouts(data.layouts || getDefaultLayouts());
        setWidgets(data.widgets || getDefaultWidgets());
      } else {
        // Use default layout if none saved
        setLayouts(getDefaultLayouts());
        setWidgets(getDefaultWidgets());
      }
    } catch (error) {
      console.error('Failed to load dashboard:', error);
      setLayouts(getDefaultLayouts());
      setWidgets(getDefaultWidgets());
    } finally {
      setIsLoading(false);
    }
  };

  const getDefaultLayouts = () => ({
    lg: [
      { i: 'project-summary', x: 0, y: 0, w: 6, h: 4 },
      { i: 'active-itps', x: 6, y: 0, w: 6, h: 4 },
      { i: 'ncr-overview', x: 0, y: 4, w: 4, h: 4 },
      { i: 'upcoming-inspections', x: 4, y: 4, w: 4, h: 4 },
      { i: 'performance-metrics', x: 8, y: 4, w: 4, h: 4 },
    ],
    md: [
      { i: 'project-summary', x: 0, y: 0, w: 6, h: 4 },
      { i: 'active-itps', x: 6, y: 0, w: 6, h: 4 },
      { i: 'ncr-overview', x: 0, y: 4, w: 4, h: 4 },
      { i: 'upcoming-inspections', x: 4, y: 4, w: 4, h: 4 },
      { i: 'performance-metrics', x: 0, y: 8, w: 8, h: 4 },
    ],
    sm: [
      { i: 'project-summary', x: 0, y: 0, w: 6, h: 4 },
      { i: 'active-itps', x: 0, y: 4, w: 6, h: 4 },
      { i: 'ncr-overview', x: 0, y: 8, w: 6, h: 4 },
      { i: 'upcoming-inspections', x: 0, y: 12, w: 6, h: 4 },
      { i: 'performance-metrics', x: 0, y: 16, w: 6, h: 4 },
    ],
  });

  const getDefaultWidgets = (): WidgetData[] => [
    { id: 'project-summary', type: 'project-summary', title: 'Project Summary' },
    { id: 'active-itps', type: 'active-itps', title: 'Active ITPs' },
    { id: 'ncr-overview', type: 'ncr-overview', title: 'NCR Overview' },
    { id: 'upcoming-inspections', type: 'upcoming-inspections', title: 'Upcoming Inspections' },
    { id: 'performance-metrics', type: 'performance-metrics', title: 'Performance Metrics' },
  ];

  const saveDashboard = async (newLayouts?: any, newWidgets?: WidgetData[]) => {
    try {
      const response = await fetch('/api/dashboard/layout', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          layouts: newLayouts || layouts,
          widgets: newWidgets || widgets,
        }),
      });

      if (response.ok) {
        toast.success('Dashboard saved');
      }
    } catch (error) {
      console.error('Failed to save dashboard:', error);
      toast.error('Failed to save dashboard');
    }
  };

  const handleLayoutChange = (_layout: Layout[], layouts: any) => {
    setLayouts(layouts);
    if (!isEditMode) {
      saveDashboard(layouts);
    }
  };

  const addWidget = (widgetType: string) => {
    const widgetConfig = WIDGET_TYPES.find((w) => w.id === widgetType);
    if (!widgetConfig) return;

    const newWidget: WidgetData = {
      id: `${widgetType}-${Date.now()}`,
      type: widgetType,
      title: widgetConfig.title,
    };

    const newLayout = {
      i: newWidget.id,
      x: 0,
      y: 100, // Add at bottom
      w: 4,
      h: 4,
    };

    // Add to all breakpoint layouts
    const newLayouts = { ...layouts };
    Object.keys(newLayouts).forEach((breakpoint) => {
      newLayouts[breakpoint] = [...(newLayouts[breakpoint] || []), newLayout];
    });

    const newWidgets = [...widgets, newWidget];
    setWidgets(newWidgets);
    setLayouts(newLayouts);
    setShowAddWidget(false);

    if (!isEditMode) {
      saveDashboard(newLayouts, newWidgets);
    }
  };

  const removeWidget = (widgetId: string) => {
    const newWidgets = widgets.filter((w) => w.id !== widgetId);
    const newLayouts = { ...layouts };

    Object.keys(newLayouts).forEach((breakpoint) => {
      newLayouts[breakpoint] = newLayouts[breakpoint].filter((l: Layout) => l.i !== widgetId);
    });

    setWidgets(newWidgets);
    setLayouts(newLayouts);

    if (!isEditMode) {
      saveDashboard(newLayouts, newWidgets);
    }
  };

  const renderWidget = (widget: WidgetData) => {
    const widgetConfig = WIDGET_TYPES.find((w) => w.id === widget.type);
    const Icon = widgetConfig?.icon || BarChart3;

    return (
      <div key={widget.id} className="h-full">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 h-full p-4 flex flex-col">
          {/* Widget Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Icon className="w-5 h-5 text-gray-600" />
              <h3 className="font-semibold text-gray-900">{widget.title}</h3>
            </div>
            {isEditMode && (
              <button
                onClick={() => removeWidget(widget.id)}
                className="text-gray-400 hover:text-red-500 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Widget Content */}
          <div className="flex-1 overflow-auto">{renderWidgetContent(widget)}</div>
        </div>
      </div>
    );
  };

  const renderWidgetContent = (widget: WidgetData) => {
    switch (widget.type) {
      case 'project-summary':
        return <ProjectSummaryWidget organizationId={organizationId} />;
      case 'active-itps':
        return <ActiveITPsWidget organizationId={organizationId} />;
      case 'ncr-overview':
        return <NCROverviewWidget organizationId={organizationId} />;
      case 'upcoming-inspections':
        return <UpcomingInspectionsWidget userId={userId} />;
      case 'performance-metrics':
        return <PerformanceMetricsWidget organizationId={organizationId} />;
      case 'team-activity':
        return <TeamActivityWidget organizationId={organizationId} />;
      case 'recent-reports':
        return <RecentReportsWidget organizationId={organizationId} />;
      case 'calendar':
        return <CalendarWidget userId={userId} />;
      default:
        return <div className="text-gray-500">Widget content not available</div>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Dashboard</h2>
        <div className="flex gap-2">
          <Button
            variant={isEditMode ? 'primary' : 'secondary'}
            onClick={() => {
              setIsEditMode(!isEditMode);
              if (isEditMode) {
                saveDashboard();
              }
            }}
          >
            {isEditMode ? (
              <>Save Layout</>
            ) : (
              <>
                <Settings className="w-4 h-4 mr-2" />
                Customize
              </>
            )}
          </Button>

          {isEditMode && (
            <Button variant="secondary" onClick={() => setShowAddWidget(!showAddWidget)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Widget
            </Button>
          )}
        </div>
      </div>

      {/* Add Widget Panel */}
      {showAddWidget && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <h3 className="font-semibold mb-3">Add Widget</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {WIDGET_TYPES.map((widget) => {
              const Icon = widget.icon;
              const isAdded = widgets.some((w) => w.type === widget.id);

              return (
                <button
                  key={widget.id}
                  onClick={() => !isAdded && addWidget(widget.id)}
                  disabled={isAdded}
                  className={`p-3 rounded-lg border text-left transition-colors ${
                    isAdded
                      ? 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed'
                      : 'border-gray-300 hover:border-blue-500 hover:bg-blue-50'
                  }`}
                >
                  <Icon className="w-5 h-5 mb-2" />
                  <p className="text-sm font-medium">{widget.title}</p>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Grid Layout */}
      <ResponsiveGridLayout
        className="layout"
        layouts={layouts}
        onLayoutChange={handleLayoutChange}
        breakpoints={{ lg: 1200, md: 996, sm: 768 }}
        cols={{ lg: 12, md: 8, sm: 6 }}
        rowHeight={60}
        isDraggable={isEditMode}
        isResizable={isEditMode}
        compactType="vertical"
        preventCollision={false}
      >
        {widgets.map((widget) => renderWidget(widget))}
      </ResponsiveGridLayout>

      {isEditMode && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-700">
            <Move className="w-4 h-4 inline mr-2" />
            Drag widgets to rearrange. Resize by dragging corners. Click &quot;Save Layout&quot;
            when done.
          </p>
        </div>
      )}
    </div>
  );
}

// Widget Components
function ProjectSummaryWidget({ organizationId }: { organizationId: string }) {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetch(`/api/dashboard/widgets/project-summary?organizationId=${organizationId}`)
      .then((res) => res.json())
      .then(setData)
      .catch(console.error);
  }, [organizationId]);

  if (!data) return <div className="animate-pulse h-full bg-gray-100 rounded" />;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-blue-50 rounded-lg p-3">
          <p className="text-xs text-blue-600 mb-1">Active Projects</p>
          <p className="text-2xl font-bold text-blue-900">{data.activeProjects || 0}</p>
        </div>
        <div className="bg-green-50 rounded-lg p-3">
          <p className="text-xs text-green-600 mb-1">Completed</p>
          <p className="text-2xl font-bold text-green-900">{data.completedProjects || 0}</p>
        </div>
      </div>
      <div className="text-sm text-gray-600">
        <p>Total Lots: {data.totalLots || 0}</p>
        <p>Total ITPs: {data.totalItps || 0}</p>
      </div>
    </div>
  );
}

function ActiveITPsWidget({ organizationId }: { organizationId: string }) {
  const [data, setData] = useState<any[]>([]);

  useEffect(() => {
    fetch(`/api/dashboard/widgets/active-itps?organizationId=${organizationId}`)
      .then((res) => res.json())
      .then(setData)
      .catch(console.error);
  }, [organizationId]);

  return (
    <div className="space-y-2">
      {data.length === 0 ? (
        <p className="text-gray-500 text-sm">No active ITPs</p>
      ) : (
        data.slice(0, 5).map((itp: any) => (
          <div key={itp.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
            <div>
              <p className="text-sm font-medium">{itp.name}</p>
              <p className="text-xs text-gray-500">{itp.projectName}</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold">{itp.completion}%</p>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function NCROverviewWidget({ organizationId }: { organizationId: string }) {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetch(`/api/dashboard/widgets/ncr-overview?organizationId=${organizationId}`)
      .then((res) => res.json())
      .then(setData)
      .catch(console.error);
  }, [organizationId]);

  if (!data) return <div className="animate-pulse h-full bg-gray-100 rounded" />;

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <span className="text-sm text-gray-600">Open NCRs</span>
        <span className="text-2xl font-bold text-red-600">{data.open || 0}</span>
      </div>
      <div className="flex justify-between items-center">
        <span className="text-sm text-gray-600">In Progress</span>
        <span className="text-xl font-semibold text-yellow-600">{data.inProgress || 0}</span>
      </div>
      <div className="flex justify-between items-center">
        <span className="text-sm text-gray-600">Closed Today</span>
        <span className="text-lg text-green-600">{data.closedToday || 0}</span>
      </div>
    </div>
  );
}

function UpcomingInspectionsWidget({ userId }: { userId: string }) {
  const [inspections, setInspections] = useState<any[]>([]);

  useEffect(() => {
    fetch(`/api/dashboard/widgets/upcoming-inspections?userId=${userId}`)
      .then((res) => res.json())
      .then(setInspections)
      .catch(console.error);
  }, [userId]);

  return (
    <div className="space-y-2">
      {inspections.length === 0 ? (
        <p className="text-gray-500 text-sm">No upcoming inspections</p>
      ) : (
        inspections.slice(0, 4).map((inspection: any) => (
          <div
            key={inspection.id}
            className="flex items-center justify-between p-2 bg-gray-50 rounded"
          >
            <div>
              <p className="text-sm font-medium">{inspection.name}</p>
              <p className="text-xs text-gray-500">{inspection.projectName}</p>
            </div>
            <p className="text-xs text-gray-600">{inspection.dueDate}</p>
          </div>
        ))
      )}
    </div>
  );
}

function PerformanceMetricsWidget({ organizationId }: { organizationId: string }) {
  const [metrics, setMetrics] = useState<any>(null);

  useEffect(() => {
    fetch(`/api/dashboard/widgets/performance-metrics?organizationId=${organizationId}`)
      .then((res) => res.json())
      .then(setMetrics)
      .catch(console.error);
  }, [organizationId]);

  if (!metrics) return <div className="animate-pulse h-full bg-gray-100 rounded" />;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        <div className="text-center">
          <p className="text-xs text-gray-600">Avg Completion</p>
          <p className="text-xl font-bold text-blue-600">{metrics.avgCompletion}%</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-600">Pass Rate</p>
          <p className="text-xl font-bold text-green-600">{metrics.passRate}%</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-600">On Time</p>
          <p className="text-xl font-bold text-purple-600">{metrics.onTimeRate}%</p>
        </div>
      </div>
    </div>
  );
}

function TeamActivityWidget({}: { organizationId: string }) {
  return <div className="text-gray-500 text-sm">Team activity data coming soon</div>;
}

function RecentReportsWidget({}: { organizationId: string }) {
  return <div className="text-gray-500 text-sm">Recent reports coming soon</div>;
}

function CalendarWidget({}: { userId: string }) {
  return <div className="text-gray-500 text-sm">Calendar view coming soon</div>;
}
