-- ============================================
-- PHASE 5 & 6: Storage Buckets, Payments, Enrollments, Lesson Progress
-- ============================================

-- ── Profiles ──
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  username TEXT,
  email TEXT,
  full_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'student' CHECK (role IN ('student','instructor','admin','super_admin')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active','suspended','pending')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Enrollments ──
CREATE TABLE IF NOT EXISTS enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  payment_id UUID REFERENCES payments(id),
  status TEXT DEFAULT 'active' CHECK (status IN ('active','completed','cancelled','refunded')),
  progress NUMERIC(5,2) DEFAULT 0,
  enrolled_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  certificate_url TEXT,
  UNIQUE(user_id, course_id)
);

-- ── Payments ──
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL,
  currency TEXT DEFAULT 'GHS',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','processing','successful','failed','cancelled','refunded')),
  provider TEXT,
  provider_reference TEXT,
  transaction_reference TEXT UNIQUE,
  transaction_id TEXT,
  customer_email TEXT,
  gateway_response JSONB,
  metadata JSONB,
  method TEXT,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Lesson Progress ──
CREATE TABLE IF NOT EXISTS lesson_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  completed BOOLEAN DEFAULT false,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  time_spent_seconds INT DEFAULT 0,
  last_position_seconds INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, lesson_id)
);

-- ── Lesson Resources ──
CREATE TABLE IF NOT EXISTS lesson_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  type TEXT DEFAULT 'document' CHECK (type IN ('document','pdf','video','image','archive')),
  url TEXT NOT NULL,
  bucket_name TEXT,
  storage_path TEXT,
  mime_type TEXT,
  size_bytes BIGINT,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Indexes ──
CREATE INDEX IF NOT EXISTS idx_enrollments_user_id ON enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_course_id ON enrollments(course_id);
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_transaction_ref ON payments(transaction_reference);
CREATE INDEX IF NOT EXISTS idx_lesson_progress_user_id ON lesson_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_lesson_progress_lesson_id ON lesson_progress(lesson_id);
CREATE INDEX IF NOT EXISTS idx_lesson_resources_lesson_id ON lesson_resources(lesson_id);
