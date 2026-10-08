import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  ShieldCheck, ShieldWarning, ShieldSlash, Warning, ArrowClockwise,
  LockKey, LockSimple, FileLock, CreditCard, Scroll, Fingerprint, ListChecks,
} from '@phosphor-icons/react';
import { Link } from 'react-router-dom';
import { ROUTES } from '@/constants/navigation';
import { runSecurityChecks, type SecurityRunReport, type SecurityCheckResult } from '@/services/securityService';
import { recordAuditEvent } from '@/services/auditService';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { ease: 'easeOut' as const } },
};

const CATEGORY_ICONS: Record<SecurityCheckResult['category'], React.ElementType> = {
  access: ShieldCheck,
  auth: Fingerprint,
  storage: FileLock,
  payments: CreditCard,
  audit: Scroll,
  client: LockKey,
};

const STATUS_META: Record<SecurityCheckResult['status'], { label: string; badge: string; icon: React.ElementType }> = {
  pass: { label: 'Pass', badge: 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-400 dark:ring-emerald-900', icon: ShieldCheck },
  warn: { label: 'Warning', badge: 'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950/50 dark:text-amber-400 dark:ring-amber-900', icon: Warning },
  fail: { label: 'Failed', badge: 'bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-950/50 dark:text-rose-400 dark:ring-rose-900', icon: ShieldSlash },
  unknown: { label: 'Unknown', badge: 'bg-zinc-100 text-zinc-600 ring-zinc-200 dark:bg-zinc-900 dark:text-zinc-400 dark:ring-zinc-800', icon: ShieldCheck },
};

export function AdminSecurityPage() {
  const [report, setReport] = useState<SecurityRunReport | null>(null);
  const [running, setRunning] = useState(false);

  const run = useCallback(async () => {
    setRunning(true);
    setReport((r) => (r ? { ...r, checks: r.checks.map((c) => ({ ...c, status: 'unknown' as const })) } : r));
    try {
      const result = await runSecurityChecks();
      setReport(result);
      try {
        await recordAuditEvent({
          action: 'update',
          entityType: 'security_console',
          severity: result.failed > 0 ? 'critical' : 'info',
          meta: { passed: result.passed, warned: result.warned, failed: result.failed, scope: result.checks.map((c) => c.id) },
        });
      } catch {
        /* audit write is best-effort from the console */
      }
      toast.success(`Security self-test complete — ${result.passed} passed, ${result.warned} warnings, ${result.failed} failed`);
    } catch (err) {
      toast.error(`Security scan failed: ${err instanceof Error ? err.message : 'unknown error'}`);
    } finally {
      setRunning(false);
    }
  }, []);

  const score = report ? Math.round((report.passed / Math.max(report.checks.length, 1)) * 100) : 0;

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
      <motion.div variants={itemVariants} className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
            <ShieldCheck size={24} className="text-emerald-600" />
            Security Console
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            Live posture checks against RLS enforcement, key exposure, storage buckets, payment integrity and the audit trail.
          </p>
        </div>
        <Button onClick={() => void run()} disabled={running} className="bg-emerald-600 hover:bg-emerald-700">
          <ArrowClockwise size={16} className={`mr-1.5 ${running ? 'animate-spin' : ''}`} />
          {running ? 'Scanning…' : report ? 'Re-run scan' : 'Run security scan'}
        </Button>
      </motion.div>

      {!report && !running && (
        <motion.div variants={itemVariants}>
          <Card className="border-dashed border-zinc-300 dark:border-zinc-700">
            <CardContent className="p-10 text-center">
              <LockSimple size={36} className="mx-auto text-zinc-300 dark:text-zinc-600" />
              <p className="mt-3 text-sm font-medium text-zinc-700 dark:text-zinc-300">No scan run yet</p>
              <p className="text-xs text-zinc-500 mt-1 max-w-md mx-auto">
                Run the self-test to probe sensitive tables with the publishable client key, verify storage bucket posture and confirm payment/audit safeguards.
              </p>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {running && (
        <motion.div variants={itemVariants} className="grid gap-3 md:grid-cols-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-32 rounded-xl bg-zinc-100 dark:bg-zinc-900 animate-pulse" />
          ))}
        </motion.div>
      )}

      {report && !running && (
        <>
          <motion.div variants={itemVariants} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="border-zinc-200 dark:border-zinc-800">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-zinc-900 dark:text-white">{score}%</p>
                  <p className="text-xs text-zinc-500">Security score</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-zinc-200 dark:border-zinc-800">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <ListChecks size={20} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-zinc-900 dark:text-white">{report.passed}</p>
                  <p className="text-xs text-zinc-500">Passed</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-zinc-200 dark:border-zinc-800">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400 flex items-center justify-center shrink-0">
                  <Warning size={20} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-zinc-900 dark:text-white">{report.warned}</p>
                  <p className="text-xs text-zinc-500">Warnings</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-zinc-200 dark:border-zinc-800">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400 flex items-center justify-center shrink-0">
                  <ShieldSlash size={20} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-zinc-900 dark:text-white">{report.failed}</p>
                  <p className="text-xs text-zinc-500">Failed</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={itemVariants} className="grid gap-3 md:grid-cols-2">
            {report.checks.map((check) => {
              const StatusIcon = STATUS_META[check.status].icon;
              const CatIcon = CATEGORY_ICONS[check.category];
              return (
                <Card key={check.id} className="border-zinc-200 dark:border-zinc-800">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 flex items-center justify-center shrink-0">
                          <CatIcon size={16} />
                        </div>
                        <CardTitle className="text-sm font-semibold text-zinc-900 dark:text-white">{check.title}</CardTitle>
                      </div>
                      <Badge className={`shrink-0 ring-1 ${STATUS_META[check.status].badge}`}>
                        <StatusIcon size={12} className="mr-1" />
                        {STATUS_META[check.status].label}
                      </Badge>
                    </div>
                    <CardDescription className="text-xs text-zinc-500 capitalize">{check.category} · {check.id}</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-2 space-y-2">
                    <p className="text-sm text-zinc-700 dark:text-zinc-300">{check.summary}</p>
                    <p className="text-xs text-zinc-500 leading-relaxed">{check.detail}</p>
                    <p className="text-xs rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-2.5 text-zinc-600 dark:text-zinc-400 leading-relaxed">
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">Remediation: </span>
                      {check.remediation}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </motion.div>

          <motion.div variants={itemVariants} className="text-xs text-zinc-400 flex flex-wrap items-center gap-x-4 gap-y-1">
            <span>Scanned {new Date(report.ranAt).toLocaleString('en-US')}</span>
            <Link to={ROUTES.adminAudit} className="text-emerald-600 hover:underline">
              View full audit trail →
            </Link>
            <span className="ml-auto">Checks probe the public anon client only — service-role access is never granted.</span>
          </motion.div>
        </>
      )}
    </motion.div>
  );
}