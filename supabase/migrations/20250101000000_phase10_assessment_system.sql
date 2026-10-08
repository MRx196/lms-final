-- Phase 10: Assessment System — RLS policies, quiz_results table, storage bucket

CREATE TABLE IF NOT EXISTS public.quiz_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  course_id UUID NOT NULL REFERENCES courses(id),
  score NUMERIC(5,2) DEFAULT 0,
  total_score NUMERIC(5,2) DEFAULT 0,
  passed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.quiz_results ENABLE ROW LEVEL SECURITY;

-- Students can read/write their own quiz results
CREATE POLICY "Students read own quiz results" ON public.quiz_results
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Students insert own quiz results" ON public.quiz_results
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Assignments RLS
CREATE POLICY "Students read assignments in enrolled courses" ON public.assignments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM enrollments WHERE enrollments.course_id = assignments.course_id
      AND enrollments.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage assignments" ON public.assignments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('admin', 'instructor')
    )
  );

-- Assignment submissions RLS
CREATE POLICY "Students read own submissions" ON public.assignment_submissions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Students insert own submissions" ON public.assignment_submissions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Students update own draft submissions" ON public.assignment_submissions
  FOR UPDATE USING (auth.uid() = user_id AND status = 'draft');

CREATE POLICY "Admins/instructors can view all submissions" ON public.assignment_submissions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('admin', 'instructor')
    )
  );

CREATE POLICY "Admins/instructors can update submissions" ON public.assignment_submissions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('admin', 'instructor')
    )
  );

-- Quizzes RLS
CREATE POLICY "Students read quizzes in enrolled courses" ON public.quizzes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM enrollments WHERE enrollments.course_id = quizzes.course_id
      AND enrollments.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins/instructors manage quizzes" ON public.quizzes
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('admin', 'instructor')
    )
  );

-- Quiz questions/options RLS
CREATE POLICY "Students read quiz data" ON public.quiz_questions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM enrollments e
      JOIN quizzes q ON q.course_id = e.course_id
      WHERE q.id = quiz_questions.quiz_id AND e.user_id = auth.uid()
    )
  );

CREATE POLICY "Students read quiz options" ON public.quiz_options
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM enrollments e
      JOIN quizzes q ON q.course_id = e.course_id
      JOIN quiz_questions qq ON qq.quiz_id = q.id
      WHERE qq.id = quiz_options.question_id AND e.user_id = auth.uid()
    )
  );

-- Quiz attempts RLS
CREATE POLICY "Students read own attempts" ON public.quiz_attempts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Students insert own attempts" ON public.quiz_attempts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins read all attempts" ON public.quiz_attempts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('admin', 'instructor')
    )
  );

-- Quiz answers RLS
CREATE POLICY "Students read own answers" ON public.quiz_answers
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM quiz_attempts WHERE quiz_attempts.id = quiz_answers.attempt_id
      AND quiz_attempts.user_id = auth.uid()
    )
  );

CREATE POLICY "Students insert own answers" ON public.quiz_answers
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM quiz_attempts WHERE quiz_attempts.id = quiz_answers.attempt_id
      AND quiz_attempts.user_id = auth.uid()
    )
  );

-- Certificates RLS
CREATE POLICY "Students read own certificates" ON public.certificates
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins read all certificates" ON public.certificates
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('admin', 'instructor')
    )
  );
