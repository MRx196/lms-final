-- ============================================================================
-- Quiz soft-delete and notification trigger fixes
-- ============================================================================
-- This migration:
-- 1. Adds deleted_at column to quizzes for soft-delete
-- 2. Fixes notification trigger enum type issues
-- 3. Preserves quiz attempts when quiz is deleted
-- 4. Adds fields needed for quiz review
-- ============================================================================

BEGIN;

-- 1. Add soft-delete column to quizzes
ALTER TABLE public.quizzes ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE public.quizzes ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id);

-- 2. Add submission_type to quiz_attempts to distinguish manual vs auto
ALTER TABLE public.quiz_attempts ADD COLUMN IF NOT EXISTS submission_type TEXT DEFAULT 'manual' CHECK (submission_type IN ('manual', 'auto'));

-- 2b. Add snapshot columns to quiz_answers to preserve question/option text after quiz deletion
ALTER TABLE public.quiz_answers ADD COLUMN IF NOT EXISTS question_text TEXT;
ALTER TABLE public.quiz_answers ADD COLUMN IF NOT EXISTS question_points INTEGER;
ALTER TABLE public.quiz_answers ADD COLUMN IF NOT EXISTS selected_option_text TEXT;
ALTER TABLE public.quiz_answers ADD COLUMN IF NOT EXISTS correct_option_text TEXT;
ALTER TABLE public.quiz_answers ADD COLUMN IF NOT EXISTS correct_option_id UUID;

-- 3. Fix notification trigger functions with proper enum casting

-- Enrollment notification
CREATE OR REPLACE FUNCTION public.notify_on_enrollment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  INSERT INTO public.notifications (user_id, title, message, type, category, event_type, priority, link)
  VALUES (
    NEW.user_id,
    'Enrollment confirmed',
    'You have been enrolled in a course. Start learning now.',
    'success'::public.notification_type, 'course', 'course_enrollment', 'normal', '/student/courses'
  );
  RETURN NEW;
END;
$function$;

-- Grade notification
CREATE OR REPLACE FUNCTION public.notify_on_grade()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_title text;
BEGIN
  SELECT title INTO v_title FROM public.assignments WHERE id = NEW.assignment_id;
  INSERT INTO public.notifications (user_id, title, message, type, category, event_type, priority, link)
  VALUES (
    NEW.user_id,
    'Assignment graded',
    'Your submission for "' || COALESCE(v_title, 'an assignment') || '" has been graded.',
    'success'::public.notification_type, 'assignment', 'assignment_graded', 'normal', '/student/assignments'
  );
  RETURN NEW;
END;
$function$;

-- Quiz result notification
CREATE OR REPLACE FUNCTION public.notify_on_quiz_result()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_title text;
BEGIN
  SELECT title INTO v_title FROM public.quizzes WHERE id = NEW.quiz_id;
  INSERT INTO public.notifications (user_id, title, message, type, category, event_type, priority, link)
  VALUES (
    NEW.user_id,
    'Quiz result available',
    'Your result for "' || COALESCE(v_title, 'a quiz') || '" is ready.',
    CASE WHEN NEW.passed THEN 'success'::public.notification_type ELSE 'info'::public.notification_type END,
    'quiz', 'quiz_result',
    CASE WHEN NEW.passed THEN 'normal' ELSE 'high' END,
    '/student/results'
  );
  RETURN NEW;
END;
$function$;

-- Certificate notification
CREATE OR REPLACE FUNCTION public.notify_on_certificate()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_course text;
BEGIN
  SELECT title INTO v_course FROM public.courses WHERE id = NEW.course_id;
  INSERT INTO public.notifications (user_id, title, message, type, category, event_type, priority, link)
  VALUES (
    NEW.user_id,
    'Certificate issued',
    'Congratulations! Your certificate for "' || COALESCE(v_course, 'a course') || '" is ready.',
    'success'::public.notification_type, 'certificate', 'certificate_issued', 'high', '/student/certificates'
  );
  RETURN NEW;
END;
$function$;

-- Payment notification
CREATE OR REPLACE FUNCTION public.notify_on_payment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_course text;
BEGIN
  SELECT title INTO v_course FROM public.courses WHERE id = NEW.course_id;
  INSERT INTO public.notifications (user_id, title, message, type, category, event_type, priority, link)
  VALUES (
    NEW.user_id,
    'Payment received',
    'Your payment for "' || COALESCE(v_course, 'a course') || '" was successful.',
    'success'::public.notification_type, 'payment', 'payment_success', 'normal', '/student/courses'
  );
  RETURN NEW;
END;
$function$;

-- 4. Update submit_quiz_attempt to handle soft-deleted quizzes and set submission_type
CREATE OR REPLACE FUNCTION public.submit_quiz_attempt(p_attempt_id uuid, p_answers jsonb, p_submission_type text DEFAULT 'manual')
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
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
  v_question_text text;
  v_question_points integer;
  v_selected_option_text text;
  v_correct_option_text text;
  v_correct_option_id uuid;
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

  -- Check if quiz is soft-deleted
  IF EXISTS (
    SELECT 1 FROM public.quizzes 
    WHERE id = v_attempt.quiz_id AND deleted_at IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'Quiz has been deleted';
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

    -- Get question text and points for snapshot
    SELECT qq.text, COALESCE(qq.points, 0)
    INTO v_question_text, v_question_points
    FROM public.quiz_questions AS qq
    WHERE qq.id = v_question.id;

    -- Get selected option text
    SELECT qo.text INTO v_selected_option_text
    FROM public.quiz_options AS qo
    WHERE qo.id = v_selected_option_id;

    -- Get correct option text and id
    SELECT qo.text, qo.id INTO v_correct_option_text, v_correct_option_id
    FROM public.quiz_options AS qo
    WHERE qo.question_id = v_question.id AND qo.is_correct = true
    LIMIT 1;

    INSERT INTO public.quiz_answers (
      attempt_id, question_id, selected_option_id, is_correct, points_earned,
      question_text, question_points, selected_option_text, correct_option_text, correct_option_id
    ) VALUES (
      p_attempt_id, v_question.id, v_selected_option_id, v_is_correct, v_points,
      v_question_text, v_question_points, v_selected_option_text, v_correct_option_text, v_correct_option_id
    )
    ON CONFLICT (attempt_id, question_id) DO UPDATE SET
      selected_option_id = EXCLUDED.selected_option_id,
      is_correct = EXCLUDED.is_correct,
      points_earned = EXCLUDED.points_earned,
      question_text = EXCLUDED.question_text,
      question_points = EXCLUDED.question_points,
      selected_option_text = EXCLUDED.selected_option_text,
      correct_option_text = EXCLUDED.correct_option_text,
      correct_option_id = EXCLUDED.correct_option_id;
  END LOOP;

  IF v_total <= 0 THEN
    RAISE EXCEPTION 'Quiz has no scorable questions';
  END IF;
  v_passed := v_score::numeric * 100 >= v_total::numeric * v_passing_score;

  UPDATE public.quiz_attempts
  SET score = v_score,
      total_points = v_total,
      passed = v_passed,
      completed_at = now(),
      submission_type = p_submission_type
  WHERE id = p_attempt_id;

  INSERT INTO public.quiz_results (user_id, course_id, quiz_id, score, total_score, passed, completed_at)
  VALUES (auth.uid(), v_course_id, v_attempt.quiz_id, v_score, v_total, v_passed, now())
  ON CONFLICT (user_id, course_id, quiz_id) DO UPDATE SET
    score = EXCLUDED.score,
    total_score = EXCLUDED.total_score,
    passed = EXCLUDED.passed,
    completed_at = EXCLUDED.completed_at;

  RETURN jsonb_build_object(
    'id', v_attempt.id,
    'quiz_id', v_attempt.quiz_id,
    'user_id', v_attempt.user_id,
    'score', v_score,
    'total_points', v_total,
    'passed', v_passed,
    'started_at', v_attempt.started_at,
    'completed_at', now(),
    'submission_type', p_submission_type
  );
END;
$function$;

-- 5. Update RLS policies to exclude soft-deleted quizzes from student queries
-- Drop existing policies and recreate with soft-delete check
DROP POLICY IF EXISTS "Students read quizzes in enrolled courses" ON public.quizzes;
CREATE POLICY "Students read quizzes in enrolled courses" ON public.quizzes
  FOR SELECT USING (
    deleted_at IS NULL AND
    EXISTS (
      SELECT 1 FROM enrollments WHERE enrollments.course_id = quizzes.course_id
      AND enrollments.user_id = auth.uid()
    )
  );

-- Admins can see all quizzes including deleted ones
DROP POLICY IF EXISTS "Admins/instructors manage quizzes" ON public.quizzes;
CREATE POLICY "Admins/instructors manage quizzes" ON public.quizzes
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('admin', 'instructor')
    )
  );

COMMIT;
