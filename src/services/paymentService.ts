import { supabase } from '@/integrations/supabase/client';

export const PAYMENT_CHECKOUT_DISABLED_MESSAGE =
  'Checkout is temporarily unavailable until trusted server-side payment verification is deployed.';
export const PAYMENT_CHECKOUT_ENABLED = false;

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
export class PaystackGateway implements PaymentGateway {
  name = 'paystack';

  async initializePayment(): Promise<InitializePaymentResult> {
    throw new Error(PAYMENT_CHECKOUT_DISABLED_MESSAGE);
  }

  async verifyPayment(): Promise<VerifyPaymentResult> {
    throw new Error(PAYMENT_CHECKOUT_DISABLED_MESSAGE);
  }
}

export function getGateway(): PaymentGateway {
  throw new Error(PAYMENT_CHECKOUT_DISABLED_MESSAGE);
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

/** Payment confirmation and enrollment must be performed by a trusted server. */
export async function processPostPaymentEnrollment(
  _input: PostPaymentEnrollmentInput,
): Promise<PostPaymentEnrollmentResult> {
  throw new Error(PAYMENT_CHECKOUT_DISABLED_MESSAGE);
}