-- 20261107000002_reconcile_canonical_schema.sql
-- Phase 1, migration 2 of 4: forward-only reconciliation of the deployed
-- schema with the naming/columns the frontend actually queries.
--
-- Verified live state (2026-11-07) before writing this file:
--   * All public tables exist and contain ZERO rows (profiles, courses,
--     course_categories, course_modules, lessons, enrollments, payments,
--     auth.users = 0 rows each).
--   * payments.status / enrollments.status / assignment_submissions.status
--     are already TEXT with *_stage1_check constraints (enum->text
--     conversion was applied during initial setup; payment_status,
--     submission_status enums remain but are unused by any column).
--   * lessons.video_storage_path and lesson_resources
--     bucket_name/storage_path/mime_type already exist.
--   * courses.currency already exists (default 'GHS').
--
-- This migration is ADDITIVE except for two RENAMEs (course_categories ->
-- categories, course_modules -> modules). Verified safe:
--   * No public function body references the old names (pg_proc.prosrc scan).
--   * No RLS policy qual/with_check references the old names (pg_policy scan).
--   * No views or materialized views exist in public.
--   * All FKs, indexes, triggers, grants and policies are bound to table
--     OIDs and follow the rename automatically.
--   * Trigger NAMES (set_course_categories_updated_at etc.) do not change.

BEGIN;

/* --------------------------- PREFLIGHT ------------------------------- */
DO $$
BEGIN
  IF to_regclass('public.course_categories') IS NULL
     OR to_regclass('public.course_modules') IS NULL THEN
    RAISE EXCEPTION 'preflight: expected course_categories/course_modules to exist';
  END IF;
  IF to_regclass('public.categories') IS NOT NULL
     OR to_regclass('public.modules') IS NOT NULL THEN
    RAISE EXCEPTION 'preflight: categories/modules already exist - aborting to avoid clobbering';
  END IF;
  IF to_regclass('public.courses') IS NULL OR to_regclass('public.profiles') IS NULL THEN
    RAISE EXCEPTION 'preflight: core tables missing';
  END IF;
END $$;

/* --------------------- NEW TABLES (frontend names) ------------------- */

-- Public instructor profile rows used by the course catalog
-- (courses.instructor_id -> instructors.id). Authorization/membership lives
-- separately in course_instructors (profile_id -> profiles.id); see plan doc.
CREATE TABLE IF NOT EXISTS public.instructors (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  name        text NOT NULL,
  title       text,
  bio         text,
  avatar      text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS instructors_user_id_key
  ON public.instructors (user_id) WHERE user_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.testimonials (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  quote       text NOT NULL,
  avatar      text,
  rating      integer,
  role        text,
  featured    boolean DEFAULT false,
  sort_order  integer DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Append-only payment event log (webhook/verification trail). Written only
-- by service_role (Edge Functions); RLS blocks all client writes.
CREATE TABLE IF NOT EXISTS public.payment_events (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id         uuid NOT NULL REFERENCES public.payments(id) ON DELETE CASCADE,
  event_type         text NOT NULL,
  provider_reference text,
  payload            jsonb,
  status             text,
  created_at         timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_payment_events_payment ON public.payment_events (payment_id);

ALTER TABLE public.instructors      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.testimonials     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_events   ENABLE ROW LEVEL SECURITY;

-- instructors: public read; admin full write; instructor may update own row.
CREATE POLICY instructors_select_public ON public.instructors
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY instructors_admin_write ON public.instructors
  FOR ALL TO authenticated
  USING (public.get_user_role() = ANY (ARRAY['admin'::user_role,'super_admin'::user_role]))
  WITH CHECK (public.get_user_role() = ANY (ARRAY['admin'::user_role,'super_admin'::user_role]));
CREATE POLICY instructors_update_own ON public.instructors
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY testimonials_select_public ON public.testimonials
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY testimonials_admin_write ON public.testimonials
  FOR ALL TO authenticated
  USING (public.get_user_role() = ANY (ARRAY['admin'::user_role,'super_admin'::user_role]))
  WITH CHECK (public.get_user_role() = ANY (ARRAY['admin'::user_role,'super_admin'::user_role]));

-- payment_events: admin read only; no client INSERT/UPDATE/DELETE policy, so
-- only service_role (which bypasses RLS) can write.
CREATE POLICY payment_events_admin_select ON public.payment_events
  FOR SELECT TO authenticated
  USING (public.get_user_role() = ANY (ARRAY['admin'::user_role,'super_admin'::user_role]));

/* --------------------------- RENAMES -------------------------------- */

ALTER TABLE public.course_categories RENAME TO categories;
ALTER TABLE public.course_modules    RENAME TO modules;

-- Cosmetic: align constraint/index names with new table names.
ALTER TABLE public.categories RENAME CONSTRAINT course_categories_pkey       TO categories_pkey;
ALTER TABLE public.categories RENAME CONSTRAINT course_categories_slug_key   TO categories_slug_key;
ALTER TABLE public.modules    RENAME CONSTRAINT course_modules_pkey          TO modules_pkey;
ALTER INDEX  public.idx_course_modules_course                                RENAME TO idx_modules_course;

/* ------------------- COLUMN ADDITIONS (all additive) ----------------- */

-- profiles: public-profile / instructor-profile fields used by
-- StudentProfilePage and AdminInstructorsPage.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS headline      text,
  ADD COLUMN IF NOT EXISTS bio           text,
  ADD COLUMN IF NOT EXISTS location      text,
  ADD COLUMN IF NOT EXISTS website       text,
  ADD COLUMN IF NOT EXISTS github_url    text,
  ADD COLUMN IF NOT EXISTS linkedin_url  text,
  ADD COLUMN IF NOT EXISTS twitter_url   text;

-- courses: single lead-instructor pointer for catalog display + form fields.
ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS instructor_id        uuid,
  ADD COLUMN IF NOT EXISTS learning_objectives  jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS requirements         jsonb NOT NULL DEFAULT '[]'::jsonb;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'courses_instructor_id_fkey') THEN
    ALTER TABLE public.courses
      ADD CONSTRAINT courses_instructor_id_fkey
      FOREIGN KEY (instructor_id) REFERENCES public.instructors(id) ON DELETE SET NULL;
  END IF;
END $$;

-- lesson_progress: resume-position fields used by the student player.
ALTER TABLE public.lesson_progress
  ADD COLUMN IF NOT EXISTS started_at              timestamptz,
  ADD COLUMN IF NOT EXISTS last_position_seconds   integer NOT NULL DEFAULT 0;

-- enrollments.payment_id exists but had no FK; add it.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'enrollments_payment_id_fkey') THEN
    ALTER TABLE public.enrollments
      ADD CONSTRAINT enrollments_payment_id_fkey
      FOREIGN KEY (payment_id) REFERENCES public.payments(id) ON DELETE SET NULL;
  END IF;
END $$;

-- payments: refund workflow columns. Status values are unchanged; the
-- payments_status_stage1_check constraint already permits 'refunded'.
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS refund_reason          text,
  ADD COLUMN IF NOT EXISTS refund_amount          numeric,
  ADD COLUMN IF NOT EXISTS refunded_at            timestamptz,
  ADD COLUMN IF NOT EXISTS refund_requested_at    timestamptz,
  ADD COLUMN IF NOT EXISTS refund_requested_by    uuid,
  ADD COLUMN IF NOT EXISTS refund_request_reason  text;

-- assignments: submission constraints + optional lesson linkage used by
-- `lessons:lesson_id(title)` PostgREST embeds in student dashboards.
ALTER TABLE public.assignments
  ADD COLUMN IF NOT EXISTS allowed_file_types        text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS max_file_size_mb          integer,
  ADD COLUMN IF NOT EXISTS submission_requirements   text,
  ADD COLUMN IF NOT EXISTS lesson_id                 uuid;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'assignments_lesson_id_fkey') THEN
    ALTER TABLE public.assignments
      ADD CONSTRAINT assignments_lesson_id_fkey
      FOREIGN KEY (lesson_id) REFERENCES public.lessons(id) ON DELETE SET NULL;
  END IF;
END $$;

-- quiz_results: nullable display joins for dashboard embeds. Scores remain
-- authoritative in quiz_attempts/quiz_answers; these columns only let the
-- UI resolve lesson/quiz titles. See plan doc section 5.
ALTER TABLE public.quiz_results
  ADD COLUMN IF NOT EXISTS quiz_id   uuid,
  ADD COLUMN IF NOT EXISTS lesson_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'quiz_results_quiz_id_fkey') THEN
    ALTER TABLE public.quiz_results
      ADD CONSTRAINT quiz_results_quiz_id_fkey
      FOREIGN KEY (quiz_id) REFERENCES public.quizzes(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'quiz_results_lesson_id_fkey') THEN
    ALTER TABLE public.quiz_results
      ADD CONSTRAINT quiz_results_lesson_id_fkey
      FOREIGN KEY (lesson_id) REFERENCES public.lessons(id) ON DELETE SET NULL;
  END IF;
END $$;

-- notifications: event/category metadata used by notificationService.
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS category    text,
  ADD COLUMN IF NOT EXISTS event_type  text,
  ADD COLUMN IF NOT EXISTS priority    text NOT NULL DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS data        jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS sender_id   uuid;

-- audit_logs: severity/meta used by auditService + phase20 index.
-- `action` is widened from the audit_action enum to text because the
-- frontend records arbitrary action strings (e.g. 'refund_requested');
-- all existing enum labels remain valid text values. Data preserved.
ALTER TABLE public.audit_logs ALTER COLUMN action TYPE text;
ALTER TABLE public.audit_logs
  ADD COLUMN IF NOT EXISTS severity text NOT NULL DEFAULT 'info',
  ADD COLUMN IF NOT EXISTS meta     jsonb NOT NULL DEFAULT '{}'::jsonb;

/* ---------------------------- INDEXES -------------------------------- */

CREATE INDEX IF NOT EXISTS idx_courses_instructor        ON public.courses (instructor_id);
CREATE INDEX IF NOT EXISTS idx_assignments_lesson        ON public.assignments (lesson_id);
CREATE INDEX IF NOT EXISTS idx_quiz_results_quiz         ON public.quiz_results (quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_results_lesson       ON public.quiz_results (lesson_id);
CREATE INDEX IF NOT EXISTS idx_notifications_event_type  ON public.notifications (event_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_severity       ON public.audit_logs (severity);
-- Dedupe guard for quiz_results aggregates (table currently empty).
CREATE UNIQUE INDEX IF NOT EXISTS quiz_results_user_course_quiz_key
  ON public.quiz_results (user_id, course_id, quiz_id) NULLS NOT DISTINCT;

/* --------------------------- POSTFLIGHT ------------------------------- */
DO $$
BEGIN
  IF to_regclass('public.categories') IS NULL OR to_regclass('public.modules') IS NULL THEN
    RAISE EXCEPTION 'postflight: rename failed';
  END IF;
  IF to_regclass('public.course_categories') IS NOT NULL
     OR to_regclass('public.course_modules') IS NOT NULL THEN
    RAISE EXCEPTION 'postflight: old table names still present';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema='public' AND table_name='courses' AND column_name='instructor_id') THEN
    RAISE EXCEPTION 'postflight: courses.instructor_id missing';
  END IF;
END $$;

COMMIT;
