-- ============================================
-- PHASE 2: LMS Database Schema — Tables
-- ============================================

-- 1. ENUMS
CREATE TYPE user_role AS ENUM ('student', 'instructor', 'admin', 'super_admin');
CREATE TYPE user_status AS ENUM ('active', 'suspended', 'pending');
CREATE TYPE payment_status AS ENUM ('pending', 'completed', 'refunded', 'failed');
CREATE TYPE submission_status AS ENUM ('submitted', 'graded', 'late');
CREATE TYPE notification_type AS ENUM ('info', 'warning', 'success', 'error');
CREATE TYPE audit_action AS ENUM ('create', 'update', 'delete', 'login', 'logout', 'enroll', 'payment');

-- 2. PROFILES (extends auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  full_name TEXT,
  email TEXT,
  phone TEXT,
  avatar_url TEXT,
  role user_role NOT NULL DEFAULT 'student',
  status user_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. COURSE_CATEGORIES
CREATE TABLE course_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. COURSES
CREATE TABLE courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES course_categories(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  subtitle TEXT,
  description TEXT,
  long_description TEXT,
  level TEXT NOT NULL DEFAULT 'beginner',
  price DECIMAL(10,2) NOT NULL DEFAULT 0,
  original_price DECIMAL(10,2),
  image TEXT,
  featured BOOLEAN DEFAULT false,
  status TEXT NOT NULL DEFAULT 'draft',
  duration_hours INTEGER,
  total_lessons INTEGER DEFAULT 0,
  total_modules INTEGER DEFAULT 0,
  rating DECIMAL(3,2) DEFAULT 0,
  student_count INTEGER DEFAULT 0,
  tags TEXT[] DEFAULT '{}',
  skills TEXT[] DEFAULT '{}',
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. COURSE_INSTRUCTORS (join table)
CREATE TABLE course_instructors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'primary',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(course_id, profile_id)
);

-- 6. COURSE_MODULES
CREATE TABLE course_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  duration TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. LESSONS
CREATE TABLE lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID NOT NULL REFERENCES course_modules(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  content TEXT,
  duration TEXT,
  video_url TEXT,
  type TEXT NOT NULL DEFAULT 'video',
  is_free_preview BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. LESSON_RESOURCES
CREATE TABLE lesson_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  type TEXT NOT NULL,
  url TEXT NOT NULL,
  size_bytes INTEGER,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 9. ENROLLMENTS
CREATE TABLE enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  progress DECIMAL(5,2) DEFAULT 0,
  certificate_url TEXT,
  UNIQUE(user_id, course_id)
);

-- 10. PAYMENTS
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  status payment_status NOT NULL DEFAULT 'pending',
  method TEXT,
  transaction_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 11. ASSIGNMENTS
CREATE TABLE assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  module_id UUID REFERENCES course_modules(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  instructions TEXT,
  due_date TIMESTAMPTZ,
  max_score INTEGER NOT NULL DEFAULT 100,
  passing_score INTEGER DEFAULT 60,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 12. ASSIGNMENT_SUBMISSIONS
CREATE TABLE assignment_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT,
  file_urls TEXT[] DEFAULT '{}',
  score INTEGER,
  feedback TEXT,
  status submission_status NOT NULL DEFAULT 'submitted',
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  graded_at TIMESTAMPTZ,
  UNIQUE(assignment_id, user_id)
);

-- 13. QUIZZES
CREATE TABLE quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  module_id UUID REFERENCES course_modules(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  time_limit INTEGER,
  passing_score INTEGER DEFAULT 70,
  max_attempts INTEGER DEFAULT 3,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 14. QUIZ_QUESTIONS
CREATE TABLE quiz_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'multiple_choice',
  explanation TEXT,
  points INTEGER DEFAULT 1,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 15. QUIZ_OPTIONS
CREATE TABLE quiz_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES quiz_questions(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 16. QUIZ_ATTEMPTS
CREATE TABLE quiz_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  score INTEGER NOT NULL DEFAULT 0,
  total_points INTEGER NOT NULL DEFAULT 0,
  passed BOOLEAN DEFAULT false,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  UNIQUE(quiz_id, user_id, started_at)
);

-- 17. QUIZ_ANSWERS
CREATE TABLE quiz_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id UUID NOT NULL REFERENCES quiz_attempts(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES quiz_questions(id) ON DELETE CASCADE,
  selected_option_id UUID REFERENCES quiz_options(id) ON DELETE SET NULL,
  is_correct BOOLEAN DEFAULT false,
  points_earned INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(attempt_id, question_id)
);

-- 18. LESSON_PROGRESS
CREATE TABLE lesson_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  time_spent_seconds INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, lesson_id)
);

-- 19. COURSE_PROGRESS
CREATE TABLE course_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  completed_lessons INTEGER DEFAULT 0,
  total_lessons INTEGER DEFAULT 0,
  percentage DECIMAL(5,2) DEFAULT 0,
  last_accessed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, course_id)
);

-- 20. CERTIFICATES
CREATE TABLE certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  certificate_code TEXT NOT NULL UNIQUE,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  revoked BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, course_id)
);

-- 21. NOTIFICATIONS
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type notification_type NOT NULL DEFAULT 'info',
  read BOOLEAN DEFAULT false,
  link TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 22. AUDIT_LOGS
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action audit_action NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- INDEXES
CREATE INDEX idx_profiles_user_id ON profiles(user_id);
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_courses_slug ON courses(slug);
CREATE INDEX idx_courses_category ON courses(category_id);
CREATE INDEX idx_courses_status ON courses(status);
CREATE INDEX idx_course_modules_course ON course_modules(course_id);
CREATE INDEX idx_lessons_module ON lessons(module_id);
CREATE INDEX idx_enrollments_user ON enrollments(user_id);
CREATE INDEX idx_enrollments_course ON enrollments(course_id);
CREATE INDEX idx_payments_user ON payments(user_id);
CREATE INDEX idx_payments_course ON payments(course_id);
CREATE INDEX idx_assignments_course ON assignments(course_id);
CREATE INDEX idx_assignment_submissions_user ON assignment_submissions(user_id);
CREATE INDEX idx_quizzes_course ON quizzes(course_id);
CREATE INDEX idx_quiz_attempts_user ON quiz_attempts(user_id);
CREATE INDEX idx_quiz_attempts_quiz ON quiz_attempts(quiz_id);
CREATE INDEX idx_lesson_progress_user ON lesson_progress(user_id);
CREATE INDEX idx_course_progress_user ON course_progress(user_id);
CREATE INDEX idx_certificates_user ON certificates(user_id);
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at);