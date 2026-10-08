import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Wallet, CheckCircle, ArrowCounterClockwise, Clock, Funnel,
  MagnifyingGlass, Download, Bank, Cards, DeviceMobile, Recycle,
  Prohibit, X,
} from '@phosphor-icons/react';
import { SEED_COURSES } from '@/data';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  fetchAdminPayments, processPaymentRefund,
  type AdminPayment, type PaymentStatus, type PaymentFilters,
} from '@/services/adminService';
import { useAuth } from '@/contexts/AuthContext';

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { ease: 'easeOut' as const } },
};

const inputCls =
  'w-full h-9 pl-8 pr-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30';
const selectCls =
  'h-9 px-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30';

const statusStyles: Record<PaymentStatus, string> = {
  completed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border-0',
  pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 border-0',
  refunded: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border-0',
  failed: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 border-0',
};

const providerIcon = (p: string) => {
  const s = p.toLowerCase();
  if (s.includes('card') || s.includes('visa') || s.includes('master')) return <Cards size={14} className="text-zinc-400" />;
  if (s.includes('momo') || s.includes('mobile') || s.includes('mtn')) return <DeviceMobile size={14} className="text-zinc-400" />;
  if (s.includes('bank')) return <Bank size={14} className="text-zinc-400" />;
  return <Wallet size={14} className="text-zinc-400" />;
};

const fmtMoney = (n: number, c: string) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: c || 'USD' }).format(n);

export function AdminPaymentsPage() {
  const { profile } = useAuth();
  const [payments, setPayments] = useState<AdminPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refunding, setRefunding] = useState(false);
  const [selected, setSelected] = useState<AdminPayment | null>(null);
  const [policy, setPolicy] = useState<'full' | 'partial'>('full');
  const [partialAmount, setPartialAmount] = useState('');
  const [reason, setReason] = useState('');
  const [filters, setFilters] = useState<PaymentFilters>({ status: 'all', courseId: 'all' });

  const load = async (f: PaymentFilters) => {
    setLoading(true);
    try {
      const rows = await fetchAdminPayments(f);
      setPayments(rows);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load payments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(() => load(filters), 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const metrics = useMemo(() => {
    const completed = payments.filter((p) => p.status === 'completed');
    const refunded = payments.filter((p) => p.status === 'refunded');
    const pending = payments.filter((p) => p.status === 'pending');
    return {
      totalVolume: payments.reduce((s, p) => s + p.amount, 0),
      completedVolume: completed.reduce((s, p) => s + p.amount, 0),
      refundedAmount: refunded.reduce((s, p) => s + (p.refundAmount ?? p.amount), 0),
      pendingInflow: pending.reduce((s, p) => s + p.amount, 0),
    };
  }, [payments]);

  const openRefund = (p: AdminPayment) => {
    setSelected(p);
    setPolicy('full');
    setPartialAmount('');
    setReason('');
  };

  const confirmRefund = async () => {
    if (!selected) return;
    setRefunding(true);
    try {
      const amt = policy === 'partial' ? Number(partialAmount) : null;
      if (policy === 'partial' && (!amt || amt < 0.01 || amt > selected.amount)) {
        toast.error(`Partial amount must be between 0.01 and ${fmtMoney(selected.amount, selected.currency)}`);
        return;
      }
      const res = await processPaymentRefund(selected.id, policy, amt, reason, profile?.id);
      if (!res.ok) {
        toast.error(res.message);
        return;
      }
      toast.success(res.message);
      setSelected(null);
      await load(filters);
    } catch (err: any) {
      toast.error(err.message || 'Refund failed');
    } finally {
      setRefunding(false);
    }
  };

  const exportCsv = () => {
    const head = 'Transaction Ref,Student,Email,Course,Amount,Currency,Provider,Status,Date,Refund Reason';
    const lines = payments.map((p) =>
      [
        p.transactionRef.replace(/,/g, ' '),
        p.studentName.replace(/,/g, ' '),
        p.studentEmail,
        p.courseTitle.replace(/,/g, ' '),
        p.amount,
        p.currency,
        p.provider.replace(/,/g, ' '),
        p.status,
        new Date(p.createdAt).toLocaleDateString('en-US'),
        (p.refundReason || '').replace(/,/g, ' '),
      ].join(',')
    );
    const csv = [head, ...lines].join(String.fromCharCode(10));
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payments-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Payments exported to CSV');
  };

  return (
    <motion.div initial="hidden" animate="visible" variants={itemVariants} className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">Payments</h1>
          <p className="text-zinc-500 dark:text-zinc-400 mt-1 text-sm">
            Transaction ledger with audited refund controls
          </p>
        </div>
        <Button variant="outline" onClick={exportCsv} className="gap-2 shrink-0">
          <Download size={16} /> Export CSV
        </Button>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Volume', value: fmtMoney(metrics.totalVolume, 'USD'), icon: Wallet, cls: 'text-zinc-600 bg-zinc-100 dark:bg-zinc-800' },
          { label: 'Completed', value: fmtMoney(metrics.completedVolume, 'USD'), icon: CheckCircle, cls: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30' },
          { label: 'Refunded', value: fmtMoney(metrics.refundedAmount, 'USD'), icon: ArrowCounterClockwise, cls: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30' },
          { label: 'Pending Inflow', value: fmtMoney(metrics.pendingInflow, 'USD'), icon: Clock, cls: 'text-amber-600 bg-amber-100 dark:bg-amber-900/30' },
        ].map((m) => (
          <Card key={m.label} className="border-zinc-200 dark:border-zinc-800">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${m.cls}`}>
                <m.icon size={20} />
              </div>
              <div className="min-w-0">
                <p className="text-lg font-bold text-zinc-900 dark:text-white truncate">{m.value}</p>
                <p className="text-xs text-zinc-500">{m.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card className="border-zinc-200 dark:border-zinc-800">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-xs font-medium text-zinc-500 mb-3">
            <Funnel size={14} /> Filters
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="relative">
              <MagnifyingGlass size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                className={inputCls}
                placeholder="Student or reference"
                value={filters.studentQuery || ''}
                onChange={(e) => setFilters({ ...filters, studentQuery: e.target.value })}
              />
            </div>
            <select
              className={selectCls}
              value={filters.status || 'all'}
              onChange={(e) => setFilters({ ...filters, status: e.target.value as PaymentStatus | 'all' })}
            >
              <option value="all">All statuses</option>
              <option value="completed">Completed</option>
              <option value="pending">Pending</option>
              <option value="refunded">Refunded</option>
              <option value="failed">Failed</option>
            </select>
            <select
              className={selectCls}
              value={filters.courseId || 'all'}
              onChange={(e) => setFilters({ ...filters, courseId: e.target.value })}
            >
              <option value="all">All courses</option>
              {SEED_COURSES.map((c) => (
                <option key={c.id} value={c.id}>{c.title}</option>
              ))}
            </select>
            <input
              type="date"
              className={selectCls}
              value={filters.dateFrom || ''}
              onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value || undefined })}
            />
            <input
              type="date"
              className={selectCls}
              value={filters.dateTo || ''}
              onChange={(e) => setFilters({ ...filters, dateTo: e.target.value || undefined })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Transactions table */}
      <Card className="border-zinc-200 dark:border-zinc-800">
        <CardContent className="p-0 overflow-x-auto">
          {loading ? (
            <div className="p-6 space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-12 bg-zinc-100 dark:bg-zinc-800 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : payments.length === 0 ? (
            <div className="p-12 text-center">
              <Wallet size={36} className="mx-auto text-zinc-300 mb-3" />
              <p className="text-zinc-500 text-sm">No payments match the selected filters</p>
            </div>
          ) : (
            <table className="w-full text-sm min-w-[860px]">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-zinc-400 border-b border-zinc-100 dark:border-zinc-800">
                  <th className="px-4 py-3 font-medium">Transaction</th>
                  <th className="px-4 py-3 font-medium">Student</th>
                  <th className="px-4 py-3 font-medium">Course</th>
                  <th className="px-4 py-3 font-medium text-right">Amount</th>
                  <th className="px-4 py-3 font-medium">Provider</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {payments.map((p) => (
                  <tr key={p.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-mono text-xs text-zinc-600 dark:text-zinc-300">{p.transactionRef}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-zinc-900 dark:text-white">{p.studentName}</p>
                      <p className="text-xs text-zinc-400">{p.studentEmail}</p>
                    </td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300 max-w-[220px] truncate">{p.courseTitle}</td>
                    <td className="px-4 py-3 text-right font-semibold text-zinc-900 dark:text-white">
                      {fmtMoney(p.amount, p.currency)}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5 text-zinc-500">
                        {providerIcon(p.provider)} {p.provider}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={`${statusStyles[p.status]} text-[11px] px-2 py-0.5`}>{p.status}</Badge>
                      {p.refundedAt && (
                        <p className="text-[10px] text-zinc-400 mt-1" title={p.refundReason}>
                          {new Date(p.refundedAt).toLocaleDateString('en-US')}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-zinc-500 whitespace-nowrap">
                      {new Date(p.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {p.status === 'completed' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openRefund(p)}
                          className="gap-1.5 text-blue-600 hover:text-blue-700 border-blue-200 dark:border-blue-900"
                        >
                          <Recycle size={14} /> Refund
                        </Button>
                      )}
                      {p.status === 'refunded' && (
                        <span className="text-[11px] text-zinc-400 italic">Processed</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Protected Refund Dialog */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowCounterClockwise size={18} className="text-blue-600" />
              Process Refund
            </DialogTitle>
            <DialogDescription>
              Refunds are protected and audited. The transaction status, enrollment access and a full audit entry are updated atomically.
            </DialogDescription>
          </DialogHeader>

          {selected && (
            <div className="space-y-4">
              <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-zinc-500">Transaction</span>
                  <span className="font-mono text-xs text-zinc-700 dark:text-zinc-200">{selected.transactionRef}</span>
                </div>
                <div className="flex justify-between mt-1.5">
                  <span className="text-zinc-500">Student</span>
                  <span className="text-zinc-900 dark:text-white font-medium">{selected.studentName}</span>
                </div>
                <div className="flex justify-between mt-1.5">
                  <span className="text-zinc-500">Course</span>
                  <span className="text-zinc-900 dark:text-white">{selected.courseTitle}</span>
                </div>
                <div className="flex justify-between mt-1.5">
                  <span className="text-zinc-500">Paid</span>
                  <span className="text-zinc-900 dark:text-white font-semibold">{fmtMoney(selected.amount, selected.currency)}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {([
                  { key: 'full' as const, label: 'Full refund', desc: 'Revokes course access' },
                  { key: 'partial' as const, label: 'Partial refund', desc: 'Keeps access' },
                ]).map((opt) => (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => setPolicy(opt.key)}
                    className={`text-left p-3 rounded-lg border-2 transition-all ${
                      policy === opt.key
                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                        : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300'
                    }`}
                  >
                    <p className={`text-sm font-medium ${policy === opt.key ? 'text-emerald-700 dark:text-emerald-300' : 'text-zinc-800 dark:text-zinc-200'}`}>{opt.label}</p>
                    <p className="text-[11px] text-zinc-400 mt-0.5">{opt.desc}</p>
                  </button>
                ))}
              </div>

              {policy === 'partial' && (
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                    Refund amount
                  </label>
                  <input
                    type="number"
                    min={0.01}
                    max={selected.amount}
                    step={0.01}
                    value={partialAmount}
                    onChange={(e) => setPartialAmount(e.target.value)}
                    placeholder={selected.amount.toFixed(2)}
                    className="w-full h-10 px-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Reason <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                  placeholder="Required: why is this refund being processed?"
                  className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 resize-none"
                />
              </div>

              <div className="flex items-start gap-2 rounded-lg bg-zinc-50 dark:bg-zinc-900 p-3 text-[11px] text-zinc-500">
                <Prohibit size={14} className="shrink-0 text-zinc-400 mt-0.5" />
                <span>
                  Audit preview: <code className="font-mono">PAYMENT_REFUNDED</code> entry with old and new values
                  will be written to audit_logs. This action cannot be undone from the UI.
                </span>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setSelected(null)}>Cancel</Button>
            <Button
              onClick={confirmRefund}
              disabled={refunding || !reason.trim()}
              className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
            >
              {refunding ? 'Processing...' : (
                <>
                  <X size={14} className="hidden" />
                  Confirm Refund
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}