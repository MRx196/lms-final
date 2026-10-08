import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  GraduationCap, Users, UserPlus, Pencil, Trash, MagnifyingGlass, UserCircle,
  Spinner, LinkSimple, EnvelopeSimple, Phone,
} from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import {
  Avatar, inputCls, PromoteDialog, EditDialog, AssignDialog, ViewDialog, RemoveDialog,
} from '@/components/admin/InstructorDialogs';

interface Instructor {
  id: string;
  user_id: string;
  full_name: string | null;
  username: string | null;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  headline: string | null;
  bio: string | null;
  website: string | null;
  linkedin_url: string | null;
}
interface CourseLite { id: string; title: string; status: string | null; }
interface Join { course_id: string; profile_id: string; }
interface Candidate { id: string; full_name: string | null; username: string | null; email: string | null; role: string; }

const itemVariants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.25, ease: 'easeOut' as const } },
};

export function AdminInstructorsPage() {
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [courses, setCourses] = useState<CourseLite[]>([]);
  const [joins, setJoins] = useState<Join[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<Instructor | null>(null);
  const [form, setForm] = useState({ full_name: '', headline: '', bio: '', phone: '', website: '', linkedin_url: '' });

  const [promoteOpen, setPromoteOpen] = useState(false);
  const [promoteSearch, setPromoteSearch] = useState('');

  const [assignOpen, setAssignOpen] = useState(false);
  const [assignTarget, setAssignTarget] = useState<Instructor | null>(null);
  const [assignIds, setAssignIds] = useState<Set<string>>(new Set());

  const [viewOpen, setViewOpen] = useState(false);
  const [viewTarget, setViewTarget] = useState<Instructor | null>(null);

  const [removeTarget, setRemoveTarget] = useState<Instructor | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [inst, crs, jn, all] = await Promise.all([
        supabase.from('profiles').select('*').eq('role', 'instructor').order('full_name'),
        supabase.from('courses').select('id,title,status').order('title'),
        supabase.from('course_instructors').select('course_id,profile_id'),
        supabase.from('profiles').select('id,full_name,username,email,role').order('full_name'),
      ]);
      if (inst.error) throw inst.error;
      setInstructors((inst.data as Instructor[]) || []);
      setCourses((crs.data as CourseLite[]) || []);
      setJoins((jn.data as Join[]) || []);
      setCandidates(((all.data as Candidate[]) || []).filter((p) => p.role !== 'instructor'));
    } catch (e) {
      toast.error((e as Error).message || 'Failed to load instructors');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchAll();
  }, [fetchAll]);

  const coursesByInstructor = useMemo(() => {
    const byProfile = new Map<string, string[]>();
    for (const j of joins) {
      const arr = byProfile.get(j.profile_id) || [];
      arr.push(j.course_id);
      byProfile.set(j.profile_id, arr);
    }
    const courseMap = new Map(courses.map((c) => [c.id, c]));
    const m = new Map<string, CourseLite[]>();
    for (const [pid, cids] of byProfile) {
      m.set(pid, cids.map((id) => courseMap.get(id)).filter(Boolean) as CourseLite[]);
    }
    return m;
  }, [joins, courses]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return instructors.filter(
      (i) => !q || (i.full_name || '').toLowerCase().includes(q) || (i.email || '').toLowerCase().includes(q) || (i.username || '').toLowerCase().includes(q),
    );
  }, [instructors, search]);

  const filteredCandidates = useMemo(() => {
    const q = promoteSearch.trim().toLowerCase();
    return candidates.filter(
      (c) => !q || (c.full_name || '').toLowerCase().includes(q) || (c.email || '').toLowerCase().includes(q) || (c.username || '').toLowerCase().includes(q),
    );
  }, [candidates, promoteSearch]);

  const assignedCount = instructors.filter((i) => (coursesByInstructor.get(i.id) || []).length > 0).length;

  const openEdit = (i: Instructor) => {
    setEditing(i);
    setForm({
      full_name: i.full_name || '', headline: i.headline || '', bio: i.bio || '',
      phone: i.phone || '', website: i.website || '', linkedin_url: i.linkedin_url || '',
    });
    setEditOpen(true);
  };

  const saveEdit = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('profiles').update({
        full_name: form.full_name.trim() || null, headline: form.headline.trim() || null,
        bio: form.bio.trim() || null, phone: form.phone.trim() || null,
        website: form.website.trim() || null, linkedin_url: form.linkedin_url.trim() || null,
      }).eq('id', editing.id);
      if (error) throw error;
      toast.success('Instructor updated');
      setEditOpen(false);
      await fetchAll();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const promote = async (c: { id: string; full_name: string | null; email: string | null }) => {
    try {
      const { error } = await supabase.from('profiles').update({ role: 'instructor' }).eq('id', c.id);
      if (error) throw error;
      toast.success(`${c.full_name || c.email} is now an instructor`);
      setPromoteOpen(false);
      await fetchAll();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const openAssign = (i: Instructor) => {
    setAssignTarget(i);
    setAssignIds(new Set((coursesByInstructor.get(i.id) || []).map((c) => c.id)));
    setAssignOpen(true);
  };

  const toggleAssign = (id: string) => {
    setAssignIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const saveAssign = async () => {
    if (!assignTarget) return;
    setSaving(true);
    try {
      const current = new Set((coursesByInstructor.get(assignTarget.id) || []).map((c) => c.id));
      const toAdd = [...assignIds].filter((id) => !current.has(id));
      const toRemove = [...current].filter((id) => !assignIds.has(id));
      if (toRemove.length) {
        const { error } = await supabase.from('course_instructors').delete().eq('profile_id', assignTarget.id).in('course_id', toRemove);
        if (error) throw error;
      }
      if (toAdd.length) {
        const { error } = await supabase.from('course_instructors').insert(toAdd.map((course_id) => ({ course_id, profile_id: assignTarget.id })));
        if (error) throw error;
      }
      toast.success('Course assignments saved');
      setAssignOpen(false);
      await fetchAll();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const confirmRemove = async () => {
    if (!removeTarget) return;
    try {
      const { error } = await supabase.from('profiles').update({ role: 'student' }).eq('id', removeTarget.id);
      if (error) throw error;
      toast.success(`${removeTarget.full_name || removeTarget.email} moved back to student role`);
      setRemoveTarget(null);
      await fetchAll();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <motion.div variants={itemVariants} initial="hidden" animate="show" className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Instructors</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Manage instructor profiles, promote users, and assign them to courses.
          </p>
        </div>
        <Button onClick={() => setPromoteOpen(true)} className="gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700">
          <UserPlus size={16} weight="bold" /> Add Instructor
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <MetricCard icon={<GraduationCap size={20} className="text-emerald-600" />} label="Total Instructors" value={instructors.length} hint="Active teaching staff" />
        <MetricCard icon={<Users size={20} className="text-emerald-600" />} label="Assigned to Courses" value={assignedCount} hint="Teaching at least one" />
        <MetricCard icon={<UserCircle size={20} className="text-amber-600" />} label="Unassigned" value={instructors.length - assignedCount} hint="Not on any course yet" />
      </div>

      <Card className="border-slate-200 dark:border-slate-800">
        <CardContent className="p-4">
          <div className="relative max-w-sm">
            <MagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search instructors..." className={`${inputCls} pl-9`} />
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-200 dark:border-slate-800">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-slate-400">
              <Spinner size={20} className="animate-spin" /> Loading instructors...
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
              <GraduationCap size={32} className="text-slate-300 dark:text-slate-600" />
              <p className="text-sm font-medium text-slate-500">No instructors found</p>
              <p className="text-xs text-slate-400">Promote a user to the instructor role to get started.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500 dark:border-slate-800">
                  <tr>
                    <th className="px-4 py-3 font-medium">Instructor</th>
                    <th className="px-4 py-3 font-medium">Contact</th>
                    <th className="px-4 py-3 font-medium">Headline</th>
                    <th className="px-4 py-3 font-medium">Courses</th>
                    <th className="px-4 py-3 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filtered.map((i) => {
                    const count = (coursesByInstructor.get(i.id) || []).length;
                    return (
                      <tr key={i.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <Avatar name={i.full_name} email={i.email} url={i.avatar_url} />
                            <div>
                              <div className="font-medium text-slate-900 dark:text-white">{i.full_name || 'Unnamed'}</div>
                              <div className="text-xs text-slate-400">{i.username ? `@${i.username}` : ''}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 text-xs text-slate-500"><EnvelopeSimple size={13} /> {i.email || '—'}</div>
                          {i.phone && <div className="mt-0.5 flex items-center gap-1 text-xs text-slate-400"><Phone size={13} /> {i.phone}</div>}
                        </td>
                        <td className="max-w-[16rem] px-4 py-3 text-slate-500"><span className="line-clamp-1">{i.headline || '—'}</span></td>
                        <td className="px-4 py-3">
                          <button onClick={() => { setViewTarget(i); setViewOpen(true); }} className="inline-flex items-center gap-1.5">
                            <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">{count}</Badge>
                            <span className="text-xs text-slate-400 underline-offset-2 hover:underline">view</span>
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <IconBtn onClick={() => openAssign(i)} title="Assign courses"><LinkSimple size={15} /></IconBtn>
                            <IconBtn onClick={() => openEdit(i)} title="Edit profile"><Pencil size={15} /></IconBtn>
                            <IconBtn onClick={() => setRemoveTarget(i)} title="Remove instructor role" danger><Trash size={15} /></IconBtn>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <PromoteDialog
        open={promoteOpen}
        onOpenChange={setPromoteOpen}
        candidates={filteredCandidates}
        query={promoteSearch}
        setQuery={setPromoteSearch}
        onPromote={promote}
      />
      <EditDialog open={editOpen} onOpenChange={setEditOpen} form={form} setForm={setForm} saving={saving} onSave={saveEdit} />
      <AssignDialog
        open={assignOpen}
        onOpenChange={setAssignOpen}
        target={assignTarget}
        courses={courses}
        selected={assignIds}
        onToggle={toggleAssign}
        saving={saving}
        onSave={saveAssign}
      />
      <ViewDialog
        open={viewOpen}
        onOpenChange={setViewOpen}
        target={viewTarget}
        linked={viewTarget ? coursesByInstructor.get(viewTarget.id) || [] : []}
      />
      <RemoveDialog open={!!removeTarget} onOpenChange={(o) => !o && setRemoveTarget(null)} target={removeTarget} onConfirm={confirmRemove} />
    </motion.div>
  );
}

function MetricCard({ icon, label, value, hint }: { icon: React.ReactNode; label: string; value: number; hint: string }) {
  return (
    <Card className="border-slate-200 dark:border-slate-800">
      <CardContent className="flex items-center gap-3 p-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800">{icon}</div>
        <div>
          <div className="text-xl font-bold text-slate-900 dark:text-white">{value}</div>
          <div className="text-xs font-medium text-slate-500">{label}</div>
          <div className="text-[11px] text-slate-400">{hint}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function IconBtn({ children, onClick, title, danger }: { children: React.ReactNode; onClick: () => void; title: string; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 transition dark:border-slate-700 ${
        danger ? 'text-slate-500 hover:border-red-300 hover:bg-red-50 hover:text-red-600 dark:hover:border-red-800 dark:hover:bg-red-950/40' : 'text-slate-500 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-600 dark:hover:border-emerald-800 dark:hover:bg-emerald-950/40'
      }`}
    >
      {children}
    </button>
  );
}