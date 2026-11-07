import { supabase } from '@/integrations/supabase/client';

/* ----------------------------- Types ------------------------------- */

export type PaymentStatus = 'pending' | 'completed' | 'refunded' | 'failed';
export type EnrollmentStatus = 'active' | 'completed' | 'suspended' | 'cancelled' | 'refunded' | 'revoked';

export interface AdminPayment {
  id: string;
  transactionRef: string;
  studentName: string;
  studentEmail: string;
  courseId: string;
  courseTitle: string;
  amount: number;
  currency: string;
  provider: string;
  status: PaymentStatus;
  createdAt: string;
  refundReason?: string;
  refundAmount?: number;
  refundedAt?: string;
}

export interface AdminEnrollment {
  id: string;
  studentName: string;
  studentEmail: string;
  studentAvatar?: string;
  courseId: string;
  courseTitle: string;
  enrolledAt: string;
  completedAt?: string;
  status: EnrollmentStatus;
  progress: number;
  totalLessons: number;
  completedLessons: number;
  certificateUrl?: string;
  paymentId?: string;
}

export interface PaymentFilters {
  dateFrom?: string;
  dateTo?: string;
  courseId?: string;
  studentQuery?: string;
  status?: PaymentStatus | 'all';
}

export interface EnrollmentFilters {
  courseId?: string;
  status?: EnrollmentStatus | 'all';
  studentQuery?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface RevenuePoint {
  label: string;
  revenue: number;
  count: number;
}

export interface CourseAnalyticsRow {
  courseId: string;
  title: string;
  enrollments: number;
  completionRate: number;
  avgProgress: number;
  avgQuizScore: number;
  submissions: number;
  passRate: number;
  revenue: number;
}

export interface LMSMetrics {
  totalStudents: number;
  activeStudents: number;
  totalCourses: number;
  publishedCourses: number;
  totalEnrollments: number;
  completions: number;
  totalRevenue: number;
  revenueByCurrency: Record<string, number>;
  pendingGrading: number;
  avgQuizScore: number;
}

/* ---------------------------- Helpers ------------------------------ */

const courseTitle = new Map<string, string>();
export const getCourseTitle = (id: string) => courseTitle.get(id) ?? 'Course';
const rememberCourseTitles = (rows: { id: string; title: string }[] = []) => {
  for (const c of rows) courseTitle.set(c.id, c.title);
};

const normStatus = (s?: string): PaymentStatus => {
  const st = (s || 'pending').toLowerCase();
  if (st === 'successful' || st === 'completed') return 'completed';
  if (st === 'processing') return 'pending';
  if (st === 'refunded') return 'refunded';
  if (st === 'failed' || st === 'cancelled') return 'failed';
  return 'pending';
};

const normEnroll = (s?: string): EnrollmentStatus => {
  const st = (s || 'active').toLowerCase();
  if (['active', 'completed', 'suspended', 'cancelled', 'refunded', 'revoked'].includes(st)) return st as EnrollmentStatus;
  return 'active';
};

const matchesQuery = (query: string | undefined, ...values: string[]) => {
  const normalized = query?.trim().toLowerCase();
  return !normalized || values.some((value) => value.toLowerCase().includes(normalized));
};

/* ---------------------------- Payments ----------------------------- */

export async function fetchAdminPayments(filters: PaymentFilters = {}): Promise<AdminPayment[]> {
  const query = supabase
    .from('payments')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(400);
  if (filters.dateFrom) query.gte('created_at', filters.dateFrom);
  if (filters.dateTo) query.lte('created_at', filters.dateTo);
  if (filters.courseId && filters.courseId !== 'all') query.eq('course_id', filters.courseId);
  if (filters.status === 'completed') query.in('status', ['completed', 'successful']);
  else if (filters.status === 'pending') query.in('status', ['pending', 'processing']);
  else if (filters.status === 'failed') query.in('status', ['failed', 'cancelled']);
  else if (filters.status && filters.status !== 'all') query.eq('status', filters.status);

  const { data, error } = await query;
  if (error) throw error;
  const rows = data || [];
  if (rows.length === 0) return [];

  const userIds = [...new Set(rows.map((row: any) => row.user_id).filter(Boolean))];
  const courseIds = [...new Set(rows.map((row: any) => row.course_id).filter(Boolean))];
  const [profilesResult, coursesResult] = await Promise.all([
    userIds.length
      ? supabase.from('profiles').select('user_id,full_name,email').in('user_id', userIds)
      : Promise.resolve({ data: [], error: null }),
    courseIds.length
      ? supabase.from('courses').select('id,title').in('id', courseIds)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (profilesResult.error) throw profilesResult.error;
  if (coursesResult.error) throw coursesResult.error;

  const profiles = new Map((profilesResult.data || []).map((p: any) => [p.user_id, p]));
  const courses = new Map((coursesResult.data || []).map((c: any) => [c.id, c.title]));
  rememberCourseTitles(coursesResult.data || []);
  const search = filters.studentQuery?.trim().toLowerCase();

  return rows.map((r: any): AdminPayment => {
    const profile = profiles.get(r.user_id) as any;
    return {
      id: r.id,
      transactionRef: r.transaction_reference || r.transaction_id || r.id.slice(0, 8).toUpperCase(),
      studentName: profile?.full_name || r.customer_email || 'Unknown student',
      studentEmail: profile?.email || r.customer_email || '',
      courseId: r.course_id,
      courseTitle: courses.get(r.course_id) || 'Unknown course',
      amount: Number(r.amount),
      currency: r.currency || 'GHS',
      provider: r.provider || r.method || 'Online',
      status: normStatus(r.status),
      createdAt: r.created_at,
      refundReason: r.refund_reason || undefined,
      refundAmount: r.refund_amount != null ? Number(r.refund_amount) : undefined,
      refundedAt: r.refunded_at || undefined,
    };
  }).filter((p) => !search || `${p.studentName} ${p.studentEmail} ${p.transactionRef}`.toLowerCase().includes(search));
}

/**
 * Protected refund flow. Payment status is never edited ad hoc from the UI:
 * the DB RPC performs the transition, revokes access and appends an
 * immutable audit_logs row in a single transaction.
 */
export async function processPaymentRefund(
  paymentId: string,
  policy: 'full' | 'partial',
  amount: number | null,
  reason: string,
): Promise<{ ok: boolean; message: string }> {
  if (!reason.trim()) return { ok: false, message: 'A reason is required to process a refund' };
  if (policy === 'partial' && (!Number.isFinite(amount) || (amount ?? 0) <= 0)) {
    return { ok: false, message: 'A valid partial refund amount is required' };
  }
  try {
    const { data, error } = await supabase.rpc('execute_payment_refund', {
      p_payment_id: paymentId,
      p_policy: policy,
      p_amount: amount,
      p_reason: reason.trim(),
      p_revoke_access: policy === 'full',
    });
    if (error) return { ok: false, message: error.message || 'Refund operation failed' };
    const res = Array.isArray(data) ? data[0] : data;
    if (!res || res.ok !== true) {
      return { ok: false, message: res?.message || 'Refund was not confirmed by the database' };
    }
    return { ok: true, message: res.message || 'Refund processed and audited' };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : 'Refund operation failed' };
  }
}

/* --------------------------- Enrollments ---------------------------- */

export async function fetchAdminEnrollments(filters: EnrollmentFilters = {}): Promise<AdminEnrollment[]> {
  const query = supabase
    .from('enrollments')
    .select('*')
    .order('enrolled_at', { ascending: false })
    .limit(400);
  if (filters.courseId && filters.courseId !== 'all') query.eq('course_id', filters.courseId);
  if (filters.status && filters.status !== 'all') query.eq('status', filters.status);
  if (filters.dateFrom) query.gte('enrolled_at', filters.dateFrom);
  if (filters.dateTo) query.lte('enrolled_at', filters.dateTo);
  const { data, error } = await query;
  if (error) throw error;
  const rows = data || [];
  if (rows.length === 0) return [];

  const userIds = [...new Set(rows.map((row: any) => row.user_id).filter(Boolean))];
  const courseIds = [...new Set(rows.map((row: any) => row.course_id).filter(Boolean))];
  const [profilesResult, coursesResult] = await Promise.all([
    userIds.length
      ? supabase.from('profiles').select('user_id,full_name,email,avatar_url').in('user_id', userIds)
      : Promise.resolve({ data: [], error: null }),
    courseIds.length
      ? supabase.from('courses').select('id,title,total_lessons').in('id', courseIds)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (profilesResult.error) throw profilesResult.error;
  if (coursesResult.error) throw coursesResult.error;

  const profiles = new Map((profilesResult.data || []).map((p: any) => [p.user_id, p]));
  const courses = new Map((coursesResult.data || []).map((c: any) => [c.id, c]));
  rememberCourseTitles(coursesResult.data || []);
  const search = filters.studentQuery?.trim().toLowerCase();

  return rows.map((r: any): AdminEnrollment => {
    const profile = profiles.get(r.user_id) as any;
    const course = courses.get(r.course_id) as any;
    const lessons = Number(course?.total_lessons || 0);
    const progress = Number(r.progress ?? 0);
    return {
      id: r.id,
      studentName: profile?.full_name || profile?.email || 'Unknown student',
      studentEmail: profile?.email || '',
      studentAvatar: profile?.avatar_url || undefined,
      courseId: r.course_id,
      courseTitle: course?.title || 'Unknown course',
      enrolledAt: r.enrolled_at,
      completedAt: r.completed_at || undefined,
      status: normEnroll(r.status),
      progress,
      totalLessons: lessons,
      completedLessons: Math.round((progress / 100) * lessons),
      certificateUrl: r.certificate_url || undefined,
      paymentId: r.payment_id || undefined,
    };
  }).filter((enrollment) => matchesQuery(search, enrollment.studentName, enrollment.studentEmail));
}

export async function setEnrollmentStatus(
  enrollmentId: string,
  status: EnrollmentStatus,
  reason: string,
): Promise<{ ok: boolean; message: string }> {
  if (!reason.trim()) return { ok: false, message: 'A reason is required to change enrollment status' };
  try {
    const { data, error } = await supabase.rpc('set_enrollment_status', {
      p_enrollment_id: enrollmentId,
      p_status: status,
      p_reason: reason.trim(),
    });
    if (error) return { ok: false, message: error.message || 'Enrollment status update failed' };
    const res = Array.isArray(data) ? data[0] : data;
    if (!res || res.ok !== true) {
      return { ok: false, message: res?.message || 'Enrollment status change was not confirmed' };
    }
    return { ok: true, message: res.message || 'Enrollment updated' };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : 'Enrollment status update failed' };
  }
}

/* ------------------------- LMS analytics ---------------------------- */

export async function fetchLMSMetrics(): Promise<LMSMetrics> {
  const [payments, enrollments, courses, profiles, submissions, quiz] = await Promise.all([
    supabase.from('payments').select('status, amount, currency'),
    supabase.from('enrollments').select('status, progress'),
    supabase.from('courses').select('status'),
    supabase.from('profiles').select('role, status'),
    supabase.from('assignment_submissions').select('status, score'),
    supabase.from('quiz_results').select('score, total_score'),
  ]);
  const failedQuery = [payments, enrollments, courses, profiles, submissions, quiz].find((result) => result.error);
  if (failedQuery?.error) throw failedQuery.error;
  const payRows = payments.data || [];
  const enrollmentRows = enrollments.data || [];
  const quizRows = quiz.data || [];
  const revenueByCurrency: Record<string, number> = {};
  for (const payment of payRows as any[]) {
    if (payment.status !== 'completed' && payment.status !== 'successful') continue;
    const currency = payment.currency || 'GHS';
    revenueByCurrency[currency] = (revenueByCurrency[currency] || 0) + Number(payment.amount);
  }
  return {
    totalStudents: profiles.data?.filter((p: any) => p.role === 'student').length || 0,
    activeStudents: profiles.data?.filter((p: any) => p.role === 'student' && p.status === 'active').length || 0,
    totalCourses: courses.data?.length || 0,
    publishedCourses: courses.data?.filter((c: any) => c.status === 'published').length || 0,
    totalEnrollments: enrollmentRows.length,
    completions: enrollmentRows.filter((e: any) => e.status === 'completed' || Number(e.progress) >= 100).length,
    totalRevenue: Math.round(payRows.filter((p: any) => p.status === 'completed' || p.status === 'successful').reduce((sum: number, p: any) => sum + Number(p.amount), 0) * 100) / 100,
    revenueByCurrency: Object.fromEntries(Object.entries(revenueByCurrency).map(([currency, amount]) => [currency, Math.round(amount * 100) / 100])),
    pendingGrading: submissions.data?.filter((s: any) => s.score == null && s.status !== 'draft').length || 0,
    avgQuizScore: quizRows.length ? Math.round((quizRows.reduce((sum: number, r: any) => sum + (Number(r.score) / Math.max(Number(r.total_score), 1)) * 100, 0) / quizRows.length) * 10) / 10 : 0,
  };
}

export async function fetchRevenueReport(period: 'daily' | 'weekly' | 'monthly' | 'yearly'): Promise<RevenuePoint[]> {
  const { data, error } = await supabase
    .from('payments')
    .select('amount, created_at, status')
    .order('created_at', { ascending: true });
  if (error) throw error;
  const buckets = new Map<string, RevenuePoint>();
  for (const row of data || []) {
    if (row.status !== 'completed' && row.status !== 'successful') continue;
    const date = new Date(row.created_at);
    const label = period === 'weekly' ? isoWeek(date) : period === 'yearly' ? `${date.getFullYear()}` : period === 'monthly' ? date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }) : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const point = buckets.get(label) || { label, revenue: 0, count: 0 };
    point.revenue += Number(row.amount);
    point.count += 1;
    buckets.set(label, point);
  }
  return [...buckets.values()].map((point) => ({ ...point, revenue: Math.round(point.revenue * 100) / 100 }));
}

const isoWeek = (d: Date) => {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${date.getUTCFullYear()}-W${weekNo}`;
};

export async function fetchCourseAnalytics(): Promise<CourseAnalyticsRow[]> {
  const [courses, payments, enrollments, quizResults, assignments, submissions] = await Promise.all([
    supabase.from('courses').select('id,title'),
    supabase.from('payments').select('course_id,amount,status'),
    supabase.from('enrollments').select('course_id,progress,status'),
    supabase.from('quiz_results').select('course_id,score,total_score,passed'),
    supabase.from('assignments').select('id,course_id'),
    supabase.from('assignment_submissions').select('assignment_id'),
  ]);
  const failedQuery = [courses, payments, enrollments, quizResults, assignments, submissions].find((result) => result.error);
  if (failedQuery?.error) throw failedQuery.error;

  const titles = new Map((courses.data || []).map((course: any) => [course.id, course.title]));
  rememberCourseTitles(courses.data || []);
  const assignmentCourses = new Map((assignments.data || []).map((assignment: any) => [assignment.id, assignment.course_id]));
  return (courses.data || []).map((course: any) => {
    const courseEnrollments = (enrollments.data || []).filter((row: any) => row.course_id === course.id);
    const paidRows = (payments.data || []).filter((row: any) => row.course_id === course.id && (row.status === 'completed' || row.status === 'successful'));
    const courseQuizResults = (quizResults.data || []).filter((row: any) => row.course_id === course.id);
    const courseSubmissions = (submissions.data || []).filter((row: any) => assignmentCourses.get(row.assignment_id) === course.id);
    const completed = courseEnrollments.filter((row: any) => row.status === 'completed' || Number(row.progress) >= 100).length;
    const averageQuizScore = courseQuizResults.length
      ? Math.round((courseQuizResults.reduce((sum: number, row: any) => sum + (Number(row.score) / Math.max(Number(row.total_score), 1)) * 100, 0) / courseQuizResults.length) * 10) / 10
      : 0;

    return {
      courseId: course.id,
      title: titles.get(course.id) || 'Unknown course',
      enrollments: courseEnrollments.length,
      completionRate: courseEnrollments.length ? Math.round((completed / courseEnrollments.length) * 100) : 0,
      avgProgress: courseEnrollments.length ? Math.round((courseEnrollments.reduce((sum: number, row: any) => sum + Number(row.progress || 0), 0) / courseEnrollments.length) * 10) / 10 : 0,
      avgQuizScore: averageQuizScore,
      submissions: courseSubmissions.length,
      passRate: courseQuizResults.length ? Math.round((courseQuizResults.filter((row: any) => row.passed).length / courseQuizResults.length) * 100) : 0,
      revenue: Math.round(paidRows.reduce((sum: number, row: any) => sum + Number(row.amount), 0) * 100) / 100,
    };
  });
}