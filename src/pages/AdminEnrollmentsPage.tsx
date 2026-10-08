import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  GraduationCap, CheckCircle, ChartLineUp, MagnifyingGlass, Funnel,
  Prohibit, ArrowCounterClockwise, UserCircle, Certificate, Spinner,
} from '@phosphor-icons/react';
import { SEED_COURSES } from '@/data';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  fetchAdminEnrollments, setEnrollmentStatus,
  type AdminEnrollment, type EnrollmentStatus, type EnrollmentFilters,
} from '@/services/adminService';
import { useAuth } from '@/contexts/AuthContext';

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { ease: 'easeOut' as const } },
};

const inputCls =
  'w-full h-9 pl-8 pr-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30';
const selectCls =
  'h-9 px-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30';

const statusStyles: Record<EnrollmentStatus, string> = {
  active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border-0',
  completed: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300 border-0',
  suspended: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 border-0',
  cancelled: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 border-0',
  refunded: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border-0',
  revoked: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 border-0',
};

export function AdminEnrollmentsPage() {
  const { profile } = useAuth();
  const [rows, setRows] = useState<AdminEnrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [target, setTarget] = useState<AdminEnrollment | null>(null);
  const [actionStatus, setActionStatus] = useState<EnrollmentStatus>('revoked');
  const [reason, setReason] = useState('');
  const [filters, setFilters] = useState<EnrollmentFilters>({ status: 'all', courseId: 'all' });

  const load = async (f: EnrollmentFilters) => {
    setLoading(true);
    try {
      setRows(await fetchAdminEnrollments(f));
    } catch (err: any) {
      toast.error(err.message || 'Failed to load enrollments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(() => load(filters), 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const metrics = useMemo(() => {
    const active = rows.filter((r) => r.status === 'active').length;
    const completed = rows.filter((r) => r.status === 'completed').length;
    const avg = rows.length ? Math.round(rows.reduce((s, r) => s + r.progress, 0) / rows.length) : 0;
    return { active, completed, avg };
  }, [rows]);

  const openAction = (r: AdminEnrollment, status: EnrollmentStatus) => {
    setTarget(r);
    setActionStatus(status);
    setReason('');
  };

  const confirmAction = async () => {
    if (!target) return;
    setActing(true);
    try {
      const res = await setEnrollmentStatus(target.id, actionStatus, reason, profile?.id);
      if (!res.ok) {
        toast.error(res.message);
        return;
      }
      toast.success(res.message);
      setTarget(null);
      await load(filters);
    } catch (err: any) {
      toast.error(err.message || 'Action failed');
    } finally {
      setActing(false);
    }
  };

  return (
    <motion.div initial="hidden" animate="visible" variants={itemVariants} className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">Enrollments</h1>
        <p className="text-zinc-500 dark:text-zinc-400 mt-1 text-sm">
          Student course access, progress and lifecycle management
        </p>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Active Enrollments', value: metrics.active, desc: 'Currently in progress', icon: GraduationCap, cls: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30' },
          { label: 'Completed', value: metrics.completed, desc: 'Finished and certified', icon: CheckCircle, cls: 'text-cyan-600 bg-cyan-100 dark:bg-cyan-900/30' },
          { label: 'Average Progress', value: `${metrics.avg}%`, desc: 'Across filtered rows', icon: ChartLineUp, cls: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30' },
        ].map((m) => (
          <Card key={m.label} className="border-zinc-200 dark:border-zinc-800">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${m.cls}`}>
                <m.icon size={20} />
              </div>
              <div>
                <p className="text-xl font-bold text-zinc-900 dark:text-white">{m.value}</p>
                <p className="text-xs text-zinc-500">{m.label}</p>
                <p className="text-[10px] text-zinc-400">{m.desc}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card className="border-zinc-200 dark:border-zinc-800">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-xs font-medium text-zinc-500 mb-3">
            <Funnel size={14} /> Filters
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="relative lg:col-span-2">
              <MagnifyingGlass size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                className={inputCls}
                placeholder="Search student name or email"
                value={filters.studentQuery || ''}
                onChange={(e) => setFilters({ ...filters, studentQuery: e.target.value })}
              />
            </div>
            <select
              className={selectCls}
              value={filters.status || 'all'}
              onChange={(e) => setFilters({ ...filters, status: e.target.value as EnrollmentStatus | 'all' })}
            >
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="suspended">Suspended</option>
              <option value="cancelled">Cancelled</option>
              <option value="refunded">Refunded</option>
              <option value="revoked">Revoked</option>
            </select>
            <select
              className={selectCls}
              value={filters.courseId || 'all'}
              onChange={(e) => setFilters({ ...filters, courseId: e.target.value })}
            >
              <option value="all">All courses</option>
              {SEED_COURSES.map((c) => (
                <option key={c.id} value={c.id}>{c.title}</option>
              ))}
            </select>
            <input
              type="date"
              className={selectCls}
              value={filters.dateFrom || ''}
              onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value || undefined })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="border-zinc-200 dark:border-zinc-800">
        <CardContent className="p-0 overflow-x-auto">
          {loading ? (
            <div className="p-6 space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-12 bg-zinc-100 dark:bg-zinc-800 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : rows.length === 0 ? (
            <div className="p-12 text-center">
              <GraduationCap size={36} className="mx-auto text-zinc-300 mb-3" />
              <p className="text-zinc-500 text-sm">No enrollments match the selected filters</p>
            </div>
          ) : (
            <table className="w-full text-sm min-w-[900px]">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-zinc-400 border-b border-zinc-100 dark:border-zinc-800">
                  <th className="px-4 py-3 font-medium">Student</th>
                  <th className="px-4 py-3 font-medium">Course</th>
                  <th className="px-4 py-3 font-medium">Enrolled</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium w-[220px]">Progress</th>
                  <th className="px-4 py-3 font-medium">Certificate</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {rows.map((r) => (
                  <tr key={r.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {r.studentAvatar ? (
                          <img src={r.studentAvatar} alt="" className="w-8 h-8 rounded-full bg-zinc-100 object-cover" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                            <UserCircle size={18} className="text-emerald-600" />
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-zinc-900 dark:text-white">{r.studentName}</p>
                          <p className="text-xs text-zinc-400">{r.studentEmail}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300 max-w-[200px] truncate">{r.courseTitle}</td>
                    <td className="px-4 py-3 text-zinc-500 whitespace-nowrap">
                      {new Date(r.enrolledAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={`${statusStyles[r.status]} text-[11px] px-2 py-0.5`}>{r.status}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Progress value={r.progress} className="h-1.5 flex-1" />
                        <span className="text-xs font-medium text-zinc-600 dark:text-zinc-300 w-10 text-right">{r.progress}%</span>
                      </div>
                      <p className="text-[10px] text-zinc-400 mt-1">{r.completedLessons}/{r.totalLessons} lessons</p>
                    </td>
                    <td className="px-4 py-3">
                      {r.certificateUrl ? (
                        <Badge className="bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300 border-0 text-[11px]">
                          <Certificate size={12} className="mr-1" /> Issued
                        </Badge>
                      ) : r.status === 'completed' ? (
                        <span className="text-[11px] text-zinc-400 italic">Pending</span>
                      ) : (
                        <span className="text-[11px] text-zinc-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        {(r.status === 'active' || r.status === 'suspended' || r.status === 'revoked' || r.status === 'cancelled' || r.status === 'refunded') && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-red-600 hover:text-red-700 border-red-200 dark:border-red-900 gap-1"
                            onClick={() => openAction(r, r.status === 'active' ? 'revoked' : 'active')}
                          >
                            {r.status === 'active' ? <Prohibit size={13} /> : <ArrowCounterClockwise size={13} />}
                            {r.status === 'active' ? 'Revoke' : 'Restore'}
                          </Button>
                        )}
                        {r.status === 'active' && (
                          <Button variant="outline" size="sm" className="gap-1" onClick={() => openAction(r, 'suspended')}>
                            Pause
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Status change dialog (audited) */}
      <Dialog open={!!target} onOpenChange={(o) => !o && setTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Change enrollment status</DialogTitle>
            <DialogDescription>
              Status changes are recorded in the audit log with a required reason.
            </DialogDescription>
          </DialogHeader>
          {target && (
            <div className="space-y-4">
              <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-3 text-sm space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-zinc-500">Student</span>
                  <span className="font-medium text-zinc-900 dark:text-white">{target.studentName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Course</span>
                  <span className="text-zinc-900 dark:text-white">{target.courseTitle}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Current</span>
                  <Badge className={`${statusStyles[target.status]} text-[11px]`}>{target.status}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">New status</span>
                  <Badge className={`${statusStyles[actionStatus]} text-[11px]`}>{actionStatus}</Badge>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Reason</label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                  placeholder="Required: why is this enrollment being changed?"
                  className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 resize-none"
                />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setTarget(null)}>Cancel</Button>
            <Button
              onClick={confirmAction}
              disabled={acting || !reason.trim()}
              className={actionStatus === 'active' ? 'bg-emerald-600 hover:bg-emerald-700 text-white gap-2' : 'bg-red-600 hover:bg-red-700 text-white gap-2'}
            >
              {acting ? <Spinner size={15} className="animate-spin" /> : null}
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}