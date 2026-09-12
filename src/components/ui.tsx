import { ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

export function LoadingSpinner({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <Loader2 className="w-8 h-8 text-forest animate-spin" />
      <p className="text-ink/50 text-sm mt-3">{message}</p>
    </div>
  );
}

export function EmptyState({ icon: Icon, title, message }: { icon: any; title: string; message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-14 h-14 rounded-full bg-sand-light border border-sand flex items-center justify-center mb-4">
        <Icon className="w-7 h-7 text-forest/60" />
      </div>
      <h3 className="font-display font-semibold text-ink">{title}</h3>
      <p className="text-sm text-ink/50 mt-1 max-w-xs">{message}</p>
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-14 h-14 rounded-full bg-brick/10 border border-brick/20 flex items-center justify-center mb-4">
        <span className="text-2xl text-brick">!</span>
      </div>
      <h3 className="font-display font-semibold text-ink">Something went wrong</h3>
      <p className="text-sm text-ink/50 mt-1 max-w-xs">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="mt-4 px-4 py-2 rounded-md bg-forest text-paper text-sm font-medium hover:bg-forest-dark transition">
          Try again
        </button>
      )}
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    scheduled: 'bg-clay/10 text-clay-dark',
    in_progress: 'bg-moss/15 text-forest-dark',
    collected: 'bg-forest/10 text-forest',
    missed: 'bg-brick/10 text-brick',
    unavailable: 'bg-clay/10 text-clay-dark',
    inaccessible: 'bg-clay/10 text-clay-dark',
    reported: 'bg-brick/10 text-brick',
    assigned: 'bg-moss/15 text-forest-dark',
    resolved: 'bg-forest/10 text-forest',
    rejected: 'bg-sand text-ink/50',
    new: 'bg-brick/10 text-brick',
    under_review: 'bg-clay/10 text-clay-dark',
    cleanup_assigned: 'bg-moss/15 text-forest-dark',
    recurring: 'bg-ink/10 text-ink/70',
    requested: 'bg-clay/10 text-clay-dark',
    completed: 'bg-forest/10 text-forest',
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
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status] || 'bg-sand text-ink/60'}`}>
      {labels[status] || status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
    </span>
  );
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-lg border border-sand ${className}`}>
      {children}
    </div>
  );
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        <h1 className="text-2xl font-display font-semibold text-ink">{title}</h1>
        {subtitle && <p className="text-ink/50 text-sm mt-1">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
