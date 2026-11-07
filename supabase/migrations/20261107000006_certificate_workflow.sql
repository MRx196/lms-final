-- ============================================================================
-- Phase: Certificate workflow — configurable completion rules, admin approval,
--        public verification, revocation. Forward-only, additive.
-- ============================================================================
BEGIN;

-- ── Preflight ────────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables
                 WHERE table_schema='public' AND table_name='certificates') THEN
    RAISE EXCEPTION 'preflight: certificates table missing';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables
                 WHERE table_schema='public' AND table_name='courses') THEN
    RAISE EXCEPTION 'preflight: courses table missing';
  END IF;
END $$;

-- ── Schema ───────────────────────────────────────────────────────────────────
-- certificates.status is the single source of truth for the lifecycle:
--   pending  → student requested, awaiting admin approval (not verifiable)
--   active   → approved & issued (verifiable, downloadable)
--   revoked  → previously active, invalidated by an admin
-- The legacy `revoked` boolean is kept in sync for backwards compatibility.
ALTER TABLE public.certificates
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending';
ALTER TABLE public.certificates
  DROP CONSTRAINT IF EXISTS certificates_status_check;
ALTER TABLE public.certificates
  ADD CONSTRAINT certificates_status_check
  CHECK (status IN ('pending','active','revoked'));
ALTER TABLE public.certificates
  ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.certificates
  ADD COLUMN IF NOT EXISTS approved_at timestamptz;

-- Per-course configurable completion rule: minimum enrollment progress (0–100)
-- required before a student may request a certificate.
ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS certificate_min_progress integer NOT NULL DEFAULT 100;
ALTER TABLE public.courses
  DROP CONSTRAINT IF EXISTS courses_certificate_min_progress_check;
ALTER TABLE public.courses
  ADD CONSTRAINT courses_certificate_min_progress_check
  CHECK (certificate_min_progress BETWEEN 0 AND 100);

CREATE INDEX IF NOT EXISTS idx_certificates_status ON public.certificates(status);
CREATE INDEX IF NOT EXISTS idx_certificates_user_course
  ON public.certificates(user_id, course_id);

-- Any legacy rows (none expected) become 'active' only if they were never revoked.
UPDATE public.certificates
   SET status = CASE WHEN revoked THEN 'revoked' ELSE 'active' END;

-- ── RPC: request_certificate ────────────────────────────────────────────────
-- Student requests a certificate for a course they have completed per the
-- course's configured rule. Creates a 'pending' row; an admin must approve.
CREATE OR REPLACE FUNCTION public.request_certificate(p_course_id uuid)
RETURNS public.certificates
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_role text;
  v_enrollment public.enrollments%ROWTYPE;
  v_min_progress integer;
  v_existing uuid;
  v_code text;
  v_row public.certificates%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT p.role::text INTO v_role
    FROM public.profiles p
   WHERE p.user_id = v_uid AND p.status::text = 'active'
   LIMIT 1;
  IF v_role IS DISTINCT FROM 'student' THEN
    RAISE EXCEPTION 'forbidden: students only';
  END IF;

  SELECT * INTO v_enrollment
    FROM public.enrollments
   WHERE user_id = v_uid AND course_id = p_course_id
     AND status::text IN ('active','completed')
   LIMIT 1;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'not_enrolled';
  END IF;

  SELECT certificate_min_progress INTO v_min_progress
    FROM public.courses WHERE id = p_course_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'course_not_found';
  END IF;

  IF COALESCE(v_enrollment.progress, 0) < v_min_progress THEN
    RAISE EXCEPTION 'completion_rule_not_met: progress % < required %',
      v_enrollment.progress, v_min_progress;
  END IF;

  SELECT id INTO v_existing
    FROM public.certificates
   WHERE user_id = v_uid AND course_id = p_course_id
     AND status IN ('pending','active')
   LIMIT 1;
  IF v_existing IS NOT NULL THEN
    RAISE EXCEPTION 'certificate_already_exists';
  END IF;

  v_code := 'NNH-CERT-' || to_char(now(), 'YYYY') || '-' ||
            upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));

  INSERT INTO public.certificates (user_id, course_id, certificate_code, status)
  VALUES (v_uid, p_course_id, v_code, 'pending')
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$function$;

REVOKE ALL ON FUNCTION public.request_certificate(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.request_certificate(uuid) TO authenticated;

-- ── RPC: approve_certificate ────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.approve_certificate(p_certificate_id uuid)
RETURNS public.certificates
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_role text;
  v_row public.certificates%ROWTYPE;
BEGIN
  SELECT p.role::text INTO v_role
    FROM public.profiles p
   WHERE p.user_id = auth.uid() AND p.status::text = 'active'
   LIMIT 1;
  IF v_role IS DISTINCT FROM 'admin' AND v_role IS DISTINCT FROM 'super_admin' THEN
    RAISE EXCEPTION 'forbidden: admins only';
  END IF;

  SELECT * INTO v_row FROM public.certificates WHERE id = p_certificate_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'certificate_not_found';
  END IF;
  IF v_row.status <> 'pending' THEN
    RAISE EXCEPTION 'certificate_not_pending';
  END IF;

  UPDATE public.certificates
     SET status = 'active',
         approved_by = (SELECT id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1),
         approved_at = now(),
         issued_at = now(),
         revoked = false
   WHERE id = p_certificate_id
  RETURNING * INTO v_row;

  INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, meta)
  VALUES (auth.uid(), 'certificate_approved', 'certificate', p_certificate_id,
          jsonb_build_object('certificate_code', v_row.certificate_code, 'course_id', v_row.course_id));

  RETURN v_row;
END;
$function$;

REVOKE ALL ON FUNCTION public.approve_certificate(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.approve_certificate(uuid) TO authenticated;

-- ── RPC: reject_certificate (admin discards a pending request) ──────────────
CREATE OR REPLACE FUNCTION public.reject_certificate(p_certificate_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_role text;
  v_row public.certificates%ROWTYPE;
BEGIN
  SELECT p.role::text INTO v_role
    FROM public.profiles p
   WHERE p.user_id = auth.uid() AND p.status::text = 'active'
   LIMIT 1;
  IF v_role IS DISTINCT FROM 'admin' AND v_role IS DISTINCT FROM 'super_admin' THEN
    RAISE EXCEPTION 'forbidden: admins only';
  END IF;

  SELECT * INTO v_row FROM public.certificates WHERE id = p_certificate_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'certificate_not_found';
  END IF;
  IF v_row.status <> 'pending' THEN
    RAISE EXCEPTION 'certificate_not_pending';
  END IF;

  DELETE FROM public.certificates WHERE id = p_certificate_id;

  INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, meta)
  VALUES (auth.uid(), 'certificate_rejected', 'certificate', p_certificate_id,
          jsonb_build_object('certificate_code', v_row.certificate_code, 'course_id', v_row.course_id));
END;
$function$;

REVOKE ALL ON FUNCTION public.reject_certificate(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reject_certificate(uuid) TO authenticated;

-- ── RPC: revoke_certificate ─────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.revoke_certificate(p_certificate_id uuid)
RETURNS public.certificates
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_role text;
  v_row public.certificates%ROWTYPE;
BEGIN
  SELECT p.role::text INTO v_role
    FROM public.profiles p
   WHERE p.user_id = auth.uid() AND p.status::text = 'active'
   LIMIT 1;
  IF v_role IS DISTINCT FROM 'admin' AND v_role IS DISTINCT FROM 'super_admin' THEN
    RAISE EXCEPTION 'forbidden: admins only';
  END IF;

  SELECT * INTO v_row FROM public.certificates WHERE id = p_certificate_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'certificate_not_found';
  END IF;
  IF v_row.status = 'revoked' THEN
    RAISE EXCEPTION 'certificate_already_revoked';
  END IF;

  UPDATE public.certificates
     SET status = 'revoked', revoked = true
   WHERE id = p_certificate_id
  RETURNING * INTO v_row;

  INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, meta)
  VALUES (auth.uid(), 'certificate_revoked', 'certificate', p_certificate_id,
          jsonb_build_object('certificate_code', v_row.certificate_code, 'course_id', v_row.course_id));

  RETURN v_row;
END;
$function$;

REVOKE ALL ON FUNCTION public.revoke_certificate(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.revoke_certificate(uuid) TO authenticated;

-- ── RPC: verify_certificate (public) ────────────────────────────────────────
-- Returns only non-sensitive fields. Pending and revoked certificates return
-- their status so the UI can explain the result; only 'active' certs verify.
CREATE OR REPLACE FUNCTION public.verify_certificate(p_code text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_row public.certificates%ROWTYPE;
BEGIN
  SELECT * INTO v_row
    FROM public.certificates
   WHERE certificate_code = upper(trim(p_code))
   LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('found', false);
  END IF;

  RETURN jsonb_build_object(
    'found', true,
    'status', v_row.status,
    'valid', v_row.status = 'active' AND v_row.revoked = false,
    'certificate_code', v_row.certificate_code,
    'issued_at', v_row.issued_at,
    'student_name', (SELECT p.full_name FROM public.profiles p
                       WHERE p.user_id = v_row.user_id LIMIT 1),
    'course_title', (SELECT c.title FROM public.courses c
                      WHERE c.id = v_row.course_id LIMIT 1),
    'course_slug', (SELECT c.slug FROM public.courses c
                     WHERE c.id = v_row.course_id LIMIT 1)
  );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.verify_certificate(text) TO anon, authenticated;

-- ── Postflight ───────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint
                 WHERE conname = 'certificates_status_check') THEN
    RAISE EXCEPTION 'postflight: certificates_status_check missing';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint
                 WHERE conname = 'courses_certificate_min_progress_check') THEN
    RAISE EXCEPTION 'postflight: courses_certificate_min_progress_check missing';
  END IF;
END $$;

COMMIT;
