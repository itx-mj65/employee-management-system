import { cn } from '@/lib/utils';

const statusStyles = {
  'todo': 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  'in-progress': 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  'pending-approval': 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  'approved': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  'rejected': 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  'on-hold': 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
  'present': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  'absent': 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  'low': 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
  'medium': 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  'high': 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
  'urgent': 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
};

const labels = {
  'todo': 'To Do',
  'in-progress': 'In Progress',
  'pending-approval': 'Pending',
  'approved': 'Approved',
  'rejected': 'Rejected',
  'on-hold': 'On Hold',
  'present': 'Present',
  'absent': 'Absent',
  'low': 'Low',
  'medium': 'Medium',
  'high': 'High',
  'urgent': 'Urgent',
};

export default function StatusBadge({ status, className }) {
  return (
    <span className={cn(
      'inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium',
      statusStyles[status] || 'bg-muted text-muted-foreground',
      className
    )}>
      {labels[status] || status}
    </span>
  );
}
