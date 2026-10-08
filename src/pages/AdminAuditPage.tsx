import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link as AppLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowClockwise, FunnelSimple, MagnifyingGlass, ShieldWarning,
  CheckSquare, LockSimple, FileLock, Timer, CaretDown, CaretRight,
} from '@phosphor-icons/react';
import { ROUTES } from '@/constants/navigation';
import {
  fetchAuditLogs, fetchAuditSummary, fetchAuditEntityTypes, recordAuditEvent,
  formatAuditTime, diffSummary, truncateId, SEVERITY_STYLES,
  type AuditLogRow, type AuditSeverity, type AuditAction, type AuditSummary,
} from '@/services/auditService';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { ease: 'easeOut' as const } },
};

function StatCard({ label, value, tone, icon: Icon }: { label: string; value: number; tone: string; icon: React.ElementType }) {
  return (
    <Card className="border-zinc-200 dark:border-zinc-800">
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${tone}`}>
          <Icon size={20} />
        </div>
        <div>
          <p className="text-2xl font-bold text-zinc-900 dark:text-white">{value}</p>
          <p className="text-xs text-zinc-500">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export function AdminAuditPage() {
  const { profile } = useAuth();
  const [logs, setLogs] = useState<AuditLogRow[]>([]);
  const [summary, setSummary] = useState<AuditSummary | null>(null);
  const [entityTypes, setEntityTypes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState<{ action: AuditAction | 'all'; severity: AuditSeverity | 'all'; entity: string | 'all'; query: string }>({
    action: 'all',
    severity: 'all',
    entity: 'all',
    query: '',
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [rows, sum, entities] = await Promise.all([fetchAuditLogs(), fetchAuditSummary(), fetchAuditEntityTypes()]);
      setLogs(rows);
      setSummary(sum);
      setEntityTypes(entities);
    } catch (err) {
      toast.error(`Could not load audit trail: ${err instanceof Error ? err.message : 'unknown error'}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    return logs.filter((r) => {
      if (filters.action !== 'all' && r.action !== filters.action) return false;
      if (filters.severity !== 'all' && r.severity !== filters.severity) return false;
      if (filters.entity !== 'all' && r.entity_type !== filters.entity) return false;
      const q = filters.query.trim().toLowerCase();
      if (!q) return true;
      return [r.action, r.entity_type, r.entity_id, r.user_id, r.ip_address].some((v) => v?.toLowerCase().includes(q));
    });
  }, [logs, filters]);

  const toggleRow = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleExportAudit = async () => {
    try {
      await recordAuditEvent({
        action: 'export',
        entityType: 'audit_logs',
        meta: { scope: 'admin-console', count: filtered.length },
        severity: 'warning',
      });
      const blob = new Blob([JSON.stringify(filtered, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-log-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Exported ${filtered.length} audit entries`);
    } catch (err) {
      toast.error(`Export failed: ${err instanceof Error ? err.message : 'unknown error'}`);
    }
  };

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
      <motion.div variants={itemVariants} className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
            <ShieldWarning size={24} className="text-emerald-600" />
            Security Audit Trail
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            Immutable record of sensitive actions across payments, enrollments, courses, certificates and admin activity.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => void load()} disabled={loading}>
            <ArrowClockwise size={16} className="mr-1" /> Refresh
          </Button>
          <Button variant="outline" onClick={() => void handleExportAudit()}>
            <FileLock size={16} className="mr-1" /> Export
          </Button>
        </div>
      </motion.div>

      <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Events (last 1,000)" value={summary?.total ?? 0} tone="bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400" icon={CheckSquare} />
        <StatCard label="Critical" value={summary?.critical ?? 0} tone="bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400" icon={ShieldWarning} />
        <StatCard label="Warning" value={summary?.warning ?? 0} tone="bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400" icon={LockSimple} />
        <StatCard label="Info" value={summary?.info ?? 0} tone="bg-sky-50 text-sky-600 dark:bg-sky-950/50 dark:text-sky-400" icon={Timer} />
      </motion.div>

      <motion.div variants={itemVariants} className="flex flex-col gap-2 md:flex-row md:items-center flex-wrap">
        <div className="relative flex-1 md:max-w-xs">
          <MagnifyingGlass size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            value={filters.query}
            onChange={(e) => setFilters((f) => ({ ...f, query: e.target.value }))}
            placeholder="Search action, entity, IP…"
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <FunnelSimple size={14} className="text-zinc-400" />
          <select
            value={filters.severity}
            onChange={(e) => setFilters((f) => ({ ...f, severity: e.target.value as AuditSeverity | 'all' }))}
            className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-2 py-2 text-zinc-700 dark:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
          >
            <option value="all">All severities</option>
            <option value="critical">Critical</option>
            <option value="warning">Warning</option>
            <option value="info">Info</option>
          </select>
          <select
            value={filters.action}
            onChange={(e) => setFilters((f) => ({ ...f, action: e.target.value as AuditAction | 'all' }))}
            className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-2 py-2 text-zinc-700 dark:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
          >
            <option value="all">All actions</option>
            <option value="create">create</option>
            <option value="update">update</option>
            <option value="delete">delete</option>
            <option value="login">login</option>
            <option value="export">export</option>
            <option value="download">download</option>
          </select>
          {entityTypes.length > 0 && (
            <select
              value={filters.entity}
              onChange={(e) => setFilters((f) => ({ ...f, entity: e.target.value }))}
              className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-2 py-2 text-zinc-700 dark:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
            >
              <option value="all">All entities</option>
              {entityTypes.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          )}
        </div>
      </motion.div>

      <motion.div variants={itemVariants} className="space-y-2">
        {loading ? (
          <div className="grid gap-2">{Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-14 rounded-xl bg-zinc-100 dark:bg-zinc-900 animate-pulse" />
          ))}</div>
        ) : filtered.length === 0 ? (
          <Card className="border-dashed border-zinc-300 dark:border-zinc-700">
            <CardContent className="p-10 text-center">
              <ShieldWarning size={32} className="mx-auto text-zinc-300 dark:text-zinc-600" />
              <p className="mt-3 text-sm font-medium text-zinc-700 dark:text-zinc-300">No audit entries match the current filters</p>
              <p className="text-xs text-zinc-500 mt-1">Sensitive writes (payments, enrollments, courses, certificates) are recorded automatically by database triggers.</p>
            </CardContent>
          </Card>
        ) : (
          filtered.map((row) => {
            const isOpen = expanded.has(row.id);
            const sev = row.severity ?? 'info';
            return (
              <div key={row.id} className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
                <button
                  onClick={() => toggleRow(row.id)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800/60 transition-colors"
                >
                  <span className={`shrink-0 w-2 h-2 rounded-full ${sev === 'critical' ? 'bg-rose-500' : sev === 'warning' ? 'bg-amber-500' : 'bg-sky-500'}`} />
                  {isOpen ? <CaretDown size={14} className="text-zinc-400 shrink-0" /> : <CaretRight size={14} className="text-zinc-400 shrink-0" />}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-zinc-900 dark:text-white truncate">
                      <span className="font-mono text-emerald-600 dark:text-emerald-400">{row.action}</span>
                      <span className="text-zinc-400 mx-1.5">on</span>
                      {row.entity_type}
                      <span className="ml-2 hidden sm:inline text-xs text-zinc-500 font-normal">{diffSummary(row)}</span>
                    </p>
                    <p className="text-xs text-zinc-500 truncate mt-0.5">
                      {formatAuditTime(row.created_at)} · user {truncateId(row.user_id)} · {row.ip_address ?? 'no IP'}
                    </p>
                  </div>
                  <Badge className={`shrink-0 ring-1 ${SEVERITY_STYLES[sev]}`}>{sev}</Badge>
                </button>
                {isOpen && (
                  <div className="px-4 pb-4 border-t border-zinc-100 dark:border-zinc-800 grid gap-4 md:grid-cols-2 bg-zinc-50/60 dark:bg-zinc-950/40">
                    <div className="pt-3">
                      <p className="text-[10px] uppercase tracking-wide text-zinc-400 mb-1">Before</p>
                      <pre className="text-[11px] font-mono text-zinc-600 dark:text-zinc-400 whitespace-pre-wrap break-words bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-2 max-h-40 overflow-auto">
                        {JSON.stringify(row.old_values ?? {}, null, 1)}
                      </pre>
                    </div>
                    <div className="pt-3">
                      <p className="text-[10px] uppercase tracking-wide text-zinc-400 mb-1">After</p>
                      <pre className="text-[11px] font-mono text-zinc-600 dark:text-zinc-400 whitespace-pre-wrap break-words bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-2 max-h-40 overflow-auto">
                        {JSON.stringify(row.new_values ?? {}, null, 1)}
                      </pre>
                    </div>
                    <div className="md:col-span-2">
                      <p className="text-[10px] uppercase tracking-wide text-zinc-400 mb-1">Metadata</p>
                      <pre className="text-[11px] font-mono text-zinc-500 dark:text-zinc-500 whitespace-pre-wrap break-words bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-2">
                        {JSON.stringify(row.meta ?? {}, null, 1)}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </motion.div>

      {profile && (
        <p className="text-xs text-zinc-400 text-right">
          Reviewed by {profile.full_name ?? profile.email} · <LinkLike to={ROUTES.adminSecurity} label="Run security self-test" />
        </p>
      )}
    </motion.div>
  );
}

function LinkLike({ to, label }: { to: string; label: string }) {
  return <AppLink to={to} className="text-emerald-600 hover:underline">{label}</AppLink>;
}