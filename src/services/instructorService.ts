import { supabase } from '@/integrations/supabase/client';

export interface InstructorCourse {
  id: string;
  title: string;
  slug: string;
  status: string;
  price: number;
  currency: string;
  image: string | null;
  level: string | null;
  total_lessons: number | null;
  total_modules: number | null;
  student_count: number | null;
  enrollment_count: number;
  pending_submissions: number;
}

export interface InstructorSubmission {
  id: string;
  assignment_id: string;
  assignment_title: string;
  course_id: string;
  course_title: string;
  student_name: string;
  student_email: string;
  content: string | null;
  file_urls: string[] | null;
  file_names: string[] | null;
  score: number | null;
  feedback: string | null;
  status: string;
  submitted_at: string;
}

/** Resolve the signed-in user's profiles row (instructors are identified by profile_id in course_instructors). */
export async function getMyProfile() {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', auth.user.id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/** Courses assigned to the signed-in instructor via course_instructors (authoritative). */
export async function getMyCourses(): Promise<InstructorCourse[]> {
  const profile = await getMyProfile();
  if (!profile) return [];

  const { data: joins, error: joinError } = await supabase
    .from('course_instructors')
    .select('course_id, role')
    .eq('profile_id', profile.id);
  if (joinError) throw joinError;
  const courseIds = (joins || []).map((j) => j.course_id);
  if (courseIds.length === 0) return [];

  const { data: courses, error } = await supabase
    .from('courses')
    .select('id,title,slug,status,price,currency,image,level,total_lessons,total_modules,student_count')
    .in('id', courseIds)
    .order('created_at', { ascending: false });
  if (error) throw error;

  const enrollments = await supabase
    .from('enrollments')
    .select('course_id')
    .in('course_id', courseIds);

  const enrollCounts: Record<string, number> = {};
  for (const e of enrollments.data || []) {
    enrollCounts[e.course_id] = (enrollCounts[e.course_id] || 0) + 1;
  }

  // pending submissions per course
  const { data: assignments } = await supabase
    .from('assignments')
    .select('id, course_id')
    .in('course_id', courseIds);
  const assignmentCourse = new Map((assignments || []).map((a) => [a.id, a.course_id]));
  const pendingCounts: Record<string, number> = {};
  const { data: subs } = await supabase
    .from('assignment_submissions')
    .select('assignment_id, score, status')
    .in('assignment_id', [...assignmentCourse.keys()]);
  for (const s of subs || []) {
    if (s.score != null) continue;
    const cid = assignmentCourse.get(s.assignment_id);
    if (cid) pendingCounts[cid] = (pendingCounts[cid] || 0) + 1;
  }

  return (courses || []).map((c) => ({
    ...c,
    enrollment_count: enrollCounts[c.id] || 0,
    pending_submissions: pendingCounts[c.id] || 0,
  }));
}

/** All submissions across the instructor's courses, with titles resolved. */
export async function getMySubmissions(): Promise<InstructorSubmission[]> {
  const profile = await getMyProfile();
  if (!profile) return [];

  const { data: joins } = await supabase
    .from('course_instructors')
    .select('course_id')
    .eq('profile_id', profile.id);
  const courseIds = (joins || []).map((j) => j.course_id);
  if (courseIds.length === 0) return [];

  const { data: assignments, error: aErr } = await supabase
    .from('assignments')
    .select('id,title,course_id')
    .in('course_id', courseIds);
  if (aErr) throw aErr;
  const assignmentIds = (assignments || []).map((a) => a.id);
  if (assignmentIds.length === 0) return [];

  const assignmentMap = new Map((assignments || []).map((a) => [a.id, a]));
  const { data: courses } = await supabase.from('courses').select('id,title').in('id', courseIds);
  const courseTitles = new Map((courses || []).map((c) => [c.id, c.title]));

  const { data: subs, error: sErr } = await supabase
    .from('assignment_submissions')
    .select('*')
    .in('assignment_id', assignmentIds)
    .order('submitted_at', { ascending: false });
  if (sErr) throw sErr;
  if (!subs || subs.length === 0) return [];

  const userIds = [...new Set(subs.map((s) => s.user_id))];
  const { data: profiles } = await supabase
    .from('profiles')
    .select('user_id, full_name, email')
    .in('user_id', userIds);
  const profileMap = new Map((profiles || []).map((p) => [p.user_id, p]));

  return subs.map((s) => {
    const a = assignmentMap.get(s.assignment_id);
    const p = profileMap.get(s.user_id);
    const courseId = a?.course_id || '';
    return {
      id: s.id,
      assignment_id: s.assignment_id,
      assignment_title: a?.title || 'Assignment',
      course_id: courseId,
      course_title: courseTitles.get(courseId) || 'Course',
      student_name: p?.full_name || p?.email || 'Student',
      student_email: p?.email || '',
      content: s.content,
      file_urls: s.file_urls,
      file_names: s.file_names,
      score: s.score,
      feedback: s.feedback,
      status: s.status,
      submitted_at: s.submitted_at,
    };
  });
}

/** Grade (or re-grade) a submission. RLS limits this to admins and the course's instructor. */
export async function gradeSubmission(submissionId: string, score: number, feedback: string) {
  const { error } = await supabase
    .from('assignment_submissions')
    .update({
      score,
      feedback: feedback || null,
      status: 'graded',
      graded_at: new Date().toISOString(),
    })
    .eq('id', submissionId);
  if (error) throw error;
}
