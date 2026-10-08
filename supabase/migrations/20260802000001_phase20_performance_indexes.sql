-- Phase 20: Performance indexes for hot query paths.
-- All columns verified against information_schema. Idempotent (IF NOT EXISTS).

-- Courses: marketplace filter (status) + ordering (published_at), slug lookups,
-- featured rail, and category/level facets.
CREATE INDEX IF NOT EXISTS idx_courses_status_published_at ON public.courses (status, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_courses_slug ON public.courses (slug);
CREATE INDEX IF NOT EXISTS idx_courses_featured ON public.courses (featured) WHERE featured = true;
CREATE INDEX IF NOT EXISTS idx_courses_category ON public.courses (category_id);
CREATE INDEX IF NOT EXISTS idx_courses_level ON public.courses (level);

-- Enrollments: per-user course list, per-course enrollment counts, dup checks.
CREATE INDEX IF NOT EXISTS idx_enrollments_user ON public.enrollments (user_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_course ON public.enrollments (course_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_user_course ON public.enrollments (user_id, course_id);

-- Payments: admin ledger ordering + per-user history + reference lookups.
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON public.payments (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_user ON public.payments (user_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments (status);
CREATE INDEX IF NOT EXISTS idx_payments_reference ON public.payments (transaction_reference);

-- Curriculum: modules (base table course_modules) + lessons ordered by sort_order.
CREATE INDEX IF NOT EXISTS idx_course_modules_course_sort ON public.course_modules (course_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_lessons_module_sort ON public.lessons (module_id, sort_order);

-- Lesson progress: resume position + completion lookups per user/lesson.
CREATE INDEX IF NOT EXISTS idx_lesson_progress_user_lesson ON public.lesson_progress (user_id, lesson_id);
CREATE INDEX IF NOT EXISTS idx_lesson_progress_lesson ON public.lesson_progress (lesson_id);

-- Course progress: per-user completion.
CREATE INDEX IF NOT EXISTS idx_course_progress_user ON public.course_progress (user_id);
CREATE INDEX IF NOT EXISTS idx_course_progress_user_course ON public.course_progress (user_id, course_id);

-- Profiles: admin student roster (role filter + created_at ordering).
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles (role);
CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON public.profiles (created_at DESC);

-- Audit logs: admin trail ordering + filters.
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs (action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_severity ON public.audit_logs (severity);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON public.audit_logs (entity_type);

-- Notifications: per-user feed ordering.
CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON public.notifications (user_id, created_at DESC);

-- Certificates: verification code lookup.
CREATE INDEX IF NOT EXISTS idx_certificates_code ON public.certificates (certificate_code);

-- Lesson resources: per-lesson listing ordered by sort_order.
CREATE INDEX IF NOT EXISTS idx_lesson_resources_lesson_sort ON public.lesson_resources (lesson_id, sort_order);

-- Quizzes / attempts: assessment hot paths.
CREATE INDEX IF NOT EXISTS idx_quiz_questions_quiz ON public.quiz_questions (quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_options_question ON public.quiz_options (question_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user ON public.quiz_attempts (user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_quiz ON public.quiz_attempts (quiz_id);
