import { supabase } from '@/integrations/supabase/client';

/* ----------------------------- Types ------------------------------- */

export type AuditSeverity = 'info' | 'warning' | 'critical';
export type AuditAction = 'create' | 'update' | 'delete' | 'login' | 'export' | 'download' | string;

export interface AuditLogRow {
  id: string;
  user_id: string | null;
  action: AuditAction;
  entity_type: string;
  entity_id: string | null;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  ip_address: string | null;
  severity: AuditSeverity;
  meta: Record<string, unknown> | null;
  created_at: string;
}

export interface AuditLogFilters {
  action?: AuditAction | 'all';
  severity?: AuditSeverity | 'all';
  entityType?: string | 'all';
  query?: string;
  limit?: number;
}

export type AuditSummary = {
  total: number;
  critical: number;
  warning: number;
  info: number;
  byAction: { action: string; count: number }[];
  byEntity: { entity_type: string; count: number }[];
};

/* ---------------------------- Helpers ------------------------------ */

export const SEVERITY_STYLES: Record<AuditSeverity, string> = {
  info: 'bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-950/50 dark:text-sky-400 dark:ring-sky-900',
  warning: 'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950/50 dark:text-amber-400 dark:ring-amber-900',
  critical: 'bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-950/50 dark:text-rose-400 dark:ring-rose-900',
};

/** Map a raw DB row (snake_case from the trigger function) to the UI shape. */
export function mapAuditRow(r: Record<string, unknown>): AuditLogRow {
  return {
    id: String(r.id ?? ''),
    user_id: (r.user_id as string | null) ?? null,
    action: (r.action as AuditAction) ?? 'unknown',
    entity_type: String(r.entity_type ?? 'system'),
    entity_id: (r.entity_id as string | null) ?? null,
    old_values: (r.old_values as Record<string, unknown> | null) ?? null,
    new_values: (r.new_values as Record<string, unknown> | null) ?? null,
    ip_address: (r.ip_address as string | null) ?? null,
    severity: (r.severity as AuditSeverity) ?? 'info',
    meta: (r.meta as Record<string, unknown> | null) ?? null,
    created_at: String(r.created_at ?? new Date().toISOString()),
  };
}

const FORMATTER = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

export function formatAuditTime(iso: string): string {
  try {
    return FORMATTER.format(new Date(iso));
  } catch {
    return iso;
  }
}

export function truncateId(id: string | null | undefined, len = 8): string {
  return id ? `${id.slice(0, len)}…` : '—';
}

export function diffSummary(row: AuditLogRow): string {
  if (row.action === 'create' && row.new_values) return 'record created';
  if (row.action === 'delete' && row.old_values) return 'record deleted';
  if (row.action === 'update' && row.old_values && row.new_values) {
    const keys = Object.keys(row.new_values).filter((k) => row.old_values?.[k] !== row.new_values?.[k]);
    return keys.length > 0 ? `changed: ${keys.slice(0, 4).join(', ')}${keys.length > 4 ? '…' : ''}` : 'no changes';
  }
  return row.action;
}

/* ---------------------------- Queries ------------------------------ */

/** Admin reads the full audit trail. The DB view restricts to admin/super_admin. */
export async function fetchAuditLogs(filters: AuditLogFilters = {}): Promise<AuditLogRow[]> {
  const q = supabase
    .from('audit_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(filters.limit ?? 250);
  if (filters.action && filters.action !== 'all') q.eq('action', filters.action);
  if (filters.severity && filters.severity !== 'all') q.eq('severity', filters.severity);
  if (filters.entityType && filters.entityType !== 'all') q.eq('entity_type', filters.entityType);
  const { data, error } = await q;
  if (error) throw error;
  const rows = (data ?? []).map(mapAuditRow);
  const sq = filters.query?.trim().toLowerCase();
  if (!sq) return rows;
  return rows.filter((r) =>
    [r.action, r.entity_type, r.entity_id, r.user_id, r.ip_address].some((v) => v?.toLowerCase().includes(sq ?? ''))
  );
}

/** Aggregates for the summary stat cards; reads the most recent 1000 rows once. */
export async function fetchAuditSummary(): Promise<AuditSummary> {
  const { data, error } = await supabase
    .from('audit_logs')
    .select('action, severity, entity_type')
    .order('created_at', { ascending: false })
    .limit(1000);
  if (error) throw error;
  const rows = data ?? [];
  const byAction = new Map<string, number>();
  const byEntity = new Map<string, number>();
  let critical = 0;
  let warning = 0;
  for (const r of rows) {
    const sev = (r.severity ?? 'info') as AuditSeverity;
    if (sev === 'critical') critical += 1;
    if (sev === 'warning') warning += 1;
    byAction.set(String(r.action ?? 'unknown'), (byAction.get(String(r.action ?? 'unknown')) ?? 0) + 1);
    byEntity.set(String(r.entity_type ?? 'system'), (byEntity.get(String(r.entity_type ?? 'system')) ?? 0) + 1);
  }
  return {
    total: rows.length,
    critical,
    warning,
    info: rows.length - critical - warning,
    byAction: [...byAction.entries()].map(([action, count]) => ({ action, count })),
    byEntity: [...byEntity.entries()].map(([entity_type, count]) => ({ entity_type, count })),
  };
}

/** Explicitly record an event via the SECURITY DEFINER `record_audit_event` RPC. */
export async function recordAuditEvent(opts: {
  action: string;
  entityType?: string;
  entityId?: string;
  meta?: Record<string, unknown>;
  severity?: AuditSeverity;
}): Promise<string> {
  const { data, error } = await supabase.rpc('record_audit_event', {
    p_action: opts.action,
    p_entity_type: opts.entityType ?? null,
    p_entity_id: opts.entityId ?? null,
    p_meta: opts.meta ?? null,
    p_severity: opts.severity ?? 'info',
  });
  if (error) throw error;
  return String(data ?? '');
}

/** Distinct entity types seen in the trail (dynamic filter keys, never hardcoded). */
export async function fetchAuditEntityTypes(): Promise<string[]> {
  const { data, error } = await supabase
    .from('audit_logs')
    .select('entity_type')
    .order('created_at', { ascending: false })
    .limit(500);
  if (error) throw error;
  return [...new Set((data ?? []).map((r) => String(r.entity_type ?? 'system')))];
}