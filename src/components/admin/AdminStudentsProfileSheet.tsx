import { useState } from 'react';
import {
  EnvelopeSimple, CalendarBlank, MapPin, Phone, ShieldCheck, UserMinus, LockKey,
  BookOpen, CreditCard, ClipboardText, Exam, Certificate, CheckCircle, Wallet, CurrencyCircleDollar, Clock,
} from '@phosphor-icons/react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { getCourseTitle, getQuizTitle, getAssignmentTitle } from '@/services/adminStudentService';
import { StatusBadge, fmtDate, fmtMoney, initials } from './studentHelpers';
import type { StudentDetail } from '@/services/adminStudentService';
import type { User } from '@/types';

function CheckCard({ title, note, icon: Icon }: { title: string; note: string; icon: React.ElementType }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-200 px-6 py-10 text-center dark:border-zinc-800">
      <div className="flex size-10 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
        <Icon className="size-5 text-zinc-400" weight="duotone" />
      </div>
      <p className="mt-3 text-sm font-medium text-zinc-900 dark:text-white">{title}</p>
      <p className="mt-1 max-w-xs text-xs text-zinc-500 dark:text-zinc-400">{note}</p>
    </div>
  );
}

function SnapshotMetric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-zinc-200 p-3 dark:border-zinc-800">
      <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-400">{label}</p>
      <p className="mt-1 text-lg font-semibold text-zinc-900 dark:text-white">{value}</p>
    </div>
  );
}

export function AdminStudentsProfileSheet({
  student, open, onOpenChange, onToggleStatus, tab, onTabChange,
}: {
  student: StudentDetail | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onToggleStatus: (user: User) => void;
  tab: string;
  onTabChange: (tab: string) => void;
}) {
  const [detailLoading, setDetailLoading] = useState(false);
  const s = student;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
        <SheetHeader className="border-b border-zinc-200 pb-4 dark:border-zinc-800">
          <SheetTitle className="text-left text-lg">Student Profile</SheetTitle>
          <SheetDescription className="text-left">
            Complete learning record — enrollments, payments, progress, results & certificates.
          </SheetDescription>
        </SheetHeader>

        {!s || detailLoading ? (
          <div className="space-y-4 p-6">
            <div className="flex items-center gap-4">
              <Skeleton className="size-14 rounded-full" />
              <div className="space-y-2"><Skeleton className="h-4 w-40" /><Skeleton className="h-3 w-56" /></div>
            </div>
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-40 w-full rounded-xl" />
          </div>
        ) : (
          <div className="space-y-6 p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-center gap-4">
                <Avatar className="size-14">
                  <AvatarImage src={s.avatar} alt={s.name} />
                  <AvatarFallback>{initials(s.name)}</AvatarFallback>
                </Avatar>
                <div>
                  <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">{s.name}</h2>
                  <div className="mt-1.5 space-y-1 text-xs text-zinc-500 dark:text-zinc-400">
                    <p className="flex items-center gap-1.5"><EnvelopeSimple className="size-3.5" /> {s.email}</p>
                    {s.phone && <p className="flex items-center gap-1.5"><Phone className="size-3.5" /> {s.phone}</p>}
                    {s.location && <p className="flex items-center gap-1.5"><MapPin className="size-3.5" /> {s.location}</p>}
                    <p className="flex items-center gap-1.5"><CalendarBlank className="size-3.5" /> Registered {fmtDate(s.joinedAt)}</p>
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-start gap-2 sm:items-end">
                <StatusBadge status={s.status ?? 'active'} />
                <Button
                  variant={s.status === 'suspended' ? 'outline' : 'destructive'}
                  size="sm"
                  className="gap-1.5"
                  onClick={() => onToggleStatus(s)}
                >
                  {s.status === 'suspended' ? <><ShieldCheck className="size-4" /> Reactivate</> : <><UserMinus className="size-4" /> Suspend account</>}
                </Button>
              </div>
            </div>

            {s.status === 'suspended' && (
              <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-500/20 dark:bg-red-500/10">
                <UserMinus className="mt-0.5 size-5 shrink-0 text-red-600 dark:text-red-400" weight="bold" />
                <div>
                  <p className="text-sm font-medium text-red-800 dark:text-red-300">Account suspended</p>
                  <p className="mt-0.5 text-xs text-red-700/80 dark:text-red-300/80">
                    This student cannot log in or access course content until the account is reactivated.
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-500/20 dark:bg-emerald-500/10">
              <LockKey className="mt-0.5 size-5 shrink-0 text-emerald-600 dark:text-emerald-400" weight="duotone" />
              <div>
                <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300">Credentials protected</p>
                <p className="mt-0.5 text-xs text-emerald-700/80 dark:text-emerald-300/80">
                  Passwords and authentication tokens are never stored or displayed to administrators.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <SnapshotMetric label="Courses" value={s.enrollments.length} />
              <SnapshotMetric label="Avg. Quiz Score" value={`${s.avgScore}%`} />
              <SnapshotMetric label="Certificates" value={s.certificates.length} />
              <SnapshotMetric label="Total Paid" value={fmtMoney(s.totalSpent, 'USD')} />
            </div>

            <Tabs value={tab} onValueChange={onTabChange}>
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="courses"><BookOpen className="size-4" /><span className="hidden sm:inline">Courses</span></TabsTrigger>
                <TabsTrigger value="payments"><CreditCard className="size-4" /><span className="hidden sm:inline">Payments</span></TabsTrigger>
                <TabsTrigger value="assignments"><ClipboardText className="size-4" /><span className="hidden sm:inline">Assignments</span></TabsTrigger>
                <TabsTrigger value="quizzes"><Exam className="size-4" /><span className="hidden sm:inline">Quizzes</span></TabsTrigger>
                <TabsTrigger value="certificates"><Certificate className="size-4" /><span className="hidden sm:inline">Certs</span></TabsTrigger>
              </TabsList>

              <TabsContent value="courses" className="mt-4 space-y-3">
                {s.enrollments.length === 0 ? (
                  <CheckCard icon={BookOpen} title="No enrollments" note="This student has not enrolled in any courses." />
                ) : s.enrollments.map((enr) => {
                  const done = enr.progress >= 100;
                  return (
                    <div key={enr.id} className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium text-zinc-900 dark:text-white">{getCourseTitle(enr.courseId)}</p>
                        {done ? (
                          <Badge className="gap-1 bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-400">
                            <CheckCircle className="size-3.5" /> Completed
                          </Badge>
                        ) : (
                          <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">{enr.progress}%</span>
                        )}
                      </div>
                      <Progress value={enr.progress} className="mt-2 h-1.5" />
                      <p className="mt-2 text-xs text-zinc-400 dark:text-zinc-500">
                        Enrolled {fmtDate(enr.enrolledAt)}
                        {enr.completedAt ? ` · Completed ${fmtDate(enr.completedAt)}` : ''}
                        {enr.certificateUrl ? ' · Certificate issued' : ''}
                      </p>
                    </div>
                  );
                })}
              </TabsContent>

              <TabsContent value="payments" className="mt-4 space-y-3">
                {s.payments.length === 0 ? (
                  <CheckCard icon={CurrencyCircleDollar} title="No payments" note="No payment transactions recorded for this student." />
                ) : s.payments.map((p) => (
                  <div key={p.id} className="flex items-center justify-between gap-3 rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-zinc-900 dark:text-white">{getCourseTitle(p.courseId)}</p>
                      <p className="mt-0.5 flex items-center gap-1.5 text-xs text-zinc-400 dark:text-zinc-500">
                        <Wallet className="size-3.5" /> {p.method.replace('_', ' ')} · {fmtDate(p.createdAt)}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-sm font-semibold text-zinc-900 dark:text-white">{fmtMoney(p.amount, p.currency)}</span>
                      <StatusBadge status={p.status} />
                    </div>
                  </div>
                ))}
              </TabsContent>

              <TabsContent value="assignments" className="mt-4 space-y-3">
                {s.submissions.length === 0 ? (
                  <CheckCard icon={ClipboardText} title="No submissions" note="This student has not submitted any assignments yet." />
                ) : s.submissions.map((sub) => (
                  <div key={sub.id} className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-zinc-900 dark:text-white">{getAssignmentTitle(sub.assignmentId)}</p>
                      <StatusBadge status={sub.status} />
                    </div>
                    <p className="mt-1.5 line-clamp-2 text-xs text-zinc-500 dark:text-zinc-400">{sub.content}</p>
                    <div className="mt-2 flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5 text-zinc-400 dark:text-zinc-500">
                        <Clock className="size-3.5" /> Submitted {fmtDate(sub.submittedAt)}
                      </span>
                      {sub.score !== undefined && <span className="font-semibold text-zinc-900 dark:text-white">{sub.score}/100</span>}
                    </div>
                    {sub.feedback && (
                      <p className="mt-2 rounded-lg bg-zinc-50 px-3 py-2 text-xs text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
                        “{sub.feedback}”
                      </p>
                    )}
                  </div>
                ))}
              </TabsContent>

              <TabsContent value="quizzes" className="mt-4 space-y-3">
                {s.quizResults.length === 0 ? (
                  <CheckCard icon={Exam} title="No quiz attempts" note="This student has not taken any quizzes yet." />
                ) : s.quizResults.map((r) => {
                  const pct = Math.round((r.score / r.total) * 100);
                  return (
                    <div key={r.id} className="flex items-center justify-between gap-3 rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-zinc-900 dark:text-white">{getQuizTitle(r.quizId)}</p>
                        <p className="mt-0.5 text-xs text-zinc-400 dark:text-zinc-500">{fmtDate(r.completedAt)}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className={`text-sm font-semibold ${r.passed ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>{pct}%</p>
                          <p className="text-[11px] text-zinc-400 dark:text-zinc-500">{r.score}/{r.total}</p>
                        </div>
                        <StatusBadge status={r.passed ? 'graded' : 'late'} />
                      </div>
                    </div>
                  );
                })}
              </TabsContent>

              <TabsContent value="certificates" className="mt-4 space-y-3">
                {s.certificates.length === 0 ? (
                  <CheckCard icon={Certificate} title="No certificates" note="Certificates appear here once a course is fully completed." />
                ) : s.certificates.map((c) => (
                  <div key={c.id} className="flex items-center gap-3 rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
                      <Certificate className="size-5" weight="duotone" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-zinc-900 dark:text-white">{c.courseName}</p>
                      <p className="mt-0.5 text-xs text-zinc-400 dark:text-zinc-500">{c.certificateId} · Issued {fmtDate(c.issuedAt)}</p>
                    </div>
                  </div>
                ))}
              </TabsContent>
            </Tabs>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}