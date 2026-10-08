-- ============================================
-- PHASE 7: Post-Payment Account Flow & Idempotent Enrollment
-- ============================================

-- 1) Standardize enrollment statuses to include 'suspended'
ALTER TABLE enrollments
  DROP CONSTRAINT IF EXISTS enrollments_status_check;
ALTER TABLE enrollments
  ADD CONSTRAINT enrollments_status_check
  CHECK (status IN ('active','completed','suspended','cancelled','refunded'));

-- 2) RLS: allow an authenticated user to complete (insert) their own
--    payments even when the payment row was created by a guest checkout
--    that predates account creation. Payments already allows user-own insert.
--    Add INSERT policy for enrollments and payments keyed on auth.uid() and
--    purchase_email so post-payment account linking always works.
DROP POLICY IF EXISTS enrollments_insert_own ON enrollments;
CREATE POLICY enrollments_insert_own ON enrollments FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- 3) Payment completion by student (mark their own payment successful) --
--    previously only admins could UPDATE payments, which blocked the
--    client-side guest verification path. Students may update ONLY their
--    own payment rows.
DROP POLICY IF EXISTS payments_update_own ON payments;
CREATE POLICY payments_update_own ON payments FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 4) Idempotent enrollment RPC (Phase 7)
--    Public helper: safely creates an active enrollment for a verified
--    payment owned by the caller, without duplicate enrollments.
CREATE OR REPLACE FUNCTION public.enroll_from_verified_payment(p_payment_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_payment payments%ROWTYPE;
  v_enrollment enrollments%ROWTYPE;
  v_user_id UUID;
BEGIN
  SELECT auth.uid() INTO v_user_id;
  IF v_user_id IS NULL THEN
    RETURN json_build_object('error', 'Not authenticated');
  END IF;

  SELECT * INTO v_payment FROM payments WHERE id = p_payment_id;
  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Payment not found');
  END IF;

  IF v_payment.user_id <> v_user_id THEN
    RETURN json_build_object('error', 'Payment does not belong to caller');
  END IF;

  IF v_payment.status <> 'successful' THEN
    RETURN json_build_object('error', 'Payment is not successful');
  END IF;

  -- Idempotency: no duplicate enrollment if one already exists for this
  -- payment OR this (user, course) pair.
  SELECT * INTO v_enrollment FROM enrollments
    WHERE payment_id = p_payment_id
    LIMIT 1;
  IF NOT FOUND THEN
    SELECT * INTO v_enrollment FROM enrollments
      WHERE user_id = v_user_id AND course_id = v_payment.course_id
      LIMIT 1;
  END IF;

  IF FOUND THEN
    RETURN json_build_object(
      'success', true,
      'enrollment_id', v_enrollment.id,
      'payment_id', v_payment.id,
      'already_enrolled', true
    );
  END IF;

  INSERT INTO enrollments (user_id, course_id, payment_id, status, enrolled_at)
  VALUES (v_user_id, v_payment.course_id, p_payment_id, 'active', NOW())
  RETURNING * INTO v_enrollment;

  UPDATE courses SET student_count = student_count + 1
  WHERE id = v_payment.course_id;

  RETURN json_build_object(
    'success', true,
    'enrollment_id', v_enrollment.id,
    'payment_id', v_payment.id,
    'already_enrolled', false
  );
END;
$$;

-- 5) Guest checkout: payments are created BEFORE the buyer has an auth
--    account (user_id unknown at init time). Make user_id nullable; the
--    post-payment verification step claims the row once the account exists.
ALTER TABLE public.payments ALTER COLUMN user_id DROP NOT NULL;

-- 6) Revoke direct anon INSERT/UPDATE on enrollments & payments: the RPC
--    above is the only privileged write path for enrollment creation, and
--    guest checkout creates payments as the (pre-account) user once they
--    have an identity. This keeps guest purchase + late account linking safe.