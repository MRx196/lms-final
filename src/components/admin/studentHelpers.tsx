import { X } from '@phosphor-icons/react';
import { Badge } from '@/components/ui/badge';

export const STATUS_STYLES: Record<string, string> = {
  active: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-400/20',
  suspended: 'bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-500/10 dark:text-red-400 dark:ring-red-400/20',
  completed: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-400/20',
  pending: 'bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-400/20',
  refunded: 'bg-zinc-100 text-zinc-700 ring-zinc-600/20 dark:bg-zinc-500/10 dark:text-zinc-300 dark:ring-zinc-400/20',
  graded: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-400/20',
  late: 'bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-400/20',
  submitted: 'bg-sky-50 text-sky-700 ring-sky-600/20 dark:bg-sky-500/10 dark:text-sky-400 dark:ring-sky-400/20',
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <Badge variant="outline" className={`gap-1 capitalize ring-1 ${STATUS_STYLES[status] ?? 'bg-zinc-50 text-zinc-700 dark:bg-zinc-500/10 dark:text-zinc-300'}`}>
      <span className="size-1.5 rounded-full bg-current" />
      {status}
    </Badge>
  );
}

export function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

export function fmtMoney(amount: number, currency: string) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency || 'USD' }).format(amount);
}

export const initials = (name: string) =>
  name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();

export function SuspendedMarker() {
  return <X className="size-3.5 text-red-500" weight="bold" aria-label="Suspended" />;
}