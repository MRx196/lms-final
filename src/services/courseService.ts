import { supabase } from '@/integrations/supabase/client';
import type { CourseRow, ModuleRow, LessonRow, EnrollmentRow, CategoryRow, InstructorRow, TestimonialRow, LessonProgressRow, PaymentRow } from '@/integrations/supabase/types';

export type CourseWithRelations = CourseRow & {
  category: CategoryRow | null;
  instructor: InstructorRow | null;
};

export type ModuleWithLessons = ModuleRow & {
  lessons: LessonRow[];
};

export type AdminCourseRow = CourseRow & {
  categories: CategoryRow | null;
  instructors: InstructorRow | null;
  enrollment_count: number;
};

/* ── Public methods ── */

export async function getPublishedCourses() {
  const { data, error } = await supabase
    .from('courses')
    .select('*, category:categories(*), instructor:instructors(*)')
    .eq('status', 'published')
    .order('published_at', { ascending: false });

  if (error) throw error;
  return data as CourseWithRelations[];
}

export async function getFeaturedCourses() {
  const { data, error } = await supabase
    .from('courses')
    .select('*, category:categories(*), instructor:instructors(*)')
    .eq('status', 'published')
    .eq('featured', true)
    .order('published_at', { ascending: false })
    .limit(6);

  if (error) throw error;
  return data as CourseWithRelations[];
}

export async function getCourseBySlug(slug: string) {
  const { data, error } = await supabase
    .from('courses')
    .select('*, category:categories(*), instructor:instructors(*)')
    .eq('status', 'published')
    .eq('slug', slug)
    .single();

  if (error) throw error;
  return data as CourseWithRelations;
}

export async function getCourseModulesWithLessons(courseId: string) {
  const { data, error } = await supabase
    .from('modules')
    .select('*, lessons(*)')
    .eq('course_id', courseId)
    .order('sort_order', { ascending: true });

  if (error) throw error;
  return data as ModuleWithLessons[];
}

export async function getCategories() {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('name', { ascending: true });

  if (error) throw error;
  return data as CategoryRow[];
}

export async function getTestimonials() {
  const { data, error } = await supabase
    .from('testimonials')
    .select('*')
    .eq('featured', true)
    .order('sort_order', { ascending: true });

  if (error) throw error;
  return data as TestimonialRow[];
}

/* ── Phase 20: Paginated public query (server-side) ── */

export type PagedResult<T> = {
  data: T[];
  count: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type PagedCoursesParams = {
  page: number;
  pageSize: number;
  search?: string;
  categoryId?: string;
  level?: string;
};

/**
 * Server-side paginated marketplace query. Selects only the columns the card
 * grid renders and uses PostgREST `range()` + `count:'exact'` so we never pull
 * the entire courses table into the client.
 */
export async function getPublishedCoursesPaged({
  page,
  pageSize,
  search,
  categoryId,
  level,
}: PagedCoursesParams): Promise<PagedResult<CourseWithRelations>> {
  let query = supabase
    .from('courses')
    .select('*, category:categories(*), instructor:instructors(*)', { count: 'exact' })
    .eq('status', 'published');

  if (categoryId && categoryId !== 'all') query = query.eq('category_id', categoryId);
  if (level && level !== 'all') query = query.eq('level', level);
  if (search && search.trim()) {
    const term = `%${search.trim().toLowerCase()}%`;
    query = query.or(`title.ilike.${term},subtitle.ilike.${term}`);
  }

  const from = (page - 1) * pageSize;
  const { data, error, count } = await query
    .order('published_at', { ascending: false })
    .range(from, from + pageSize - 1);

  if (error) throw error;
  const total = count ?? 0;
  return {
    data: (data as unknown as CourseWithRelations[]) ?? [],
    count: total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

/* ── Admin methods ── */

export async function getAdminCourses() {
  const { data, error } = await supabase
    .from('courses')
    .select(`
      *,
      categories:category_id(*),
      instructors:instructor_id(*)
    `)
    .order('created_at', { ascending: false });

  if (error) throw error;

  const courses = data as any[];

  // Fetch enrollment counts in parallel
  const courseIds = courses.map((c) => c.id);
  const { data: enrollData, error: enrollError } = await supabase
    .from('enrollments')
    .select('course_id')
    .in('course_id', courseIds);

  if (enrollError) throw enrollError;

  const enrollCounts: Record<string, number> = {};
  for (const e of enrollData || []) {
    enrollCounts[e.course_id] = (enrollCounts[e.course_id] || 0) + 1;
  }

  return courses.map((c) => ({
    ...c,
    enrollment_count: enrollCounts[c.id] || 0,
  })) as AdminCourseRow[];
}

/**
 * Phase 20: server-side paginated admin course list. Only fetches enrollment
 * counts for the current page's course ids, not the whole enrollments table.
 */
export async function getAdminCoursesPaged({
  page,
  pageSize,
  search,
}: {
  page: number;
  pageSize: number;
  search?: string;
}): Promise<PagedResult<AdminCourseRow>> {
  let query = supabase
    .from('courses')
    .select('*, categories:category_id(*), instructors:instructor_id(*)', { count: 'exact' });

  if (search && search.trim()) {
    const term = `%${search.trim().toLowerCase()}%`;
    query = query.or(`title.ilike.${term},slug.ilike.${term}`);
  }

  const from = (page - 1) * pageSize;
  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range(from, from + pageSize - 1);

  if (error) throw error;
  const courses = (data as any[]) ?? [];
  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  if (courses.length === 0) {
    return { data: [], count: total, page, pageSize, totalPages };
  }

  const courseIds = courses.map((c) => c.id);
  const { data: enrollData } = await supabase
    .from('enrollments')
    .select('course_id')
    .in('course_id', courseIds);

  const enrollCounts: Record<string, number> = {};
  for (const e of enrollData || []) {
    enrollCounts[e.course_id] = (enrollCounts[e.course_id] || 0) + 1;
  }

  return {
    data: courses.map((c) => ({
      ...c,
      enrollment_count: enrollCounts[c.id] || 0,
    })) as AdminCourseRow[],
    count: total,
    page,
    pageSize,
    totalPages,
  };
}

export async function getAdminCourseById(id: string) {
  const { data, error } = await supabase
    .from('courses')
    .select(`
      *,
      categories:category_id(*),
      instructors:instructor_id(*)
    `)
    .eq('id', id)
    .single();

  if (error) throw error;
  return data as any;
}

export async function createCourse(courseData: Partial<CourseRow>) {
  const { data, error } = await supabase
    .from('courses')
    .insert(courseData)
    .select()
    .single();

  if (error) throw error;
  return data as CourseRow;
}

export async function updateCourse(id: string, courseData: Partial<CourseRow>) {
  const { data, error } = await supabase
    .from('courses')
    .update(courseData)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as CourseRow;
}

export async function duplicateCourse(id: string) {
  // Fetch original course
  const original = await getAdminCourseById(id);

  // Create a copy with appended title and new slug
  const newSlug = `${original.slug}-copy-${Date.now()}`;
  const insertData: Partial<CourseRow> = {
    title: `${original.title} (Copy)`,
    slug: newSlug,
    subtitle: original.subtitle,
    description: original.description,
    long_description: original.long_description,
    category_id: original.category_id,
    instructor_id: original.instructor_id,
    level: original.level,
    price: original.price,
    original_price: original.original_price,
    currency: original.currency || 'GHS',
    image: original.image,
    duration_hours: original.duration_hours,
    featured: false,
    status: 'draft',
    skills: original.skills,
    tags: original.tags,
    requirements: original.requirements,
    learning_objectives: original.learning_objectives,
  };

  const { data, error } = await supabase
    .from('courses')
    .insert(insertData)
    .select()
    .single();

  if (error) throw error;
  return data as CourseRow;
}

export async function deleteCourse(id: string) {
  const { error } = await supabase
    .from('courses')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function updateCourseStatus(id: string, status: 'draft' | 'published' | 'archived') {
  const updateData: Partial<CourseRow> = { status };
  if (status === 'published') {
    updateData.published_at = new Date().toISOString();
  }
  const { data, error } = await supabase
    .from('courses')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as CourseRow;
}

export async function getInstructors() {
  const { data, error } = await supabase
    .from('instructors')
    .select('*')
    .order('name', { ascending: true });

  if (error) throw error;
  return data as InstructorRow[];
}

export async function getCourseCategories() {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('name', { ascending: true });

  if (error) throw error;
  return data as CategoryRow[];
}

export async function getEnrollmentCount(courseId: string) {
  const { count, error } = await supabase
    .from('enrollments')
    .select('*', { count: 'exact', head: true })
    .eq('course_id', courseId);

  if (error) throw error;
  return count || 0;
}

/* ─── Storage & Enrollment Methods (Phase 5/6) ─── */

export async function enrollStudent(userId: string, courseId: string) {
  const { data, error } = await supabase
    .from('enrollments')
    .insert({ user_id: userId, course_id: courseId })
    .select()
    .single();

  if (error) throw error;
  return data as EnrollmentRow;
}

export async function isEnrolled(userId: string, courseId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('enrollments')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('course_id', courseId);

  if (error) throw error;
  return (data?.length ?? 0) > 0;
}

export async function getLessonProgress(userId: string, lessonId: string) {
  const { data, error } = await supabase
    .from('lesson_progress')
    .select('*')
    .eq('user_id', userId)
    .eq('lesson_id', lessonId)
    .single();

  if (error) throw error;
  return data as LessonProgressRow | null;
}

export async function updateLessonProgress(
  userId: string,
  lessonId: string,
  updates: Partial<LessonProgressRow>,
) {
  const { data, error } = await supabase
    .from('lesson_progress')
    .upsert({
      user_id: userId,
      lesson_id: lessonId,
      ...updates,
    }, { onConflict: 'user_id,lesson_id' })
    .select()
    .single();

  if (error) throw error;
  return data as LessonProgressRow;
}

export async function createLesson(data: Partial<LessonRow>) {
  const { data: result, error } = await supabase
    .from('lessons')
    .insert(data)
    .select()
    .single();

  if (error) throw error;
  return result as LessonRow;
}

export async function updateLesson(id: string, data: Partial<LessonRow>) {
  const { data: result, error } = await supabase
    .from('lessons')
    .update(data)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return result as LessonRow;
}

export async function deleteLesson(id: string) {
  const { error } = await supabase
    .from('lessons')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function updateLessonsOrder(updates: Array<{ id: string; module_id: string; sort_order: number }>) {
  const { error } = await (supabase as any).rpc('update_lessons_sort_order', { p_updates: updates });
  if (error) throw error;
}

export async function createModule(data: Partial<ModuleRow>) {
  const { data: result, error } = await supabase
    .from('modules')
    .insert(data)
    .select()
    .single();

  if (error) throw error;
  return result as ModuleRow;
}

export async function updateModule(id: string, data: Partial<ModuleRow>) {
  const { data: result, error } = await supabase
    .from('modules')
    .update(data)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return result as ModuleRow;
}

export async function deleteModule(id: string) {
  const { error } = await supabase
    .from('modules')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function updateModulesOrder(updates: Array<{ id: string; sort_order: number }>) {
  const { error } = await (supabase as any).rpc('update_modules_sort_order', { p_updates: updates });
  if (error) throw error;
}

export async function getPaymentByReference(reference: string) {
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('transaction_reference', reference)
    .single();

  if (error) return null;
  return data as PaymentRow | null;
}

export async function updatePaymentStatus(paymentId: string, status: string, metadata?: Record<string, unknown>) {
  const { data, error } = await supabase
    .from('payments')
    .update({ status, gateway_response: metadata ?? undefined, paid_at: new Date().toISOString() })
    .eq('id', paymentId)
    .select()
    .single();

  if (error) throw error;
  return data as PaymentRow;
}