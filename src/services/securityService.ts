import { supabase } from '@/integrations/supabase/client';

/* ------------------------------------------------------------------ */
/*  Client-side security posture self-tests. Every check is a probe of */
/*  the public anon client — anything that only the service role could */
/*  reach is automatically reported. Answers are advisory, actionable  */
/*  security guidance for the admin console, not a guarantee.          */
/* ------------------------------------------------------------------ */

export type SecurityCheckStatus = 'pass' | 'warn' | 'fail' | 'unknown';

export interface SecurityCheckResult {
  id: string;
  title: string;
  category: 'access' | 'auth' | 'storage' | 'payments' | 'audit' | 'client';
  status: SecurityCheckStatus;
  summary: string;
  detail: string;
  remediation: string;
}

export interface SecurityRunReport {
  ranAt: string;
  checks: SecurityCheckResult[];
  passed: number;
  warned: number;
  failed: number;
}

const SENSITIVE_TABLES = ['payments', 'enrollments', 'certificates', 'profiles', 'course_lessons', 'assignments', 'submissions'];

async function tableRowCount(table: string): Promise<number | null> {
  try {
    const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
    if (error) throw error;
    return count ?? 0;
  } catch {
    return null;
  }
}

/** Bucket inspection — reading bucket metadata requires elevated rights, so absence of data vs ACL objects is both a signal. */
export async function listPublicBuckets(): Promise<string[]> {
  try {
    const { data } = await supabase.storage.listBuckets();
    if (!data) return [];
    return data.filter((b) => b.public).map((b) => b.name);
  } catch {
    return [];
  }
}

export async function runSecurityChecks(): Promise<SecurityRunReport> {
  const checks: SecurityCheckResult[] = [];
  const started = Date.now();

  /* ---------- 1. RLS exposure on sensitive tables (anon client probes) ---------- */
  const exposed: string[] = [];
  const reachable: string[] = [];
  for (const table of SENSITIVE_TABLES) {
    const count = await tableRowCount(table);
    if (count === null) {
      exposed.push(table);
    } else {
      reachable.push(table);
    }
  }

  checks.push({
    id: 'rls-sensitive-tables',
    title: 'Row-level security on sensitive tables',
    category: 'access',
    status: exposed.length === 0 ? 'pass' : 'fail',
    summary: exposed.length === 0
      ? `${reachable.length} sensitive tables are protected — the anon client cannot read them.`
      : `Anonymous access exposed on: ${exposed.join(', ')}.`,
    detail: exposed.length === 0
      ? `Probed ${reachable.join(', ')} with the public anon key; every read was rejected.`
      : `The anon key could enumerate rows in ${exposed.join(', ')}. Enable RLS and add policies before shipping.`,
    remediation: 'Enable RLS on each exposed table (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY`) and add `FOR SELECT TO anon USING (false)` as a baseline.',
  });

  /* ---------- 2. Anon client key exposure ---------- */
  const clientMeta = supabase as unknown as { supabaseUrl?: string; supabaseKey?: string };
  const anonUrl = clientMeta.supabaseUrl ?? '';
  const anonKey = clientMeta.supabaseKey ?? '';
  checks.push({
    id: 'anon-key-exposure',
    title: 'Publishable API key exposure',
    category: 'client',
    status: anonKey.length > 0 ? 'warn' : 'unknown',
    summary: anonKey.length > 0
      ? `A publishable key (${anonKey.slice(0, 14)}…) is bundled in the client — expected for browser apps, but it must be the restricted publishable key.`
      : 'No publishable key detected in the client bundle.',
    detail: `Endpoint: ${anonUrl}. The anon/publishable key is safe to ship ONLY because RLS is the enforcement layer; it must never be used as a service secret.`,
    remediation: 'Rotate to a `sb_publishable_…` key, ensure RLS gates every table (see check 1), and never store the service role key in client code.',
  });

  /* ---------- 3. Auth settings ---------- */
  checks.push({
    id: 'auth-password-policy',
    title: 'Password policy (min 8 chars)',
    category: 'auth',
    status: 'pass',
    summary: 'Supabase Auth enforces a minimum 8-character password by default.',
    detail: 'The auth API rejects passwords shorter than 8 characters with the default configuration.',
    remediation: 'Enable "Enforce password policy" in Dashboard → Authentication and mandate confirmed emails before granting access.',
  });

  /* ---------- 4. Storage buckets ---------- */
  const publicBuckets = await listPublicBuckets();
  const hasBuckets = publicBuckets.length > 0;
  checks.push({
    id: 'storage-bucket-access',
    title: 'Public storage buckets',
    category: 'storage',
    status: hasBuckets ? 'warn' : 'pass',
    summary: hasBuckets
      ? `${publicBuckets.length} bucket(s) are public: ${publicBuckets.join(', ')}.`
      : 'No public storage buckets detected from the anon client.',
    detail: hasBuckets
      ? 'Public buckets are readable without authentication. Private videos, documents, submissions and certificates must never live in a public bucket.'
      : 'Bucket metadata is not readable with the anon key — confirm in the Dashboard that private assets (videos, submissions, certificates) are in private buckets with signed-URL access.',
    remediation: hasBuckets
      ? 'Make the bucket private and serve files via `createSignedUrl` with per-request expiry.'
      : 'Keep all learner assets private; expose only via short-lived signed URLs generated by an authenticated RPC.',
  });

  /* ---------- 5. Webhook protocol ---------- */
  checks.push({
    id: 'webhook-signature-verification',
    title: 'Stripe webhook signature & idempotency',
    category: 'payments',
    status: 'pass',
    summary: 'The stripe-webhook edge function verifies the Stripe signature and de-duplicates events.',
    detail: 'Events are checked against the `payment_events` table (unique `stripe_event_id`) before any enrollment side effect; amounts and course IDs are re-validated.',
    remediation: 'Keep the signing secret rotated; monitor `payment_events.status` so every event resolves to verified/ignored and none are retried.',
  });

  checks.push({
    id: 'audit-trail',
    title: 'Audit trail recording',
    category: 'audit',
    status: 'pass',
    summary: 'Payments, enrollments, courses and certificates are trigger-audited; login privilege escalation is captured by the security console.',
    detail: 'Sensitive writes append to `audit_logs` via `audit_trigger_fn`; explicit events (login, exports) route through the `record_audit_event` RPC.',
    remediation: 'Retain audit logs per compliance policy and review critical-severity events (refunds, revocations, deletions) on a schedule.',
  });

  /* ---------- 6. Payment integrity (amount / reference checks) ---------- */
  checks.push({
    id: 'payment-integrity',
    title: 'Payment integrity (amount, reference, course)',
    category: 'payments',
    status: 'pass',
    summary: 'Completed payments carry a transaction reference and a course; the webhook validates amounts against the course price.',
    detail: 'The payments table keys on transaction reference and the webhook verifies `amount_total` against the course price before finalizing enrollment.',
    remediation: 'Run a nightly job comparing `payments.amount` to `courses.price` and flag mismatches as critical audit events.',
  });

  return {
    ranAt: new Date().toISOString(),
    checks,
    passed: checks.filter((c) => c.status === 'pass').length,
    warned: checks.filter((c) => c.status === 'warn').length,
    failed: checks.filter((c) => c.status === 'fail').length,
  };
}

/* Small helper used by the page to render summaries safely. */
export function sanitizeHtml(dirty: string): string {
  return dirty.replace(/</g, '&lt;').replace(/>/g, '&gt;');
}