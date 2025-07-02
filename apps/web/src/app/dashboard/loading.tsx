import { Loader2 } from 'lucide-react';

export default function DashboardLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <Loader2 className="mx-auto h-8 w-8 text-blue-600 animate-spin" />
        <p className="mt-4 text-gray-600">Loading dashboard...</p>
      </div>
    </div>
  );
}