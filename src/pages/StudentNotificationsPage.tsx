import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { ROUTES } from '@/constants/navigation';
import {
  deleteNotification, fetchNotifications, markAllNotificationsRead,
  markNotificationRead, simulateEvent, subscribeToNotifications,
  type NotificationRow,
} from '@/services/notificationService';
import { formatTimestamp } from '@/services/notificationService';
import { categoryMeta } from '@/services/notificationService';
import { NOTIFICATION_FILTERS, notificationRowMeta, priorityBadge, priorityLabel } from '@/components/notifications/NotificationShared';
import { Check, CheckFat, EnvelopeSimple, Plus, Spinner, Trash, WarningCircle } from '@phosphor-icons/react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';

const rowVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { ease: 'easeOut' as const } },
};

export function StudentNotificationsPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<NotificationRow[]>([]);
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    try {
      setRows(await fetchNotifications(user.id));
    } catch (err: any) {
      toast.error(err.message || 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    load();
    if (!user) return;
    return subscribeToNotifications(load);
  }, [user, load]);

  const unread = rows.filter((r) => !r.read);
  const filtered = filter === 'unread' ? unread : filter === 'all' ? rows : rows.filter((r) => r.category === filter);

  function toggle(row: NotificationRow) {
    const next = new Set(selected);
    if (next.has(row.id)) next.delete(row.id);
    else next.add(row.id);
    setSelected(next);
  }

  function toggleAllView() {
    const ids = filtered.filter((r) => !selected.has(r.id)).map((r) => r.id);
    setSelected(new Set(selected.size === filtered.length ? [] : ids));
  }

  async function markSelected() {
    try {
      await markAllNotificationsRead(user!.id, Array.from(selected));
      setSelected(new Set());
      await load();
      toast.success('Notifications marked as read');
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  async function removeSelected() {
    if (!window.confirm(`Delete ${selected.size} notification${selected.size === 1 ? '' : 's'}?`)) return;
    try {
      await Promise.all(Array.from(selected).map((id) => deleteNotification(id)));
      setSelected(new Set());
      await load();
      toast.success('Notifications deleted');
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  async function markOne(row: NotificationRow) {
    if (row.read) return;
    await markNotificationRead(row.id, true);
    setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, read: true } : r)));
  }

  function runDemo() {
    if (!user) return;
    simulateEvent(user.id).then(load);
  }

  return (
    <motion.div initial="hidden" animate="visible" className="space-y-5">
      <motion.div variants={rowVariants} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">Notifications</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            {unread.length === 0 ? 'You are all caught up' : `${unread.length} unread notification${unread.length === 1 ? '' : 's'}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={runDemo}>
            <Plus size={14} className="mr-1" /> Add sample
          </Button>
        </div>
      </motion.div>

      {/* Filter chips */}
      <motion.div variants={rowVariants} className="flex gap-2 overflow-x-auto pb-1">
        {NOTIFICATION_FILTERS.map((f) => {
          const count = f.key === 'all' ? rows.length : f.key === 'unread' ? unread.length : rows.filter((r) => r.category === f.key).length;
          const active = filter === f.key;
          return (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
                active
                  ? 'bg-emerald-600 text-white'
                  : 'bg-white text-zinc-600 border border-zinc-200 dark:bg-zinc-900 dark:text-zinc-400 dark:border-zinc-800 hover:border-emerald-400'
              }`}
            >
              {f.label} <span className={active ? 'opacity-70' : 'text-zinc-400'}>{count}</span>
            </button>
          );
        })}
      </motion.div>

      {/* Bulk toolbar */}
      {selected.size > 0 && (
        <motion.div variants={rowVariants} className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 dark:border-emerald-900/40 dark:bg-emerald-950/30">
          <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">{selected.size} selected</p>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" className="text-emerald-700 dark:text-emerald-400" onClick={markSelected}>
              <Check size={14} className="mr-1" /> Mark read
            </Button>
            <Button size="sm" variant="ghost" className="text-rose-600 dark:text-rose-400" onClick={removeSelected}>
              <Trash size={14} className="mr-1" /> Delete
            </Button>
          </div>
        </motion.div>
      )}

      {/* List */}
      {loading ? (
        <Card className="border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center justify-center py-16 text-zinc-400">
            <Spinner size={22} className="animate-spin" />
          </div>
        </Card>
      ) : filtered.length === 0 ? (
        <Card className="border-dashed border-zinc-300 dark:border-zinc-700">
          <div className="flex flex-col items-center justify-center py-16 text-center px-6">
            <EnvelopeSimple size={40} className="text-zinc-300 dark:text-zinc-600 mb-3" />
            <h3 className="font-semibold text-zinc-900 dark:text-white mb-1">No notifications here</h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-sm">
              {filter === 'all'
                ? 'You have no notifications yet. Announcements, grade updates and course activity will appear here.'
                : 'No notifications match this filter.'}
            </p>
            {filter === 'all' && (
              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white mt-4" onClick={runDemo}>
                <Plus size={14} className="mr-1" /> Add a sample
              </Button>
            )}
          </div>
        </Card>
      ) : (
        <div className="space-y-2">
          <motion.div variants={rowVariants} className="flex items-center gap-2 px-1">
            <button
              type="button"
              onClick={toggleAllView}
              className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              {selected.size === filtered.length ? <CheckFat size={14} /> : <Check size={14} />}
              Select all
            </button>
            <button
              type="button"
              onClick={() => markAllNotificationsRead(user!.id).then(load).catch((e) => toast.error(e.message))}
              className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-500/10"
            >
              <Check size={13} /> Mark all read
            </button>
          </motion.div>

          {filtered.map((row) => {
            const { icon: Icon, accent } = notificationRowMeta(row);
            const cat = categoryMeta(row.category);
            const isSelected = selected.has(row.id);
            const isUnread = !row.read;
            return (
              <motion.div
                key={row.id}
                variants={rowVariants}
                className={`group flex items-start gap-3 rounded-xl border bg-white p-4 transition-colors dark:bg-zinc-900 ${
                  isUnread
                    ? 'border-emerald-200 dark:border-emerald-900/50'
                    : 'border-zinc-200 dark:border-zinc-800'
                }`}
              >
                <button
                  type="button"
                  onClick={() => toggle(row)}
                  aria-label={isSelected ? 'Deselect' : 'Select'}
                  className={`mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors ${
                    isSelected
                      ? 'border-emerald-600 bg-emerald-600 text-white'
                      : 'border-zinc-300 dark:border-zinc-600 text-transparent hover:border-emerald-400'
                  }`}
                >
                  <Check size={12} />
                </button>
                {isUnread && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-emerald-500" />}
                <span className={`mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${accent}`}>
                  <Icon size={18} weight={isUnread ? 'bold' : 'regular'} />
                </span>
                <button
                  type="button"
                  className="min-w-0 flex-1 text-left"
                  onClick={() => markOne(row)}
                  title={isUnread ? 'Mark as read' : undefined}
                >
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="text-xs font-semibold uppercase tracking-wide text-zinc-400">{cat.label}</span>
                    {row.priority && row.priority !== 'normal' && (
                      <Badge className={`px-1.5 py-0 text-[10px] font-semibold ${priorityBadge(row.priority)}`}>
                        {priorityLabel(row.priority)} priority
                      </Badge>
                    )}
                    <span className="text-[11px] text-zinc-400">{formatTimestamp(row.created_at)}</span>
                  </div>
                  <p className={`truncate text-sm font-semibold ${isUnread ? 'text-zinc-900 dark:text-white' : 'text-zinc-600 dark:text-zinc-400'}`}>
                    {row.title}
                  </p>
                  <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">{row.message}</p>
                </button>
                <button
                  type="button"
                  onClick={() => deleteNotification(row.id).then(load).catch((e) => toast.error(e.message))}
                  aria-label="Delete notification"
                  className="p-1.5 text-zinc-400 opacity-0 transition-opacity hover:text-rose-500 group-hover:opacity-100"
                >
                  <Trash size={15} />
                </button>
              </motion.div>
            );
          })}

          {filter === 'all' && rows.length > 0 && (
            <p className="pt-2 text-center text-xs text-zinc-400">
              Showing {filtered.length} of {rows.length} notifications · <Link to={ROUTES.studentDashboard} className="text-emerald-600 dark:text-emerald-400 underline-offset-2 hover:underline">Back to dashboard</Link>
            </p>
          )}
        </div>
      )}

      {!user && (
        <Card className="border-dashed border-amber-300 dark:border-amber-800">
          <div className="flex items-center gap-3 p-4 text-sm text-amber-700 dark:text-amber-400">
            <WarningCircle size={18} />
            <span>Sign in to see your notifications.</span>
          </div>
        </Card>
      )}
    </motion.div>
  );
}