import type { NotificationCategoryMeta, NotificationPriority, NotificationRow } from '@/services/notificationService';
import { categoryMeta } from '@/services/notificationService';
import {
  Megaphone, BellRinging, BookOpen, CheckCircle, ClipboardText, Clock,
  CreditCard, SealCheck, Timer, Trophy, WarningCircle, Medal,
} from '@phosphor-icons/react';
import type { Icon } from '@phosphor-icons/react';

/* ── Icon + priority metadata per notification category ── */

const categoryIcons: Record<string, Icon> = {
  announcement: Megaphone,
  payment: CreditCard,
  course: BookOpen,
  assignment: ClipboardText,
  quiz: Trophy,
  certificate: SealCheck,
};

const fallbackIcons: Record<string, Icon> = {
  success: CheckCircle,
  warning: WarningCircle,
  error: WarningCircle,
  info: BellRinging,
  deadline: Timer,
  completion: SealCheck,
};

export function notificationIcon(row: NotificationRow): Icon {
  return categoryIcons[row.category] || categoryMeta(row.category).event === 'assignment_deadline'
    ? categoryIcons[row.category] || Timer
    : fallbackIcons[row.type] || Clock;
}

export function notificationAccent(row: NotificationRow): string {
  return categoryMeta(row.category).accent;
}

export function priorityBadge(p: NotificationPriority | string | null | undefined): string {
  if (p === 'high') return 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400';
  if (p === 'low') return 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400';
  return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400';
}

export function priorityLabel(p: NotificationPriority | string | null | undefined): string {
  if (p === 'high') return 'High';
  if (p === 'low') return 'Low';
  return 'Normal';
}

export function notificationRowMeta(row: NotificationRow): { icon: Icon; accent: string } {
  return { icon: notificationIcon(row), accent: notificationAccent(row) };
}

export const NOTIFICATION_FILTERS: NotificationCategoryMeta[] = [
  { key: 'all', label: 'All', event: 'payment_success', accent: 'text-zinc-600 bg-zinc-100 dark:bg-zinc-800' },
  { key: 'unread', label: 'Unread', event: 'admin_announcement', accent: 'text-emerald-600 bg-emerald-100 dark:text-emerald-400 dark:bg-emerald-500/15' },
  { key: 'announcement', label: 'Announcements', event: 'admin_announcement', accent: 'text-violet-600 bg-violet-100 dark:text-violet-400 dark:bg-violet-500/15' },
  { key: 'payment', label: 'Payments', event: 'payment_success', accent: 'text-emerald-600 bg-emerald-100 dark:text-emerald-400 dark:bg-emerald-500/15' },
  { key: 'course', label: 'Courses', event: 'course_enrollment', accent: 'text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-500/15' },
  { key: 'assignment', label: 'Assignments', event: 'assignment_available', accent: 'text-amber-600 bg-amber-100 dark:text-amber-400 dark:bg-amber-500/15' },
  { key: 'quiz', label: 'Quizzes', event: 'quiz_completed', accent: 'text-rose-600 bg-rose-100 dark:text-rose-400 dark:bg-rose-500/15' },
  { key: 'certificate', label: 'Certificates', event: 'certificate_issued', accent: 'text-cyan-600 bg-cyan-100 dark:text-cyan-400 dark:bg-cyan-500/15' },
];