-- 20261107000003_supporting_rpc_functions.sql
-- Phase 1, migration 3 of 4: RPC functions the frontend already calls but
-- which exist in NO migration file. All SECURITY DEFINER with search_path=''.
--
-- Authorization model (verified against live DB):
--   * Admin check: public.get_user_role() (existing SECURITY DEFINER helper)
--     returns the caller's profiles.role enum.
--   * Instructor check: course_instructors.profile_id -> profiles.id ->
--     profiles.user_id = auth.uid(), scoped to the affected course.
--   * Every function REVOKEs EXECUTE from PUBLIC/anon where not needed and
--     grants only to authenticated (or nobody, for service-role-only).

BEGIN;

/* -------------------- sort-order RPCs (course builder) ---------------- */

CREATE OR REPLACE FUNCTION public.update_modules_sort_order(p_updates jsonb)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_role  public.user_role;
  v_uid   uuid := auth.uid();
  v_item  jsonb;
  v_id    uuid;
  v_sort  integer;
  v_course uuid;
BEGIN
  IF v_uid IS NULL THEN
    RETURN json_build_object('ok', false, 'message', 'Not authenticated');
  END IF;
  v_role := public.get_user_role();
  IF v_role IS NULL OR v_role NOT IN ('admin','super_admin','instructor') THEN
    RETURN json_build_object('ok', false, 'message', 'Forbidden');
  END IF;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_updates) LOOP
    v_id   := (v_item ->> 'id')::uuid;
    v_sort := (v_item ->> 'sort_order')::integer;

    SELECT course_id INTO v_course FROM public.modules WHERE id = v_id;
    IF NOT FOUND THEN CONTINUE; END IF;

    -- Instructors may only reorder modules in courses assigned to them.
    IF v_role = 'instructor' AND NOT EXISTS (
      SELECT 1
      FROM public.course_instructors ci
      JOIN public.profiles p ON p.id = ci.profile_id
      WHERE ci.course_id = v_course AND p.user_id = v_uid
    ) THEN
      RETURN json_build_object('ok', false, 'message', 'Not authorized for this course');
    END IF;

    UPDATE public.modules SET sort_order = v_sort, updated_at = now() WHERE id = v_id;
  END LOOP;

  RETURN json_build_object('ok', true);
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_lessons_sort_order(p_updates jsonb)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_role   public.user_role;
  v_uid    uuid := auth.uid();
  v_item   jsonb;
  v_id     uuid;
  v_sort   integer;
  v_course uuid;
BEGIN
  IF v_uid IS NULL THEN
    RETURN json_build_object('ok', false, 'message', 'Not authenticated');
  END IF;
  v_role := public.get_user_role();
  IF v_role IS NULL OR v_role NOT IN ('admin','super_admin','instructor') THEN
    RETURN json_build_object('ok', false, 'message', 'Forbidden');
  END IF;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_updates) LOOP
    v_id   := (v_item ->> 'id')::uuid;
    v_sort := (v_item ->> 'sort_order')::integer;

    -- lessons.module_id -> modules.course_id gives the owning course.
    SELECT m.course_id INTO v_course
    FROM public.lessons l
    JOIN public.modules m ON m.id = l.module_id
    WHERE l.id = v_id;
    IF NOT FOUND THEN CONTINUE; END IF;

    IF v_role = 'instructor' AND NOT EXISTS (
      SELECT 1
      FROM public.course_instructors ci
      JOIN public.profiles p ON p.id = ci.profile_id
      WHERE ci.course_id = v_course AND p.user_id = v_uid
    ) THEN
      RETURN json_build_object('ok', false, 'message', 'Not authorized for this course');
    END IF;

    UPDATE public.lessons SET sort_order = v_sort, updated_at = now() WHERE id = v_id;
  END LOOP;

  RETURN json_build_object('ok', true);
END;
$function$;

/* ------------------------- audit event RPC ---------------------------- */

CREATE OR REPLACE FUNCTION public.record_audit_event(
  p_action      text,
  p_entity_type text    DEFAULT NULL,
  p_entity_id   uuid    DEFAULT NULL,
  p_meta        jsonb   DEFAULT NULL,
  p_severity    text    DEFAULT 'info'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_id uuid;
BEGIN
  IF p_severity NOT IN ('debug','info','notice','warning','error','critical') THEN
    p_severity := 'info';
  END IF;

  INSERT INTO public.audit_logs
    (user_id, action, entity_type, entity_id, meta, severity)
  VALUES
    (auth.uid(), COALESCE(NULLIF(p_action,''),'event'),
     COALESCE(NULLIF(p_entity_type,''),'system'),
     p_entity_id, COALESCE(p_meta,'{}'::jsonb), p_severity)
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$function$;

/* -------------------- enrollment status RPC (admin) ------------------- */

CREATE OR REPLACE FUNCTION public.set_enrollment_status(
  p_enrollment_id uuid,
  p_status        text,
  p_reason        text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_role  public.user_role;
  v_old   text;
  v_uid   uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RETURN json_build_object('ok', false, 'message', 'Not authenticated');
  END IF;
  v_role := public.get_user_role();
  IF v_role IS NULL OR v_role NOT IN ('admin','super_admin') THEN
    RETURN json_build_object('ok', false, 'message', 'Forbidden');
  END IF;
  IF p_reason IS NULL OR btrim(p_reason) = '' THEN
    RETURN json_build_object('ok', false, 'message', 'A reason is required');
  END IF;
  IF p_status NOT IN ('active','completed','suspended','cancelled','refunded','revoked') THEN
    RETURN json_build_object('ok', false, 'message', 'Invalid status');
  END IF;

  SELECT status INTO v_old FROM public.enrollments WHERE id = p_enrollment_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN json_build_object('ok', false, 'message', 'Enrollment not found');
  END IF;

  UPDATE public.enrollments SET status = p_status WHERE id = p_enrollment_id;

  -- Immutable audit trail for the privileged status change.
  INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, meta, severity)
  VALUES (v_uid, 'update', 'enrollment', p_enrollment_id,
          jsonb_build_object('old_status', v_old, 'new_status', p_status, 'reason', btrim(p_reason)),
          'warning');

  RETURN json_build_object('ok', true, 'message', 'Enrollment updated');
END;
$function$;

/* ------------- refund: REQUEST phase (admin) vs CONFIRM phase --------- */
/*
 * execute_payment_refund now only RECORDS a refund request. It never marks
 * a payment refunded and never revokes access by itself. The actual
 * 'refunded' transition happens exclusively in confirm_payment_refund,
 * which is callable only by service_role (the Paystack Edge Function after
 * it has verified the refund with the provider).
 */

CREATE OR REPLACE FUNCTION public.execute_payment_refund(
  p_payment_id     uuid,
  p_policy         text,
  p_amount         numeric,
  p_reason         text,
  p_revoke_access  boolean
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_role    public.user_role;
  v_payment public.payments%ROWTYPE;
  v_uid     uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RETURN json_build_object('ok', false, 'message', 'Not authenticated');
  END IF;
  v_role := public.get_user_role();
  IF v_role IS NULL OR v_role NOT IN ('admin','super_admin') THEN
    RETURN json_build_object('ok', false, 'message', 'Forbidden');
  END IF;
  IF p_reason IS NULL OR btrim(p_reason) = '' THEN
    RETURN json_build_object('ok', false, 'message', 'A reason is required to process a refund');
  END IF;
  IF p_policy NOT IN ('full','partial') THEN
    RETURN json_build_object('ok', false, 'message', 'Invalid refund policy');
  END IF;

  SELECT * INTO v_payment FROM public.payments WHERE id = p_payment_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN json_build_object('ok', false, 'message', 'Payment not found');
  END IF;
  IF v_payment.status <> 'successful' THEN
    RETURN json_build_object('ok', false, 'message', 'Only successful payments can be refunded');
  END IF;
  IF v_payment.refund_requested_at IS NOT NULL THEN
    RETURN json_build_object('ok', false, 'message', 'A refund is already pending for this payment');
  END IF;
  IF p_policy = 'partial' AND (p_amount IS NULL OR p_amount <= 0 OR p_amount > v_payment.amount) THEN
    RETURN json_build_object('ok', false, 'message', 'Invalid partial refund amount');
  END IF;

  UPDATE public.payments SET
    refund_requested_at   = now(),
    refund_requested_by   = v_uid,
    refund_request_reason = btrim(p_reason),
    refund_reason         = btrim(p_reason),
    refund_amount         = CASE WHEN p_policy = 'partial' THEN p_amount ELSE v_payment.amount END,
    updated_at            = now()
  WHERE id = p_payment_id;

  INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, meta, severity)
  VALUES (v_uid, 'payment', 'payment', p_payment_id,
          jsonb_build_object('event', 'refund_requested', 'policy', p_policy,
                             'amount', CASE WHEN p_policy='partial' THEN p_amount ELSE v_payment.amount END,
                             'revoke_access', p_revoke_access, 'reason', btrim(p_reason)),
          'warning');

  RETURN json_build_object('ok', true,
    'message', 'Refund requested - awaiting provider confirmation');
END;
$function$;

-- CONFIRM phase: service_role ONLY (Edge Function after Paystack verifies
-- the refund). EXECUTE is revoked from every client-facing role.
CREATE OR REPLACE FUNCTION public.confirm_payment_refund(
  p_payment_id          uuid,
  p_provider_reference  text,
  p_gateway_response    jsonb
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_payment public.payments%ROWTYPE;
BEGIN
  SELECT * INTO v_payment FROM public.payments WHERE id = p_payment_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN json_build_object('ok', false, 'message', 'Payment not found');
  END IF;
  IF v_payment.status = 'refunded' THEN
    RETURN json_build_object('ok', true, 'message', 'Already refunded', 'idempotent', true);
  END IF;
  IF v_payment.status <> 'successful' THEN
    RETURN json_build_object('ok', false, 'message', 'Payment is not in a refundable state');
  END IF;

  UPDATE public.payments SET
    status            = 'refunded',
    refunded_at       = now(),
    provider_reference = COALESCE(p_provider_reference, provider_reference),
    gateway_response  = COALESCE(p_gateway_response, gateway_response),
    updated_at        = now()
  WHERE id = p_payment_id;

  -- Full refunds revoke course access exactly once.
  UPDATE public.enrollments SET status = 'revoked'
  WHERE payment_id = p_payment_id AND status = 'active';

  INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, meta, severity)
  VALUES (NULL, 'payment', 'payment', p_payment_id,
          jsonb_build_object('event', 'refund_confirmed',
                             'provider_reference', p_provider_reference),
          'warning');

  RETURN json_build_object('ok', true, 'message', 'Refund confirmed');
END;
$function$;

/* ------------------------- EXECUTE grants ---------------------------- */

REVOKE EXECUTE ON FUNCTION public.update_modules_sort_order(jsonb)   FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.update_lessons_sort_order(jsonb)   FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.record_audit_event(text,text,uuid,jsonb,text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.set_enrollment_status(uuid,text,text)          FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.execute_payment_refund(uuid,text,numeric,text,boolean) FROM PUBLIC, anon;
-- confirm_payment_refund: service_role only — no client role may execute.
REVOKE EXECUTE ON FUNCTION public.confirm_payment_refund(uuid,text,jsonb)
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.update_modules_sort_order(jsonb)   TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_lessons_sort_order(jsonb)   TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_audit_event(text,text,uuid,jsonb,text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.set_enrollment_status(uuid,text,text)          TO authenticated;
GRANT EXECUTE ON FUNCTION public.execute_payment_refund(uuid,text,numeric,text,boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_payment_refund(uuid,text,jsonb)        TO service_role;

COMMIT;
