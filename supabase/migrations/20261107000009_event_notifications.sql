-- ============================================================================
-- Event-driven notifications: DB triggers insert notification rows when key
-- LMS events occur. Functions are SECURITY DEFINER (owner bypasses RLS) so
-- students receive notifications for system events they cannot write directly.
-- ============================================================================
BEGIN;

-- Enrollment confirmed
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
    'success', 'course', 'course_enrollment', 'normal', '/student/courses'
  );
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_notify_enrollment ON public.enrollments;
CREATE TRIGGER trg_notify_enrollment
  AFTER INSERT ON public.enrollments
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_enrollment();

-- Assignment graded (score transitions NULL → value)
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
    'success', 'assignment', 'assignment_graded', 'normal', '/student/assignments'
  );
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_notify_grade ON public.assignment_submissions;
CREATE TRIGGER trg_notify_grade
  AFTER UPDATE OF score ON public.assignment_submissions
  FOR EACH ROW
  WHEN (OLD.score IS NULL AND NEW.score IS NOT NULL)
  EXECUTE FUNCTION public.notify_on_grade();

-- Quiz attempt completed
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
    CASE WHEN NEW.passed THEN 'success' ELSE 'info' END,
    'quiz', 'quiz_result',
    CASE WHEN NEW.passed THEN 'normal' ELSE 'high' END,
    '/student/results'
  );
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_notify_quiz ON public.quiz_attempts;
CREATE TRIGGER trg_notify_quiz
  AFTER UPDATE OF completed_at ON public.quiz_attempts
  FOR EACH ROW
  WHEN (OLD.completed_at IS NULL AND NEW.completed_at IS NOT NULL)
  EXECUTE FUNCTION public.notify_on_quiz_result();

-- Certificate issued (pending → active)
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
    'success', 'certificate', 'certificate_issued', 'high', '/student/certificates'
  );
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_notify_certificate ON public.certificates;
CREATE TRIGGER trg_notify_certificate
  AFTER UPDATE OF status ON public.certificates
  FOR EACH ROW
  WHEN (NEW.status = 'active' AND OLD.status IS DISTINCT FROM 'active')
  EXECUTE FUNCTION public.notify_on_certificate();

-- Payment succeeded (fires when the trusted payment flow marks success)
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
    'success', 'payment', 'payment_success', 'normal', '/student/courses'
  );
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_notify_payment ON public.payments;
CREATE TRIGGER trg_notify_payment
  AFTER UPDATE OF status ON public.payments
  FOR EACH ROW
  WHEN (NEW.status = 'successful' AND OLD.status IS DISTINCT FROM 'successful')
  EXECUTE FUNCTION public.notify_on_payment();

COMMIT;
