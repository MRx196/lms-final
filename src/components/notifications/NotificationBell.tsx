import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchNotifications, fetchUnreadCount, markAllNotificationsRead, markNotificationRead, subscribeToNotifications, type NotificationRow } from '@/services/notificationService';
import { formatTimestamp } from '@/services/notificationService';
import { categoryMeta } from '@/services/notificationService';
import { notificationRowMeta } from './NotificationShared';
import { ArrowRight, Bell, Check, CheckCircle, Spinner } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';

export function useNotifications() {
  const { user } = useAuth();
  const [count, setCount] = useState(0);
  const [recent, setRecent] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    try {
      const [unread, rows] = await Promise.all([fetchUnreadCount(user.id), fetchNotifications(user.id)]);
      setCount(unread);
      setRecent(rows.slice(0, 6));
    } catch {
      /* keep last known state */
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    load();
    if (!user) return;
    const unsub = subscribeToNotifications(() => {
      load();
    });
    return unsub;
  }, [user, load]);

  return { count, recent, loading, refresh: load };
}

interface NotificationBellProps {
  href: string;
}

export function NotificationBell({ href }: NotificationBellProps) {
  const { count, recent, loading, refresh } = useNotifications();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  async function handleMarkAll() {
    if (!recent[0]) return;
    await markAllNotificationsRead(recent[0].user_id);
    refresh();
  }

  async function handleMarkOne(row: NotificationRow) {
    if (row.read) return;
    await markNotificationRead(row.id, true);
    refresh();
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        aria-label={`Notifications${count > 0 ? `, ${count} unread` : ''}`}
        onClick={() => setOpen((v) => !v)}
        className="relative flex h-9 w-9 items-center justify-center rounded-full text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
      >
        <Bell size={20} />
        {count > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white">
            {count > 99 ? '99+' : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-50 w-80 sm:w-96 overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xl">
          <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-zinc-900 dark:text-white">Notifications</p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {count > 0 ? `${count} unread` : 'You are all caught up'}
              </p>
            </div>
            {count > 0 && (
              <button
                type="button"
                onClick={handleMarkAll}
                className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-500/10"
              >
                <Check size={13} /> Mark all read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-10 text-zinc-400">
                <Spinner size={20} className="animate-spin" />
              </div>
            ) : recent.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                <CheckCircle size={32} className="text-emerald-500 mb-2" />
                <p className="text-sm text-zinc-500 dark:text-zinc-400">No notifications yet</p>
              </div>
            ) : (
              recent.map((row) => {
                const { icon: Icon, accent } = notificationRowMeta(row);
                const cat = categoryMeta(row.category);
                return (
                  <button
                    key={row.id}
                    type="button"
                    onClick={() => {
                      if (!row.read) handleMarkOne(row);
                    }}
                    className={`flex w-full items-start gap-3 border-b border-zinc-100 dark:border-zinc-800 px-4 py-3 text-left transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/60 ${row.read ? 'opacity-60' : ''}`}
                  >
                    <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${accent}`}>
                      <Icon size={16} weight={row.read ? 'regular' : 'bold'} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2">
                        <span className="truncate text-xs font-medium text-zinc-400 uppercase">{cat.label}</span>
                        <span className="shrink-0 text-[11px] text-zinc-400">{formatTimestamp(row.created_at)}</span>
                      </span>
                      <span className="block truncate text-sm font-medium text-zinc-900 dark:text-white">{row.title}</span>
                      <span className="mt-0.5 line-clamp-2 block text-xs text-zinc-500 dark:text-zinc-400">{row.message}</span>
                    </span>
                    {!row.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-emerald-500" />}
                  </button>
                );
              })
            )}
          </div>

          <div className="border-t border-zinc-100 dark:border-zinc-800 p-2">
            <Link to={href} onClick={() => setOpen(false)} className="flex items-center justify-center">
              <Button variant="ghost" className="w-full gap-1.5 text-sm text-emerald-600 hover:text-emerald-700 dark:text-emerald-400">
                View all notifications <ArrowRight size={14} />
              </Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}