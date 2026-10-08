import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Users, BookOpen, Wallet, GraduationCap, Trophy, ChartLineUp,
  CheckCircle, ClipboardText, Exam, MagnifyingGlass, ArrowDown, ArrowUp,
} from '@phosphor-icons/react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import {
  fetchLMSMetrics, fetchRevenueReport, fetchCourseAnalytics,
  type LMSMetrics, type RevenuePoint, type CourseAnalyticsRow,
} from '@/services/adminService';

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { ease: 'easeOut' as const } },
};

type Period = 'daily' | 'weekly' | 'monthly' | 'yearly';
type CourseSort = 'revenue' | 'enrollments' | 'dropoff';

const PERIODS: { key: Period; label: string }[] = [
  { key: 'daily', label: 'Daily' },
  { key: 'weekly', label: 'Weekly' },
  { key: 'monthly', label: 'Monthly' },
  { key: 'yearly', label: 'Yearly' },
];

const fmtMoney = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

function MiniBars({ points, height = 96 }: { points: RevenuePoint[]; height?: number }) {
  const max = Math.max(...points.map((p) => p.revenue), 1);
  return (
    <div className="flex items-end gap-1.5" style={{ height }}>
      {points.map((p, i) => {
        const h = Math.max(6, Math.round((p.revenue / max) * height));
        const gradient = 'bg-gradient-to-t from-emerald-600 to-emerald-400 dark:from-emerald-700 dark:to-emerald-500';
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1 min-w-0">
            <div className="w-full rounded-t-md bg-emerald-100 dark:bg-emerald-900/40 overflow-hidden" style={{ height }}>
              <div className={`${gradient} rounded-t-md transition-all duration-500`} style={{ height: `${h}px`, marginTop: `${height - h}px` }} />
            </div>
            <span className="text-[9px] text-zinc-400 truncate w-full text-center">{p.label}</span>
          </div>
        );
      })}
    </div>
  );
}

export function AdminAnalyticsPage() {
  const [metrics, setMetrics] = useState<LMSMetrics | null>(null);
  const [revenue, setRevenue] = useState<RevenuePoint[]>([]);
  const [courses, setCourses] = useState<CourseAnalyticsRow[]>([]);
  const [period, setPeriod] = useState<Period>('daily');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<CourseSort>('revenue');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [m, rev, c] = await Promise.all([
          fetchLMSMetrics(),
          fetchRevenueReport(period),
          fetchCourseAnalytics(),
        ]);
        setMetrics(m);
        setRevenue(rev);
        setCourses(c);
      } catch (err: any) {
        toast.error(err.message || 'Failed to load analytics');
      } finally {
        setLoading(false);
      }
    })();
  }, [period]);

  const kpis = useMemo(
    () =>
      metrics
        ? [
            { label: 'Total Students', value: metrics.totalStudents, icon: Users, cls: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30' },
            { label: 'Active Students', value: metrics.activeStudents, icon: ChartLineUp, cls: 'text-violet-600 bg-violet-100 dark:bg-violet-900/30' },
            { label: 'Total Courses', value: metrics.totalCourses, icon: BookOpen, cls: 'text-amber-600 bg-amber-100 dark:bg-amber-900/30' },
            { label: 'Published', value: metrics.publishedCourses, icon: CheckCircle, cls: 'text-cyan-600 bg-cyan-100 dark:bg-cyan-900/30' },
            { label: 'Enrollments', value: metrics.totalEnrollments, icon: GraduationCap, cls: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30' },
            { label: 'Completions', value: metrics.completions, icon: Trophy, cls: 'text-orange-600 bg-orange-100 dark:bg-orange-900/30' },
            { label: 'Revenue', value: fmtMoney(metrics.totalRevenue), icon: Wallet, cls: 'text-zinc-600 bg-zinc-100 dark:bg-zinc-800' },
            { label: 'Pending Grading', value: metrics.pendingGrading, icon: ClipboardText, cls: 'text-rose-600 bg-rose-100 dark:bg-rose-900/30' },
            { label: 'Avg Quiz Score', value: `${metrics.avgQuizScore}%`, icon: Exam, cls: 'text-teal-600 bg-teal-100 dark:bg-teal-900/30' },
          ]
        : [],
    [metrics]
  );

  const filteredCourses = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q ? courses.filter((c) => c.title.toLowerCase().includes(q)) : [...courses];
    return list.sort((a, b) => {
      if (sort === 'enrollments') return b.enrollments - a.enrollments;
      if (sort === 'dropoff') return (100 - a.completionRate) - (100 - b.completionRate);
      return b.revenue - a.revenue;
    });
  }, [courses, query, sort]);

  const totals = useMemo(() => {
    const revenueTotal = courses.reduce((s, c) => s + c.revenue, 0);
    const avgCompletion = courses.length ? Math.round(courses.reduce((s, c) => s + c.completionRate, 0) / courses.length) : 0;
    return { revenueTotal, avgCompletion };
  }, [courses]);

  return (
    <motion.div initial="hidden" animate="visible" variants={itemVariants} className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">Reports &amp; Analytics</h1>
        <p className="text-zinc-500 dark:text-zinc-400 mt-1 text-sm">
          Platform KPIs, revenue trends and course-level performance
        </p>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
        {loading && !metrics
          ? [...Array(10)].map((_, i) => (
              <Card key={i} className="border-zinc-200 dark:border-zinc-800">
                <CardContent className="p-4 space-y-2">
                  <Skeleton className="h-8 w-8 rounded-lg" />
                  <Skeleton className="h-5 w-16" />
                  <Skeleton className="h-3 w-24" />
                </CardContent>
              </Card>
            ))
          : kpis.map((k) => (
              <Card key={k.label} className="border-zinc-200 dark:border-zinc-800">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${k.cls}`}>
                      <k.icon size={18} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-lg font-bold text-zinc-900 dark:text-white truncate">{k.value}</p>
                      <p className="text-[11px] text-zinc-500 truncate">{k.label}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
      </div>

      {/* Revenue analytics */}
      <Card className="border-zinc-200 dark:border-zinc-800">
        <CardContent className="p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
            <div>
              <h2 className="font-semibold text-zinc-900 dark:text-white">Revenue Trend</h2>
              <p className="text-xs text-zinc-500 mt-0.5">
                Total {fmtMoney(totals.revenueTotal)} gross · {revenue.reduce((s, p) => s + p.count, 0)} transactions
              </p>
            </div>
            <div className="flex rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden">
              {PERIODS.map((p) => (
                <button
                  key={p.key}
                  onClick={() => setPeriod(p.key)}
                  className={`px-3.5 py-1.5 text-xs font-medium transition-colors ${
                    period === p.key
                      ? 'bg-emerald-600 text-white'
                      : 'bg-white dark:bg-zinc-900 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : revenue.length === 0 ? (
            <div className="py-10 text-center text-sm text-zinc-400">No revenue data for this period yet</div>
          ) : (
            <div>
              <MiniBars points={revenue} />
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
                <div className="rounded-lg bg-emerald-50 dark:bg-emerald-900/20 p-3">
                  <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">Peak period revenue</p>
                  <p className="text-lg font-bold text-emerald-700 dark:text-emerald-300">
                    {fmtMoney(Math.max(...revenue.map((p) => p.revenue)))}
                  </p>
                </div>
                <div className="rounded-lg bg-zinc-50 dark:bg-zinc-900 p-3">
                  <p className="text-[11px] text-zinc-500 font-medium">Average per period</p>
                  <p className="text-lg font-bold text-zinc-900 dark:text-white">
                    {fmtMoney(Math.round((revenue.reduce((s, p) => s + p.revenue, 0) / Math.max(revenue.length, 1)) * 100) / 100)}
                  </p>
                </div>
                <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 p-3">
                  <p className="text-[11px] text-blue-600 dark:text-blue-400 font-medium">Total transactions</p>
                  <p className="text-lg font-bold text-blue-700 dark:text-blue-300">{revenue.reduce((s, p) => s + p.count, 0)}</p>
                </div>
                <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 p-3">
                  <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">Avg order value</p>
                  <p className="text-lg font-bold text-amber-700 dark:text-amber-300">
                    {fmtMoney(Math.round((revenue.reduce((s, p) => s + p.revenue, 0) / Math.max(revenue.reduce((s, p) => s + p.count, 0), 1)) * 100) / 100)}
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Course performance */}
      <Card className="border-zinc-200 dark:border-zinc-800">
        <CardContent className="p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="font-semibold text-zinc-900 dark:text-white">Course Performance</h2>
              <p className="text-xs text-zinc-500 mt-0.5">Completion across courses: {totals.avgCompletion}% average</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <MagnifyingGlass size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search course"
                  className="h-9 pl-8 pr-3 w-44 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                />
              </div>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as CourseSort)}
                className="h-9 px-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
              >
                <option value="revenue">By revenue</option>
                <option value="enrollments">By enrollments</option>
                <option value="dropoff">Highest drop-off</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
            </div>
          ) : filteredCourses.length === 0 ? (
            <div className="py-12 text-center text-sm text-zinc-400">No courses found</div>
          ) : (
            <div className="space-y-2">
              <div className="hidden md:grid grid-cols-12 gap-2 text-[11px] uppercase tracking-wider text-zinc-400 px-3">
                <span className="col-span-4">Course</span>
                <span className="col-span-1 text-right">Enrolled</span>
                <span className="col-span-2 text-right">Completion</span>
                <span className="col-span-2 text-right">Avg progress</span>
                <span className="col-span-1 text-right">Quiz avg</span>
                <span className="col-span-2 text-right">Revenue</span>
              </div>
              {filteredCourses.map((c) => {
                const dropoff = 100 - c.completionRate;
                return (
                  <div
                    key={c.courseId}
                    className="grid grid-cols-2 md:grid-cols-12 gap-2 items-center px-3 py-3 rounded-lg border border-zinc-100 dark:border-zinc-800 hover:border-emerald-200 dark:hover:border-emerald-900 transition-colors"
                  >
                    <div className="col-span-2 md:col-span-4 min-w-0">
                      <p className="text-sm font-medium text-zinc-900 dark:text-white truncate">{c.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border-0 text-[10px]">
                          {c.enrollments} enrolled
                        </Badge>
                        {dropoff >= 60 && (
                          <span className="flex items-center gap-0.5 text-[10px] text-rose-500">
                            <ArrowDown size={10} /> {dropoff}% drop-off
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="col-span-1 text-right text-sm font-semibold text-zinc-800 dark:text-zinc-200">{c.enrollments}</div>
                    <div className="col-span-2 md:col-span-2">
                      <div className="flex items-center gap-2">
                        <Progress value={c.completionRate} className="h-1.5 flex-1" />
                        <span className="text-xs font-medium text-zinc-600 dark:text-zinc-300 w-9 text-right">{c.completionRate}%</span>
                      </div>
                    </div>
                    <div className="col-span-2 text-right">
                      <span className="text-sm text-zinc-700 dark:text-zinc-300">{c.avgProgress}%</span>
                      <span className="text-[10px] text-zinc-400 ml-1.5">{c.submissions} subs</span>
                    </div>
                    <div className="col-span-1 text-right text-sm text-zinc-700 dark:text-zinc-300">
                      {c.avgQuizScore ? `${c.avgQuizScore}%` : '-'}
                    </div>
                    <div className="col-span-2 text-right">
                      <span className="text-sm font-bold text-emerald-600">{fmtMoney(c.revenue)}</span>
                      <span className="flex items-center justify-end gap-0.5 text-[10px] text-zinc-400 mt-0.5">
                        <ArrowUp size={9} className="text-emerald-500" /> {c.passRate}% pass rate
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}