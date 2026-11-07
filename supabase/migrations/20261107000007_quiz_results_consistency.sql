-- ============================================================================
-- Fix: submit_quiz_attempt now records quiz_id on quiz_results and upserts the
-- aggregate row (unique on user_id+course_id+quiz_id) so retakes update the
-- same result instead of inserting duplicates or leaving quiz_id NULL.
-- ============================================================================
BEGIN;

CREATE OR REPLACE FUNCTION public.submit_quiz_attempt(p_attempt_id uuid, p_answers jsonb)
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
    'completed_at', now()
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.submit_quiz_attempt(uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_quiz_attempt(uuid, jsonb) TO authenticated;

COMMIT;
