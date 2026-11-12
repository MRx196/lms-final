-- Direct fix for quiz notification type casting
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
