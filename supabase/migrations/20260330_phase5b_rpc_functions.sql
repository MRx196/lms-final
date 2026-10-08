-- ============================================
-- PHASE 5b: RPC Functions for Payments & Enrollment
-- ============================================

-- ── RPC: Check if user is enrolled in a course ──
CREATE OR REPLACE FUNCTION public.is_enrolled(p_user_id UUID, p_course_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM enrollments
    WHERE user_id = p_user_id AND course_id = p_course_id AND status = 'active'
  );
$$;

-- ── RPC: Complete verified payment and enroll ──
CREATE OR REPLACE FUNCTION public.complete_verified_payment(
  p_payment_id UUID,
  p_provider_reference TEXT,
  p_gateway_response JSONB,
  p_verified_amount_minor INT,
  p_verified_currency TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_payment payments%ROWTYPE;
  v_enrollment enrollments%ROWTYPE;
BEGIN
  SELECT * INTO v_payment FROM payments WHERE id = p_payment_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Payment not found');
  END IF;
  IF v_payment.status = 'successful' THEN
    RETURN json_build_object('message', 'Already processed', 'payment_id', p_payment_id);
  END IF;
  UPDATE payments SET
    status = 'successful',
    provider_reference = p_provider_reference,
    gateway_response = p_gateway_response,
    paid_at = NOW(),
    updated_at = NOW()
  WHERE id = p_payment_id;
  INSERT INTO enrollments (user_id, course_id, payment_id, status, enrolled_at)
  VALUES (v_payment.user_id, v_payment.course_id, p_payment_id, 'active', NOW())
  RETURNING * INTO v_enrollment;
  UPDATE courses SET student_count = student_count + 1
  WHERE id = v_payment.course_id;
  RETURN json_build_object(
    'success', true,
    'payment_id', p_payment_id,
    'enrollment_id', v_enrollment.id
  );
END;
$$;

-- ── RPC: Verify payment by reference and enroll ──
CREATE OR REPLACE FUNCTION public.verify_payment_and_enroll(p_reference TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_payment payments%ROWTYPE;
BEGIN
  SELECT * INTO v_payment FROM payments WHERE transaction_reference = p_reference;
  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Payment not found');
  END IF;
  IF v_payment.status = 'successful' THEN
    RETURN json_build_object('message', 'Already processed');
  END IF;
  UPDATE payments SET
    status = 'successful',
    paid_at = NOW(),
    updated_at = NOW()
  WHERE transaction_reference = p_reference;
  INSERT INTO enrollments (user_id, course_id, payment_id, status, enrolled_at)
  VALUES (v_payment.user_id, v_payment.course_id, v_payment.id, 'active', NOW());
  UPDATE courses SET student_count = student_count + 1
  WHERE id = v_payment.course_id;
  RETURN json_build_object('success', true, 'payment_id', v_payment.id);
END;
$$;

-- ── RPC: Check payment idempotency ──
CREATE OR REPLACE FUNCTION public.check_payment_idempotency(p_transaction_reference TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_count INT;
BEGIN
  SELECT COUNT(*) INTO v_count FROM payments WHERE transaction_reference = p_transaction_reference;
  RETURN json_build_object('exists', v_count > 0, 'count', v_count);
END;
$$;
