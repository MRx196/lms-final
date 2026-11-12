-- Fix assignment_submissions RLS policies to allow students to read their own submissions
BEGIN;

-- Drop existing policies
DROP POLICY IF EXISTS "Students read own submissions" ON public.assignment_submissions;
DROP POLICY IF EXISTS "Students insert own submissions" ON public.assignment_submissions;
DROP POLICY IF EXISTS "Students update own draft submissions" ON public.assignment_submissions;
DROP POLICY IF EXISTS "Admins/instructors can view all submissions" ON public.assignment_submissions;
DROP POLICY IF EXISTS "Admins/instructors can update submissions" ON public.assignment_submissions;

-- Students can read their own submissions
CREATE POLICY "Students read own submissions" ON public.assignment_submissions
  FOR SELECT USING (auth.uid() = user_id);

-- Students can insert their own submissions
CREATE POLICY "Students insert own submissions" ON public.assignment_submissions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Students can update their own draft submissions
CREATE POLICY "Students update own draft submissions" ON public.assignment_submissions
  FOR UPDATE USING (auth.uid() = user_id AND status = 'draft');

-- Admins/instructors can view all submissions
CREATE POLICY "Admins/instructors can view all submissions" ON public.assignment_submissions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('admin', 'instructor')
    )
  );

-- Admins/instructors can update submissions
CREATE POLICY "Admins/instructors can update submissions" ON public.assignment_submissions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('admin', 'instructor')
    )
  );

COMMIT;
