import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  Users, Student, MagnifyingGlass, Wallet, UserMinus, LockKey, BookOpen,
  ShieldCheck, DotsThree, SlidersHorizontal, CaretDown,
} from '@phosphor-icons/react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { fetchAllStudents, fetchStudentDetail, setStudentAccountStatus, getCourseTitle } from '@/services/adminStudentService';
import { AdminStudentsProfileSheet } from '@/components/admin/AdminStudentsProfileSheet';
import { StatusBadge, fmtDate, initials, SuspendedMarker } from '@/components/admin/studentHelpers';
import type { StudentDetail } from '@/services/adminStudentService';
import type { User } from '@/types';

function StatCard({ icon: Icon, label, value, hint, tone }: { icon: React.ElementType; label: string; value: string | number; hint: string; tone: string }) {
  return (
    <Card>
      <CardContent className="flex items-start gap-3 p-4 sm:p-5">
        <div className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${tone}`}>
          <Icon className="size-5" weight="duotone" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">{label}</p>
          <p className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-white">{value}</p>
          <p className="truncate text-xs text-zinc-400 dark:text-zinc-500">{hint}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export function AdminStudentsPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'suspended'>('all');
  const [courseFilter, setCourseFilter] = useState<string>('all');
  const [courseOptions, setCourseOptions] = useState<{ id: string; title: string }[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [student, setStudent] = useState<StudentDetail | null>(null);
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState('courses');
  const [suspendTarget, setSuspendTarget] = useState<User | null>(null);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchAllStudents();
      const withStatus = data.map((u) => ({
        ...u,
        status: (localStorage.getItem(`student_status_${u.id}`) as 'active' | 'suspended') ?? u.status ?? 'active',
      }));
      const allCourseIds = Array.from(new Set(withStatus.flatMap((u) => u.enrolledCourseIds)));
      setCourseOptions(allCourseIds.map((id) => ({ id, title: getCourseTitle(id) })).filter((c) => c.title !== 'Course'));
      setUsers(withStatus);
    } catch (err) {
      toast.error((err as Error).message || 'Failed to load students');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const openStudent = useCallback(async (id: string) => {
    setSelectedId(id);
    setTab('courses');
    setOpen(true);
    try {
      const detail = await fetchStudentDetail(id);
      setStudent(detail);
    } catch (err) {
      toast.error((err as Error).message || 'Failed to load student profile');
    }
  }, []);

  const toggleStatus = useCallback(async (target: User) => {
    const next = target.status === 'suspended' ? 'active' : 'suspended';
    try {
      await setStudentAccountStatus(target.id, next);
      setUsers((prev) => prev.map((u) => (u.id === target.id ? { ...u, status: next } : u)));
      setStudent((prev) => (prev ? { ...prev, status: next } : prev));
      toast.success(next === 'suspended' ? `${target.name} has been suspended` : `${target.name} has been reactivated`);
    } catch (err) {
      toast.error((err as Error).message || 'Failed to update account status');
    } finally {
      setSuspendTarget(null);
    }
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return users.filter((u) => {
      if (statusFilter !== 'all' && u.status !== statusFilter) return false;
      if (courseFilter !== 'all' && !u.enrolledCourseIds.includes(courseFilter)) return false;
      if (q && !`${u.name} ${u.email} ${u.phone ?? ''} ${u.location ?? ''}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [users, query, statusFilter, courseFilter]);

  const stats = useMemo(() => {
    const active = users.filter((u) => u.status !== 'suspended').length;
    return { total: users.length, active, suspended: users.length - active };
  }, [users]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">Student Management</h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Search, view, and manage every learner on the platform. Passwords are never visible.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
          <LockKey className="size-4 text-emerald-600 dark:text-emerald-400" weight="duotone" />
          Credential data is protected
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={Users} label="Total Students" value={stats.total} hint="All registered learners" tone="bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400" />
        <StatCard icon={Student} label="Active" value={stats.active} hint="Accounts in good standing" tone="bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400" />
        <StatCard icon={UserMinus} label="Suspended" value={stats.suspended} hint="Access temporarily revoked" tone="bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400" />
        <StatCard icon={Wallet} label="Enrollments" value={users.reduce((sum, u) => sum + u.enrolledCourseIds.length, 0)} hint="Across all active courses" tone="bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400" />
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <MagnifyingGlass className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name, email, phone, or location…"
                className="pl-9"
                aria-label="Search students"
              />
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                <SlidersHorizontal className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'suspended')}
                  className="h-9 appearance-none rounded-md border border-zinc-200 bg-white pl-9 pr-8 text-sm text-zinc-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300"
                  aria-label="Filter by status"
                >
                  <option value="all">All statuses</option>
                  <option value="active">Active</option>
                  <option value="suspended">Suspended</option>
                </select>
                <CaretDown className="pointer-events-none absolute right-3 top-1/2 size-3.5 -translate-y-1/2 text-zinc-400" />
              </div>
              <div className="relative">
                <BookOpen className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
                <select
                  value={courseFilter}
                  onChange={(e) => setCourseFilter(e.target.value)}
                  className="h-9 appearance-none rounded-md border border-zinc-200 bg-white pl-9 pr-8 text-sm text-zinc-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300"
                  aria-label="Filter by course"
                >
                  <option value="all">All courses</option>
                  {courseOptions.map((c) => (
                    <option key={c.id} value={c.id}>{c.title}</option>
                  ))}
                </select>
                <CaretDown className="pointer-events-none absolute right-3 top-1/2 size-3.5 -translate-y-1/2 text-zinc-400" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-3 p-4">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="size-9 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-3.5 w-36" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                  <Skeleton className="ml-auto h-6 w-20 rounded-full" />
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
              <div className="flex size-12 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
                <Users className="size-6 text-zinc-400" weight="duotone" />
              </div>
              <h3 className="mt-4 text-sm font-semibold text-zinc-900 dark:text-white">No students found</h3>
              <p className="mt-1 max-w-sm text-sm text-zinc-500 dark:text-zinc-400">
                Try adjusting your search or clearing the active filters.
              </p>
              <Button variant="outline" size="sm" className="mt-4" onClick={() => { setQuery(''); setStatusFilter('all'); setCourseFilter('all'); }}>
                Clear filters
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 text-left text-xs uppercase tracking-wider text-zinc-400 dark:border-zinc-800 dark:text-zinc-500">
                    <th className="px-4 py-3 font-medium">Student</th>
                    <th className="px-4 py-3 font-medium">Enrolled</th>
                    <th className="hidden px-4 py-3 font-medium md:table-cell">Courses</th>
                    <th className="hidden px-4 py-3 font-medium sm:table-cell">Joined</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                  {filtered.map((u) => (
                    <tr key={u.id} onClick={() => openStudent(u.id)} className="cursor-pointer transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar className="size-9">
                            <AvatarImage src={u.avatar} alt={u.name} />
                            <AvatarFallback>{initials(u.name)}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="flex items-center gap-1.5 font-medium text-zinc-900 dark:text-white">
                              {u.name}
                              {u.status === 'suspended' && <SuspendedMarker />}
                            </p>
                            <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300">{u.enrolledCourseIds.length}</td>
                      <td className="hidden max-w-[220px] truncate px-4 py-3 text-zinc-500 dark:text-zinc-400 md:table-cell">
                        {u.enrolledCourseIds.slice(0, 2).map((id) => getCourseTitle(id)).join(', ')}
                        {u.enrolledCourseIds.length > 2 ? ` +${u.enrolledCourseIds.length - 2} more` : ''}
                      </td>
                      <td className="hidden whitespace-nowrap px-4 py-3 text-zinc-500 dark:text-zinc-400 sm:table-cell">{fmtDate(u.joinedAt)}</td>
                      <td className="px-4 py-3"><StatusBadge status={u.status ?? 'active'} /></td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs" onClick={(e) => { e.stopPropagation(); openStudent(u.id); }}>
                            <DotsThree className="size-4" /> View
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className={`h-8 gap-1 text-xs ${u.status === 'suspended' ? 'text-emerald-600 hover:text-emerald-700 dark:text-emerald-400' : 'text-red-600 hover:text-red-700 dark:text-red-400'}`}
                            onClick={(e) => { e.stopPropagation(); setSuspendTarget(u); }}
                          >
                            {u.status === 'suspended'
                              ? <><ShieldCheck className="size-4" /> Reactivate</>
                              : <><UserMinus className="size-4" /> Suspend</>}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <AdminStudentsProfileSheet
        student={student}
        open={open}
        onOpenChange={(o) => { setOpen(o); if (!o) setSelectedId(null); }}
        onToggleStatus={(u) => setSuspendTarget(u)}
        tab={tab}
        onTabChange={setTab}
      />

      <AlertDialog open={suspendTarget !== null} onOpenChange={(o) => { if (!o) setSuspendTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {suspendTarget?.status === 'suspended' ? `Reactivate ${suspendTarget?.name}?` : `Suspend ${suspendTarget?.name}?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {suspendTarget?.status === 'suspended'
                ? 'The student will regain access to their account and enrolled courses immediately.'
                : 'The student will immediately lose access to their account and all enrolled course content. Enrollment and payment history are preserved, and the account can be reactivated at any time.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { if (suspendTarget) toggleStatus(suspendTarget); }}
              className={suspendTarget?.status === 'suspended' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'}
            >
              {suspendTarget?.status === 'suspended' ? <><ShieldCheck className="size-4" /> Reactivate</> : <><UserMinus className="size-4" /> Suspend</>}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}