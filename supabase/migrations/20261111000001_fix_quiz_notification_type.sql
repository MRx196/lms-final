-- Fix notification trigger type casting for quiz results
BEGIN;

CREATE OR REPLACE FUNCTION public.notify_on_quiz_result()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
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

DROP TRIGGER IF EXISTS trg_notify_quiz ON public.quiz_attempts;
CREATE TRIGGER trg_notify_quiz
  AFTER UPDATE OF completed_at ON public.quiz_attempts
  FOR EACH ROW
  WHEN (OLD.completed_at IS NULL AND NEW.completed_at IS NOT NULL)
  EXECUTE FUNCTION public.notify_on_quiz_result();

COMMIT;
