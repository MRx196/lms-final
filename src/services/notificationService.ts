import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/* ── Types ─────────────────────────────────────────────── */

export type NotificationEvent =
  | 'payment_success'
  | 'course_enrollment'
  | 'assignment_available'
  | 'assignment_graded'
  | 'quiz_completed'
  | 'quiz_result'
  | 'assignment_deadline'
  | 'course_completion'
  | 'certificate_issued'
  | 'admin_announcement';

export type NotificationPriority = 'low' | 'normal' | 'high';

export interface NotificationCategoryMeta {
  key: string;
  label: string;
  event: NotificationEvent;
  accent: string;
}

export interface NotificationRow {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  read: boolean | null;
  link: string | null;
  data: Record<string, unknown> | null;
  category: string;
  event_type: string | null;
  priority: string | null;
  sender_id: string | null;
  created_at: string;
}

export interface NotificationPayload {
  user_id: string;
  title: string;
  message: string;
  type?: string;
  category: string;
  event_type: string;
  priority?: NotificationPriority;
  link?: string;
  data?: Record<string, unknown>;
  read?: boolean;
}

export interface BroadcastPayload {
  title: string;
  message: string;
  category: string;
  event_type: string;
  priority: NotificationPriority;
  sender_id: string;
  user_ids: string[];
}

/* ── Categories (filterable buckets) ──────────────────── */

export const NOTIFICATION_CATEGORIES: NotificationCategoryMeta[] = [
  { key: 'all', label: 'All', event: 'payment_success', accent: 'text-zinc-600 bg-zinc-100 dark:bg-zinc-800' },
  { key: 'announcement', label: 'Announcements', event: 'admin_announcement', accent: 'text-violet-600 bg-violet-100 dark:text-violet-400 dark:bg-violet-500/15' },
  { key: 'payment', label: 'Payments', event: 'payment_success', accent: 'text-emerald-600 bg-emerald-100 dark:text-emerald-400 dark:bg-emerald-500/15' },
  { key: 'course', label: 'Courses', event: 'course_enrollment', accent: 'text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-500/15' },
  { key: 'assignment', label: 'Assignments', event: 'assignment_available', accent: 'text-amber-600 bg-amber-100 dark:text-amber-400 dark:bg-amber-500/15' },
  { key: 'quiz', label: 'Quizzes', event: 'quiz_completed', accent: 'text-rose-600 bg-rose-100 dark:text-rose-400 dark:bg-rose-500/15' },
  { key: 'certificate', label: 'Certificates', event: 'certificate_issued', accent: 'text-cyan-600 bg-cyan-100 dark:text-cyan-400 dark:bg-cyan-500/15' },
  { key: 'system', label: 'System', event: 'assignment_deadline', accent: 'text-zinc-600 bg-zinc-100 dark:bg-zinc-800' },
];

export function categoryMeta(category: string): NotificationCategoryMeta {
  return (
    NOTIFICATION_CATEGORIES.find((c) => c.key === category) || {
      key: category,
      label: category.charAt(0).toUpperCase() + category.slice(1),
      event: 'admin_announcement',
      accent: 'text-zinc-600 bg-zinc-100 dark:bg-zinc-800',
    }
  );
}

export function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function fullTimestamp(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/* ── Queries ──────────────────────────────────────────── */

export async function fetchNotifications(userId: string): Promise<NotificationRow[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) throw error;
  return (data || []) as NotificationRow[];
}

export async function fetchUnreadCount(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('read', false);
  if (error) throw error;
  return count || 0;
}

export async function markNotificationRead(id: string, read: boolean): Promise<void> {
  const { error } = await supabase.from('notifications').update({ read }).eq('id', id);
  if (error) {
    toast.error(error.message);
    throw error;
  }
}

export async function markAllNotificationsRead(userId: string, ids?: string[]): Promise<void> {
  const query = supabase.from('notifications').update({ read: true }).eq('user_id', userId).eq('read', false);
  const { error } = ids && ids.length > 0 ? await supabase.from('notifications').update({ read: true }).in('id', ids) : await query;
  if (error) {
    toast.error(error.message);
    throw error;
  }
}

export async function deleteNotification(id: string): Promise<void> {
  const { error } = await supabase.from('notifications').delete().eq('id', id);
  if (error) {
    toast.error(error.message);
    throw error;
  }
}

/* ── Admin broadcast fan-out ──────────────────────────── */

export async function createNotification(payload: NotificationPayload): Promise<void> {
  const { error } = await supabase.from('notifications').insert({
    user_id: payload.user_id,
    title: payload.title,
    message: payload.message,
    type: payload.type || 'info',
    category: payload.category,
    event_type: payload.event_type,
    priority: payload.priority || 'normal',
    link: payload.link || null,
    data: payload.data || null,
    read: payload.read ?? false,
  });
  if (error) throw error;
}

export async function sendBroadcast(payload: BroadcastPayload): Promise<number> {
  const rows = payload.user_ids.map((userId) => ({
    user_id: userId,
    title: payload.title,
    message: payload.message,
    type: 'announcement',
    category: payload.category,
    event_type: payload.event_type,
    priority: payload.priority,
    sender_id: payload.sender_id,
    read: false,
  }));
  const { error } = await supabase.from('notifications').insert(rows);
  if (error) throw error;
  return rows.length;
}

/* ── Realtime events ──────────────────────────────────── */

type NotificationsListener = () => void;

const listeners = new Set<NotificationsListener>();
let realtimeUnsub: (() => void) | null = null;

export function subscribeToNotifications(cb: NotificationsListener): () => void {
  listeners.add(cb);
  if (!realtimeUnsub) {
    const channel = supabase
      .channel('notifications-updates')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        () => {
          listeners.forEach((l) => l());
        },
      )
      .subscribe();
    realtimeUnsub = () => {
      supabase.removeChannel(channel);
      realtimeUnsub = null;
    };
  }
  return () => {
    listeners.delete(cb);
    if (listeners.size === 0 && realtimeUnsub) {
      realtimeUnsub();
    }
  };
}

export function notifyListeners(): void {
  listeners.forEach((l) => l());
}

/* ── Event simulator (client-safe; inserts via student RLS) ── */

const SIM_EVENTS: { title: string; category: string; type: string; emoji: string; accent: string }[] = [
  { title: 'Payment received', category: 'payment', type: 'success', emoji: '💳', accent: 'text-emerald-600 bg-emerald-100 dark:text-emerald-400 dark:bg-emerald-500/15' },
  { title: 'New course unlocked', category: 'course', type: 'info', emoji: '📘', accent: 'text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-500/15' },
  { title: 'Assignment graded', category: 'assignment', type: 'success', emoji: '📝', accent: 'text-amber-600 bg-amber-100 dark:text-amber-400 dark:bg-amber-500/15' },
  { title: 'Quiz completed', category: 'quiz', type: 'success', emoji: '🧠', accent: 'text-rose-600 bg-rose-100 dark:text-rose-400 dark:bg-rose-500/15' },
  { title: 'Certificate issued', category: 'certificate', type: 'success', emoji: '🎓', accent: 'text-cyan-600 bg-cyan-100 dark:text-cyan-400 dark:bg-cyan-500/15' },
];

export async function simulateEvent(userId: string): Promise<void> {
  const ev = SIM_EVENTS[Math.floor(Math.random() * SIM_EVENTS.length)];
  const seq = Math.floor(Math.random() * 9000) + 1000;
  await createNotification({
    user_id: userId,
    title: ev.title,
    message: `${ev.title.toLowerCase()} — reference #${seq}. This is a sample notification shown for demonstration.`,
    type: ev.type,
    category: ev.category,
    event_type: ev.category === 'payment' ? 'payment_success' : ev.category === 'course' ? 'course_enrollment' : ev.category === 'assignment' ? 'assignment_graded' : ev.category === 'quiz' ? 'quiz_completed' : 'certificate_issued',
    priority: 'normal',
  });
  toast.success('Sample notification added');
}