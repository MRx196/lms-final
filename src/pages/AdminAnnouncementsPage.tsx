import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { ROUTES } from '@/constants/navigation';
import { sendBroadcast, type NotificationPriority } from '@/services/notificationService';
import { priorityBadge } from '@/components/notifications/NotificationShared';
import { BookOpen, Broadcast, Check, Megaphone, PaperPlaneTilt, Spinner, UserFocus, Users, WarningCircle } from '@phosphor-icons/react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

interface CourseRow { id: string; title: string; status: string | null; }
interface ProfileRow { id: string; full_name: string | null; email: string | null; avatar_url: string | null; }

type AudienceMode = 'all' | 'course' | 'manual';

const priorityOptions: { value: NotificationPriority; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'normal', label: 'Normal' },
  { value: 'high', label: 'High' },
];

export function AdminAnnouncementsPage() {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [priority, setPriority] = useState<NotificationPriority>('normal');
  const [mode, setMode] = useState<AudienceMode>('all');
  const [courses, setCourses] = useState<CourseRow[]>([]);
  const [courseId, setCourseId] = useState('');
  const [students, setStudents] = useState<ProfileRow[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [sending, setSending] = useState(false);
  const [touched, setTouched] = useState(false);

  /* ── Load courses for course-targeting ── */
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.from('courses').select('id,title,status').order('title');
      if (error) {
        toast.error(error.message);
      } else {
        setCourses((data || []) as CourseRow[]);
        if (data && data.length > 0) setCourseId(data[0].id);
      }
    })();
  }, []);

  const ensureSelectedIsId = (ids: string) => {
    const c = courses.find((x) => x.id === ids);
    if (c) {
      setCourseId(ids);
      setMode('course');
    }
  };

  /* ── Resolve recipient profile list for the chosen audience ── */
  const loadStudents = useCallback(async (target: AudienceMode, cid: string) => {
    setLoadingStudents(true);
    try {
      if (target === 'all') {
        const { data, error } = await supabase
          .from('profiles')
          .select('id,full_name,email,avatar_url')
          .eq('role', 'student')
          .order('full_name');
        if (error) throw error;
        setStudents((data || []) as ProfileRow[]);
      } else if (target === 'course') {
        if (!cid) { setStudents([]); return; }
        const { data: enrollments, error: enrErr } = await supabase
          .from('enrollments')
          .select('user_id')
          .eq('course_id', cid);
        if (enrErr) throw enrErr;
        const ids = (enrollments || []).map((e) => e.user_id);
        if (ids.length === 0) { setStudents([]); return; }
        const { data, error } = await supabase
          .from('profiles')
          .select('id,full_name,email,avatar_url')
          .in('id', ids)
          .order('full_name');
        if (error) throw error;
        setStudents((data || []) as ProfileRow[]);
      } else {
        const { data, error } = await supabase
          .from('profiles')
          .select('id,full_name,email,avatar_url')
          .eq('role', 'student')
          .order('full_name');
        if (error) throw error;
        setStudents((data || []) as ProfileRow[]);
        setSelected(new Set());
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to load students');
      setStudents([]);
    } finally {
      setLoadingStudents(false);
    }
  }, []);

  useEffect(() => {
    loadStudents(mode, courseId);
  }, [mode, courseId, loadStudents]);

  /* ── Manual search filter ── */
  const visibleStudents = useMemo(() => {
    if (!search.trim()) return students;
    const q = search.toLowerCase();
    return students.filter((s) => (s.full_name || '').toLowerCase().includes(q) || (s.email || '').toLowerCase().includes(q));
  }, [students, search]);

  /* ── Recipient computation for preview + send ── */
  const recipientCount = useMemo(() => {
    if (mode === 'all') return students.length;
    if (mode === 'course') return students.length;
    return selected.size;
  }, [mode, students.length, selected.size]);

  function toggleStudent(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  }

  function toggleAllVisible() {
    if (visibleStudents.every((s) => selected.has(s.id))) {
      setSelected(new Set([...selected].filter((id) => !visibleStudents.some((s) => s.id === id))));
    } else {
      const next = new Set(selected);
      visibleStudents.forEach((s) => next.add(s.id));
      setSelected(next);
    }
  }

  async function handleSend() {
    setTouched(true);
    if (!title.trim() || !message.trim()) {
      toast.error('Title and message are required');
      return;
    }
    if (!user) {
      toast.error('You must be signed in to broadcast');
      return;
    }
    if (recipientCount === 0) {
      toast.error('No recipients match the selected audience');
      return;
    }
    if (recipientCount > 500) {
      toast.error('Broadcast capped at 500 recipients per send');
      return;
    }
    setSending(true);
    try {
      const user_ids = mode === 'manual' ? Array.from(selected) : students.map((s) => s.id);
      const sent = await sendBroadcast({
        title: title.trim(),
        message: message.trim(),
        category: 'announcement',
        event_type: 'admin_announcement',
        priority,
        sender_id: user.id,
        user_ids,
      });
      toast.success(`Announcement sent to ${sent} student${sent === 1 ? '' : 's'}`);
      setTitle('');
      setMessage('');
      setPriority('normal');
      setSelected(new Set());
      setTouched(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to send announcement');
    } finally {
      setSending(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ease: 'easeOut' as const, duration: 0.3 }}
      className="space-y-5"
    >
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
          <Megaphone size={22} />
        </span>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">Announcements</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Broadcast updates to all students, a course, or selected students.</p>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-5">
        {/* ── Composer ── */}
        <div className="xl:col-span-3 space-y-5">
          <Card className="border-zinc-200 dark:border-zinc-800">
            <CardHeader className="border-b border-zinc-100 dark:border-zinc-800 px-5 py-4">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-white">
                <Broadcast size={16} className="text-emerald-500" /> Compose announcement
              </h2>
            </CardHeader>
            <CardContent className="space-y-4 p-5">
              <div className="space-y-1.5">
                <Label htmlFor="ann-title" className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                  Title
                </Label>
                <Input
                  id="ann-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. New course available: Advanced React"
                  className={`bg-white dark:bg-zinc-900 ${touched && !title.trim() ? 'border-rose-400 focus-visible:ring-rose-300' : ''}`}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="ann-message" className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                  Message
                </Label>
                <textarea
                  id="ann-message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={4}
                  placeholder="Write the announcement body students will see..."
                  className={`w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition-all placeholder:text-zinc-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 dark:border-zinc-800 dark:bg-zinc-900 dark:text-white dark:placeholder:text-zinc-500 ${touched && !message.trim() ? 'border-rose-400' : ''}`}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Priority</Label>
                <div className="flex gap-2">
                  {priorityOptions.map((p) => (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => setPriority(p.value)}
                      className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
                        priority === p.value
                          ? priorityBadge(p.value === 'high' ? 'high' : p.value === 'low' ? 'low' : 'normal')
                          : 'bg-white text-zinc-500 border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800 hover:border-emerald-400'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Audience</Label>
                <div className="grid gap-2 sm:grid-cols-3">
                  <button
                    type="button"
                    onClick={() => { setMode('all'); setSelected(new Set()); }}
                    className={`flex items-center gap-2 rounded-xl border px-3 py-3 text-left text-sm transition-colors ${
                      mode === 'all'
                        ? 'border-emerald-500 bg-emerald-50 dark:border-emerald-500/60 dark:bg-emerald-950/30'
                        : 'border-zinc-200 dark:border-zinc-800 hover:border-emerald-300'
                    }`}
                  >
                    <Users size={16} className={mode === 'all' ? 'text-emerald-600' : 'text-zinc-400'} />
                    <span className="font-medium text-zinc-700 dark:text-zinc-300">All students</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode('course')}
                    className={`flex items-center gap-2 rounded-xl border px-3 py-3 text-left text-sm transition-colors ${
                      mode === 'course'
                        ? 'border-emerald-500 bg-emerald-50 dark:border-emerald-500/60 dark:bg-emerald-950/30'
                        : 'border-zinc-200 dark:border-zinc-800 hover:border-emerald-300'
                    }`}
                  >
                    <BookOpen size={16} className={mode === 'course' ? 'text-emerald-600' : 'text-zinc-400'} />
                    <span className="font-medium text-zinc-700 dark:text-zinc-300">By course</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setMode('manual'); setSelected(new Set()); }}
                    className={`flex items-center gap-2 rounded-xl border px-3 py-3 text-left text-sm transition-colors ${
                      mode === 'manual'
                        ? 'border-emerald-500 bg-emerald-50 dark:border-emerald-500/60 dark:bg-emerald-950/30'
                        : 'border-zinc-200 dark:border-zinc-800 hover:border-emerald-300'
                    }`}
                  >
                    <UserFocus size={16} className={mode === 'manual' ? 'text-emerald-600' : 'text-zinc-400'} />
                    <span className="font-medium text-zinc-700 dark:text-zinc-300">Select students</span>
                  </button>
                </div>
              </div>

              {mode === 'course' && (
                <div className="space-y-1.5">
                  <Label htmlFor="ann-course" className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                    Course
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {courses.slice(0, 12).map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => ensureSelectedIsId(c.id)}
                        className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                          courseId === c.id
                            ? 'bg-emerald-600 text-white'
                            : 'bg-white border border-zinc-200 text-zinc-600 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-400 hover:border-emerald-400'
                        }`}
                      >
                        {c.title.length > 28 ? `${c.title.slice(0, 28)}…` : c.title}
                      </button>
                    ))}
                    {courses.length === 0 && (
                      <p className="text-xs text-zinc-400">No courses available yet. <a href={ROUTES.adminCourses} className="text-emerald-600 underline-offset-2 hover:underline">Create one</a>.</p>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              <WarningCircle size={13} className="mr-1 inline text-amber-500" />
              Announcements are sent instantly and cannot be recalled.
            </p>
            <Button
              onClick={handleSend}
              disabled={sending}
              className="bg-emerald-600 text-white hover:bg-emerald-700"
            >
              {sending ? <Spinner size={15} className="mr-2 animate-spin" /> : <PaperPlaneTilt size={15} className="mr-2" />}
              Send to {recipientCount} student{recipientCount === 1 ? '' : 's'}
            </Button>
          </div>
        </div>

        {/* ── Recipients preview ── */}
        <div className="xl:col-span-2">
          <Card className="border-zinc-200 dark:border-zinc-800">
            <CardHeader className="border-b border-zinc-100 dark:border-zinc-800 px-5 py-4">
              <div className="flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-white">
                  <Users size={16} className="text-emerald-500" /> Recipients
                </h2>
                <Badge className={priorityBadge(priority)}>{recipientCount.toLocaleString()}</Badge>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              <div className="mb-3 flex items-center gap-2">
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Filter students..."
                  className="h-8 bg-white text-xs dark:bg-zinc-900"
                />
              </div>

              {loadingStudents ? (
                <div className="flex items-center justify-center py-12 text-zinc-400">
                  <Spinner size={18} className="animate-spin" />
                </div>
              ) : students.length === 0 ? (
                <div className="py-12 text-center">
                  <Users size={28} className="mx-auto mb-2 text-zinc-300 dark:text-zinc-600" />
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    {mode === 'course' ? 'No students enrolled in this course yet.' : 'No students found yet.'}
                  </p>
                </div>
              ) : (
                <>
                  {mode === 'manual' && (
                    <button
                      type="button"
                      onClick={toggleAllVisible}
                      className="mb-2 flex items-center gap-1.5 rounded-md px-1 py-1 text-xs font-medium text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-500/10"
                    >
                      {visibleStudents.every((s) => selected.has(s.id)) ? <span>Clear all</span> : <span>Select all ({visibleStudents.length})</span>}
                    </button>
                  )}
                  <div className="max-h-[380px] space-y-1 overflow-y-auto pr-1">
                    {visibleStudents.map((s) => {
                      const checked = mode === 'manual' ? selected.has(s.id) : true;
                      return (
                        <div
                          key={s.id}
                          className={`flex items-center gap-2.5 rounded-lg px-2 py-2 ${mode === 'manual' ? 'cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/60' : ''}`}
                          onClick={mode === 'manual' ? () => toggleStudent(s.id) : undefined}
                        >
                          <Checkbox checked={checked} disabled={mode !== 'manual'} onCheckedChange={() => toggleStudent(s.id)} className="data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600" />
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-emerald-100 text-xs font-bold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">
                            {s.avatar_url ? (
                              <img src={s.avatar_url} alt="" className="h-full w-full object-cover" />
                            ) : (
                              (s.full_name || 'S').charAt(0).toUpperCase()
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-zinc-800 dark:text-zinc-200">{s.full_name || 'Student'}</p>
                            <p className="truncate text-xs text-zinc-400">{s.email || ''}</p>
                          </div>
                          {mode !== 'manual' && <Check size={13} className="ml-auto text-emerald-500" />}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </motion.div>
  );
}