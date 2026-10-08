import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/* ─── Types ─── */

export interface AssignmentRow {
  id: string;
  course_id: string;
  module_id: string | null;
  title: string;
  description: string | null;
  instructions: string | null;
  due_date: string | null;
  max_score: number;
  passing_score: number | null;
  allowed_file_types: string[] | null;
  max_file_size_mb: number | null;
  submission_requirements: string | null;
  sort_order: number | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface SubmissionRow {
  id: string;
  assignment_id: string;
  user_id: string;
  content: string | null;
  file_urls: string[] | null;
  file_names: string[] | null;
  score: number | null;
  feedback: string | null;
  status: 'draft' | 'submitted' | 'late' | 'graded' | 'returned';
  submitted_at: string | null;
  graded_at: string | null;
  updated_at: string | null;
}

export interface QuizRow {
  id: string;
  course_id: string;
  module_id: string | null;
  title: string;
  description: string | null;
  time_limit: number | null;
  passing_score: number | null;
  max_attempts: number | null;
  sort_order: number | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface QuizQuestionRow {
  id: string;
  quiz_id: string;
  text: string;
  type: 'multiple_choice' | 'true_false';
  explanation: string | null;
  points: number;
  sort_order: number | null;
  created_at: string | null;
  options?: QuizOptionRow[];
}

export interface QuizOptionRow {
  id: string;
  question_id: string;
  text: string;
  is_correct: boolean;
  sort_order: number | null;
  created_at: string | null;
}

export interface QuizAttemptRow {
  id: string;
  quiz_id: string;
  user_id: string;
  score: number;
  total_points: number;
  passed: boolean | null;
  started_at: string;
  completed_at: string | null;
}

export interface QuizAnswerRow {
  id: string;
  attempt_id: string;
  question_id: string;
  selected_option_id: string | null;
  is_correct: boolean | null;
  points_earned: number | null;
  created_at: string | null;
}

export interface CertificateRow {
  id: string;
  user_id: string;
  course_id: string;
  certificate_code: string;
  issued_at: string;
  expires_at: string | null;
  revoked: boolean;
  created_at: string;
}

export interface CourseRow {
  id: string;
  title: string;
  slug: string;
  image: string | null;
  duration_hours: number | null;
  total_lessons: number | null;
  total_modules: number | null;
}

/* ─── Assignment CRUD ─── */

export async function getAssignments(courseId: string, moduleId?: string) {
  let query = supabase.from('assignments').select('*').eq('course_id', courseId).order('sort_order', { ascending: true });
  if (moduleId) query = query.eq('module_id', moduleId);
  const { data, error } = await query;
  if (error) throw error;
  return data as AssignmentRow[];
}

export async function getAllAssignments() {
  const { data, error } = await supabase
    .from('assignments')
    .select('*, course:courses(title)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as any[];
}

export async function createAssignment(data: Partial<AssignmentRow>) {
  const { data: result, error } = await supabase
    .from('assignments')
    .insert({ ...data, max_score: data.max_score ?? 100 })
    .select()
    .single();
  if (error) throw error;
  return result as AssignmentRow;
}

export async function updateAssignment(id: string, data: Partial<AssignmentRow>) {
  const { data: result, error } = await supabase
    .from('assignments')
    .update(data)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return result as AssignmentRow;
}

export async function deleteAssignment(id: string) {
  const { error } = await supabase.from('assignments').delete().eq('id', id);
  if (error) throw error;
}

/* ─── Submissions ─── */

export async function getSubmission(assignmentId: string, userId: string) {
  const { data, error } = await supabase
    .from('assignment_submissions')
    .select('*')
    .eq('assignment_id', assignmentId)
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return data as SubmissionRow | null;
}

export async function getStudentSubmissions(userId: string) {
  const { data, error } = await supabase
    .from('assignment_submissions')
    .select(`
      *,
      assignment:assignments(
        id, title, description, instructions, due_date, max_score,
        course:courses(title)
      )
    `)
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return data as any[];
}

export async function getGradedSubmissions(assignmentId: string) {
  const { data, error } = await supabase
    .from('assignment_submissions')
    .select(`
      *,
      user:profiles(user_id, full_name, avatar_url)
    `)
    .eq('assignment_id', assignmentId)
    .is('score', null)
    .order('submitted_at', { ascending: true });
  if (error) throw error;
  return data as any[];
}

export async function submitAssignment(
  assignmentId: string,
  userId: string,
  content: string,
  fileUrls: string[],
  fileNames: string[],
) {
  const existing = await getSubmission(assignmentId, userId);
  const isLate = existing?.status === 'submitted' || existing?.status === 'graded';
  const status: SubmissionRow['status'] = isLate ? 'late' : 'submitted';

  if (existing && existing.status === 'draft') {
    const { data, error } = await supabase
      .from('assignment_submissions')
      .update({ content, file_urls: fileUrls, file_names: fileNames, status, submitted_at: new Date().toISOString() })
      .eq('id', existing.id)
      .select()
      .single();
    if (error) throw error;
    return data as SubmissionRow;
  }

  const { data, error } = await supabase
    .from('assignment_submissions')
    .insert({ assignment_id: assignmentId, user_id: userId, content, file_urls: fileUrls, file_names: fileNames, status, submitted_at: new Date().toISOString() })
    .select()
    .single();
  if (error) throw error;
  return data as SubmissionRow;
}

export async function saveDraft(assignmentId: string, userId: string, content: string) {
  const existing = await getSubmission(assignmentId, userId);
  if (existing) {
    const { data, error } = await supabase
      .from('assignment_submissions')
      .update({ content, status: 'draft' })
      .eq('id', existing.id)
      .select()
      .single();
    if (error) throw error;
    return data as SubmissionRow;
  }
  const { data, error } = await supabase
    .from('assignment_submissions')
    .insert({ assignment_id: assignmentId, user_id: userId, content, status: 'draft' })
    .select()
    .single();
  if (error) throw error;
  return data as SubmissionRow;
}

export async function gradeSubmission(
  submissionId: string,
  score: number,
  feedback: string,
) {
  const { data, error } = await supabase
    .from('assignment_submissions')
    .update({ score, feedback, status: 'graded', graded_at: new Date().toISOString() })
    .eq('id', submissionId)
    .select()
    .single();
  if (error) throw error;
  return data as SubmissionRow;
}

export async function returnSubmission(submissionId: string) {
  const { data, error } = await supabase
    .from('assignment_submissions')
    .update({ status: 'returned', score: null, feedback: null })
    .eq('id', submissionId)
    .select()
    .single();
  if (error) throw error;
  return data as SubmissionRow;
}

/* ─── File Upload ─── */

export async function uploadFile(file: File, userId: string, assignmentId: string) {
  const fileName = `${userId}/${assignmentId}/${Date.now()}-${file.name}`;
  const { data, error } = await supabase.storage
    .from('assignment-submissions')
    .upload(fileName, file, { upsert: true });
  if (error) throw error;
  const { data: urlData } = await supabase.storage
    .from('assignment-submissions')
    .getPublicUrl(fileName);
  return urlData.publicUrl;
}

/* ─── Quiz ─── */

export async function getQuizzes(courseId: string) {
  const { data, error } = await supabase
    .from('quizzes')
    .select('*')
    .eq('course_id', courseId)
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return data as QuizRow[];
}

export async function getAllQuizzes() {
  const { data, error } = await supabase
    .from('quizzes')
    .select('*, course:courses(title)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as any[];
}

export async function createQuiz(data: Partial<QuizRow>) {
  const { data: result, error } = await supabase
    .from('quizzes')
    .insert(data)
    .select()
    .single();
  if (error) throw error;
  return result as QuizRow;
}

export async function updateQuiz(id: string, data: Partial<QuizRow>) {
  const { data: result, error } = await supabase
    .from('quizzes')
    .update(data)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return result as QuizRow;
}

export async function deleteQuiz(id: string) {
  const { error } = await supabase.from('quizzes').delete().eq('id', id);
  if (error) throw error;
}

export async function getQuizQuestions(quizId: string) {
  const { data, error } = await supabase
    .from('quiz_questions')
    .select('*, options:quiz_options(*)')
    .eq('quiz_id', quizId)
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return data as QuizQuestionRow[];
}

export async function createQuizQuestion(data: {
  quiz_id: string;
  text: string;
  type: 'multiple_choice' | 'true_false';
  points: number;
  explanation?: string;
  sort_order?: number;
}) {
  const { data: result, error } = await supabase
    .from('quiz_questions')
    .insert(data)
    .select()
    .single();
  if (error) throw error;
  return result as QuizQuestionRow;
}

export async function updateQuizQuestion(
  questionId: string,
  data: Partial<Pick<QuizQuestionRow, 'text' | 'type' | 'points' | 'explanation'>>,
) {
  const { data: result, error } = await supabase
    .from('quiz_questions')
    .update(data)
    .eq('id', questionId)
    .select()
    .single();
  if (error) throw error;
  return result as QuizQuestionRow;
}

export async function deleteQuizQuestion(questionId: string) {
  const { error } = await supabase.from('quiz_questions').delete().eq('id', questionId);
  if (error) throw error;
}

export async function createQuizOption(data: {
  question_id: string;
  text: string;
  is_correct: boolean;
  sort_order?: number;
}) {
  const { data: result, error } = await supabase
    .from('quiz_options')
    .insert(data)
    .select()
    .single();
  if (error) throw error;
  return result as QuizOptionRow;
}

export async function updateQuizOption(
  optionId: string,
  data: Partial<Pick<QuizOptionRow, 'text' | 'is_correct' | 'sort_order'>>,
) {
  const { data: result, error } = await supabase
    .from('quiz_options')
    .update(data)
    .eq('id', optionId)
    .select()
    .single();
  if (error) throw error;
  return result as QuizOptionRow;
}

export async function deleteQuizOption(optionId: string) {
  const { error } = await supabase.from('quiz_options').delete().eq('id', optionId);
  if (error) throw error;
}

/* ─── Quiz Attempts ─── */

export async function getAttemptCount(quizId: string, userId: string) {
  const { count, error } = await supabase
    .from('quiz_attempts')
    .select('*', { count: 'exact', head: true })
    .eq('quiz_id', quizId)
    .eq('user_id', userId);
  if (error) throw error;
  return count || 0;
}

export async function createAttempt(quizId: string, userId: string) {
  const { data, error } = await supabase
    .from('quiz_attempts')
    .insert({ quiz_id: quizId, user_id: userId })
    .select()
    .single();
  if (error) throw error;
  return data as QuizAttemptRow;
}

export async function submitAttempt(
  attemptId: string,
  answers: Array<{ question_id: string; selected_option_id: string | null }>,
  score: number,
  totalPoints: number,
  passed: boolean,
) {
  // Insert individual answers
  for (const ans of answers) {
    await supabase.from('quiz_answers').insert({
      attempt_id: attemptId,
      question_id: ans.question_id,
      selected_option_id: ans.selected_option_id,
    });
  }

  const { data, error } = await supabase
    .from('quiz_attempts')
    .update({ score, total_points: totalPoints, passed, completed_at: new Date().toISOString() })
    .eq('id', attemptId)
    .select()
    .single();
  if (error) throw error;
  return data as QuizAttemptRow;
}

export async function getUserAttempts(quizId: string, userId: string) {
  const { data, error } = await supabase
    .from('quiz_attempts')
    .select('*')
    .eq('quiz_id', quizId)
    .eq('user_id', userId)
    .order('started_at', { ascending: false });
  if (error) throw error;
  return data as QuizAttemptRow[];
}

/* ─── Results / Grades ─── */

export async function getStudentResults(userId: string) {
  const { data: enrollments, error: enrollError } = await supabase
    .from('enrollments')
    .select('course_id')
    .eq('user_id', userId);
  if (enrollError) throw enrollError;

  const courseIds = (enrollments || []).map((e: any) => e.course_id);
  if (courseIds.length === 0) return [];

  const { data: attempts, error: attError } = await supabase
    .from('quiz_attempts')
    .select(`
      *,
      quiz:quizzes(title, course_id)
    `)
    .in('quiz.course_id', courseIds)
    .eq('user_id', userId)
    .order('completed_at', { ascending: false });
  if (attError) throw attError;

  const { data: submissions, error: subError } = await supabase
    .from('assignment_submissions')
    .select(`
      *,
      assignment:assignments(title, max_score, course_id)
    `)
    .in('assignment.course_id', courseIds)
    .eq('user_id', userId)
    .order('graded_at', { ascending: false });
  if (subError) throw subError;

  return { attempts: attempts || [], submissions: submissions || [] };
}

/* ─── Certificates ─── */

export async function generateCertificateCode(): Promise<string> {
  const year = new Date().getFullYear();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `NNH-CERT-${year}-${random}`;
}

export async function createCertificate(userId: string, courseId: string) {
  const code = await generateCertificateCode();
  const { data, error } = await supabase
    .from('certificates')
    .insert({ user_id: userId, course_id: courseId, certificate_code: code })
    .select('*, course:courses(title)')
    .single();
  if (error) throw error;
  return data as any;
}

export async function getUserCertificates(userId: string) {
  const { data, error } = await supabase
    .from('certificates')
    .select('*, course:courses(title, slug, image)')
    .eq('user_id', userId)
    .order('issued_at', { ascending: false });
  if (error) throw error;
  return data as any[];
}

export async function verifyCertificate(code: string) {
  const { data, error } = await supabase
    .from('certificates')
    .select(`
      *,
      user:profiles(full_name),
      course:courses(title, slug, image)
    `)
    .eq('certificate_code', code)
    .eq('revoked', false)
    .single();
  if (error) return null;
  return data as any;
}

export async function getAllCertificates() {
  const { data, error } = await supabase
    .from('certificates')
    .select('*, user:profiles(full_name), course:courses(title)')
    .order('issued_at', { ascending: false });
  if (error) throw error;
  return data as any[];
}

export async function revokeCertificate(certId: string) {
  const { data, error } = await supabase
    .from('certificates')
    .update({ revoked: true })
    .eq('id', certId)
    .select()
    .single();
  if (error) throw error;
  return data;
}
