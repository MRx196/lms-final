-- Fix all notification triggers with proper type casting
BEGIN;

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

COMMIT;
