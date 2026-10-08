import { supabase } from '@/integrations/supabase/client';
import {
  MOCK_USERS,
  MOCK_ENROLLMENTS,
  MOCK_PAYMENTS,
  MOCK_QUIZZES,
  MOCK_QUIZ_RESULTS,
  MOCK_ASSIGNMENTS,
  MOCK_SUBMISSIONS,
  MOCK_CERTIFICATES,
  SEED_COURSES,
} from '@/data';
import type { User, Enrollment, PaymentTransaction, QuizResult, Assignment, AssignmentSubmission, Certificate, Quiz, Course } from '@/types';

export interface StudentDetail extends User {
  enrollments: Enrollment[];
  payments: PaymentTransaction[];
  quizResults: QuizResult[];
  submissions: AssignmentSubmission[];
  certificates: Certificate[];
  avgScore: number;
  totalSpent: number;
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
  const enrollments = MOCK_ENROLLMENTS.filter((e) => e.userId === studentId);
  const payments = MOCK_PAYMENTS.filter((p) => p.userId === studentId);
  const quizResults = MOCK_QUIZ_RESULTS.filter((r) => r.userId === studentId);
  const submissions = MOCK_SUBMISSIONS.filter((s) => s.studentId === studentId);
  const certificates = MOCK_CERTIFICATES.filter((c) => c.userId === studentId);
  const avgScore = quizResults.length
    ? Math.round((quizResults.reduce((sum, r) => sum + (r.score / r.total), 0) / quizResults.length) * 100)
    : 0;
  const totalSpent = payments.filter((p) => p.status === 'completed').reduce((sum, p) => sum + p.amount, 0);
  return { ...student, enrollments, payments, quizResults, submissions, certificates, avgScore, totalSpent };
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