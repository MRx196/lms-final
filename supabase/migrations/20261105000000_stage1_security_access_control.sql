-- Stage 1: enforce public signup roles and active-user access at the database.
-- This migration supports both checked-in schema generations without deleting
-- rows. Any unrecognized schema, data value, policy, trigger, or dependency
-- aborts the transaction before security changes are made.
DO $source_preflight$
DECLARE
  v_required RECORD;
  v_policy RECORD;
  v_allowed_policies text[] := ARRAY[
    'profiles_select_own', 'profiles_update_own', 'profiles_admin_all', 'profiles_admin_update',
    'categories_select_public', 'categories_admin_write', 'courses_select_published', 'courses_admin_write',
    'course_instructors_select', 'course_instructors_admin', 'modules_select', 'modules_write',
    'lessons_select', 'lessons_write', 'lesson_resources_select', 'lesson_resources_write',
    'enrollments_select_own', 'enrollments_insert_own', 'enrollments_insert_free_own', 'enrollments_admin_insert', 'enrollments_admin_update',
    'payments_select_own', 'payments_insert_own', 'payments_update_own', 'payments_admin_update',
    'assignments_select', 'assignments_write', 'Students read assignments in enrolled courses', 'Admins can manage assignments',
    'assignment_submissions_select_own', 'assignment_submissions_insert_own', 'assignment_submissions_admin_update',
    'assignment_submissions_update_own_draft', 'Students read own submissions', 'Students insert own submissions',
    'Students update own draft submissions', 'Admins/instructors can view all submissions', 'Admins/instructors can update submissions',
    'quizzes_select', 'quizzes_write', 'Students read quizzes in enrolled courses', 'Admins/instructors manage quizzes',
    'quiz_questions_select', 'quiz_questions_write', 'Students read quiz data',
    'quiz_options_select', 'quiz_options_write', 'Students read quiz options',
    'quiz_attempts_select_own', 'quiz_attempts_insert_own', 'quiz_attempts_admin_update',
    'Students read own attempts', 'Students insert own attempts', 'Admins read all attempts',
    'quiz_answers_select_own', 'quiz_answers_insert_own', 'Students read own answers', 'Students insert own answers',
    'lesson_progress_select_own', 'lesson_progress_insert_own', 'lesson_progress_update_own',
    'course_progress_select_own', 'course_progress_insert_own', 'course_progress_update_own',
    'certificates_select_own', 'certificates_admin_write', 'Students read own certificates', 'Admins read all certificates',
    'notifications_select_own', 'notifications_update_own', 'notifications_admin_insert',
    'audit_logs_admin_select', 'audit_logs_admin_insert', 'Students read own quiz results', 'Students insert own quiz results',
    'quiz_results_select_own',
    'stage1_storage_read_allow', 'stage1_storage_read_guard', 'stage1_storage_write_allow', 'stage1_storage_write_guard',
    'stage1_storage_update_allow', 'stage1_storage_update_guard', 'stage1_storage_delete_allow', 'stage1_storage_delete_guard'
  ];
BEGIN
  IF to_regtype('public.user_role') IS NULL THEN
    RAISE EXCEPTION 'Stage 1 requires public.user_role; reconcile the deployed schema first';
  END IF;
  IF to_regprocedure('auth.uid()') IS NULL
    OR EXISTS (
      SELECT required.role_name
      FROM unnest(ARRAY['anon', 'authenticated', 'service_role']) AS required(role_name)
      WHERE NOT EXISTS (SELECT 1 FROM pg_roles AS r WHERE r.rolname = required.role_name)
    ) THEN
    RAISE EXCEPTION 'Required Supabase auth roles/functions are missing; refusing Stage 1';
  END IF;

  FOR v_required IN
    SELECT * FROM (VALUES
      ('profiles', 'id'), ('profiles', 'user_id'), ('profiles', 'role'), ('profiles', 'status'),
      ('course_categories', 'id'),
      ('courses', 'id'), ('courses', 'status'), ('courses', 'price'), ('courses', 'student_count'),
      ('course_instructors', 'course_id'), ('course_instructors', 'profile_id'),
      ('course_modules', 'id'), ('course_modules', 'course_id'),
      ('lessons', 'id'), ('lessons', 'module_id'), ('lessons', 'is_free_preview'), ('lessons', 'video_url'),
      ('enrollments', 'id'), ('enrollments', 'user_id'), ('enrollments', 'course_id'),
      ('payments', 'id'), ('payments', 'user_id'), ('payments', 'course_id'), ('payments', 'amount'), ('payments', 'status'),
      ('lesson_resources', 'id'), ('lesson_resources', 'lesson_id'),
      ('assignments', 'id'), ('assignments', 'course_id'),
      ('assignment_submissions', 'id'), ('assignment_submissions', 'user_id'), ('assignment_submissions', 'assignment_id'), ('assignment_submissions', 'status'),
      ('quizzes', 'id'), ('quizzes', 'course_id'), ('quizzes', 'passing_score'), ('quizzes', 'max_attempts'),
      ('quiz_questions', 'id'), ('quiz_questions', 'quiz_id'), ('quiz_questions', 'points'),
      ('quiz_options', 'id'), ('quiz_options', 'question_id'), ('quiz_options', 'is_correct'),
      ('quiz_attempts', 'id'), ('quiz_attempts', 'quiz_id'), ('quiz_attempts', 'user_id'),
      ('quiz_attempts', 'score'), ('quiz_attempts', 'total_points'), ('quiz_attempts', 'passed'),
      ('quiz_attempts', 'started_at'), ('quiz_attempts', 'completed_at'), ('quiz_answers', 'attempt_id'),
      ('quiz_answers', 'question_id'), ('quiz_answers', 'selected_option_id'), ('quiz_answers', 'is_correct'), ('quiz_answers', 'points_earned'),
      ('quiz_results', 'user_id'), ('quiz_results', 'course_id'), ('quiz_results', 'score'), ('quiz_results', 'total_score'),
      ('storage', 'objects'), ('storage', 'buckets'), ('auth', 'users')
    ) AS required(table_name, column_name)
  LOOP
    IF v_required.table_name IN ('storage', 'auth') THEN
      IF to_regclass(format('%I.%I', v_required.table_name, v_required.column_name)) IS NULL THEN
        RAISE EXCEPTION 'Stage 1 requires %.%; reconcile schema first', v_required.table_name, v_required.column_name;
      END IF;
    ELSIF to_regclass(format('public.%I', v_required.table_name)) IS NULL
      OR NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = v_required.table_name
          AND column_name = v_required.column_name
      ) THEN
      RAISE EXCEPTION 'Stage 1 requires public.%.%; reconcile schema first', v_required.table_name, v_required.column_name;
    END IF;
  END LOOP;

  IF to_regprocedure('public.is_enrolled(uuid,uuid)') IS NULL
    OR to_regprocedure('public.complete_verified_payment(uuid,text,jsonb,integer,text)') IS NULL
    OR to_regprocedure('public.verify_payment_and_enroll(text)') IS NULL
    OR to_regprocedure('public.check_payment_idempotency(text)') IS NULL
    OR to_regprocedure('storage.foldername(text)') IS NULL THEN
    RAISE EXCEPTION 'Stage 1 payment/storage function dependencies are missing; reconcile schema first';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger AS t
    WHERE t.tgrelid = 'auth.users'::regclass
      AND t.tgname = 'on_auth_user_created'
      AND NOT t.tgisinternal
  ) THEN
    RAISE EXCEPTION 'Stage 1 requires the on_auth_user_created trigger on auth.users';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger AS t
    WHERE t.tgrelid = 'auth.users'::regclass
      AND t.tgname = 'on_auth_user_email_updated'
      AND NOT t.tgisinternal
  ) THEN
    RAISE EXCEPTION 'Stage 1 requires the on_auth_user_email_updated trigger on auth.users';
  END IF;

  FOR v_required IN
    SELECT unnest(ARRAY[
      'profiles', 'course_categories', 'courses', 'course_instructors', 'course_modules', 'lessons',
      'lesson_resources', 'enrollments', 'payments', 'assignments', 'assignment_submissions',
      'quizzes', 'quiz_questions', 'quiz_options', 'quiz_attempts', 'quiz_answers',
      'lesson_progress', 'course_progress', 'certificates', 'notifications', 'audit_logs', 'quiz_results'
    ]) AS table_name
  LOOP
    IF NOT COALESCE((
      SELECT c.relrowsecurity
      FROM pg_class AS c
      JOIN pg_namespace AS n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname = v_required.table_name
    ), false) THEN
      RAISE EXCEPTION 'RLS is not enabled on public.%; refusing to continue', v_required.table_name;
    END IF;
  END LOOP;
  IF NOT COALESCE((
    SELECT c.relrowsecurity FROM pg_class AS c
    JOIN pg_namespace AS n ON n.oid = c.relnamespace
    WHERE n.nspname = 'storage' AND c.relname = 'objects'
  ), false) THEN
    RAISE EXCEPTION 'RLS is not enabled on storage.objects; refusing to continue';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.profiles
    WHERE role IS NULL
      OR role::text NOT IN ('student', 'instructor', 'admin', 'super_admin')
      OR status IS NULL
      OR status::text NOT IN ('active', 'suspended', 'pending')
  ) THEN
    RAISE EXCEPTION 'Null or unexpected profile role/status values exist; no rows were changed';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.payments
    WHERE status::text NOT IN ('pending', 'processing', 'successful', 'completed', 'failed', 'cancelled', 'refunded')
  ) THEN
    RAISE EXCEPTION 'Unexpected payment status values exist; no rows were changed';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.assignment_submissions
    WHERE status::text NOT IN ('draft', 'submitted', 'graded', 'late', 'returned')
  ) THEN
    RAISE EXCEPTION 'Unexpected submission status values exist; no rows were changed';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.enrollments
    WHERE status::text NOT IN ('active', 'completed', 'suspended', 'cancelled', 'refunded', 'revoked')
  ) THEN
    RAISE EXCEPTION 'Unexpected enrollment status values exist; no rows were changed';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM pg_constraint AS c
    WHERE c.contype = 'c'
      AND c.conrelid IN (
        'public.enrollments'::regclass,
        'public.payments'::regclass,
        'public.assignment_submissions'::regclass
      )
      AND c.conkey @> ARRAY[(
        SELECT a.attnum FROM pg_attribute AS a
        WHERE a.attrelid = c.conrelid AND a.attname = 'status' AND NOT a.attisdropped
      )]::smallint[]
      AND c.conname NOT IN (
        'enrollments_status_check', 'payments_status_check', 'assignment_submissions_status_check',
        'enrollments_status_stage1_check', 'payments_status_stage1_check', 'assignment_submissions_status_stage1_check'
      )
  ) THEN
    RAISE EXCEPTION 'Unrecognized status-related CHECK constraint exists; reconcile it before Stage 1';
  END IF;
  FOR v_policy IN
    SELECT schemaname, tablename, policyname FROM pg_policies
    WHERE (schemaname = 'public' AND tablename = ANY (ARRAY[
      'profiles', 'course_categories', 'courses', 'course_instructors', 'course_modules', 'lessons', 'lesson_resources',
      'enrollments', 'payments', 'assignments', 'assignment_submissions', 'quizzes', 'quiz_questions',
      'quiz_options', 'quiz_attempts', 'quiz_answers', 'lesson_progress', 'course_progress',
      'certificates', 'notifications', 'audit_logs', 'quiz_results'
    ])) OR (schemaname = 'storage' AND tablename = 'objects')
  LOOP
    IF NOT (v_policy.policyname = ANY (v_allowed_policies)) THEN
      RAISE EXCEPTION 'Unreviewed RLS policy %.%.% exists; reconcile policy inventory first',
        v_policy.schemaname, v_policy.tablename, v_policy.policyname;
    END IF;
  END LOOP;
END;
$source_preflight$;

-- Add the missing columns from the later checked-in schema without dropping
-- or rewriting any user/course/payment records.
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'GHS';
ALTER TABLE public.enrollments ADD COLUMN IF NOT EXISTS payment_id uuid;
ALTER TABLE public.enrollments ADD COLUMN IF NOT EXISTS status text;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS transaction_reference text;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS provider text;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS provider_reference text;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS transaction_id text;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS customer_email text;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS gateway_response jsonb;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS metadata jsonb;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS method text;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS paid_at timestamptz;
ALTER TABLE public.assignment_submissions ADD COLUMN IF NOT EXISTS file_names text[] NOT NULL DEFAULT '{}';
ALTER TABLE public.assignment_submissions ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.assignment_submissions ADD COLUMN IF NOT EXISTS file_urls text[] NOT NULL DEFAULT '{}';
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS video_storage_path text;
ALTER TABLE public.lesson_resources ADD COLUMN IF NOT EXISTS bucket_name text;
ALTER TABLE public.lesson_resources ADD COLUMN IF NOT EXISTS storage_path text;
ALTER TABLE public.lesson_resources ADD COLUMN IF NOT EXISTS mime_type text;

-- Existing enum/check variants are normalized to text so both migrations
-- preserve their current values while accepting one shared application set.
DO $normalize_status_types$
DECLARE
  v_constraint record;
BEGIN
  FOR v_constraint IN
    SELECT c.conrelid::regclass AS relation_name, c.conname
    FROM pg_constraint AS c
    WHERE c.contype = 'c'
      AND c.conrelid IN (
        'public.enrollments'::regclass,
        'public.payments'::regclass,
        'public.assignment_submissions'::regclass
      )
      AND c.conname IN (
        'enrollments_status_check', 'payments_status_check', 'assignment_submissions_status_check',
        'enrollments_status_stage1_check', 'payments_status_stage1_check', 'assignment_submissions_status_stage1_check'
      )
      AND c.conkey @> ARRAY[(
        SELECT a.attnum
        FROM pg_attribute AS a
        WHERE a.attrelid = c.conrelid AND a.attname = 'status' AND NOT a.attisdropped
      )]::smallint[]
  LOOP
    EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I', v_constraint.relation_name, v_constraint.conname);
  END LOOP;

  ALTER TABLE public.enrollments ALTER COLUMN status DROP DEFAULT;
  ALTER TABLE public.enrollments ALTER COLUMN status TYPE text USING status::text;
  UPDATE public.enrollments SET status = 'active' WHERE status IS NULL;
  ALTER TABLE public.enrollments ALTER COLUMN status SET DEFAULT 'active';
  ALTER TABLE public.enrollments ALTER COLUMN status SET NOT NULL;

  ALTER TABLE public.payments ALTER COLUMN status DROP DEFAULT;
  ALTER TABLE public.payments ALTER COLUMN status TYPE text USING status::text;
  UPDATE public.payments SET status = 'successful' WHERE status = 'completed';
  UPDATE public.payments SET status = 'pending' WHERE status IS NULL;
  ALTER TABLE public.payments ALTER COLUMN status SET DEFAULT 'pending';
  ALTER TABLE public.payments ALTER COLUMN status SET NOT NULL;

  ALTER TABLE public.assignment_submissions ALTER COLUMN status DROP DEFAULT;
  ALTER TABLE public.assignment_submissions ALTER COLUMN status TYPE text USING status::text;
  UPDATE public.assignment_submissions SET status = 'submitted' WHERE status IS NULL;
  ALTER TABLE public.assignment_submissions ALTER COLUMN status SET DEFAULT 'submitted';
  ALTER TABLE public.assignment_submissions ALTER COLUMN status SET NOT NULL;
END;
$normalize_status_types$;

ALTER TABLE public.enrollments DROP CONSTRAINT IF EXISTS enrollments_status_stage1_check;
ALTER TABLE public.enrollments ADD CONSTRAINT enrollments_status_stage1_check
  CHECK (status IN ('active', 'completed', 'suspended', 'cancelled', 'refunded', 'revoked'));
ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_status_stage1_check;
ALTER TABLE public.payments ADD CONSTRAINT payments_status_stage1_check
  CHECK (status IN ('pending', 'processing', 'successful', 'failed', 'cancelled', 'refunded'));
ALTER TABLE public.assignment_submissions DROP CONSTRAINT IF EXISTS assignment_submissions_status_stage1_check;
ALTER TABLE public.assignment_submissions ADD CONSTRAINT assignment_submissions_status_stage1_check
  CHECK (status IN ('draft', 'submitted', 'graded', 'late', 'returned'));

DO $enrollment_payment_fk$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint AS c
    WHERE c.conrelid = 'public.enrollments'::regclass
      AND c.contype = 'f'
      AND c.confrelid = 'public.payments'::regclass
      AND c.conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.enrollments'::regclass AND attname = 'payment_id')]::smallint[]
      AND c.confkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.payments'::regclass AND attname = 'id')]::smallint[]
  ) THEN
    ALTER TABLE public.enrollments
      ADD CONSTRAINT enrollments_payment_id_stage1_fkey
      FOREIGN KEY (payment_id) REFERENCES public.payments(id) ON DELETE SET NULL;
  END IF;
END;
$enrollment_payment_fk$;

DO $final_contract_preflight$
DECLARE
  v_required RECORD;
  v_actual text;
BEGIN
  FOR v_required IN
    SELECT * FROM (VALUES
      ('profiles', 'id', 'uuid'), ('profiles', 'user_id', 'uuid'), ('profiles', 'role', 'user_role'), ('profiles', 'status', 'user_status'),
      ('course_categories', 'id', 'uuid'),
      ('courses', 'id', 'uuid'), ('courses', 'status', 'text'), ('courses', 'price', 'numeric'), ('courses', 'currency', 'text'), ('courses', 'student_count', 'int4'),
      ('course_instructors', 'course_id', 'uuid'), ('course_instructors', 'profile_id', 'uuid'),
      ('course_modules', 'id', 'uuid'), ('course_modules', 'course_id', 'uuid'),
      ('lessons', 'id', 'uuid'), ('lessons', 'module_id', 'uuid'), ('lessons', 'is_free_preview', 'bool'), ('lessons', 'video_url', 'text'), ('lessons', 'video_storage_path', 'text'),
      ('enrollments', 'id', 'uuid'), ('enrollments', 'user_id', 'uuid'), ('enrollments', 'course_id', 'uuid'), ('enrollments', 'payment_id', 'uuid'), ('enrollments', 'status', 'text'),
      ('payments', 'id', 'uuid'), ('payments', 'user_id', 'uuid'), ('payments', 'course_id', 'uuid'), ('payments', 'amount', 'numeric'), ('payments', 'status', 'text'), ('payments', 'currency', 'text'), ('payments', 'transaction_reference', 'text'),
      ('lesson_resources', 'id', 'uuid'), ('lesson_resources', 'lesson_id', 'uuid'), ('lesson_resources', 'url', 'text'), ('lesson_resources', 'bucket_name', 'text'), ('lesson_resources', 'storage_path', 'text'),
      ('assignments', 'id', 'uuid'), ('assignments', 'course_id', 'uuid'),
      ('assignment_submissions', 'id', 'uuid'), ('assignment_submissions', 'user_id', 'uuid'), ('assignment_submissions', 'assignment_id', 'uuid'), ('assignment_submissions', 'status', 'text'), ('assignment_submissions', 'score', 'int4'), ('assignment_submissions', 'feedback', 'text'), ('assignment_submissions', 'file_urls', '_text'),
      ('quizzes', 'id', 'uuid'), ('quizzes', 'course_id', 'uuid'), ('quizzes', 'passing_score', 'int4'), ('quizzes', 'max_attempts', 'int4'),
      ('quiz_questions', 'id', 'uuid'), ('quiz_questions', 'quiz_id', 'uuid'), ('quiz_questions', 'text', 'text'), ('quiz_questions', 'type', 'text'), ('quiz_questions', 'explanation', 'text'), ('quiz_questions', 'points', 'int4'), ('quiz_questions', 'sort_order', 'int4'), ('quiz_questions', 'created_at', 'timestamptz'),
      ('quiz_options', 'id', 'uuid'), ('quiz_options', 'question_id', 'uuid'), ('quiz_options', 'text', 'text'), ('quiz_options', 'is_correct', 'bool'), ('quiz_options', 'sort_order', 'int4'), ('quiz_options', 'created_at', 'timestamptz'),
      ('quiz_attempts', 'id', 'uuid'), ('quiz_attempts', 'quiz_id', 'uuid'), ('quiz_attempts', 'user_id', 'uuid'), ('quiz_attempts', 'score', 'int4'), ('quiz_attempts', 'total_points', 'int4'), ('quiz_attempts', 'passed', 'bool'), ('quiz_attempts', 'started_at', 'timestamptz'), ('quiz_attempts', 'completed_at', 'timestamptz'),
      ('quiz_answers', 'attempt_id', 'uuid'), ('quiz_answers', 'question_id', 'uuid'), ('quiz_answers', 'selected_option_id', 'uuid'), ('quiz_answers', 'is_correct', 'bool'), ('quiz_answers', 'points_earned', 'int4'),
      ('quiz_results', 'user_id', 'uuid'), ('quiz_results', 'course_id', 'uuid'), ('quiz_results', 'score', 'numeric'), ('quiz_results', 'total_score', 'numeric'), ('quiz_results', 'passed', 'bool'), ('quiz_results', 'completed_at', 'timestamptz'),
      ('objects', 'bucket_id', 'text'), ('objects', 'name', 'text'),
      ('buckets', 'id', 'text'), ('buckets', 'name', 'text'), ('buckets', 'public', 'bool'),
      ('users', 'id', 'uuid'), ('users', 'raw_user_meta_data', 'jsonb')
    ) AS required(table_name, column_name, udt_name)
  LOOP
    v_actual := NULL;
    IF v_required.table_name IN ('objects', 'buckets') THEN
      SELECT c.udt_name INTO v_actual
      FROM information_schema.columns AS c
      WHERE c.table_schema = 'storage' AND c.table_name = v_required.table_name
        AND c.column_name = v_required.column_name;
    ELSIF v_required.table_name = 'users' THEN
      SELECT c.udt_name INTO v_actual
      FROM information_schema.columns AS c
      WHERE c.table_schema = 'auth' AND c.table_name = 'users'
        AND c.column_name = v_required.column_name;
    ELSE
      SELECT c.udt_name INTO v_actual
      FROM information_schema.columns AS c
      WHERE c.table_schema = 'public' AND c.table_name = v_required.table_name
        AND c.column_name = v_required.column_name;
    END IF;
    IF v_required.table_name = 'profiles' AND v_required.column_name = 'role' THEN
      IF v_actual NOT IN ('text', 'user_role') THEN
        RAISE EXCEPTION 'Stage 1 expects profiles.role to be text or public.user_role, found %', COALESCE(v_actual, '<missing>');
      END IF;
    ELSIF v_required.table_name = 'profiles' AND v_required.column_name = 'status' THEN
      IF v_actual NOT IN ('text', 'user_status') THEN
        RAISE EXCEPTION 'Stage 1 expects profiles.status to be text or public.user_status, found %', COALESCE(v_actual, '<missing>');
      END IF;
    ELSIF v_actual IS DISTINCT FROM v_required.udt_name THEN
      RAISE EXCEPTION 'Stage 1 expects %.% type %, found %',
        v_required.table_name, v_required.column_name, v_required.udt_name, COALESCE(v_actual, '<missing>');
    END IF;
  END LOOP;

  IF EXISTS (
    SELECT 1 FROM public.payments
    WHERE transaction_reference IS NOT NULL
    GROUP BY transaction_reference HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Duplicate payment references exist; no security policy changes were made';
  END IF;

  FOR v_required IN
    SELECT * FROM (VALUES
      ('public.profiles', 'set_profiles_updated_at'),
      ('public.courses', 'set_courses_updated_at'),
      ('public.course_categories', 'set_course_categories_updated_at'),
      ('public.course_modules', 'set_course_modules_updated_at'),
      ('public.lessons', 'set_lessons_updated_at'),
      ('public.payments', 'set_payments_updated_at'),
      ('public.assignments', 'set_assignments_updated_at'),
      ('public.quizzes', 'set_quizzes_updated_at'),
      ('public.lesson_progress', 'set_lesson_progress_updated_at'),
      ('public.course_progress', 'set_course_progress_updated_at')
    ) AS expected(relation_name, trigger_name)
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_trigger AS t
      WHERE t.tgrelid = to_regclass(v_required.relation_name)
        AND t.tgname = v_required.trigger_name
        AND NOT t.tgisinternal
    ) THEN
      RAISE EXCEPTION 'Required trigger %.% is missing', v_required.relation_name, v_required.trigger_name;
    END IF;
  END LOOP;

  IF to_regprocedure('public.set_updated_at()') IS NULL THEN
    RAISE EXCEPTION 'Required updated_at trigger/function dependency missing';
  END IF;
END;
$final_contract_preflight$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_transaction_reference_stage1
  ON public.payments (transaction_reference) WHERE transaction_reference IS NOT NULL;

-- Align bucket visibility with the client definitions. Private reads below are
-- authorized by object-to-course relationships, not by public bucket URLs.
INSERT INTO storage.buckets (id, name, public) VALUES
  ('course-thumbnails', 'course-thumbnails', true),
  ('course-videos', 'course-videos', false),
  ('course-documents', 'course-documents', false),
  ('lesson-resources', 'lesson-resources', false),
  ('assignment-submissions', 'assignment-submissions', false),
  ('certificates', 'certificates', false),
  ('profile-images', 'profile-images', true)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

-- Public signup metadata is untrusted. Assign fixed values and qualify every
-- application object under the empty search path.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name, role, status)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name', ''),
    'student',
    'active'
  );
  RETURN NEW;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- Return no role for missing, pending, or suspended profiles. Existing role
-- policies use this function, so they now fail closed.
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS public.user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT p.role::text::public.user_role
  FROM public.profiles AS p
  WHERE p.user_id = auth.uid()
    AND p.status::text = 'active'
  LIMIT 1
$function$;

REVOKE EXECUTE ON FUNCTION public.get_user_role() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_user_role() TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.has_course_access(p_course_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT CASE
    WHEN public.get_user_role()::text IN ('admin', 'super_admin') THEN true
    WHEN public.get_user_role()::text = 'instructor' THEN EXISTS (
      SELECT 1
      FROM public.course_instructors AS ci
      JOIN public.profiles AS p ON p.id = ci.profile_id
      WHERE ci.course_id = p_course_id
        AND p.user_id = auth.uid()
        AND p.status::text = 'active'
    )
    WHEN public.get_user_role()::text = 'student' THEN EXISTS (
      SELECT 1
      FROM public.enrollments AS e
      WHERE e.user_id = auth.uid()
        AND e.course_id = p_course_id
        AND e.status::text IN ('active', 'completed')
    )
    ELSE false
  END
$function$;

CREATE OR REPLACE FUNCTION public.can_access_lesson(p_lesson_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.lessons AS l
    JOIN public.course_modules AS m ON m.id = l.module_id
    JOIN public.courses AS c ON c.id = m.course_id
    WHERE l.id = p_lesson_id
      AND (
        (l.is_free_preview IS TRUE AND c.status = 'published')
        OR public.has_course_access(c.id)
      )
  )
$function$;

CREATE OR REPLACE FUNCTION public.can_read_learning_object(p_bucket_id text, p_name text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT CASE
    WHEN p_bucket_id IN ('course-thumbnails', 'profile-images') THEN true
    WHEN public.get_user_role()::text IN ('admin', 'super_admin') THEN true
    WHEN p_bucket_id = 'course-videos' THEN EXISTS (
      SELECT 1
      FROM public.lessons AS l
      WHERE (
        COALESCE(l.video_storage_path, l.video_url) = p_name
        OR (
          regexp_replace(l.video_url, '^.*course-videos/', '') = p_name
          AND l.video_url LIKE '%course-videos/%'
        )
      )
        AND public.can_access_lesson(l.id)
    )
    WHEN p_bucket_id IN ('lesson-resources', 'course-documents') THEN EXISTS (
      SELECT 1
      FROM public.lesson_resources AS r
      WHERE COALESCE(r.bucket_name, p_bucket_id) = p_bucket_id
        AND (
          COALESCE(r.storage_path, r.url) = p_name
          OR regexp_replace(r.url, '^.*' || p_bucket_id || '/', '') = p_name
        )
        AND public.can_access_lesson(r.lesson_id)
    )
    WHEN p_bucket_id = 'assignment-submissions' THEN EXISTS (
      SELECT 1
      FROM public.assignment_submissions AS s
      JOIN public.assignments AS a ON a.id = s.assignment_id
      WHERE s.user_id::text = (storage.foldername(p_name))[1]
        AND a.id::text = (storage.foldername(p_name))[2]
        AND EXISTS (
          SELECT 1
          FROM unnest(COALESCE(s.file_urls, ARRAY[]::text[])) AS f(file_url)
          WHERE f.file_url = p_name
            OR regexp_replace(f.file_url, '^.*assignment-submissions/', '') = p_name
        )
        AND (
          (s.user_id = auth.uid() AND public.get_user_role()::text = 'student'
            AND public.has_course_access(a.course_id))
          OR (public.get_user_role()::text = 'instructor'
            AND public.has_course_access(a.course_id))
        )
    )
    ELSE false
  END
$function$;

CREATE OR REPLACE FUNCTION public.can_write_learning_object(p_bucket_id text, p_name text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT CASE
    WHEN public.get_user_role()::text IN ('admin', 'super_admin') THEN true
    WHEN p_bucket_id = 'profile-images'
      AND public.get_user_role()::text IN ('student', 'instructor')
      AND (storage.foldername(p_name))[1] = auth.uid()::text THEN true
    WHEN p_bucket_id = 'assignment-submissions'
      AND public.get_user_role()::text = 'student'
      AND (storage.foldername(p_name))[1] = auth.uid()::text
      AND EXISTS (
        SELECT 1 FROM public.assignments AS a
        WHERE a.id::text = (storage.foldername(p_name))[2]
          AND public.has_course_access(a.course_id)
      ) THEN true
    ELSE false
  END
$function$;

REVOKE EXECUTE ON FUNCTION public.can_read_learning_object(text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.can_write_learning_object(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_read_learning_object(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.can_write_learning_object(text, text) TO authenticated;

DROP POLICY IF EXISTS stage1_storage_read_allow ON storage.objects;
DROP POLICY IF EXISTS stage1_storage_write_allow ON storage.objects;
DROP POLICY IF EXISTS stage1_storage_update_allow ON storage.objects;
DROP POLICY IF EXISTS stage1_storage_delete_allow ON storage.objects;
CREATE POLICY stage1_storage_read_allow ON storage.objects FOR SELECT
  USING (public.can_read_learning_object(bucket_id, name));
CREATE POLICY stage1_storage_write_allow ON storage.objects FOR INSERT
  WITH CHECK (public.can_write_learning_object(bucket_id, name));
CREATE POLICY stage1_storage_update_allow ON storage.objects FOR UPDATE
  USING (public.can_write_learning_object(bucket_id, name))
  WITH CHECK (public.can_write_learning_object(bucket_id, name));
CREATE POLICY stage1_storage_delete_allow ON storage.objects FOR DELETE
  USING (public.can_write_learning_object(bucket_id, name));

REVOKE EXECUTE ON FUNCTION public.has_course_access(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.can_access_lesson(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_course_access(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_lesson(uuid) TO anon, authenticated;

-- The earlier helper accepted any user ID and revealed enrollment state.
REVOKE EXECUTE ON FUNCTION public.is_enrolled(uuid, uuid)
  FROM PUBLIC, anon, authenticated, service_role;
CREATE OR REPLACE FUNCTION public.is_enrolled(p_course_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT public.has_course_access(p_course_id)
$function$;
REVOKE EXECUTE ON FUNCTION public.is_enrolled(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_enrolled(uuid) TO authenticated;

-- Profile owners cannot grant themselves roles or reactivate suspended rows.
DROP POLICY IF EXISTS profiles_update_own ON public.profiles;
DROP POLICY IF EXISTS profiles_admin_all ON public.profiles;
DROP POLICY IF EXISTS profiles_admin_update ON public.profiles;
CREATE POLICY profiles_update_own ON public.profiles FOR UPDATE
  USING (user_id = auth.uid() AND public.get_user_role() IS NOT NULL)
  WITH CHECK (
    user_id = auth.uid()
    AND role::text = public.get_user_role()::text
    AND status::text = 'active'
  );
  CREATE POLICY profiles_admin_update ON public.profiles FOR UPDATE
    USING (
      public.get_user_role()::text = 'super_admin'
      OR (
        public.get_user_role()::text = 'admin'
        AND role::text NOT IN ('admin', 'super_admin')
        AND user_id <> auth.uid()
      )
    )
    WITH CHECK (
      public.get_user_role()::text = 'super_admin'
      OR (
        public.get_user_role()::text = 'admin'
        AND role::text NOT IN ('admin', 'super_admin')
        AND user_id <> auth.uid()
      )
    );

-- A user may create only a free-course enrollment. Paid-course enrollments
-- must be created by a trusted payment operation; admins may grant access.
DROP POLICY IF EXISTS enrollments_insert_own ON public.enrollments;
DROP POLICY IF EXISTS enrollments_insert_free_own ON public.enrollments;
DROP POLICY IF EXISTS enrollments_admin_insert ON public.enrollments;
CREATE POLICY enrollments_insert_free_own ON public.enrollments FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND public.get_user_role()::text = 'student'
    AND EXISTS (
      SELECT 1 FROM public.courses AS c
      WHERE c.id = enrollments.course_id
        AND c.status = 'published'
        AND c.price = 0
    )
  );

DROP POLICY IF EXISTS profiles_select_own ON public.profiles;
CREATE POLICY profiles_select_own ON public.profiles FOR SELECT
  USING (
    user_id = auth.uid()
    OR public.get_user_role()::text IN ('admin', 'super_admin')
    OR (
      public.get_user_role()::text = 'instructor'
      AND EXISTS (
        SELECT 1 FROM public.enrollments AS e
        WHERE e.user_id = profiles.user_id
          AND public.has_course_access(e.course_id)
      )
    )
  );

DROP POLICY IF EXISTS courses_admin_write ON public.courses;
CREATE POLICY courses_admin_write ON public.courses FOR ALL
  USING (
    public.get_user_role()::text IN ('admin', 'super_admin')
    OR (public.get_user_role()::text = 'instructor' AND public.has_course_access(id))
  )
  WITH CHECK (
    public.get_user_role()::text IN ('admin', 'super_admin')
    OR (public.get_user_role()::text = 'instructor' AND public.has_course_access(id))
  );

DROP POLICY IF EXISTS modules_write ON public.course_modules;
CREATE POLICY modules_write ON public.course_modules FOR ALL
  USING (
    public.get_user_role()::text IN ('admin', 'super_admin')
    OR (public.get_user_role()::text = 'instructor' AND public.has_course_access(course_id))
  )
  WITH CHECK (
    public.get_user_role()::text IN ('admin', 'super_admin')
    OR (public.get_user_role()::text = 'instructor' AND public.has_course_access(course_id))
  );

DROP POLICY IF EXISTS lessons_write ON public.lessons;
CREATE POLICY lessons_write ON public.lessons FOR ALL
  USING (
    public.get_user_role()::text IN ('admin', 'super_admin')
    OR (
      public.get_user_role()::text = 'instructor'
      AND EXISTS (
        SELECT 1 FROM public.course_modules AS m
        WHERE m.id = lessons.module_id AND public.has_course_access(m.course_id)
      )
    )
  )
  WITH CHECK (
    public.get_user_role()::text IN ('admin', 'super_admin')
    OR (
      public.get_user_role()::text = 'instructor'
      AND EXISTS (
        SELECT 1 FROM public.course_modules AS m
        WHERE m.id = lessons.module_id AND public.has_course_access(m.course_id)
      )
    )
  );

DROP POLICY IF EXISTS lesson_resources_write ON public.lesson_resources;
CREATE POLICY lesson_resources_write ON public.lesson_resources FOR ALL
  USING (
    public.get_user_role()::text IN ('admin', 'super_admin')
    OR (
      public.get_user_role()::text = 'instructor'
      AND EXISTS (
        SELECT 1 FROM public.lessons AS l
        JOIN public.course_modules AS m ON m.id = l.module_id
        WHERE l.id = lesson_resources.lesson_id AND public.has_course_access(m.course_id)
      )
    )
  )
  WITH CHECK (
    public.get_user_role()::text IN ('admin', 'super_admin')
    OR (
      public.get_user_role()::text = 'instructor'
      AND EXISTS (
        SELECT 1 FROM public.lessons AS l
        JOIN public.course_modules AS m ON m.id = l.module_id
        WHERE l.id = lesson_resources.lesson_id AND public.has_course_access(m.course_id)
      )
    )
  );
CREATE POLICY enrollments_admin_insert ON public.enrollments FOR INSERT
  WITH CHECK (public.get_user_role()::text IN ('admin', 'super_admin'));
DROP POLICY IF EXISTS enrollments_select_own ON public.enrollments;
CREATE POLICY enrollments_select_own ON public.enrollments FOR SELECT
  USING (
    public.get_user_role() IS NOT NULL
    AND (
      user_id = auth.uid()
      OR public.get_user_role()::text IN ('admin', 'super_admin')
      OR (public.get_user_role()::text = 'instructor' AND public.has_course_access(course_id))
    )
  );

-- Students can create pending payment intents only, never mark them paid.
DROP POLICY IF EXISTS payments_insert_own ON public.payments;
DROP POLICY IF EXISTS payments_update_own ON public.payments;
DROP POLICY IF EXISTS payments_select_own ON public.payments;
CREATE POLICY payments_insert_own ON public.payments FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND public.get_user_role()::text = 'student'
    AND status::text = 'pending'
    AND EXISTS (
      SELECT 1 FROM public.courses AS c
      WHERE c.id = payments.course_id
        AND c.status = 'published'
        AND c.price = payments.amount
    )
  );
CREATE POLICY payments_select_own ON public.payments FOR SELECT
  USING (
    public.get_user_role() IS NOT NULL
    AND (user_id = auth.uid() OR public.get_user_role()::text IN ('admin', 'super_admin'))
  );

-- No client may call the legacy status-changing payment RPCs. A future trusted
-- provider integration must explicitly grant only the verified server path.
REVOKE EXECUTE ON FUNCTION public.complete_verified_payment(uuid, text, jsonb, integer, text)
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.verify_payment_and_enroll(text)
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.check_payment_idempotency(text)
  FROM PUBLIC, anon, authenticated, service_role;

-- Idempotent enrollment RPC: only the active owner of a verified payment can
-- consume it. Status can no longer be changed by the browser policies above.
CREATE OR REPLACE FUNCTION public.enroll_from_verified_payment(p_payment_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_payment public.payments%ROWTYPE;
  v_enrollment public.enrollments%ROWTYPE;
  v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL OR public.get_user_role()::text IS DISTINCT FROM 'student' THEN
    RETURN json_build_object('error', 'Not authorized');
  END IF;

  SELECT * INTO v_payment
  FROM public.payments
  WHERE id = p_payment_id
  FOR UPDATE;

  IF NOT FOUND OR v_payment.user_id IS DISTINCT FROM v_user_id THEN
    RETURN json_build_object('error', 'Payment not found');
  END IF;
  IF v_payment.status::text NOT IN ('successful', 'completed') THEN
    RETURN json_build_object('error', 'Payment is not verified');
  END IF;

  SELECT * INTO v_enrollment
  FROM public.enrollments
  WHERE user_id = v_user_id AND course_id = v_payment.course_id
  LIMIT 1;

  IF FOUND THEN
    RETURN json_build_object(
      'success', true,
      'enrollment_id', v_enrollment.id,
      'payment_id', v_payment.id,
      'already_enrolled', true
    );
  END IF;

  INSERT INTO public.enrollments (user_id, course_id, payment_id, status, enrolled_at)
  VALUES (v_user_id, v_payment.course_id, p_payment_id, 'active', now())
  RETURNING * INTO v_enrollment;

  UPDATE public.courses
  SET student_count = COALESCE(student_count, 0) + 1
  WHERE id = v_payment.course_id;

  RETURN json_build_object(
    'success', true,
    'enrollment_id', v_enrollment.id,
    'payment_id', v_payment.id,
    'already_enrolled', false
  );
END;
$function$;
REVOKE EXECUTE ON FUNCTION public.enroll_from_verified_payment(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.enroll_from_verified_payment(uuid) TO authenticated;

-- RLS for course content and assessments. Existing permissive policies are
-- removed because permissive policies combine with OR.
DROP POLICY IF EXISTS courses_select_published ON public.courses;
CREATE POLICY courses_select_published ON public.courses FOR SELECT
  USING (
    status = 'published'
    OR public.get_user_role()::text IN ('admin', 'super_admin')
    OR (public.get_user_role()::text = 'instructor' AND public.has_course_access(id))
  );

DROP POLICY IF EXISTS lessons_select ON public.lessons;
CREATE POLICY lessons_select ON public.lessons FOR SELECT
  USING (public.can_access_lesson(id));

DROP POLICY IF EXISTS lesson_resources_select ON public.lesson_resources;
CREATE POLICY lesson_resources_select ON public.lesson_resources FOR SELECT
  USING (public.can_access_lesson(lesson_id));

DROP POLICY IF EXISTS assignments_select ON public.assignments;
DROP POLICY IF EXISTS "Students read assignments in enrolled courses" ON public.assignments;
DROP POLICY IF EXISTS "Admins can manage assignments" ON public.assignments;
DROP POLICY IF EXISTS assignments_write ON public.assignments;
CREATE POLICY assignments_select ON public.assignments FOR SELECT
  USING (
    public.has_course_access(course_id)
  );
CREATE POLICY assignments_write ON public.assignments FOR ALL
  USING (
    public.get_user_role()::text IN ('admin', 'super_admin')
    OR (public.get_user_role()::text = 'instructor' AND public.has_course_access(course_id))
  )
  WITH CHECK (
    public.get_user_role()::text IN ('admin', 'super_admin')
    OR (public.get_user_role()::text = 'instructor' AND public.has_course_access(course_id))
  );

DROP POLICY IF EXISTS quizzes_select ON public.quizzes;
DROP POLICY IF EXISTS "Students read quizzes in enrolled courses" ON public.quizzes;
DROP POLICY IF EXISTS "Admins/instructors manage quizzes" ON public.quizzes;
DROP POLICY IF EXISTS quizzes_write ON public.quizzes;
CREATE POLICY quizzes_select ON public.quizzes FOR SELECT
  USING (public.has_course_access(course_id));
CREATE POLICY quizzes_write ON public.quizzes FOR ALL
  USING (
    public.get_user_role()::text IN ('admin', 'super_admin')
    OR (public.get_user_role()::text = 'instructor' AND public.has_course_access(course_id))
  )
  WITH CHECK (
    public.get_user_role()::text IN ('admin', 'super_admin')
    OR (public.get_user_role()::text = 'instructor' AND public.has_course_access(course_id))
  );

DROP POLICY IF EXISTS quiz_questions_select ON public.quiz_questions;
DROP POLICY IF EXISTS "Students read quiz data" ON public.quiz_questions;
DROP POLICY IF EXISTS quiz_questions_write ON public.quiz_questions;
CREATE POLICY quiz_questions_select ON public.quiz_questions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.quizzes AS q
      WHERE q.id = quiz_questions.quiz_id
        AND public.has_course_access(q.course_id)
    )
  );
CREATE POLICY quiz_questions_write ON public.quiz_questions FOR ALL
  USING (
    public.get_user_role()::text IN ('admin', 'super_admin')
    OR EXISTS (
      SELECT 1 FROM public.quizzes AS q
      WHERE q.id = quiz_questions.quiz_id
        AND public.get_user_role()::text = 'instructor'
        AND public.has_course_access(q.course_id)
    )
  )
  WITH CHECK (
    public.get_user_role()::text IN ('admin', 'super_admin')
    OR EXISTS (
      SELECT 1 FROM public.quizzes AS q
      WHERE q.id = quiz_questions.quiz_id
        AND public.get_user_role()::text = 'instructor'
        AND public.has_course_access(q.course_id)
    )
  );

DROP POLICY IF EXISTS quiz_options_select ON public.quiz_options;
DROP POLICY IF EXISTS "Students read quiz options" ON public.quiz_options;
DROP POLICY IF EXISTS quiz_options_write ON public.quiz_options;
CREATE POLICY quiz_options_select ON public.quiz_options FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.quiz_questions AS qq
      JOIN public.quizzes AS q ON q.id = qq.quiz_id
      WHERE qq.id = quiz_options.question_id
        AND public.has_course_access(q.course_id)
    )
  );
CREATE POLICY quiz_options_write ON public.quiz_options FOR ALL
  USING (
    public.get_user_role()::text IN ('admin', 'super_admin')
    OR EXISTS (
      SELECT 1
      FROM public.quiz_questions AS qq
      JOIN public.quizzes AS q ON q.id = qq.quiz_id
      WHERE qq.id = quiz_options.question_id
        AND public.get_user_role()::text = 'instructor'
        AND public.has_course_access(q.course_id)
    )
  )
  WITH CHECK (
    public.get_user_role()::text IN ('admin', 'super_admin')
    OR EXISTS (
      SELECT 1
      FROM public.quiz_questions AS qq
      JOIN public.quizzes AS q ON q.id = qq.quiz_id
      WHERE qq.id = quiz_options.question_id
        AND public.get_user_role()::text = 'instructor'
        AND public.has_course_access(q.course_id)
    )
  );

-- Column grants keep correctness flags and explanations server-side even for
-- enrolled students. Administrators retrieve them through a role-checked RPC.
REVOKE SELECT ON TABLE public.quiz_questions FROM PUBLIC, anon, authenticated;
REVOKE SELECT (explanation) ON TABLE public.quiz_questions FROM PUBLIC, anon, authenticated;
GRANT SELECT (id, quiz_id, text, type, points, sort_order, created_at)
  ON TABLE public.quiz_questions TO authenticated;
REVOKE SELECT ON TABLE public.quiz_options FROM PUBLIC, anon, authenticated;
REVOKE SELECT (is_correct) ON TABLE public.quiz_options FROM PUBLIC, anon, authenticated;
GRANT SELECT (id, question_id, text, sort_order, created_at)
  ON TABLE public.quiz_options TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_get_quiz_questions(p_quiz_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_result jsonb;
  v_course_id uuid;
BEGIN
  SELECT q.course_id INTO v_course_id
  FROM public.quizzes AS q
  WHERE q.id = p_quiz_id;

  IF NOT FOUND OR NOT COALESCE(
    public.get_user_role()::text IN ('admin', 'super_admin')
    OR (public.get_user_role()::text = 'instructor' AND public.has_course_access(v_course_id)),
    false
  ) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', q.id,
        'quiz_id', q.quiz_id,
        'text', q.text,
        'type', q.type,
        'explanation', q.explanation,
        'points', q.points,
        'sort_order', q.sort_order,
        'created_at', q.created_at,
        'options', COALESCE(o.options, '[]'::jsonb)
      ) ORDER BY q.sort_order
    ),
    '[]'::jsonb
  ) INTO v_result
  FROM public.quiz_questions AS q
  LEFT JOIN LATERAL (
    SELECT jsonb_agg(
      jsonb_build_object(
        'id', qo.id,
        'question_id', qo.question_id,
        'text', qo.text,
        'is_correct', qo.is_correct,
        'sort_order', qo.sort_order,
        'created_at', qo.created_at
      ) ORDER BY qo.sort_order
    ) AS options
    FROM public.quiz_options AS qo
    WHERE qo.question_id = q.id
  ) AS o ON true
  WHERE q.quiz_id = p_quiz_id;

  RETURN v_result;
END;
$function$;
REVOKE EXECUTE ON FUNCTION public.admin_get_quiz_questions(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_get_quiz_questions(uuid) TO authenticated;

-- Student attempts must belong to an active enrollment, obey max_attempts,
-- and be scored atomically using the answer key held in the database.
CREATE OR REPLACE FUNCTION public.start_quiz_attempt(p_quiz_id uuid)
RETURNS public.quiz_attempts
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_quiz public.quizzes%ROWTYPE;
  v_attempt public.quiz_attempts%ROWTYPE;
  v_attempt_count integer;
BEGIN
  IF auth.uid() IS NULL OR public.get_user_role()::text IS DISTINCT FROM 'student' THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT * INTO v_quiz
  FROM public.quizzes
  WHERE id = p_quiz_id
  FOR UPDATE;
  IF NOT FOUND OR NOT public.has_course_access(v_quiz.course_id) THEN
    RAISE EXCEPTION 'Course access required';
  END IF;

  SELECT count(*) INTO v_attempt_count
  FROM public.quiz_attempts
  WHERE quiz_id = p_quiz_id AND user_id = auth.uid();
  IF v_attempt_count >= COALESCE(v_quiz.max_attempts, 3) THEN
    RAISE EXCEPTION 'Maximum attempts reached';
  END IF;

  INSERT INTO public.quiz_attempts (quiz_id, user_id)
  VALUES (p_quiz_id, auth.uid())
  RETURNING * INTO v_attempt;
  RETURN v_attempt;
END;
$function$;
REVOKE EXECUTE ON FUNCTION public.start_quiz_attempt(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.start_quiz_attempt(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.submit_quiz_attempt(
  p_attempt_id uuid,
  p_answers jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_attempt public.quiz_attempts%ROWTYPE;
  v_course_id uuid;
  v_passing_score numeric;
  v_question RECORD;
  v_selected_option_id uuid;
  v_is_correct boolean;
  v_points integer;
  v_score integer := 0;
  v_total integer := 0;
  v_passed boolean;
BEGIN
  IF auth.uid() IS NULL OR public.get_user_role()::text IS DISTINCT FROM 'student' THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  IF jsonb_typeof(p_answers) <> 'array' THEN
    RAISE EXCEPTION 'Answers must be an array';
  END IF;

  SELECT * INTO v_attempt
  FROM public.quiz_attempts
  WHERE id = p_attempt_id
  FOR UPDATE;
  IF NOT FOUND OR v_attempt.user_id <> auth.uid() THEN
    RAISE EXCEPTION 'Attempt not found';
  END IF;
  IF v_attempt.completed_at IS NOT NULL THEN
    RAISE EXCEPTION 'Attempt already submitted';
  END IF;

  SELECT q.course_id, COALESCE(q.passing_score, 70)
  INTO v_course_id, v_passing_score
  FROM public.quizzes AS q
  WHERE q.id = v_attempt.quiz_id;
  IF NOT FOUND OR NOT public.has_course_access(v_course_id) THEN
    RAISE EXCEPTION 'Course access required';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(p_answers) AS a(value)
    LEFT JOIN public.quiz_questions AS qq
      ON qq.id = (a.value ->> 'question_id')::uuid
    WHERE qq.id IS NULL OR qq.quiz_id <> v_attempt.quiz_id
  ) THEN
    RAISE EXCEPTION 'Answer contains a question outside this quiz';
  END IF;

  IF EXISTS (
    SELECT a.value ->> 'question_id'
    FROM jsonb_array_elements(p_answers) AS a(value)
    GROUP BY a.value ->> 'question_id'
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Duplicate question answers are not allowed';
  END IF;

  FOR v_question IN
    SELECT qq.id, COALESCE(qq.points, 0)::integer AS points
    FROM public.quiz_questions AS qq
    WHERE qq.quiz_id = v_attempt.quiz_id
    ORDER BY qq.sort_order
  LOOP
    v_selected_option_id := NULL;
    SELECT NULLIF(a.value ->> 'selected_option_id', '')::uuid
    INTO v_selected_option_id
    FROM jsonb_array_elements(p_answers) AS a(value)
    WHERE a.value ->> 'question_id' = v_question.id::text
    LIMIT 1;

    v_is_correct := false;
    IF v_selected_option_id IS NOT NULL THEN
      SELECT qo.is_correct INTO v_is_correct
      FROM public.quiz_options AS qo
      WHERE qo.id = v_selected_option_id
        AND qo.question_id = v_question.id;
      IF NOT FOUND THEN
        RAISE EXCEPTION 'Selected option does not belong to its question';
      END IF;
    END IF;

    v_points := CASE WHEN v_is_correct THEN v_question.points ELSE 0 END;
    v_total := v_total + v_question.points;
    v_score := v_score + v_points;

    INSERT INTO public.quiz_answers (
      attempt_id, question_id, selected_option_id, is_correct, points_earned
    ) VALUES (
      p_attempt_id, v_question.id, v_selected_option_id, v_is_correct, v_points
    )
    ON CONFLICT (attempt_id, question_id) DO UPDATE SET
      selected_option_id = EXCLUDED.selected_option_id,
      is_correct = EXCLUDED.is_correct,
      points_earned = EXCLUDED.points_earned;
  END LOOP;

  IF v_total <= 0 THEN
    RAISE EXCEPTION 'Quiz has no scorable questions';
  END IF;
  v_passed := v_score::numeric * 100 >= v_total::numeric * v_passing_score;

  UPDATE public.quiz_attempts
  SET score = v_score,
      total_points = v_total,
      passed = v_passed,
      completed_at = now()
  WHERE id = p_attempt_id;

  INSERT INTO public.quiz_results (user_id, course_id, score, total_score, passed, completed_at)
  VALUES (auth.uid(), v_course_id, v_score, v_total, v_passed, now());

  RETURN jsonb_build_object(
    'id', v_attempt.id,
    'quiz_id', v_attempt.quiz_id,
    'user_id', v_attempt.user_id,
    'score', v_score,
    'total_points', v_total,
    'passed', v_passed,
    'started_at', v_attempt.started_at,
    'completed_at', now()
  );
END;
$function$;
REVOKE EXECUTE ON FUNCTION public.submit_quiz_attempt(uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_quiz_attempt(uuid, jsonb) TO authenticated;

-- Old migration policies allowed direct attempt/answer writes. Drop every
-- checked-in name and revoke table DML; the SECURITY DEFINER RPCs above are
-- the only student write paths.
DROP POLICY IF EXISTS quiz_attempts_select_own ON public.quiz_attempts;
DROP POLICY IF EXISTS quiz_attempts_insert_own ON public.quiz_attempts;
DROP POLICY IF EXISTS quiz_attempts_admin_update ON public.quiz_attempts;
DROP POLICY IF EXISTS "Students read own attempts" ON public.quiz_attempts;
DROP POLICY IF EXISTS "Students insert own attempts" ON public.quiz_attempts;
DROP POLICY IF EXISTS "Admins read all attempts" ON public.quiz_attempts;
CREATE POLICY quiz_attempts_select_own ON public.quiz_attempts FOR SELECT
  USING (
    (user_id = auth.uid() AND public.get_user_role()::text = 'student')
    OR EXISTS (
      SELECT 1 FROM public.quizzes AS q
      WHERE q.id = quiz_attempts.quiz_id
        AND (
          public.get_user_role()::text IN ('admin', 'super_admin')
          OR (public.get_user_role()::text = 'instructor' AND public.has_course_access(q.course_id))
        )
    )
  );

DROP POLICY IF EXISTS quiz_answers_select_own ON public.quiz_answers;
DROP POLICY IF EXISTS quiz_answers_insert_own ON public.quiz_answers;
DROP POLICY IF EXISTS "Students read own answers" ON public.quiz_answers;
DROP POLICY IF EXISTS "Students insert own answers" ON public.quiz_answers;
CREATE POLICY quiz_answers_select_own ON public.quiz_answers FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.quiz_attempts AS qa
      WHERE qa.id = quiz_answers.attempt_id
        AND qa.user_id = auth.uid()
        AND public.get_user_role()::text = 'student'
    )
    OR EXISTS (
      SELECT 1
      FROM public.quiz_attempts AS qa
      JOIN public.quizzes AS q ON q.id = qa.quiz_id
      WHERE qa.id = quiz_answers.attempt_id
        AND (
          public.get_user_role()::text IN ('admin', 'super_admin')
          OR (public.get_user_role()::text = 'instructor' AND public.has_course_access(q.course_id))
        )
    )
  );

REVOKE INSERT, UPDATE, DELETE ON TABLE public.quiz_attempts FROM PUBLIC, anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.quiz_answers FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.quiz_attempts, public.quiz_answers TO authenticated;

-- Remove direct answer insertion and prevent inactive users from reading or
-- mutating their own learning records.
DROP POLICY IF EXISTS assignment_submissions_select_own ON public.assignment_submissions;
DROP POLICY IF EXISTS assignment_submissions_insert_own ON public.assignment_submissions;
DROP POLICY IF EXISTS assignment_submissions_admin_update ON public.assignment_submissions;
DROP POLICY IF EXISTS "Students read own submissions" ON public.assignment_submissions;
DROP POLICY IF EXISTS "Students insert own submissions" ON public.assignment_submissions;
DROP POLICY IF EXISTS "Students update own draft submissions" ON public.assignment_submissions;
DROP POLICY IF EXISTS "Admins/instructors can view all submissions" ON public.assignment_submissions;
DROP POLICY IF EXISTS "Admins/instructors can update submissions" ON public.assignment_submissions;
CREATE POLICY assignment_submissions_select_own ON public.assignment_submissions FOR SELECT
  USING (
    (user_id = auth.uid() AND public.get_user_role()::text = 'student')
    OR public.get_user_role()::text IN ('admin', 'super_admin')
    OR EXISTS (
      SELECT 1 FROM public.assignments AS a
      WHERE a.id = assignment_submissions.assignment_id
        AND public.get_user_role()::text = 'instructor'
        AND public.has_course_access(a.course_id)
    )
  );
CREATE POLICY assignment_submissions_insert_own ON public.assignment_submissions FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND public.get_user_role()::text = 'student'
    AND status::text IN ('draft', 'submitted', 'late')
    AND score IS NULL
    AND feedback IS NULL
    AND EXISTS (
      SELECT 1 FROM public.assignments AS a
      WHERE a.id = assignment_submissions.assignment_id
        AND public.has_course_access(a.course_id)
    )
  );
CREATE POLICY assignment_submissions_update_own_draft ON public.assignment_submissions FOR UPDATE
  USING (
    user_id = auth.uid()
    AND public.get_user_role()::text = 'student'
    AND status::text IN ('draft', 'submitted', 'late')
    AND EXISTS (
      SELECT 1 FROM public.assignments AS a
      WHERE a.id = assignment_submissions.assignment_id
        AND public.has_course_access(a.course_id)
    )
  )
  WITH CHECK (
    user_id = auth.uid()
    AND public.get_user_role()::text = 'student'
    AND status::text IN ('draft', 'submitted', 'late')
    AND score IS NULL
    AND feedback IS NULL
    AND EXISTS (
      SELECT 1 FROM public.assignments AS a
      WHERE a.id = assignment_submissions.assignment_id
        AND public.has_course_access(a.course_id)
    )
  );
CREATE POLICY assignment_submissions_admin_update ON public.assignment_submissions FOR UPDATE
  USING (
    public.get_user_role()::text IN ('admin', 'super_admin')
    OR EXISTS (
      SELECT 1 FROM public.assignments AS a
      WHERE a.id = assignment_submissions.assignment_id
        AND public.get_user_role()::text = 'instructor'
        AND public.has_course_access(a.course_id)
    )
  )
  WITH CHECK (
    public.get_user_role()::text IN ('admin', 'super_admin')
    OR EXISTS (
      SELECT 1 FROM public.assignments AS a
      WHERE a.id = assignment_submissions.assignment_id
        AND public.get_user_role()::text = 'instructor'
        AND public.has_course_access(a.course_id)
    )
  );

DROP POLICY IF EXISTS lesson_progress_select_own ON public.lesson_progress;
DROP POLICY IF EXISTS lesson_progress_insert_own ON public.lesson_progress;
DROP POLICY IF EXISTS lesson_progress_update_own ON public.lesson_progress;
CREATE POLICY lesson_progress_select_own ON public.lesson_progress FOR SELECT
  USING (
    (user_id = auth.uid() AND public.get_user_role()::text = 'student')
    OR public.get_user_role()::text IN ('admin', 'super_admin')
    OR EXISTS (
      SELECT 1
      FROM public.lessons AS l
      JOIN public.course_modules AS m ON m.id = l.module_id
      WHERE l.id = lesson_progress.lesson_id
        AND public.get_user_role()::text = 'instructor'
        AND public.has_course_access(m.course_id)
    )
  );
CREATE POLICY lesson_progress_insert_own ON public.lesson_progress FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND public.get_user_role()::text = 'student'
    AND public.can_access_lesson(lesson_id)
  );
CREATE POLICY lesson_progress_update_own ON public.lesson_progress FOR UPDATE
  USING (
    user_id = auth.uid()
    AND public.get_user_role()::text = 'student'
    AND public.can_access_lesson(lesson_id)
  )
  WITH CHECK (
    user_id = auth.uid()
    AND public.get_user_role()::text = 'student'
    AND public.can_access_lesson(lesson_id)
  );

DROP POLICY IF EXISTS course_progress_select_own ON public.course_progress;
DROP POLICY IF EXISTS course_progress_insert_own ON public.course_progress;
DROP POLICY IF EXISTS course_progress_update_own ON public.course_progress;
CREATE POLICY course_progress_select_own ON public.course_progress FOR SELECT
  USING (
    (user_id = auth.uid() AND public.get_user_role()::text = 'student')
    OR public.get_user_role()::text IN ('admin', 'super_admin')
    OR (public.get_user_role()::text = 'instructor' AND public.has_course_access(course_id))
  );
CREATE POLICY course_progress_insert_own ON public.course_progress FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND public.get_user_role()::text = 'student'
    AND public.has_course_access(course_id)
  );
CREATE POLICY course_progress_update_own ON public.course_progress FOR UPDATE
  USING (
    user_id = auth.uid()
    AND public.get_user_role()::text = 'student'
    AND public.has_course_access(course_id)
  )
  WITH CHECK (
    user_id = auth.uid()
    AND public.get_user_role()::text = 'student'
    AND public.has_course_access(course_id)
  );

DROP POLICY IF EXISTS certificates_select_own ON public.certificates;
DROP POLICY IF EXISTS "Students read own certificates" ON public.certificates;
DROP POLICY IF EXISTS "Admins read all certificates" ON public.certificates;
CREATE POLICY certificates_select_own ON public.certificates FOR SELECT
  USING (
    (user_id = auth.uid() AND public.get_user_role()::text = 'student')
    OR public.get_user_role()::text IN ('admin', 'super_admin')
  );

DROP POLICY IF EXISTS notifications_select_own ON public.notifications;
DROP POLICY IF EXISTS notifications_update_own ON public.notifications;
CREATE POLICY notifications_select_own ON public.notifications FOR SELECT
  USING (
    (user_id = auth.uid() AND public.get_user_role() IS NOT NULL)
    OR public.get_user_role()::text IN ('admin', 'super_admin')
  );
CREATE POLICY notifications_update_own ON public.notifications FOR UPDATE
  USING (user_id = auth.uid() AND public.get_user_role() IS NOT NULL)
  WITH CHECK (user_id = auth.uid() AND public.get_user_role() IS NOT NULL);

DROP POLICY IF EXISTS "Students read own quiz results" ON public.quiz_results;
DROP POLICY IF EXISTS "Students insert own quiz results" ON public.quiz_results;
CREATE POLICY quiz_results_select_own ON public.quiz_results FOR SELECT
  USING (
    (user_id = auth.uid() AND public.get_user_role()::text = 'student')
    OR public.get_user_role()::text IN ('admin', 'super_admin')
    OR (public.get_user_role()::text = 'instructor' AND public.has_course_access(course_id))
  );