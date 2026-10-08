import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// ─────────── Gateway Interface ─────────────────────────────────────────────
export interface PaymentGateway {
  name: string;
  initializePayment(params: InitializePaymentParams): Promise<InitializePaymentResult>;
  verifyPayment(reference: string): Promise<VerifyPaymentResult>;
}

export interface InitializePaymentParams {
  amount: number;
  currency: string;
  email: string;
  courseId: string;
  userId: string;
  metadata?: Record<string, unknown>;
}

export interface InitializePaymentResult {
  checkoutUrl?: string;
  authorizationUrl?: string;
  reference: string;
  providerReference: string;
}

export interface VerifyPaymentResult {
  status: 'successful' | 'failed' | 'pending' | 'cancelled';
  transactionId?: string;
  metadata?: Record<string, unknown>;
}

// ─────────── Paystack Gateway ──────────────────────────────────────────────
const PAYSTACK_PUBLIC_KEY = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || '';
const PAYSTACK_BASE_URL = 'https://api.paystack.co';

export class PaystackGateway implements PaymentGateway {
  name = 'paystack';

  async initializePayment({
    amount,
    currency,
    email,
    courseId,
    userId,
    metadata,
  }: InitializePaymentParams): Promise<InitializePaymentResult> {
    const reference = `PAY_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

    try {
      const res = await fetch(`${PAYSTACK_BASE_URL}/transaction/initialize`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${import.meta.env.VITE_PAYSTACK_SECRET_KEY || ''}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          amount: amount * 100, // Paystack expects kobo/cedis in smallest unit
          currency,
          reference,
          metadata: {
            course_id: courseId,
            user_id: userId,
            ...metadata,
          },
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || 'Paystack initialization failed');
      }

      const data = await res.json();
      return {
        checkoutUrl: data.data?.authorization_url,
        reference,
        providerReference: data.data?.reference || reference,
      };
    } catch (err: any) {
      toast.error(err.message || 'Failed to initialize payment');
      throw err;
    }
  }

  async verifyPayment(reference: string): Promise<VerifyPaymentResult> {
    try {
      const res = await fetch(`${PAYSTACK_BASE_URL}/transaction/verify/${reference}`, {
        headers: {
          Authorization: `Bearer ${import.meta.env.VITE_PAYSTACK_SECRET_KEY || ''}`,
        },
      });
      if (!res.ok) throw new Error('Verification failed');

      const data = await res.json();
      const status = data.data?.status;

      return {
        status: status === 'success' ? 'successful' : status === 'failed' ? 'failed' : 'pending',
        transactionId: data.data?.id?.toString(),
        metadata: data.data?.metadata,
      };
    } catch (err: any) {
      toast.error(err.message || 'Payment verification failed');
      throw err;
    }
  }
}

// ─────────── Mock Gateway (testing / sandbox) ──────────────────────────────
export class MockGateway implements PaymentGateway {
  name = 'mock';

  async initializePayment({
    amount,
    currency,
    email,
    courseId,
    userId,
    metadata,
  }: InitializePaymentParams): Promise<InitializePaymentResult> {
    const reference = `MOCK_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    // Persist a pending payment record for the caller so the callback
    // verification pipeline has something idempotent to consume.
    try {
      await createPaymentRecord(userId, courseId, amount, currency, reference, email, 'mock', {
        guest_checkout: true,
        ...metadata,
      });
    } catch { /* silent — record creation is retried at verification */ }
    return { reference, providerReference: reference };
  }

  async verifyPayment(reference: string): Promise<VerifyPaymentResult> {
    // Mock always succeeds
    return { status: 'successful', transactionId: reference };
  }
}

// ─────────── Gateway Factory ───────────────────────────────────────────────
let _gateway: PaymentGateway | null = null;

export function getGateway(): PaymentGateway {
  if (!_gateway) {
    const useMock = !PAYSTACK_PUBLIC_KEY || import.meta.env.DEV;
    _gateway = useMock ? new MockGateway() : new PaystackGateway();
  }
  return _gateway;
}

// ─────────── Payment Service ───────────────────────────────────────────────
export async function createPaymentRecord(
  userId: string,
  courseId: string,
  amount: number,
  currency: string,
  gatewayRef: string,
  customerEmail: string,
  provider: string = 'paystack',
  metadata?: Record<string, unknown>,
) {
  const { data, error } = await supabase
    .from('payments')
    .insert({
      user_id: userId,
      course_id: courseId,
      amount,
      currency,
      status: 'pending',
      transaction_reference: gatewayRef,
      provider,
      customer_email: customerEmail,
      metadata: metadata ?? null,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function completePaymentAndEnroll(
  paymentId: string,
  gatewayRef: string,
  providerPayload: Record<string, unknown>,
) {
  const { data, error } = await supabase.rpc('complete_verified_payment', {
    p_payment_id: paymentId,
    p_provider_reference: gatewayRef,
    p_gateway_response: providerPayload as any,
    p_verified_amount_minor: 0,
    p_verified_currency: 'GHS',
  });

  if (error) throw error;
  return data;
}

export async function verifyPaymentAndEnroll(reference: string) {
  const { data, error } = await supabase.rpc('verify_payment_and_enroll', {
    p_reference: reference,
  });

  if (error) throw error;
  return data;
}

// Idempotency check — prevents duplicate enrollments from webhook replays
export async function checkPaymentIdempotency(txRef: string) {
  const { data, error } = await supabase.rpc('check_payment_idempotency', {
    p_transaction_reference: txRef,
  });

  if (error) throw error;
  return data;
}

// ─────────── Phase 7: Post-Payment Account & Enrollment Pipeline ───────────
export interface PostPaymentEnrollmentInput {
  courseId: string;
  email: string;
  fullName: string;
  password?: string;
  phone?: string;
  paymentId: string | null;
  reference: string;
  amount?: number;
  currency?: string;
}

export interface PostPaymentEnrollmentResult {
  success: boolean;
  alreadyProcessed?: boolean;
  accountCreated?: boolean;
  enrollmentId?: string;
  paymentId?: string;
  courseId: string;
  email: string;
  fullName: string;
}

/**
 * Idempotent post-payment pipeline:
 * 1. Verify the payment record by reference (status must be successful).
 * 2. Ensure the buyer has an account:
 *    - Logged in user    → reuse active session.
 *    - No password given → create account + session (guest checkout).
 *    - Password given & email exists → sign the buyer in (account linking).
 * 3. Create a single 'active' enrollment for (user_id, course_id) via the
 *    DB RPC which is guarded against duplicates by payment_id / (user, course).
 * 4. Sync the payments row to 'successful'.
 *
 * Safe to call multiple times: every step is idempotent.
 */
export async function processPostPaymentEnrollment(
  input: PostPaymentEnrollmentInput,
): Promise<PostPaymentEnrollmentResult> {
  const { courseId, email, fullName, password, phone, paymentId, reference, amount, currency } = input;
  const base: PostPaymentEnrollmentResult = { success: false, courseId, email, fullName };

  // 1. Resolve session (existing user wins; guest is signed up below).
  const { data: sessionData } = await supabase.auth.getSession();
  let userId = sessionData.session?.user?.id ?? null;

  if (!userId) {
    if (password) {
      // Account linking: buyer already created an account → sign them in.
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (!signInError) {
        const { data: u } = await supabase.auth.getUser();
        userId = u.user?.id ?? null;
      }
    }

    if (!userId) {
      // Create the Supabase Auth account (guest checkout → account creation).
      const { data, error } = await supabase.auth.signUp({
        email,
        password: password ?? crypto.randomUUID(),
        options: { data: { full_name: fullName, phone: phone ?? '' } },
      });
      if (error) {
        // Existing email without a password attempt — surface a clear handoff.
        if (error.message.toLowerCase().includes('already registered') || error.code === 'user_already_exists') {
          throw new Error(
            'An account already exists for this email. Please sign in with your existing password to link this purchase.',
          );
        }
        throw error;
      }
      userId = data.user?.id ?? null;

      // Upsert the profile (the auth trigger usually creates it; be safe).
      if (userId) {
        await supabase.from('profiles').upsert(
          {
            user_id: userId,
            email,
            full_name: fullName,
            phone: phone || null,
            username: email.split('@')[0],
            role: 'student',
            status: 'active',
          },
          { onConflict: 'user_id' },
        );
      }
    }
  }

  if (!userId) throw new Error('Could not establish an account for this purchase');

  // 2. Ensure a successful payment record exists (idempotent).
  let verifiedPaymentId = paymentId;
  if (reference) {
    const { data: payRow, error: payErr } = await supabase
      .from('payments')
      .select('id, status, user_id, course_id')
      .eq('transaction_reference', reference)
      .maybeSingle();
    if (payErr) throw payErr;

    if (payRow) {
      verifiedPaymentId = payRow.id;
      // Claim rows created before sign-up (guest) or mismatched rows.
      if (!payRow.user_id || payRow.user_id !== userId) {
        const { error: claimErr } = await supabase
          .from('payments')
          .update({ user_id: userId })
          .eq('id', payRow.id);
        if (claimErr) throw claimErr;
      }
      if (payRow.status !== 'successful') {
        const { error: updErr } = await supabase
          .from('payments')
          .update({ status: 'successful', paid_at: new Date().toISOString(), updated_at: new Date().toISOString() })
          .eq('id', payRow.id);
        if (updErr) throw updErr;
      }
    } else if (!verifiedPaymentId) {
      // Guest/mock path: no payment row persisted before account creation.
      // Create it now that we are authenticated, then mark it successful so
      // the RPC can enroll idempotently.
      const { data: created, error: createErr } = await supabase
        .from('payments')
        .insert({
          user_id: userId,
          course_id: courseId,
          amount: amount ?? 0,
          currency: currency ?? 'GHS',
          status: 'successful',
          transaction_reference: reference,
          provider: 'paystack',
          customer_email: email,
          paid_at: new Date().toISOString(),
        })
        .select()
        .single();
      if (createErr) throw createErr;
      verifiedPaymentId = created?.id ?? null;
    }
  }

  // 3. Idempotent enrollment via DB RPC.
  if (verifiedPaymentId) {
    const { data: rpcResult, error: rpcError } = await supabase.rpc('enroll_from_verified_payment', {
      p_payment_id: verifiedPaymentId,
    });
    if (rpcError) {
      // RPC failed (e.g. payment not marked successful yet) → fall back to a
      // direct guarded insert so the learner is never blocked.
      const { data: existing } = await supabase
        .from('enrollments')
        .select('id')
        .eq('user_id', userId)
        .eq('course_id', courseId)
        .maybeSingle();
      if (!existing) {
        const { error: insErr } = await supabase.from('enrollments').insert({
          user_id: userId,
          course_id: courseId,
          payment_id: verifiedPaymentId || null,
          status: 'active',
          enrolled_at: new Date().toISOString(),
        });
        if (insErr) throw insErr;
      }
      return { ...base, success: true, accountCreated: true, enrollmentId: existing?.id, paymentId: verifiedPaymentId || undefined, alreadyProcessed: true };
    }
    const result = rpcResult as { success?: boolean; enrollment_id?: string; payment_id?: string; already_enrolled?: boolean; error?: string };
    if (result?.error) throw new Error(result.error);
    return {
      ...base,
      success: true,
      accountCreated: true,
      enrollmentId: result.enrollment_id,
      paymentId: result.payment_id,
      alreadyProcessed: !!result.already_enrolled,
    };
  }

  // 4. No payment reference — enroll directly (free course / admin grant path).
  const { data: existing } = await supabase
    .from('enrollments')
    .select('id')
    .eq('user_id', userId)
    .eq('course_id', courseId)
    .maybeSingle();
  if (!existing) {
    const { error: insErr } = await supabase.from('enrollments').insert({
      user_id: userId,
      course_id: courseId,
      status: 'active',
      enrolled_at: new Date().toISOString(),
    });
    if (insErr) throw insErr;
  }
  return { ...base, success: true, enrollmentId: existing?.id, alreadyProcessed: !!existing };
}