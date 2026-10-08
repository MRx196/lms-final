import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Camera, Check, Pencil, X, Trophy, Certificate, BookOpen, Clock,
  TrendUp, Flame, MapPin, Globe, GithubLogo, LinkedinLogo, Calendar,
  Copy, ShareNetwork, ShieldCheck, Key, Eye, EyeSlash, SignOut,
  UserCircle, Envelope, Phone, ChatCenteredText, Sparkle, GraduationCap,
  ArrowSquareOut, SpinnerGap,
} from '@phosphor-icons/react';
import { supabase } from '@/integrations/supabase/client';
import { uploadFile } from '@/services/storageService';
import { ROUTES } from '@/constants/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';

type ProfileData = {
  id: string; user_id: string; username: string | null; full_name: string | null;
  email: string | null; phone: string | null; avatar_url: string | null;
  role: string; status: string; created_at: string | null;
  bio: string | null; headline: string | null; location: string | null;
  website: string | null; github_url: string | null; linkedin_url: string | null; twitter_url: string | null;
};

type StatsData = { enrolled: number; completed: number; certificates: number; hours: number; avgScore: number };

const fadeUp = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' as const } } };
const stagger = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.08 } } };

export default function StudentProfilePage() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [stats, setStats] = useState<StatsData>({ enrolled: 0, completed: 0, certificates: 0, hours: 0, avgScore: 0 });
  const [certs, setCerts] = useState<{ id: string; certificate_code: string; issued_at: string; course_title: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Partial<ProfileData>>({});
  const [showPwd, setShowPwd] = useState(false);
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [savingPwd, setSavingPwd] = useState(false);
  const [darkMode, setDarkMode] = useState(() => document.documentElement.classList.contains('dark'));
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function load() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setLoading(false); return; }
        const { data: prof } = await supabase.from('profiles').select('*').eq('user_id', user.id).single();
        if (prof) { setProfile(prof as ProfileData); setForm(prof as ProfileData); }

        const { data: enr } = await supabase.from('enrollments').select('status, progress').eq('user_id', user.id);
        const { data: certData } = await supabase.from('certificates').select('id, certificate_code, issued_at, course_id').eq('user_id', user.id);
        const { data: lp } = await supabase.from('lesson_progress').select('time_spent_seconds').eq('user_id', user.id).eq('completed', true);
        const { data: qr } = await supabase.from('quiz_results').select('score, total_score').eq('user_id', user.id);

        const enrollments = enr || [];
        const completedHours = ((lp || []).reduce((s, r) => s + (r.time_spent_seconds || 0), 0)) / 3600;
        const avgScore = qr && qr.length > 0
          ? Math.round(qr.reduce((s, r) => s + (r.total_score > 0 ? (r.score / r.total_score) * 100 : 0), 0) / qr.length)
          : 0;

        setStats({
          enrolled: enrollments.length,
          completed: enrollments.filter((e: any) => e.status === 'completed').length,
          certificates: (certData || []).length,
          hours: Math.round(completedHours * 10) / 10,
          avgScore,
        });

        if (certData && certData.length > 0) {
          const courseIds = certData.map((c: any) => c.course_id);
          const { data: courses } = await supabase.from('courses').select('id, title').in('id', courseIds);
          const courseMap = new Map((courses || []).map((c: any) => [c.id, c.title]));
          setCerts(certData.map((c: any) => ({ ...c, course_title: courseMap.get(c.course_id) || 'Course' })));
        }
      } catch (err: any) { toast.error(err.message || 'Failed to load profile'); }
      finally { setLoading(false); }
    }
    load();
  }, []);

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('profiles').update({
        full_name: form.full_name, username: form.username, phone: form.phone,
        bio: form.bio, headline: form.headline, location: form.location,
        website: form.website, github_url: form.github_url, linkedin_url: form.linkedin_url, twitter_url: form.twitter_url,
        updated_at: new Date().toISOString(),
      }).eq('id', profile.id);
      if (error) throw error;
      setProfile((prev) => prev ? { ...prev, ...form } : prev);
      setEditing(false);
      toast.success('Profile updated successfully');
    } catch (err: any) { toast.error(err.message || 'Failed to save'); }
    setSaving(false);
  };

  const handleAvatarUpload = async (file: File) => {
    if (!profile) return;
    setUploading(true);
    try {
      const path = `${profile.user_id}/avatar-${Date.now()}`;
      await uploadFile('profile-images', path, file);
      const { data } = supabase.storage.from('profile-images').getPublicUrl(path);
      const url = data?.publicUrl || null;
      if (url) {
        await supabase.from('profiles').update({ avatar_url: url }).eq('id', profile.id);
        setProfile((prev) => prev ? { ...prev, avatar_url: url } : prev);
        toast.success('Avatar updated');
      }
    } catch (err: any) { toast.error(err.message || 'Upload failed'); }
    setUploading(false);
  };

  const handleChangePassword = async () => {
    if (newPwd !== confirmPwd) { toast.error('Passwords do not match'); return; }
    if (newPwd.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    setSavingPwd(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPwd });
      if (error) throw error;
      toast.success('Password updated');
      setNewPwd(''); setConfirmPwd('');
    } catch (err: any) { toast.error(err.message || 'Failed to update password'); }
    setSavingPwd(false);
  };

  const toggleDark = () => {
    const next = !document.documentElement.classList.contains('dark');
    document.documentElement.classList.toggle('dark', next);
    setDarkMode(next);
  };

  const copyProfileLink = () => {
    const link = `${window.location.origin}/student/profile`;
    navigator.clipboard.writeText(link);
    toast.success('Profile link copied');
  };

  if (loading) return (
    <div className="space-y-4">{[0, 1, 2].map((i) => (<div key={i} className="h-24 bg-zinc-100 dark:bg-zinc-800 rounded-xl animate-pulse" />))}</div>
  );

  const displayName = profile?.full_name || profile?.username || 'Student';
  const initials = displayName.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  const joinDate = profile?.created_at ? new Date(profile.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : '';

  return (
    <motion.div variants={stagger} initial="hidden" animate="visible" className="space-y-6 max-w-4xl mx-auto">
      {/* Hero Banner */}
      <motion.div variants={fadeUp} className="relative overflow-hidden rounded-2xl">
        <div className="h-40 sm:h-48 bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 relative">
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '24px 24px' }} />
          <div className="absolute top-4 right-4 flex gap-2">
            <Button size="sm" variant="secondary" onClick={copyProfileLink} className="gap-1.5 text-xs bg-white/20 text-white border-0 hover:bg-white/30 backdrop-blur-sm">
              <ShareNetwork size={14} /> Share
            </Button>
          </div>
        </div>
        <div className="px-4 sm:px-8 pb-6 -mt-14">
          <div className="flex flex-col sm:flex-row sm:items-end gap-4">
            {/* Avatar */}
            <div className="relative group">
              <div className="w-28 h-28 rounded-2xl border-4 border-white dark:border-zinc-900 shadow-xl overflow-hidden bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt={displayName} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-3xl font-bold text-white">{initials}</span>
                )}
              </div>
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="absolute bottom-1 right-1 w-8 h-8 rounded-full bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-opacity hover:scale-110"
              >
                {uploading ? <SpinnerGap size={14} className="animate-spin" /> : <Camera size={14} />}
              </button>
              <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleAvatarUpload(f); e.target.value = ''; }}
              />
            </div>
            {/* Identity */}
            <div className="flex-1 min-w-0 pt-2 sm:pt-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">{displayName}</h1>
                {profile?.status === 'active' && (
                  <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-0 text-xs gap-1">
                    <Check size={10} weight="bold" /> Active
                  </Badge>
                )}
              </div>
              {profile?.headline && <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-0.5">{profile.headline}</p>}
              <div className="flex items-center gap-3 mt-2 text-xs text-zinc-500 dark:text-zinc-400 flex-wrap">
                {profile?.username && <span className="flex items-center gap-1"><UserCircle size={12} />@{profile.username}</span>}
                {profile?.location && <span className="flex items-center gap-1"><MapPin size={12} />{profile.location}</span>}
                {joinDate && <span className="flex items-center gap-1"><Calendar size={12} />Joined {joinDate}</span>}
                {profile?.email && <span className="flex items-center gap-1"><Envelope size={12} />{profile.email}</span>}
              </div>
              {/* Social links */}
              {(profile?.website || profile?.github_url || profile?.linkedin_url || profile?.twitter_url) && (
                <div className="flex gap-2 mt-3">
                  {profile?.website && <a href={profile.website} target="_blank" rel="noopener noreferrer" className="text-zinc-500 hover:text-emerald-600 transition-colors"><Globe size={16} /></a>}
                  {profile?.github_url && <a href={profile.github_url} target="_blank" rel="noopener noreferrer" className="text-zinc-500 hover:text-emerald-600 transition-colors"><GithubLogo size={16} /></a>}
                  {profile?.linkedin_url && <a href={profile.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-zinc-500 hover:text-emerald-600 transition-colors"><LinkedinLogo size={16} /></a>}
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Stats Ribbon */}
      <motion.div variants={fadeUp} className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { icon: BookOpen, label: 'Enrolled', value: stats.enrolled, color: 'text-blue-600' },
          { icon: Check, label: 'Completed', value: stats.completed, color: 'text-emerald-600' },
          { icon: Certificate, label: 'Certificates', value: stats.certificates, color: 'text-amber-600' },
          { icon: Clock, label: 'Hours', value: stats.hours, color: 'text-violet-600' },
          { icon: TrendUp, label: 'Avg Score', value: stats.avgScore ? `${stats.avgScore}%` : '—', color: 'text-rose-600' },
        ].map((s, i) => (
          <Card key={i} className="border-zinc-200 dark:border-zinc-800 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
            <CardContent className="p-3 sm:p-4 flex items-center gap-3">
              <div className={`w-9 h-9 rounded-lg bg-zinc-50 dark:bg-zinc-800 flex items-center justify-center ${s.color}`}>
                <s.icon size={18} />
              </div>
              <div>
                <p className="text-lg font-bold text-zinc-900 dark:text-white leading-tight">{s.value}</p>
                <p className="text-[11px] text-zinc-500 uppercase tracking-wide">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </motion.div>

      {/* Tabs */}
      <motion.div variants={fadeUp}>
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="bg-zinc-100 dark:bg-zinc-800/50 p-1 rounded-xl">
            <TabsTrigger value="overview" className="rounded-lg text-sm gap-1.5"><Sparkle size={14} /> Overview</TabsTrigger>
            <TabsTrigger value="edit" className="rounded-lg text-sm gap-1.5"><Pencil size={14} /> Edit Profile</TabsTrigger>
            <TabsTrigger value="achievements" className="rounded-lg text-sm gap-1.5"><Trophy size={14} /> Achievements</TabsTrigger>
            <TabsTrigger value="settings" className="rounded-lg text-sm gap-1.5"><ShieldCheck size={14} /> Settings</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4 mt-4">
            {profile?.bio && (
              <Card className="border-zinc-200 dark:border-zinc-800">
                <CardContent className="p-5">
                  <h3 className="text-sm font-semibold text-zinc-900 dark:text-white mb-2 flex items-center gap-2"><ChatCenteredText size={14} className="text-emerald-600" /> About</h3>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">{profile.bio}</p>
                </CardContent>
              </Card>
            )}
            <div className="grid sm:grid-cols-2 gap-4">
              <Card className="border-zinc-200 dark:border-zinc-800">
                <CardContent className="p-5">
                  <h3 className="text-sm font-semibold text-zinc-900 dark:text-white mb-3 flex items-center gap-2"><GraduationCap size={14} className="text-blue-600" /> Learning Progress</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between text-xs text-zinc-500"><span>Courses Completed</span><span className="font-medium text-zinc-900 dark:text-white">{stats.completed}/{stats.enrolled}</span></div>
                    <div className="h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                      <motion.div initial={{ width: 0 }} animate={{ width: stats.enrolled > 0 ? `${(stats.completed / stats.enrolled) * 100}%` : '0%' }} transition={{ duration: 1, ease: 'easeOut' }} className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full" />
                    </div>
                    <div className="flex justify-between text-xs text-zinc-500"><span>Quiz Average</span><span className="font-medium text-zinc-900 dark:text-white">{stats.avgScore}%</span></div>
                    <div className="h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${stats.avgScore}%` }} transition={{ duration: 1, delay: 0.2, ease: 'easeOut' }} className="h-full bg-gradient-to-r from-violet-500 to-purple-500 rounded-full" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-zinc-200 dark:border-zinc-800">
                <CardContent className="p-5">
                  <h3 className="text-sm font-semibold text-zinc-900 dark:text-white mb-3 flex items-center gap-2"><Flame size={14} className="text-orange-500" /> Highlights</h3>
                  <div className="space-y-2.5">
                    {stats.enrolled > 0 && <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400"><BookOpen size={14} className="text-blue-500" /> Enrolled in {stats.enrolled} course{stats.enrolled > 1 ? 's' : ''}</div>}
                    {stats.completed > 0 && <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400"><Check size={14} className="text-emerald-500" /> Completed {stats.completed} course{stats.completed > 1 ? 's' : ''}</div>}
                    {stats.certificates > 0 && <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400"><Certificate size={14} className="text-amber-500" /> Earned {stats.certificates} certificate{stats.certificates > 1 ? 's' : ''}</div>}
                    {stats.hours > 0 && <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400"><Clock size={14} className="text-violet-500" /> {stats.hours} hours of learning</div>}
                    {stats.enrolled === 0 && <p className="text-sm text-zinc-400 italic">Start your learning journey to see achievements here.</p>}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Edit Profile Tab */}
          <TabsContent value="edit" className="mt-4">
            <Card className="border-zinc-200 dark:border-zinc-800">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold text-zinc-900 dark:text-white">Profile Information</CardTitle>
                  {!editing && <Button size="sm" variant="outline" onClick={() => setEditing(true)} className="gap-1.5 text-xs"><Pencil size={12} /> Edit</Button>}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  {([
                    { key: 'full_name', label: 'Full Name', icon: UserCircle },
                    { key: 'username', label: 'Username', icon: UserCircle },
                    { key: 'headline', label: 'Headline', icon: Sparkle },
                    { key: 'location', label: 'Location', icon: MapPin },
                    { key: 'phone', label: 'Phone', icon: Phone },
                    { key: 'website', label: 'Website', icon: Globe },
                    { key: 'github_url', label: 'GitHub', icon: GithubLogo },
                    { key: 'linkedin_url', label: 'LinkedIn', icon: LinkedinLogo },
                  ] as const).map(({ key, label, icon: Icon }) => (
                    <div key={key}>
                      <label className="text-xs font-medium text-zinc-500 mb-1.5 block flex items-center gap-1"><Icon size={11} />{label}</label>
                      {editing ? (
                        <Input value={(form as any)[key] || ''} onChange={(e) => setForm((prev) => ({ ...prev, [key]: e.target.value }))} className="border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm h-9" placeholder={label} />
                      ) : (
                        <p className="text-sm text-zinc-900 dark:text-white py-1.5 min-h-[36px]">{(profile as any)?.[key] || <span className="text-zinc-400 italic">Not set</span>}</p>
                      )}
                    </div>
                  ))}
                </div>
                <div>
                  <label className="text-xs font-medium text-zinc-500 mb-1.5 block flex items-center gap-1"><ChatCenteredText size={11} />Bio</label>
                  {editing ? (
                    <div>
                      <textarea value={form.bio || ''} onChange={(e) => setForm((prev) => ({ ...prev, bio: e.target.value }))} rows={3} maxLength={300} className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm text-zinc-900 dark:text-white resize-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" placeholder="Tell us about yourself..." />
                      <p className="text-[10px] text-zinc-400 mt-1 text-right">{(form.bio || '').length}/300</p>
                    </div>
                  ) : (
                    <p className="text-sm text-zinc-900 dark:text-white">{profile?.bio || <span className="text-zinc-400 italic">Not set</span>}</p>
                  )}
                </div>
                <AnimatePresence>
                  {editing && (
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} className="flex gap-3 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                      <Button onClick={handleSave} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"><Check size={14} weight="bold" /> {saving ? 'Saving...' : 'Save Changes'}</Button>
                      <Button variant="outline" onClick={() => { setEditing(false); setForm(profile || {}); }}>Cancel</Button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Achievements Tab */}
          <TabsContent value="achievements" className="mt-4 space-y-4">
            {certs.length === 0 ? (
              <Card className="border-dashed border-zinc-300 dark:border-zinc-700">
                <CardContent className="p-10 text-center">
                  <Trophy size={40} className="mx-auto text-zinc-300 dark:text-zinc-600 mb-3" />
                  <p className="text-sm font-medium text-zinc-500">No certificates yet</p>
                  <p className="text-xs text-zinc-400 mt-1">Complete courses to earn your first certificate</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid sm:grid-cols-2 gap-3">
                {certs.map((c) => (
                  <Card key={c.id} className="border-amber-200 dark:border-amber-900/30 hover:shadow-md transition-shadow overflow-hidden">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 shrink-0">
                          <Certificate size={18} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-zinc-900 dark:text-white truncate">{c.course_title}</p>
                          <p className="text-xs text-zinc-500 mt-0.5">Code: {c.certificate_code}</p>
                          <p className="text-xs text-zinc-400 mt-0.5">{new Date(c.issued_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="mt-4 space-y-4">
            <Card className="border-zinc-200 dark:border-zinc-800">
              <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><Sparkle size={14} className="text-violet-600" />Appearance</CardTitle></CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div><p className="text-sm font-medium text-zinc-900 dark:text-white">Dark Mode</p><p className="text-xs text-zinc-500">Toggle between light and dark themes</p></div>
                  <button onClick={toggleDark} className={`w-12 h-6 rounded-full transition-colors relative ${darkMode ? 'bg-emerald-600' : 'bg-zinc-300'}`}>
                    <div className={`w-5 h-5 rounded-full bg-white shadow absolute top-0.5 transition-transform ${darkMode ? 'translate-x-6' : 'translate-x-0.5'}`} />
                  </button>
                </div>
              </CardContent>
            </Card>
            <Card className="border-zinc-200 dark:border-zinc-800">
              <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><Key size={14} className="text-amber-600" />Change Password</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="relative">
                  <Input type={showPwd ? 'text' : 'password'} value={newPwd} onChange={(e) => setNewPwd(e.target.value)} placeholder="New password" className="pr-10 border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm" />
                  <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600">{showPwd ? <EyeSlash size={14} /> : <Eye size={14} />}</button>
                </div>
                <Input type="password" value={confirmPwd} onChange={(e) => setConfirmPwd(e.target.value)} placeholder="Confirm password" className="border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm" />
                <Button onClick={handleChangePassword} disabled={savingPwd || !newPwd} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 text-sm"><Key size={14} /> {savingPwd ? 'Updating...' : 'Update Password'}</Button>
              </CardContent>
            </Card>
            <Card className="border-red-200 dark:border-red-900/40">
              <CardHeader className="pb-3"><CardTitle className="text-sm text-red-600 font-semibold">Sign Out</CardTitle></CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-zinc-500">Log out of your account</p>
                  <Button variant="outline" onClick={async () => { await supabase.auth.signOut(); window.location.href = ROUTES.home; }} className="text-red-600 border-red-200 hover:bg-red-50 dark:hover:bg-red-900/20 gap-2 text-sm"><SignOut size={14} /> Sign Out</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </motion.div>
    </motion.div>
  );
}
