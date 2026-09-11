import { ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

export function LoadingSpinner({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <Loader2 className="w-8 h-8 text-teal-600 animate-spin" />
      <p className="text-gray-400 text-sm mt-3">{message}</p>
    </div>
  );
}

export function EmptyState({ icon: Icon, title, message }: { icon: any; title: string; message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
        <Icon className="w-7 h-7 text-gray-400" />
      </div>
      <h3 className="font-semibold text-gray-700">{title}</h3>
      <p className="text-sm text-gray-400 mt-1 max-w-xs">{message}</p>
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center mb-4">
        <span className="text-2xl">!</span>
      </div>
      <h3 className="font-semibold text-gray-700">Something went wrong</h3>
      <p className="text-sm text-gray-400 mt-1 max-w-xs">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="mt-4 px-4 py-2 rounded-lg bg-teal-600 text-white text-sm font-medium hover:bg-teal-700 transition">
          Try again
        </button>
      )}
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    scheduled: 'bg-amber-100 text-amber-700',
    in_progress: 'bg-blue-100 text-blue-700',
    collected: 'bg-emerald-100 text-emerald-700',
    missed: 'bg-red-100 text-red-700',
    unavailable: 'bg-orange-100 text-orange-700',
    inaccessible: 'bg-orange-100 text-orange-700',
    reported: 'bg-red-100 text-red-700',
    assigned: 'bg-blue-100 text-blue-700',
    resolved: 'bg-emerald-100 text-emerald-700',
    rejected: 'bg-gray-200 text-gray-600',
    new: 'bg-red-100 text-red-700',
    under_review: 'bg-orange-100 text-orange-700',
    cleanup_assigned: 'bg-blue-100 text-blue-700',
    recurring: 'bg-purple-100 text-purple-700',
    requested: 'bg-amber-100 text-amber-700',
    completed: 'bg-emerald-100 text-emerald-700',
  };

  const labels: Record<string, string> = {
    in_progress: 'In Progress',
    under_review: 'Under Review',
    cleanup_assigned: 'Cleanup Assigned',
    worker_did_not_arrive: 'Worker Did Not Arrive',
    waste_not_out: 'Waste Not Out',
    household_unavailable: 'Household Unavailable',
    lane_inaccessible: 'Lane Inaccessible',
    e_waste: 'E-Waste',
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-600'}`}>
      {labels[status] || status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
    </span>
  );
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-xl border border-gray-100 shadow-sm ${className}`}>
      {children}
    </div>
  );
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        {subtitle && <p className="text-gray-500 text-sm mt-1">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
