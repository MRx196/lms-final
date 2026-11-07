import { supabase } from '@/integrations/supabase/client';
import {
  MOCK_USERS,
  MOCK_QUIZZES,
  MOCK_QUIZ_RESULTS,
  MOCK_ASSIGNMENTS,
  MOCK_SUBMISSIONS,
  MOCK_CERTIFICATES,
  SEED_COURSES,
} from '@/data';
import type { User, Enrollment, PaymentTransaction, QuizResult, Assignment, AssignmentSubmission, Certificate, Quiz, Course } from '@/types';

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

const asUser = (p: any, i: number): User => ({
  id: p.id ?? `demo-${i}`,
  email: p.email ?? p.user_email ?? 'student@demo.com',
  name: p.name ?? p.full_name ?? p.user_name ?? 'Student',
  avatar: p.avatar_url ?? p.avatar ?? undefined,
  role: 'student',
  enrolledCourseIds: p.enrolled_course_ids ?? [],
  joinedAt: p.joined_at ?? p.created_at ?? new Date().toISOString(),
  phone: p.phone,
  location: p.location ?? p.country ?? undefined,
  status: p.status ?? 'active',
});

const courseTitle = new Map(SEED_COURSES.map((c: Course) => [c.id, c.title]));
const quizTitle = new Map(MOCK_QUIZZES.map((q: Quiz) => [q.id, q.title]));
const assignmentTitle = new Map(MOCK_ASSIGNMENTS.map((a: Assignment) => [a.id, a.title]));

export async function fetchAllStudents(): Promise<User[]> {
  try {
    const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    if (data && data.length > 0) return data.filter((p) => p.role !== 'admin').map((p, i) => asUser(p, i));
  } catch (err) {
    console.warn('profiles fetch failed — using demo dataset', (err as Error).message);
  }
  return MOCK_USERS.filter((u) => u.role === 'student');
}

export async function fetchStudentDetail(studentId: string): Promise<StudentDetail | null> {
  const all = await fetchAllStudents();
  const student = all.find((u) => u.id === studentId);
  if (!student) return null;

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('user_id')
    .eq('id', studentId)
    .maybeSingle();
  if (profileError) throw profileError;

  if (!profile?.user_id) {
    const quizResults = MOCK_QUIZ_RESULTS.filter((r) => r.userId === studentId);
    const avgScore = quizResults.length
      ? Math.round((quizResults.reduce((sum, r) => sum + (r.score / r.total), 0) / quizResults.length) * 100)
      : 0;
    return {
      ...student,
      enrollments: [],
      payments: [],
      quizResults,
      submissions: MOCK_SUBMISSIONS.filter((s) => s.studentId === studentId),
      certificates: MOCK_CERTIFICATES.filter((c) => c.userId === studentId),
      avgScore,
      totalSpent: 0,
      totalSpentByCurrency: {},
      financialDataAvailable: false,
    };
  }

  const [enrollmentResult, paymentResult] = await Promise.all([
    supabase.from('enrollments').select('*').eq('user_id', profile.user_id),
    supabase.from('payments').select('*').eq('user_id', profile.user_id).order('created_at', { ascending: false }),
  ]);
  if (enrollmentResult.error) throw enrollmentResult.error;
  if (paymentResult.error) throw paymentResult.error;

  const courseIds = [...new Set([
    ...(enrollmentResult.data || []).map((row) => row.course_id),
    ...(paymentResult.data || []).map((row) => row.course_id),
  ])];
  const { data: courses, error: coursesError } = courseIds.length
    ? await supabase.from('courses').select('id,title').in('id', courseIds)
    : { data: [], error: null };
  if (coursesError) throw coursesError;
  const courseTitles = new Map((courses || []).map((course) => [course.id, course.title]));

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
    status: row.status,
    paymentId: row.payment_id || undefined,
  }));
  const payments = (paymentResult.data || []).map((row): PaymentTransaction & { courseTitle: string } => ({
    id: row.id,
    userId: row.user_id,
    courseId: row.course_id,
    courseTitle: courseTitles.get(row.course_id) || 'Unknown course',
    amount: Number(row.amount),
    currency: row.currency || 'GHS',
    status: row.status === 'successful' ? 'completed' : row.status === 'cancelled' ? 'failed' : row.status,
    method: row.method || row.provider || 'Online',
    createdAt: row.created_at,
  }));

  const quizResults = MOCK_QUIZ_RESULTS.filter((r) => r.userId === studentId);
  const submissions = MOCK_SUBMISSIONS.filter((s) => s.studentId === studentId);
  const certificates = MOCK_CERTIFICATES.filter((c) => c.userId === studentId);
  const avgScore = quizResults.length
    ? Math.round((quizResults.reduce((sum, r) => sum + (r.score / r.total), 0) / quizResults.length) * 100)
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
  try {
    const { error } = await supabase.from('profiles').update({ status }).eq('id', studentId);
    if (error) throw error;
  } catch (err) {
    console.warn('status update failed — persisting locally', (err as Error).message);
  }
  localStorage.setItem(`student_status_${studentId}`, status);
}

export const getCourseTitle = (id: string) => courseTitle.get(id) ?? 'Course';
export const getQuizTitle = (id: string) => quizTitle.get(id) ?? 'Quiz';
export const getAssignmentTitle = (id: string) => assignmentTitle.get(id) ?? 'Assignment';