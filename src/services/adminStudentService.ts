import { supabase } from '@/integrations/supabase/client';
import type { User, Enrollment, PaymentTransaction, QuizResult, AssignmentSubmission, Certificate } from '@/types';

export interface StudentDetail extends User {
  enrollments: Array<Enrollment & { courseTitle: string }>;
  payments: Array<PaymentTransaction & { courseTitle: string }>;
  quizResults: QuizResult[];
  submissions: AssignmentSubmission[];
  certificates: Certificate[];
  avgScore: number;
  totalSpent: number;
  totalSpentByCurrency: Record<string, number>;
  financialDataAvailable: boolean;
}

const asUser = (p: any, enrolledCourseIds: string[]): User => ({
  id: p.id ?? p.user_id,
  email: p.email ?? p.user_email ?? 'unknown@student.local',
  name: p.name ?? p.full_name ?? p.user_name ?? 'Student',
  avatar: p.avatar_url ?? p.avatar ?? undefined,
  role: 'student',
  enrolledCourseIds,
  joinedAt: p.joined_at ?? p.created_at ?? new Date().toISOString(),
  phone: p.phone,
  location: p.location ?? p.country ?? undefined,
  status: p.status ?? 'active',
});

/* Title lookup maps — populated from live Supabase rows when data is fetched. */
const courseTitle = new Map<string, string>();
const quizTitle = new Map<string, string>();
const assignmentTitle = new Map<string, string>();

export async function fetchAllStudents(): Promise<User[]> {
  const [profilesResult, enrollmentsResult, coursesResult] = await Promise.all([
    supabase.from('profiles').select('*').order('created_at', { ascending: false }),
    supabase.from('enrollments').select('user_id, course_id'),
    supabase.from('courses').select('id, title'),
  ]);
  if (profilesResult.error) throw profilesResult.error;
  if (enrollmentsResult.error) throw enrollmentsResult.error;
  if (coursesResult.error) throw coursesResult.error;

  courseTitle.clear();
  for (const c of coursesResult.data || []) courseTitle.set(c.id, c.title);

  const courseIdsByUser = new Map<string, string[]>();
  for (const e of enrollmentsResult.data || []) {
    const list = courseIdsByUser.get(e.user_id) || [];
    if (!list.includes(e.course_id)) list.push(e.course_id);
    courseIdsByUser.set(e.user_id, list);
  }

  return (profilesResult.data || [])
    .filter((p) => p.role !== 'admin')
    .map((p) => asUser(p, courseIdsByUser.get(p.user_id) || []));
}

export async function fetchStudentDetail(studentId: string): Promise<StudentDetail | null> {
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', studentId)
    .maybeSingle();
  if (profileError) throw profileError;
  if (!profile) return null;

  const student = asUser(profile, []);
  const authUserId = profile.user_id as string | null;

  if (!authUserId) {
    return {
      ...student,
      enrollments: [],
      payments: [],
      quizResults: [],
      submissions: [],
      certificates: [],
      avgScore: 0,
      totalSpent: 0,
      totalSpentByCurrency: {},
      financialDataAvailable: false,
    };
  }

  const [enrollmentResult, paymentResult, quizResultRows, submissionResult, certificateResult] = await Promise.all([
    supabase.from('enrollments').select('*').eq('user_id', authUserId),
    supabase.from('payments').select('*').eq('user_id', authUserId).order('created_at', { ascending: false }),
    supabase.from('quiz_results').select('*').eq('user_id', authUserId).order('completed_at', { ascending: false }),
    supabase.from('assignment_submissions').select('*, assignment:assignments(id, title)').eq('user_id', authUserId),
    supabase.from('certificates').select('*').eq('user_id', authUserId).order('issued_at', { ascending: false }),
  ]);
  for (const r of [enrollmentResult, paymentResult, quizResultRows, submissionResult, certificateResult]) {
    if (r.error) throw r.error;
  }

  const courseIds = [...new Set([
    ...(enrollmentResult.data || []).map((row) => row.course_id),
    ...(paymentResult.data || []).map((row) => row.course_id),
    ...(certificateResult.data || []).map((row) => row.course_id),
  ])];
  const quizIds = [...new Set((quizResultRows.data || []).map((row) => row.quiz_id).filter(Boolean))] as string[];
  const assignmentIds = [...new Set((submissionResult.data || []).map((row) => row.assignment_id).filter(Boolean))];

  const [coursesResult, quizzesResult, assignmentsResult] = await Promise.all([
    courseIds.length
      ? supabase.from('courses').select('id,title').in('id', courseIds)
      : Promise.resolve({ data: [], error: null }),
    quizIds.length
      ? supabase.from('quizzes').select('id,title').in('id', quizIds)
      : Promise.resolve({ data: [], error: null }),
    assignmentIds.length
      ? supabase.from('assignments').select('id,title').in('id', assignmentIds)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (coursesResult.error) throw coursesResult.error;
  if (quizzesResult.error) throw quizzesResult.error;
  if (assignmentsResult.error) throw assignmentsResult.error;

  const courseTitles = new Map((coursesResult.data || []).map((course) => [course.id, course.title]));
  const quizTitles = new Map((quizzesResult.data || []).map((quiz) => [quiz.id, quiz.title]));
  const assignmentTitles = new Map((assignmentsResult.data || []).map((a) => [a.id, a.title]));
  for (const [id, title] of courseTitles) courseTitle.set(id, title);
  for (const [id, title] of quizTitles) quizTitle.set(id, title);
  for (const [id, title] of assignmentTitles) assignmentTitle.set(id, title);

  const enrollments = (enrollmentResult.data || []).map((row): Enrollment & { courseTitle: string } => ({
    id: row.id,
    userId: row.user_id,
    courseId: row.course_id,
    courseTitle: courseTitles.get(row.course_id) || 'Unknown course',
    enrolledAt: row.enrolled_at,
    progress: Number(row.progress || 0),
    completedLessons: [],
    completedAt: row.completed_at || undefined,
    certificateUrl: row.certificate_url || undefined,
    status: row.status as Enrollment['status'],
    paymentId: row.payment_id || undefined,
  }));
  const payments = (paymentResult.data || []).map((row): PaymentTransaction & { courseTitle: string } => ({
    id: row.id,
    userId: row.user_id,
    courseId: row.course_id,
    courseTitle: courseTitles.get(row.course_id) || 'Unknown course',
    amount: Number(row.amount),
    currency: row.currency || 'GHS',
    status: row.status === 'successful' ? 'completed' : row.status === 'cancelled' ? 'failed' : row.status as PaymentTransaction['status'],
    method: row.method || row.provider || 'Online',
    createdAt: row.created_at,
  }));

  const quizResults: QuizResult[] = (quizResultRows.data || []).map((row) => ({
    id: row.id,
    userId: row.user_id,
    quizId: row.quiz_id || '',
    score: Number(row.score || 0),
    total: Number(row.total_score || 0),
    answers: [],
    completedAt: row.completed_at || row.created_at,
    passed: !!row.passed,
  }));

  const submissions: AssignmentSubmission[] = (submissionResult.data || []).map((row) => ({
    id: row.id,
    studentId: row.user_id,
    assignmentId: row.assignment_id,
    content: row.content || '',
    submittedAt: row.submitted_at,
    score: row.score ?? undefined,
    feedback: row.feedback || undefined,
    status: (row.status as AssignmentSubmission['status']) || 'submitted',
  }));

  const certificates: Certificate[] = (certificateResult.data || []).map((row) => ({
    id: row.id,
    userId: row.user_id,
    courseId: row.course_id,
    issuedAt: row.issued_at,
    certificateId: row.certificate_code || row.id,
    studentName: profile.full_name || profile.email || 'Student',
    courseName: courseTitles.get(row.course_id) || 'Course',
  }));

  const avgScore = quizResults.length
    ? Math.round((quizResults.reduce((sum, r) => sum + (r.total > 0 ? (r.score / r.total) * 100 : 0), 0) / quizResults.length) * 100) / 100
    : 0;
  const totalSpentByCurrency: Record<string, number> = {};
  for (const payment of payments) {
    if (payment.status !== 'completed') continue;
    totalSpentByCurrency[payment.currency] = (totalSpentByCurrency[payment.currency] || 0) + payment.amount;
  }
  const totalSpent = Object.values(totalSpentByCurrency).reduce((sum, value) => sum + value, 0);
  return {
    ...student,
    enrollments,
    payments,
    quizResults,
    submissions,
    certificates,
    avgScore,
    totalSpent,
    totalSpentByCurrency,
    financialDataAvailable: true,
  };
}

export async function setStudentAccountStatus(studentId: string, status: 'active' | 'suspended'): Promise<void> {
  const { error } = await supabase.from('profiles').update({ status }).eq('id', studentId);
  if (error) throw error;
}

export const getCourseTitle = (id: string) => courseTitle.get(id) ?? 'Course';
export const getQuizTitle = (id: string) => quizTitle.get(id) ?? 'Quiz';
export const getAssignmentTitle = (id: string) => assignmentTitle.get(id) ?? 'Assignment';
