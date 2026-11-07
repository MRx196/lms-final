-- 20261107000001_revoke_sensitive_rpc_execute.sql
-- Phase 1, migration 1 of 4: emergency EXECUTE revocation on sensitive
-- SECURITY DEFINER functions.
--
-- Verified live state (2026-11-07): proacl grants EXECUTE to PUBLIC, anon and
-- authenticated on every public function, including verify_payment_and_enroll,
-- which flips any payments row to 'successful' and creates an enrollment with
-- NO payment verification. That is a free-enrollment exploit callable by any
-- anonymous client right now.
--
-- This migration ONLY revokes privileges. No function bodies, tables or data
-- are changed. service_role keeps EXECUTE (needed later by Edge Functions).
-- get_user_role() MUST stay executable by anon/authenticated because RLS
-- policy expressions on public tables call it.

BEGIN;

-- Dangerous: marks payment successful + enrolls without verification.
REVOKE EXECUTE ON FUNCTION public.verify_payment_and_enroll(text)
  FROM PUBLIC, anon, authenticated;

-- Marks payment successful; must only be callable by the payment Edge
-- Function via service_role after server-side Paystack verification.
REVOKE EXECUTE ON FUNCTION public.complete_verified_payment(uuid, text, jsonb, integer, text)
  FROM PUBLIC, anon, authenticated;

-- Payment lookup helper; no client-side need.
REVOKE EXECUTE ON FUNCTION public.check_payment_idempotency(text)
  FROM PUBLIC, anon, authenticated;

-- Self-scoped (checks auth.uid() = payment.user_id and status='successful'),
-- so authenticated keeps EXECUTE for the post-payment client flow; anon does not.
REVOKE EXECUTE ON FUNCTION public.enroll_from_verified_payment(uuid)
  FROM PUBLIC, anon;

-- Arbitrary p_user_id argument leaks enrollment state; frontend calls it as
-- authenticated only.
REVOKE EXECUTE ON FUNCTION public.is_enrolled(uuid, uuid)
  FROM PUBLIC, anon;

-- Trigger/internal functions: never called directly by clients.
REVOKE EXECUTE ON FUNCTION public.handle_new_user()
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_user_email_update()
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_updated_at()
  FROM PUBLIC, anon, authenticated;

COMMIT;
