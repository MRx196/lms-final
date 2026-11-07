import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { PencilSimpleLine, CircleNotch, CheckCircle, FileText, DownloadSimple } from '@phosphor-icons/react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { getMySubmissions, gradeSubmission, type InstructorSubmission } from '@/services/instructorService';
import { supabase } from '@/integrations/supabase/client';

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { ease: 'easeOut' as const } },
};

type Filter = 'pending' | 'graded' | 'all';

export function InstructorGradingPage() {
  const [subs, setSubs] = useState<InstructorSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('pending');
  const [grading, setGrading] = useState<InstructorSubmission | null>(null);
  const [score, setScore] = useState('');
  const [feedback, setFeedback] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setSubs(await getMySubmissions());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load submissions');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const filtered = useMemo(() => subs.filter((s) => {
    if (filter === 'pending') return s.score == null;
    if (filter === 'graded') return s.score != null;
    return true;
  }), [subs, filter]);

  const openGrade = (s: InstructorSubmission) => {
    setGrading(s);
    setScore(s.score != null ? String(s.score) : '');
    setFeedback(s.feedback || '');
  };

  const saveGrade = async () => {
    if (!grading) return;
    const value = Number(score);
    if (!Number.isFinite(value) || value < 0) {
      toast.error('Enter a valid score');
      return;
    }
    setSaving(true);
    try {
      await gradeSubmission(grading.id, value, feedback.trim());
      toast.success('Submission graded');
      setGrading(null);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save grade');
    } finally {
      setSaving(false);
    }
  };

  const downloadFile = async (path: string, name: string) => {
    const { data, error } = await supabase.storage.from('assignment-submissions').createSignedUrl(path, 60);
    if (error || !data) {
      toast.error('Could not generate download link');
      return;
    }
    window.open(data.signedUrl, '_blank', 'noopener');
  };

  const pendingCount = subs.filter((s) => s.score == null).length;

  return (
    <motion.div initial="hidden" animate="visible" variants={itemVariants} className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">Grading</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Review and grade assignment submissions for your courses.
        </p>
      </div>

      {error && (
        <Card className="border-red-200 dark:border-red-900/50">
          <CardContent className="flex items-center justify-between gap-3 p-4">
            <p className="text-sm text-red-600">{error}</p>
            <Button variant="outline" size="sm" onClick={() => void load()}>Retry</Button>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-2">
        {(['pending', 'graded', 'all'] as Filter[]).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
              filter === f
                ? 'bg-emerald-600 text-white'
                : 'bg-white text-zinc-600 border border-zinc-200 dark:bg-zinc-900 dark:text-zinc-400 dark:border-zinc-800 hover:border-emerald-400'
            }`}
          >
            {f === 'pending' ? `Pending (${pendingCount})` : f === 'graded' ? 'Graded' : 'All'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-zinc-400">
          <CircleNotch size={24} className="animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <Card className="border-dashed border-zinc-300 dark:border-zinc-700">
          <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
            <CheckCircle size={40} className="mb-3 text-emerald-500" />
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">
              {filter === 'pending' ? 'All caught up' : 'No submissions here'}
            </h3>
            <p className="mt-1 max-w-sm text-sm text-zinc-500 dark:text-zinc-400">
              {filter === 'pending'
                ? 'There are no submissions waiting for your review.'
                : 'Submissions for your courses will appear here.'}
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((s) => (
            <Card key={s.id} className="border-zinc-200 dark:border-zinc-800">
              <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400">
                  <FileText size={18} weight="duotone" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-zinc-900 dark:text-white">
                    {s.student_name}
                    <span className="ml-2 font-normal text-zinc-500">{s.assignment_title}</span>
                  </p>
                  <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                    {s.course_title} · submitted {new Date(s.submitted_at).toLocaleDateString()}
                  </p>
                  {(s.file_names || []).length > 0 && (
                    <p className="mt-1 text-xs text-zinc-400">{(s.file_names || []).join(', ')}</p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {s.score != null ? (
                    <Badge className="bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
                      Scored {s.score}
                    </Badge>
                  ) : (
                    <Badge className="bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">Ungraded</Badge>
                  )}
                  <Button size="sm" variant="outline" onClick={() => openGrade(s)}>
                    <PencilSimpleLine size={14} className="mr-1" />
                    {s.score != null ? 'Edit grade' : 'Grade'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={grading != null} onOpenChange={(o) => { if (!o) setGrading(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Grade submission</DialogTitle>
          </DialogHeader>
          {grading && (
            <div className="space-y-4">
              <div className="rounded-lg bg-zinc-50 p-3 text-sm dark:bg-zinc-900">
                <p className="font-medium text-zinc-900 dark:text-white">{grading.student_name}</p>
                <p className="text-xs text-zinc-500">{grading.assignment_title} · {grading.course_title}</p>
                {grading.content && (
                  <p className="mt-2 whitespace-pre-wrap text-xs text-zinc-600 dark:text-zinc-400">{grading.content}</p>
                )}
                {(grading.file_urls || []).map((url, i) => (
                  <button
                    key={url}
                    type="button"
                    onClick={() => void downloadFile(url, grading.file_names?.[i] || `file-${i}`)}
                    className="mt-2 flex items-center gap-1 text-xs font-medium text-emerald-600 hover:underline dark:text-emerald-400"
                  >
                    <DownloadSimple size={13} /> {grading.file_names?.[i] || `Attachment ${i + 1}`}
                  </button>
                ))}
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">Score</label>
                <Input type="number" min={0} value={score} onChange={(e) => setScore(e.target.value)} placeholder="e.g. 85" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">Feedback (optional)</label>
                <Textarea value={feedback} onChange={(e) => setFeedback(e.target.value)} rows={4} placeholder="Feedback for the student…" />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setGrading(null)}>Cancel</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => void saveGrade()} disabled={saving}>
              {saving ? <CircleNotch size={16} className="animate-spin" /> : 'Save grade'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
