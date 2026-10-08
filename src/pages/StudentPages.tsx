import { Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  BookOpen, Clock, ArrowRight, PlayCircle, Check, ArrowLeft, Trophy,
  Certificate, FilePdf, Download, ListDashes, Spinner, Lock,
  ClipboardText, Exam, TrendUp, Bell, UserCircle, GearSix, Pencil,
  Phone, Envelope, Key, Eye, EyeSlash, ChatCenteredText, ShieldCheck,
  MagnifyingGlass, DotsThreeVertical, SignOut, XCircle,
} from '@phosphor-icons/react';
import { ROUTES } from '@/constants/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { getSignedUrl } from '@/services/storageService';
import { useState, useEffect } from 'react';

type EnrollmentRow = { id: string; course_id: string; status: string; progress: number | null; enrolled_at: string | null; completed_at: string | null };
type CourseRow = { id: string; title: string; slug: string; image: string | null; duration_hours: number | null; total_lessons: number | null; total_modules: number | null };
type AssignmentItem = { id: string; title: string; description: string | null; due_date: string | null; status: string; max_score: number | null; score: number | null; submitted_at: string | null; lesson_title: string };
type QuizResultItem = { id: string; score: number | null; total_questions: number | null; passed: boolean | null; created_at: string | null; lesson_title: string };
type NotificationItem = { id: string; title: string; message: string; type: string; read: boolean | null; created_at: string | null };
type UserProfile = { full_name: string | null; avatar_url: string | null; bio: string | null; phone: string | null; email: string | null };

const itemVariants = { hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { ease: 'easeOut' as const } } };

/* ─── My Courses Page ─── */
export function StudentCoursesPage() {
  const [courses, setCourses] = useState<{ enrollment: EnrollmentRow; course: CourseRow | null }[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');

  useEffect(() => {
    async function load() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setLoading(false); return; }
        const { data: enrollData } = await supabase.from('enrollments').select('*').eq('user_id', user.id).order('enrolled_at', { ascending: false });
        const enrollments = (enrollData || []) as EnrollmentRow[];
        const enriched = await Promise.all(
          enrollments.map(async (e) => {
            const { data: c } = await supabase.from('courses').select('*').eq('id', e.course_id).single();
            return { enrollment: e, course: (c as CourseRow | undefined) || null };
          }),
        );
        setCourses(enriched);
      } catch (err: any) { toast.error(err.message || 'Failed to load courses'); }
      finally { setLoading(false); }
    }
    load();
  }, []);

  const filtered = filter === 'all' ? courses : courses.filter((c) => c.enrollment.status === filter);

  if (loading) return <div className="space-y-4">{[0, 1, 2].map((i) => (<div key={i} className="h-32 bg-zinc-100 dark:bg-zinc-800 rounded-xl animate-pulse" />))}</div>;

  return (
    <motion.div initial="hidden" animate="visible" className="space-y-4">
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-white mb-6">My Courses</h1>
      <Tabs defaultValue={filter} onValueChange={(v) => setFilter(v as typeof filter)} className="mb-6">
        <TabsList><TabsTrigger value="all">All ({courses.length})</TabsTrigger><TabsTrigger value="active">In Progress</TabsTrigger><TabsTrigger value="completed">Completed</TabsTrigger></TabsList>
      </Tabs>
      {filtered.length === 0 ? (
        <Card className="border-dashed border-zinc-300 dark:border-zinc-700"><CardContent className="p-10 text-center">
          <BookOpen size={48} className="mx-auto text-zinc-300 mb-4" />
          <h3 className="font-semibold text-zinc-900 dark:text-white mb-1">No courses found</h3>
          <Link to={ROUTES.courses}><Button className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 mt-4">Browse Courses <ArrowRight size={16} /></Button></Link>
        </CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((item) => {
            const { course, enrollment } = item;
            if (!course) return null;
            const pct = Math.round(Number(enrollment.progress || 0));
            return (
              <motion.div key={enrollment.id} variants={itemVariants}>
                <Link to={`/student/courses/${course.id}/lessons`}>
                  <Card className="border-zinc-200 dark:border-zinc-800 h-full overflow-hidden hover:shadow-lg hover:shadow-emerald-900/5 transition-shadow cursor-pointer group">
                    <div className="aspect-video bg-zinc-100 dark:bg-zinc-800 relative overflow-hidden">
                      {course.image ? <img src={course.image} alt={course.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" /> : <PlayCircle size={40} className="absolute inset-0 m-auto text-zinc-300" />}
                      <Badge className={`absolute top-3 right-3 ${enrollment.status === 'completed' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'} border-0 text-xs`}>{enrollment.status}</Badge>
                    </div>
                    <CardContent className="p-4">
                      <h3 className="font-semibold text-sm text-zinc-900 dark:text-white line-clamp-2 mb-2">{course.title}</h3>
                      <div className="flex items-center gap-3 text-xs text-zinc-400 mb-3"><span className="flex items-center gap-1"><PlayCircle size={12} />{course.total_lessons || 0} lessons</span><span className="flex items-center gap-1"><Clock size={12} />{course.duration_hours || 0}h</span></div>
                      {pct > 0 && <div className="flex items-center gap-2"><div className="flex-1 h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden"><div className="h-full bg-emerald-500 rounded-full" style={{ width: `${pct}%` }} /></div><span className="text-xs font-medium text-zinc-500">{pct}%</span></div>}
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}

/* ─── Assignments Page ─── */
export function StudentAssignmentsPage() {
  const [assignments, setAssignments] = useState<AssignmentItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setLoading(false); return; }
        const { data: enrollData } = await supabase.from('enrollments').select('course_id').eq('user_id', user.id);
        const courseIds = (enrollData || []).map((e: any) => e.course_id);
        if (courseIds.length === 0) { setLoading(false); return; }
        const { data: assignData } = await supabase.from('assignments').select(`*, lessons:lesson_id(title)`).in('course_id', courseIds).order('due_date', { ascending: true });
        if (assignData) setAssignments((assignData as any[]).map((a) => ({ ...a, lesson_title: a.lessons?.title || '' })));
      } catch (err: any) { toast.error(err.message || 'Failed to load assignments'); }
      finally { setLoading(false); }
    }
    load();
  }, []);

  if (loading) return <div className="space-y-4">{[0, 1, 2].map((i) => (<div key={i} className="h-20 bg-zinc-100 dark:bg-zinc-800 rounded-xl animate-pulse" />))}</div>;

  return (
    <motion.div initial="hidden" animate="visible" className="space-y-6">
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Assignments</h1>
      {assignments.length === 0 ? (
        <Card className="border-dashed border-zinc-300 dark:border-zinc-700"><CardContent className="p-10 text-center">
          <ClipboardText size={48} className="mx-auto text-zinc-300 mb-4" />
          <h3 className="font-semibold text-zinc-900 dark:text-white mb-1">No assignments yet</h3>
          <p className="text-sm text-zinc-500">Your instructors will post assignments here.</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-3">
          {assignments.map((a) => (
            <Card key={a.id} className="border-zinc-200 dark:border-zinc-800">
              <CardContent className="p-4 flex items-center gap-4">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                  a.status === 'graded' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30' :
                  a.status === 'submitted' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30' :
                  'bg-amber-100 text-amber-600 dark:bg-amber-900/30'}`}>
                  <ClipboardText size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-sm text-zinc-900 dark:text-white">{a.title}</h3>
                  <p className="text-xs text-zinc-500">{a.lesson_title}</p>
                </div>
                <div className="text-right shrink-0">
                  {a.score !== null && <p className="text-sm font-bold text-zinc-900 dark:text-white">{a.score}/{a.max_score ?? '?'}</p>}
                  <Badge variant="secondary" className="text-xs capitalize">{a.status}</Badge>
                </div>
                <span className="text-xs text-zinc-400 shrink-0">{a.due_date ? new Date(a.due_date).toLocaleDateString() : 'No deadline'}</span>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </motion.div>
  );
}

/* ─── Quizzes Page ─── */
export function StudentQuizzesPage() {
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setLoading(false); return; }
        const { data: enrollData } = await supabase.from('enrollments').select('course_id').eq('user_id', user.id);
        const courseIds = (enrollData || []).map((e: any) => e.course_id);
        if (courseIds.length === 0) { setLoading(false); return; }
        const { data } = await supabase.from('quiz_results').select(`*, lessons:lesson_id(title), quizzes:quiz_id(title, passing_score)`).in('course_id', courseIds).order('created_at', { ascending: false });
        if (data) setQuizzes(data as any[]);
      } catch (err: any) { toast.error(err.message || 'Failed to load quizzes'); }
      finally { setLoading(false); }
    }
    load();
  }, []);

  if (loading) return <div className="space-y-4">{[0, 1, 2].map((i) => (<div key={i} className="h-20 bg-zinc-100 dark:bg-zinc-800 rounded-xl animate-pulse" />))}</div>;

  return (
    <motion.div initial="hidden" animate="visible" className="space-y-6">
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Quizzes</h1>
      {quizzes.length === 0 ? (
        <Card className="border-dashed border-zinc-300 dark:border-zinc-700"><CardContent className="p-10 text-center">
          <Exam size={48} className="mx-auto text-zinc-300 mb-4" />
          <h3 className="font-semibold text-zinc-900 dark:text-white mb-1">No quiz results yet</h3>
          <p className="text-sm text-zinc-500">Complete lessons with quizzes to see your results here.</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-3">
          {quizzes.map((q) => (
            <Card key={q.id} className="border-zinc-200 dark:border-zinc-800">
              <CardContent className="p-4 flex items-center gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${q.passed ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30' : 'bg-red-100 text-red-600 dark:bg-red-900/30'}`}>
                  {q.passed ? <Check size={20} weight="bold" /> : <XCircle size={20} weight="bold" />}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-sm text-zinc-900 dark:text-white">{q.quizzes?.title || q.lessons?.title || 'Quiz'}</h3>
                  <p className="text-xs text-zinc-500">{q.lessons?.title}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-zinc-900 dark:text-white">{q.score !== null ? `${Math.round((q.score / q.total_questions!) * 100)}%` : 'N/A'}</p>
                  <p className="text-xs text-zinc-500">{q.score}/{q.total_questions}</p>
                </div>
                <span className="text-xs text-zinc-400 shrink-0">{q.created_at ? new Date(q.created_at).toLocaleDateString() : ''}</span>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </motion.div>
  );
}

/* ─── Results Page ─── */
export function StudentResultsPage() {
  const [results, setResults] = useState<QuizResultItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setLoading(false); return; }
        const { data: enrollData } = await supabase.from('enrollments').select('course_id').eq('user_id', user.id);
        const courseIds = (enrollData || []).map((e: any) => e.course_id);
        if (courseIds.length === 0) { setLoading(false); return; }
        const { data } = await supabase.from('quiz_results').select(`*, lessons:lesson_id(title)`).in('course_id', courseIds).order('created_at', { ascending: false });
        if (data) setResults((data as any[]).map((r) => ({ ...r, lesson_title: r.lessons?.title || '' })));
      } catch (err: any) { toast.error(err.message || 'Failed to load results'); }
      finally { setLoading(false); }
    }
    load();
  }, []);

  const avgScore = results.length > 0 ? Math.round(results.reduce((s, r) => s + (r.score && r.total_questions ? (r.score / r.total_questions) * 100 : 0), 0) / results.length) : 0;
  const passRate = results.length > 0 ? Math.round((results.filter((r) => r.passed).length / results.length) * 100) : 0;

  if (loading) return <div className="space-y-4">{[0, 1, 2].map((i) => (<div key={i} className="h-20 bg-zinc-100 dark:bg-zinc-800 rounded-xl animate-pulse" />))}</div>;

  return (
    <motion.div initial="hidden" animate="visible" className="space-y-6">
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Results</h1>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Quizzes', value: results.length, icon: Exam, tint: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20' },
          { label: 'Average Score', value: `${avgScore}%`, icon: TrendUp, tint: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20' },
          { label: 'Pass Rate', value: `${passRate}%`, icon: Trophy, tint: 'text-violet-600 bg-violet-50 dark:bg-violet-900/20' },
          { label: 'Passed', value: results.filter((r) => r.passed).length, icon: Check, tint: 'text-green-600 bg-green-50 dark:bg-green-900/20' },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className="border-zinc-200 dark:border-zinc-800">
              <CardContent className="p-5 flex items-center gap-4">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${stat.tint}`}><Icon size={20} /></div>
                <div><p className="text-2xl font-bold text-zinc-900 dark:text-white">{stat.value}</p><p className="text-xs text-zinc-500">{stat.label}</p></div>
              </CardContent>
            </Card>
          );
        })}
      </div>
      {results.length === 0 ? (
        <Card className="border-dashed border-zinc-300 dark:border-zinc-700"><CardContent className="p-10 text-center">
          <TrendUp size={48} className="mx-auto text-zinc-300 mb-4" />
          <h3 className="font-semibold text-zinc-900 dark:text-white mb-1">No results yet</h3>
          <p className="text-sm text-zinc-500">Complete quizzes to see your performance analytics.</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-3">
          {results.map((r) => (
            <Card key={r.id} className="border-zinc-200 dark:border-zinc-800">
              <CardContent className="p-4 flex items-center gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${r.passed ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30' : 'bg-red-100 text-red-600 dark:bg-red-900/30'}`}>
                  {r.passed ? <Check size={20} weight="bold" /> : <XCircle size={20} weight="bold" />}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-sm text-zinc-900 dark:text-white">{r.lesson_title}</h3>
                  <p className="text-xs text-zinc-500">{r.score}/{r.total_questions}</p>
                </div>
                <span className="text-sm font-bold text-zinc-900 dark:text-white">{r.score !== null && r.total_questions ? Math.round((r.score / r.total_questions) * 100) : 0}%</span>
                <span className="text-xs text-zinc-400 shrink-0">{r.created_at ? new Date(r.created_at).toLocaleDateString() : ''}</span>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </motion.div>
  );
}

/* ─── Certificates Page ─── */
export function StudentCertificatesPage() {
  const [certs, setCerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setLoading(false); return; }
        const { data } = await supabase.from('certificates').select('*').eq('user_id', user.id).order('issued_at', { ascending: false });
        if (data) setCerts(data as any[]);
      } catch (err: any) { toast.error(err.message || 'Failed to load certificates'); }
      finally { setLoading(false); }
    }
    load();
  }, []);

  if (loading) return <div className="space-y-4">{[0, 1, 2].map((i) => (<div key={i} className="h-48 bg-zinc-100 dark:bg-zinc-800 rounded-xl animate-pulse" />))}</div>;

  return (
    <motion.div initial="hidden" animate="visible" className="space-y-6">
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Certificates</h1>
      {certs.length === 0 ? (
        <Card className="border-dashed border-zinc-300 dark:border-zinc-700"><CardContent className="p-10 text-center">
          <Certificate size={48} className="mx-auto text-zinc-300 mb-4" />
          <h3 className="font-semibold text-zinc-900 dark:text-white mb-1">No certificates yet</h3>
          <p className="text-sm text-zinc-500">Complete all courses to earn your certificates.</p>
        </CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {certs.map((cert) => (
            <Card key={cert.id} className="border-zinc-200 dark:border-zinc-800">
              <CardContent className="p-6 text-center">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-100 to-amber-100 dark:from-emerald-900/30 dark:to-amber-900/30 flex items-center justify-center mx-auto mb-4">
                  <Certificate size={32} className="text-emerald-600" />
                </div>
                <h3 className="font-semibold text-zinc-900 dark:text-white mb-1">{cert.course_title || 'Course Certificate'}</h3>
                <p className="text-xs text-zinc-500 mb-4">Issued {cert.issued_at ? new Date(cert.issued_at).toLocaleDateString() : 'N/A'}</p>
                <Button size="sm" variant="outline" className="gap-2 text-emerald-600">
                  <FilePdf size={14} /> Download PDF
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </motion.div>
  );
}

/* ─── Notifications Page ─── */
export function StudentNotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setLoading(false); return; }
        const { data } = await supabase.from('notifications').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(50);
        if (data) setNotifications(data as NotificationItem[]);
      } catch (err: any) { toast.error(err.message || 'Failed to load notifications'); }
      finally { setLoading(false); }
    }
    load();
  }, []);

  const markAllRead = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.from('notifications').update({ read: true }).eq('user_id', user.id);
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      toast.success('All marked as read');
    } catch (err: any) { toast.error(err.message || 'Failed to update'); }
  };

  if (loading) return <div className="space-y-4">{[0, 1, 2, 3].map((i) => (<div key={i} className="h-16 bg-zinc-100 dark:bg-zinc-800 rounded-xl animate-pulse" />))}</div>;

  return (
    <motion.div initial="hidden" animate="visible" className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Notifications</h1>
        <Button size="sm" variant="ghost" onClick={markAllRead} className="text-emerald-600 gap-1">Mark all read</Button>
      </div>
      {notifications.length === 0 ? (
        <Card className="border-dashed border-zinc-300 dark:border-zinc-700"><CardContent className="p-10 text-center">
          <Bell size={48} className="mx-auto text-zinc-300 mb-4" />
          <h3 className="font-semibold text-zinc-900 dark:text-white mb-1">No notifications</h3>
          <p className="text-sm text-zinc-500">You're all caught up!</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => (
            <Card key={n.id} className={`border-zinc-200 dark:border-zinc-800 ${!n.read ? 'border-l-4 border-l-emerald-500' : ''}`}>
              <CardContent className="p-4 flex items-start gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                  n.type === 'assignment' ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30' :
                  n.type === 'quiz' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30' :
                  n.type === 'certificate' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30' :
                  'bg-zinc-100 text-zinc-600 dark:bg-zinc-800'}`}>
                  <Bell size={14} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-900 dark:text-white">{n.title}</p>
                  <p className="text-xs text-zinc-500 mt-0.5">{n.message}</p>
                </div>
                <span className="text-xs text-zinc-400 shrink-0">{n.created_at ? new Date(n.created_at).toLocaleDateString() : ''}</span>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </motion.div>
  );
}

/* ─── Profile Page ─── */
export function StudentProfilePage() {
  const [profile, setProfile] = useState<UserProfile>({ full_name: null, avatar_url: null, bio: null, phone: null, email: null });
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(profile);

  useEffect(() => {
    async function load() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        if (data) setProfile(data as UserProfile);
      } catch (err: any) { toast.error(err.message || 'Failed to load profile'); }
    }
    load();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.from('profiles').upsert({ id: user.id, ...form }, { onConflict: 'id' });
      setProfile(form); setEditing(false);
      toast.success('Profile updated');
    } catch (err: any) { toast.error(err.message || 'Failed to save'); }
    setSaving(false);
  };

  return (
    <motion.div initial="hidden" animate="visible" className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Profile</h1>
      <Card className="border-zinc-200 dark:border-zinc-800">
        <CardContent className="p-6 space-y-6">
          {/* Avatar */}
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-400 to-blue-500 flex items-center justify-center text-white text-2xl font-bold shrink-0">
              {(profile.full_name || profile.email || 'U')[0].toUpperCase()}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">{profile.full_name || 'Student'}</h2>
              <p className="text-sm text-zinc-500">{profile.email}</p>
            </div>
          </div>

          {/* Fields */}
          <div className="space-y-4">
            {[
              { key: 'full_name' as const, label: 'Full Name', icon: UserCircle, type: 'text' },
              { key: 'email' as const, label: 'Email', icon: Envelope, type: 'email' },
              { key: 'phone' as const, label: 'Phone', icon: Phone, type: 'tel' },
              { key: 'bio' as const, label: 'Bio', icon: ChatCenteredText, type: 'textarea' },
            ].map(({ key, label, icon: Icon, type }) => (
              <div key={key}>
                <label className="text-xs font-medium text-zinc-500 mb-1 block flex items-center gap-1"><Icon size={12} />{label}</label>
                {type === 'textarea' ? (
                  editing ? <textarea value={form[key] || ''} onChange={(e) => setForm({ ...form, [key]: e.target.value })} rows={3} className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm text-zinc-900 dark:text-white resize-none" /> :
                  <p className="text-sm text-zinc-900 dark:text-white">{profile[key] || 'Not set'}</p>
                ) : (
                  editing ? <Input type={type} value={form[key] || ''} onChange={(e) => setForm({ ...form, [key]: e.target.value })} className="border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm" /> :
                  <p className="text-sm text-zinc-900 dark:text-white">{profile[key] || 'Not set'}</p>
                )}
              </div>
            ))}
          </div>

          <div className="flex gap-3 pt-2">
            {editing ? (
              <>
                <Button onClick={handleSave} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"><Check size={16} weight="bold" /> Save Changes</Button>
                <Button variant="outline" onClick={() => { setEditing(false); setForm(profile); }}>Cancel</Button>
              </>
            ) : (
              <Button variant="outline" onClick={() => setEditing(true)} className="gap-2"><Pencil size={16} /> Edit Profile</Button>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

/* ─── Settings Page ─── */
export function StudentSettingsPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [savingPwd, setSavingPwd] = useState(false);
  const [darkMode, setDarkMode] = useState(() => document.documentElement.classList.contains('dark'));

  const toggleDark = () => {
    const next = !document.documentElement.classList.contains('dark');
    document.documentElement.classList.toggle('dark', next);
    setDarkMode(next);
  };

  const handleChangePassword = async () => {
    if (newPwd !== confirmPwd) { toast.error('Passwords do not match'); return; }
    if (newPwd.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    setSavingPwd(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPwd });
      if (error) throw error;
      toast.success('Password updated successfully');
      setCurrentPwd(''); setNewPwd(''); setConfirmPwd('');
    } catch (err: any) { toast.error(err.message || 'Failed to update password'); }
    setSavingPwd(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = ROUTES.home;
  };

  return (
    <motion.div initial="hidden" animate="visible" className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Settings</h1>

      {/* Appearance */}
      <Card className="border-zinc-200 dark:border-zinc-800">
        <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><ShieldCheck size={16} className="text-emerald-600" />Appearance</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div><p className="text-sm font-medium text-zinc-900 dark:text-white">Dark Mode</p><p className="text-xs text-zinc-500">Toggle between light and dark themes</p></div>
            <button onClick={toggleDark} className={`w-12 h-6 rounded-full transition-colors relative ${darkMode ? 'bg-emerald-600' : 'bg-zinc-300'}`}>
              <div className={`w-5 h-5 rounded-full bg-white shadow absolute top-0.5 transition-transform ${darkMode ? 'translate-x-6' : 'translate-x-0.5'}`} />
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Password */}
      <Card className="border-zinc-200 dark:border-zinc-800">
        <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><Key size={16} className="text-amber-600" />Security</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-xs font-medium text-zinc-500 mb-1 block">Current Password</label>
            <div className="relative">
              <Input type={showPassword ? 'text' : 'password'} value={currentPwd} onChange={(e) => setCurrentPwd(e.target.value)} placeholder="Enter current password" className="pr-10 border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm" />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600">
                {showPassword ? <EyeSlash size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-zinc-500 mb-1 block">New Password</label>
            <Input type="password" value={newPwd} onChange={(e) => setNewPwd(e.target.value)} placeholder="Enter new password" className="border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm" />
          </div>
          <div>
            <label className="text-xs font-medium text-zinc-500 mb-1 block">Confirm New Password</label>
            <Input type="password" value={confirmPwd} onChange={(e) => setConfirmPwd(e.target.value)} placeholder="Confirm new password" className="border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm" />
          </div>
          <Button onClick={handleChangePassword} disabled={savingPwd} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"><Key size={16} weight="bold" /> Update Password</Button>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-red-200 dark:border-red-900/50">
        <CardHeader className="pb-3"><CardTitle className="text-sm text-red-600">Danger Zone</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div><p className="text-sm font-medium text-zinc-900 dark:text-white">Sign Out</p><p className="text-xs text-zinc-500">Log out of your account on this device</p></div>
            <Button variant="outline" onClick={handleLogout} className="text-red-600 border-red-200 hover:bg-red-50 dark:hover:bg-red-900/20 gap-2"><SignOut size={16} /> Sign Out</Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// Re-export for backwards compatibility
export { StudentDashboard } from './StudentDashboardPage';