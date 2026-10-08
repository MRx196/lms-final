import { useState, useEffect, useRef } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ClipboardText, UploadSimple, CheckCircle, XCircle, Clock, WarningCircle,
  ArrowRight, MagnifyingGlass, Eye, Download, PaperPlaneTilt,
  Spinner, File, FileText, ArrowLeft, Trophy,
  Check, Timer, FlagBanner
} from '@phosphor-icons/react';
import { ROUTES } from '@/constants/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import * as AssessmentService from '@/services/assessmentService';
import type { AssignmentRow, SubmissionRow, QuizRow, QuizQuestionRow, QuizAttemptRow } from '@/services/assessmentService';

const itemVariants = { hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { ease: 'easeOut' as const } } };

/* ─── Student Assignments Page ─── */
export function StudentAssignmentsPage() {
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pending' | 'submitted' | 'graded'>('pending');
  const [submitOpen, setSubmitOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<AssignmentRow | null>(null);
  const [submissionContent, setSubmissionContent] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function load() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setLoading(false); return; }
        const { data: enrollData } = await supabase.from('enrollments').select('course_id').eq('user_id', user.id);
        const courseIds = (enrollData || []).map((e: any) => e.course_id);
        if (courseIds.length === 0) { setLoading(false); return; }
        const { data: assignData } = await supabase.from('assignments').select(`*, course:courses(title)`).in('course_id', courseIds).order('due_date', { ascending: true });
        if (assignData) {
          const enriched = await Promise.all(
            (assignData as any[]).map(async (a) => {
              const sub = await AssessmentService.getSubmission(a.id, user.id);
              return { ...a, submission: sub as SubmissionRow | null };
            })
          );
          setAssignments(enriched);
        }
      } catch (err: any) { toast.error(err.message || 'Failed to load assignments'); }
      finally { setLoading(false); }
    }
    load();
  }, []);

  const filtered = assignments.filter(a => {
    const s = a.submission?.status;
    if (activeTab === 'pending') return !s || s === 'draft';
    if (activeTab === 'submitted') return s === 'submitted' || s === 'late';
    return s === 'graded' || s === 'returned';
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setUploadedFiles(Array.from(e.target.files));
  };

  const handleSubmit = async () => {
    if (!selectedAssignment) return;
    if (uploadedFiles.length === 0 && !submissionContent.trim()) {
      toast.error('Please add content or upload a file');
      return;
    }
    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const fileUrls: string[] = [];
      const fileNames: string[] = [];
      for (const file of uploadedFiles) {
        const url = await AssessmentService.uploadFile(file, user.id, selectedAssignment.id);
        fileUrls.push(url);
        fileNames.push(file.name);
      }
      await AssessmentService.submitAssignment(selectedAssignment.id, user.id, submissionContent, fileUrls, fileNames);
      toast.success('Assignment submitted!');
      setSubmitOpen(false);
      setUploadedFiles([]);
      setSubmissionContent('');
      window.location.reload();
    } catch (err: any) { toast.error(err.message || 'Failed to submit'); }
    finally { setUploading(false); }
  };

  const handleSaveDraft = async () => {
    if (!selectedAssignment) return;
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await AssessmentService.saveDraft(selectedAssignment.id, user.id, submissionContent);
      toast.success('Draft saved');
      setSubmitOpen(false);
      window.location.reload();
    } catch (err: any) { toast.error(err.message || 'Failed to save draft'); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="space-y-4">{[0,1,2].map(i => <div key={i} className="h-20 bg-zinc-100 dark:bg-zinc-800 rounded-xl animate-pulse" />)}</div>;

  return (
    <motion.div initial="hidden" animate="visible" className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Assignments</h1>
      </div>

      <Tabs defaultValue={activeTab} onValueChange={(v: any) => setActiveTab(v)}>
        <TabsList>
          <TabsTrigger value="pending">Pending ({assignments.filter(a => !a.submission || a.submission.status === 'draft').length})</TabsTrigger>
          <TabsTrigger value="submitted">Submitted ({assignments.filter(a => a.submission?.status === 'submitted' || a.submission?.status === 'late').length})</TabsTrigger>
          <TabsTrigger value="graded">Graded ({assignments.filter(a => a.submission?.status === 'graded' || a.submission?.status === 'returned').length})</TabsTrigger>
        </TabsList>
      </Tabs>

      {filtered.length === 0 ? (
        <Card className="border-dashed border-zinc-300 dark:border-zinc-700"><CardContent className="p-10 text-center">
          <ClipboardText size={48} className="mx-auto text-zinc-300 mb-4" />
          <h3 className="font-semibold text-zinc-900 dark:text-white mb-1">No assignments here</h3>
          <p className="text-sm text-zinc-500">Your instructors will post assignments soon.</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(a => (
            <Card key={a.id} className="border-zinc-200 dark:border-zinc-800">
              <CardContent className="p-4 flex items-center gap-4">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                  a.submission?.status === 'graded' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30' :
                  a.submission?.status === 'returned' ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30' :
                  a.submission?.status === 'late' ? 'bg-red-100 text-red-600 dark:bg-red-900/30' :
                  a.submission?.status === 'submitted' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30' :
                  'bg-zinc-100 text-zinc-500 dark:bg-zinc-800'
                }`}>
                  <ClipboardText size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-sm text-zinc-900 dark:text-white truncate">{a.title}</h3>
                  <p className="text-xs text-zinc-500">{a.course?.title || 'Course'}</p>
                  {a.instructions && <p className="text-xs text-zinc-400 mt-0.5 line-clamp-1">{a.instructions}</p>}
                </div>
                <div className="text-right shrink-0 space-y-1">
                  {a.submission?.score !== null && (
                    <div>
                      <p className="text-sm font-bold text-zinc-900 dark:text-white">{a.submission.score}/{a.max_score ?? '?'}</p>
                      {statusBadge(a.submission.status)}
                    </div>
                  )}
                  {!a.submission || a.submission.status === 'draft' ? (
                    <Button size="sm" onClick={() => { setSelectedAssignment(a as AssignmentRow); setSubmitOpen(true); }} className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1">
                      <UploadSimple size={14} /> Submit
                    </Button>
                  ) : (
                    statusBadge(a.submission.status)
                  )}
                  {a.due_date && <p className="text-[10px] text-zinc-400">{new Date(a.due_date).toLocaleDateString()}</p>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Submit Dialog */}
      <Dialog open={submitOpen} onOpenChange={setSubmitOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Submit Assignment</DialogTitle></DialogHeader>
          {selectedAssignment && (
            <div className="space-y-4 py-2">
              <div className="p-3 bg-zinc-50 dark:bg-zinc-900 rounded-lg">
                <h4 className="font-medium text-sm text-zinc-900 dark:text-white">{selectedAssignment.title}</h4>
                {selectedAssignment.instructions && (
                  <p className="text-xs text-zinc-500 mt-1 whitespace-pre-wrap">{selectedAssignment.instructions}</p>
                )}
                {selectedAssignment.submission_requirements && (
                  <p className="text-xs text-zinc-400 mt-1">Requirements: {selectedAssignment.submission_requirements}</p>
                )}
              </div>

              <Textarea value={submissionContent} onChange={e => setSubmissionContent(e.target.value)} placeholder="Write your response here..." rows={4} />

              <div>
                <Label>Upload Files</Label>
                <div className="mt-2 border-2 border-dashed border-zinc-200 dark:border-zinc-700 rounded-lg p-6 text-center">
                  <input ref={fileInputRef} type="file" multiple accept=".pdf,.doc,.docx,.zip,.txt,.png,.jpg" onChange={handleFileSelect} className="hidden" />
                  <button type="button" onClick={() => fileInputRef.current?.click()} className="text-emerald-600 hover:text-emerald-700 text-sm font-medium">
                    <UploadSimple size={24} className="mx-auto mb-2" /> Click to upload files
                  </button>
                  <p className="text-xs text-zinc-400 mt-1">Allowed: {selectedAssignment.allowed_file_types?.join(', ') || 'pdf, doc, docx, zip'} · Max: {selectedAssignment.max_file_size_mb ?? 10}MB each</p>
                </div>
                {uploadedFiles.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {uploadedFiles.map((f, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400">
                        <File size={14} /> {f.name} ({(f.size / 1024).toFixed(0)}KB)
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={handleSaveDraft} disabled={saving}>Save Draft</Button>
                <Button onClick={handleSubmit} disabled={uploading} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
                  {uploading ? <Spinner size={16} className="animate-spin" /> : <PaperPlaneTilt size={16} />} Submit
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}

/* ─── Student Quizzes Page ─── */
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
        const { data } = await supabase.from('quizzes').select('*, course:courses(title)').in('course_id', courseIds).order('sort_order', { ascending: true });
        if (data) setQuizzes(data as any[]);
      } catch (err: any) { toast.error(err.message || 'Failed to load quizzes'); }
      finally { setLoading(false); }
    }
    load();
  }, []);

  if (loading) return <div className="space-y-4">{[0,1,2].map(i => <div key={i} className="h-20 bg-zinc-100 dark:bg-zinc-800 rounded-xl animate-pulse" />)}</div>;

  return (
    <motion.div initial="hidden" animate="visible" className="space-y-6">
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Quizzes</h1>
      {quizzes.length === 0 ? (
        <Card className="border-dashed border-zinc-300 dark:border-zinc-700"><CardContent className="p-10 text-center">
          <ExamIcon size={48} className="mx-auto text-zinc-300 mb-4" />
          <h3 className="font-semibold text-zinc-900 dark:text-white mb-1">No quizzes available</h3>
          <p className="text-sm text-zinc-500">Check back later for new quizzes.</p>
        </CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {quizzes.map(q => (
            <Card key={q.id} className="border-zinc-200 dark:border-zinc-800">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/30 flex items-center justify-center">
                      <ExamIcon size={20} />
                    </div>
                    <div>
                      <h3 className="font-medium text-sm text-zinc-900 dark:text-white">{q.title}</h3>
                      <p className="text-xs text-zinc-500">{q.course?.title || 'Course'}</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs text-zinc-400 mb-4">
                  {q.time_limit && <span className="flex items-center gap-1"><Clock size={12} />{q.time_limit}m</span>}
                  <span>Pass: {q.passing_score ?? 70}%</span>
                  <span>Attempts: {q.max_attempts ?? 3}</span>
                </div>
                <Link to={`/student/quizzes/${q.id}`} className="block">
                  <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
                    Start Quiz <ArrowRight size={16} />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </motion.div>
  );
}

/* ─── Quiz Runner ─── */
export function StudentQuizRunner() {
  const { quizId } = useParams<{ quizId: string }>();
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState<QuizRow | null>(null);
  const [questions, setQuestions] = useState<QuizQuestionRow[]>([]);
  const [answers, setAnswers] = useState<Record<string, string | null>>({});
  const [currentQ, setCurrentQ] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [started, setStarted] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [result, setResult] = useState<{ score: number; total: number; passed: boolean } | null>(null);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    async function load() {
      if (!quizId) return;
      try {
        const q = await supabase.from('quizzes').select('*').eq('id', quizId).single();
        if (q.data) setQuiz(q.data as QuizRow);
        const qs = await AssessmentService.getQuizQuestions(quizId);
        setQuestions(qs);
      } catch (err: any) { toast.error(err.message || 'Failed to load quiz'); }
      finally { setLoading(false); }
    }
    load();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [quizId]);

  useEffect(() => {
    if (started && timeLeft > 0 && !completed) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) { autoSubmit(); return 0; }
          return prev - 1;
        });
      }, 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [started, completed]);

  const startQuiz = async () => {
    if (!quizId) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const count = await AssessmentService.getAttemptCount(quizId, user.id);
    if (count >= (quiz?.max_attempts ?? 3)) {
      toast.error('Maximum attempts reached');
      return;
    }
    const attempt = await AssessmentService.createAttempt(quizId, user.id);
    setAttemptId(attempt.id);
    setTimeLeft(quiz?.time_limit ? quiz.time_limit * 60 : 0);
    setStarted(true);
  };

  const autoSubmit = () => {
    submitQuiz();
  };

  const submitQuiz = async () => {
    if (!attemptId || !questions.length) return;
    let score = 0;
    let totalPoints = 0;
    const answerRecords: Array<{ question_id: string; selected_option_id: string | null }> = [];

    for (const q of questions) {
      totalPoints += q.points;
      const selectedOptId = answers[q.id];
      answerRecords.push({ question_id: q.id, selected_option_id: selectedOptId });
      if (selectedOptId) {
        const opt = q.options?.find(o => o.id === selectedOptId);
        if (opt?.is_correct) score += q.points;
      }
    }

    const passed = quiz ? (score / totalPoints) * 100 >= (quiz.passing_score ?? 70) : false;
    const submitted = await AssessmentService.submitAttempt(attemptId, answerRecords, score, totalPoints, passed);

    // Save to quiz_results
    await supabase.from('quiz_results').insert({
      user_id: submitted.user_id,
      course_id: quiz?.course_id,
      score,
      total_score: totalPoints,
      passed,
      completed_at: new Date().toISOString(),
    });

    setResult({ score, total: totalPoints, passed });
    setCompleted(true);
  };

  if (loading) return <div className="space-y-4">{[0,1,2].map(i => <div key={i} className="h-20 bg-zinc-100 dark:bg-zinc-800 rounded-xl animate-pulse" />)}</div>;
  if (!quiz || questions.length === 0) return <div className="text-center py-12"><WarningCircle size={48} className="mx-auto text-zinc-300 mb-4" /><p className="text-zinc-500">Quiz not found or has no questions.</p></div>;

  if (!started) {
    return (
      <motion.div initial="hidden" animate="visible" className="max-w-2xl mx-auto space-y-6">
        <Card className="border-zinc-200 dark:border-zinc-800">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mx-auto mb-4">
              <ExamIcon size={32} className="text-blue-600" />
            </div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white mb-2">{quiz.title}</h1>
            {quiz.description && <p className="text-sm text-zinc-500 mb-6">{quiz.description}</p>}
            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className="p-3 bg-zinc-50 dark:bg-zinc-900 rounded-lg">
                <Clock size={20} className="mx-auto text-zinc-400 mb-1" />
                <p className="text-sm font-medium text-zinc-900 dark:text-white">{quiz.time_limit ?? '?'} min</p>
                <p className="text-xs text-zinc-400">Time Limit</p>
              </div>
              <div className="p-3 bg-zinc-50 dark:bg-zinc-900 rounded-lg">
                <FlagBanner size={20} className="mx-auto text-zinc-400 mb-1" />
                <p className="text-sm font-medium text-zinc-900 dark:text-white">{questions.length}</p>
                <p className="text-xs text-zinc-400">Questions</p>
              </div>
              <div className="p-3 bg-zinc-50 dark:bg-zinc-900 rounded-lg">
                <Trophy size={20} className="mx-auto text-zinc-400 mb-1" />
                <p className="text-sm font-medium text-zinc-900 dark:text-white">{quiz.passing_score ?? 70}%</p>
                <p className="text-xs text-zinc-400">Pass Score</p>
              </div>
            </div>
            <Button onClick={startQuiz} className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 gap-2">
              Start Quiz <ArrowRight size={16} />
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  if (completed && result) {
    return (
      <motion.div initial="hidden" animate="visible" className="max-w-2xl mx-auto space-y-6">
        <Card className={`border-2 ${result.passed ? 'border-emerald-200 dark:border-emerald-800' : 'border-red-200 dark:border-red-800'}`}>
          <CardContent className="p-8 text-center">
            <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 ${result.passed ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30' : 'bg-red-100 text-red-600 dark:bg-red-900/30'}`}>
              {result.passed ? <CheckCircle size={40} weight="bold" /> : <XCircle size={40} weight="bold" />}
            </div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white mb-2">{result.passed ? 'Congratulations!' : 'Not Passed'}</h1>
            <p className="text-zinc-500 mb-6">{result.passed ? 'You passed the quiz!' : 'You need to review and try again.'}</p>
            <div className="inline-flex items-center gap-2 px-6 py-3 bg-zinc-50 dark:bg-zinc-900 rounded-xl mb-6">
              <span className="text-3xl font-bold text-zinc-900 dark:text-white">{Math.round((result.score / result.total) * 100)}%</span>
              <span className="text-sm text-zinc-400">{result.score}/{result.total} points</span>
            </div>
            <div className="flex gap-3 justify-center">
              <Button onClick={() => navigate(ROUTES.studentQuizzes)} variant="outline" className="gap-2">Back to Quizzes</Button>
              {(!result.passed || (quiz.max_attempts ?? 3) > 1) && (
                <Link to={`/student/quizzes/${quizId}`}>
                  <Button className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2">Try Again</Button>
                </Link>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  const q = questions[currentQ];
  const pct = ((currentQ + 1) / questions.length) * 100;
  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;

  return (
    <motion.div initial="hidden" animate="visible" className="max-w-3xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Link to={ROUTES.studentQuizzes}><Button size="sm" variant="ghost" className="gap-1"><ArrowLeft size={14} /> Back</Button></Link>
        <h2 className="font-semibold text-sm text-zinc-900 dark:text-white">{quiz.title}</h2>
        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-mono font-bold ${timeLeft < 60 ? 'bg-red-100 text-red-600 dark:bg-red-900/30' : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800'}`}>
          <Timer size={16} />
          {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
        </div>
      </div>

      {/* Progress */}
      <Progress value={pct} className="h-2" />
      <div className="flex items-center justify-between text-xs text-zinc-400">
        <span>Question {currentQ + 1} of {questions.length}</span>
        <span>{Math.round(pct)}% complete</span>
      </div>

      {/* Question Navigation Dots */}
      <div className="flex flex-wrap gap-1.5">
        {questions.map((_, i) => (
          <button key={i} onClick={() => setCurrentQ(i)}
            className={`w-7 h-7 rounded-md text-xs font-medium transition-colors ${
              i === currentQ ? 'bg-emerald-600 text-white' :
              answers[questions[i].id] ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' :
              'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400'
            }`}>{i + 1}</button>
        ))}
      </div>

      {/* Question Card */}
      <Card className="border-zinc-200 dark:border-zinc-800">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs text-zinc-400 font-mono">Question {currentQ + 1}</span>
            <Badge variant="secondary" className="text-xs">{q.type === 'true_false' ? 'True / False' : 'Multiple Choice'} · {q.points} pts</Badge>
          </div>
          <h3 className="text-lg font-medium text-zinc-900 dark:text-white mb-6">{q.text}</h3>

          <div className="space-y-3">
            {(q.type === 'true_false' ? [
              { id: 'true', text: 'True', correct: false },
              { id: 'false', text: 'False', correct: false },
            ] : (q.options || [])).map((opt: any) => (
              <button key={opt.id || opt.text} onClick={() => setAnswers({ ...answers, [q.id]: opt.id || opt.text })}
                className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                  answers[q.id] === (opt.id || opt.text)
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 dark:border-emerald-600'
                    : 'border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600'
                }`}>
                <div className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    answers[q.id] === (opt.id || opt.text) ? 'border-emerald-500 bg-emerald-500' : 'border-zinc-300 dark:border-zinc-600'
                  }`}>
                    {answers[q.id] === (opt.id || opt.text) && <div className="w-2 h-2 rounded-full bg-white" />}
                  </div>
                  <span className="text-sm text-zinc-900 dark:text-white">{opt.text}</span>
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={() => setCurrentQ(Math.max(0, currentQ - 1))} disabled={currentQ === 0}>Previous</Button>
        {currentQ < questions.length - 1 ? (
          <Button onClick={() => setCurrentQ(currentQ + 1)} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2">Next <ArrowRight size={16} /></Button>
        ) : (
          <Button onClick={submitQuiz} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2">Submit Quiz <CheckCircle size={16} /></Button>
        )}
      </div>
    </motion.div>
  );
}

/* ─── Student Results Page ─── */
export function StudentResultsPage() {
  const [attempts, setAttempts] = useState<Array<QuizAttemptRow & { quiz?: { title?: string | null; course_id?: string } | null }>>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const results = await AssessmentService.getStudentResults((await supabase.auth.getUser()).data.user?.id || '');
        const payload = (results && !Array.isArray(results) ? results : { attempts: [], submissions: [] }) as { attempts: QuizAttemptRow[]; submissions: any[] };
        setAttempts(payload.attempts);
        setSubmissions(payload.submissions);
      } catch (err: any) { toast.error(err.message || 'Failed to load results'); }
      finally { setLoading(false); }
    }
    load();
  }, []);

  if (loading) return <div className="space-y-4">{[0,1,2].map(i => <div key={i} className="h-20 bg-zinc-100 dark:bg-zinc-800 rounded-xl animate-pulse" />)}</div>;

  const avgQuizScore = attempts.length > 0 ? Math.round((attempts.reduce((s, a) => s + (a.total_points > 0 ? (a.score / a.total_points) * 100 : 0), 0) / attempts.length)) : 0;
  const quizPassed = attempts.filter(a => a.passed).length;
  const gradedAssignments = submissions.filter(s => s.status === 'graded');
  const avgAssignScore = gradedAssignments.length > 0 ? Math.round((gradedAssignments.reduce((s, a) => s + (a.assignment?.max_score ? (a.score / a.assignment.max_score) * 100 : 0), 0) / gradedAssignments.length)) : 0;

  return (
    <motion.div initial="hidden" animate="visible" className="space-y-6">
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Results</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Quizzes Taken', value: attempts.length, icon: ExamIcon, tint: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20' },
          { label: 'Avg Quiz Score', value: `${avgQuizScore}%`, icon: TrendUpIcon, tint: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20' },
          { label: 'Quizzes Passed', value: quizPassed, icon: CheckCircle, tint: 'text-green-600 bg-green-50 dark:bg-green-900/20' },
          { label: 'Avg Assignment', value: `${avgAssignScore}%`, icon: Trophy, tint: 'text-violet-600 bg-violet-50 dark:bg-violet-900/20' },
        ].map(stat => (
          <Card key={stat.label} className="border-zinc-200 dark:border-zinc-800">
            <CardContent className="p-5 flex items-center gap-4">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${stat.tint}`}>
                <stat.icon size={20} />
              </div>
              <div><p className="text-2xl font-bold text-zinc-900 dark:text-white">{stat.value}</p><p className="text-xs text-zinc-500">{stat.label}</p></div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quiz Attempts */}
      <div>
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-white mb-3">Quiz History</h2>
        {attempts.length === 0 ? (
          <Card className="border-dashed border-zinc-300 dark:border-zinc-700"><CardContent className="p-8 text-center">
            <TrendUpIcon size={32} className="mx-auto text-zinc-300 mb-2" />
            <p className="text-sm text-zinc-500">No quiz results yet.</p>
          </CardContent></Card>
        ) : (
          <div className="space-y-2">
            {attempts.slice(0, 10).map(a => (
              <Card key={a.id} className="border-zinc-200 dark:border-zinc-800">
                <CardContent className="p-3 flex items-center gap-4">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${a.passed ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30' : 'bg-red-100 text-red-600 dark:bg-red-900/30'}`}>
                    {a.passed ? <Check size={16} weight="bold" /> : <XCircle size={16} weight="bold" />}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-zinc-900 dark:text-white">{a.quiz?.title || 'Quiz'}</p>
                    <p className="text-xs text-zinc-400">{a.completed_at ? new Date(a.completed_at).toLocaleDateString() : ''}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-zinc-900 dark:text-white">{a.total_points > 0 ? Math.round((a.score / a.total_points) * 100) : 0}%</p>
                    <p className="text-xs text-zinc-400">{a.score}/{a.total_points}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Assignment Grades */}
      <div>
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-white mb-3">Assignment Grades</h2>
        {gradedAssignments.length === 0 ? (
          <Card className="border-dashed border-zinc-300 dark:border-zinc-700"><CardContent className="p-8 text-center">
            <ClipboardText size={32} className="mx-auto text-zinc-300 mb-2" />
            <p className="text-sm text-zinc-500">No graded assignments yet.</p>
          </CardContent></Card>
        ) : (
          <div className="space-y-2">
            {gradedAssignments.slice(0, 10).map(s => (
              <Card key={s.id} className="border-zinc-200 dark:border-zinc-800">
                <CardContent className="p-3 flex items-center gap-4">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 flex items-center justify-center shrink-0">
                    <CheckCircle size={16} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-zinc-900 dark:text-white">{s.assignment?.title || 'Assignment'}</p>
                    <p className="text-xs text-zinc-400">{s.feedback && `Feedback: ${s.feedback.substring(0, 60)}${s.feedback.length > 60 ? '...' : ''}`}</p>
                  </div>
                  <p className="text-sm font-bold text-zinc-900 dark:text-white">{s.score}/{s.assignment?.max_score ?? '?'}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

/* ─── Student Certificates Page ─── */
export function StudentCertificatesPage() {
  const [certs, setCerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const certsData = await AssessmentService.getUserCertificates((await supabase.auth.getUser()).data.user?.id || '');
        setCerts(certsData);
      } catch (err: any) { toast.error(err.message || 'Failed to load certificates'); }
      finally { setLoading(false); }
    }
    load();
  }, []);

  if (loading) return <div className="space-y-4">{[0,1,2].map(i => <div key={i} className="h-48 bg-zinc-100 dark:bg-zinc-800 rounded-xl animate-pulse" />)}</div>;

  return (
    <motion.div initial="hidden" animate="visible" className="space-y-6">
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Certificates</h1>
      {certs.length === 0 ? (
        <Card className="border-dashed border-zinc-300 dark:border-zinc-700"><CardContent className="p-10 text-center">
          <CertificateIcon size={48} className="mx-auto text-zinc-300 mb-4" />
          <h3 className="font-semibold text-zinc-900 dark:text-white mb-1">No certificates yet</h3>
          <p className="text-sm text-zinc-500">Complete courses to earn your certificates.</p>
        </CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {certs.map(cert => (
            <Card key={cert.id} className="border-zinc-200 dark:border-zinc-800">
              <CardContent className="p-6 text-center">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-100 to-amber-100 dark:from-emerald-900/30 dark:to-amber-900/30 flex items-center justify-center mx-auto mb-4">
                  <CertificateIcon size={32} className="text-emerald-600" />
                </div>
                <h3 className="font-semibold text-zinc-900 dark:text-white mb-1">{cert.course?.title || 'Course Certificate'}</h3>
                <p className="text-xs text-zinc-500 mb-1">Code: {cert.certificate_code}</p>
                <p className="text-xs text-zinc-400 mb-4">Issued {cert.issued_at ? new Date(cert.issued_at).toLocaleDateString() : 'N/A'}</p>
                <div className="flex gap-2 justify-center">
                  <a href={`/certificate/verify/${cert.certificate_code}`} target="_blank" rel="noopener noreferrer">
                    <Button size="sm" variant="outline" className="gap-1 text-emerald-600"><Eye size={14} /> Verify</Button>
                  </a>
                  <Button size="sm" variant="outline" className="gap-1 text-zinc-600"><Download size={14} /> Download</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </motion.div>
  );
}

/* ─── Icons ─── */
function ExamIcon({ size, weight, className }: { size?: number; weight?: string; className?: string }) {
  return <ClipboardText size={size} weight={weight as 'regular'} className={className} />;
}
function TrendUpIcon({ size, weight, className }: { size?: number; weight?: string; className?: string }) {
  return <Trophy size={size} weight={weight as 'regular'} className={className} />;
}
function CertificateIcon({ size, weight, className }: { size?: number; weight?: string; className?: string }) {
  return <Trophy size={size} weight={weight as 'regular'} className={className} />;
}
function Label({ children, className }: { children: React.ReactNode; className?: string }) {
  return <label className={`text-xs font-medium text-zinc-500 mb-1 block ${className || ''}`}>{children}</label>;
}

function statusBadge(status: string) {
  const map: Record<string, { label: string; cls: string }> = {
    draft: { label: 'Draft', cls: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400' },
    submitted: { label: 'Submitted', cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
    late: { label: 'Late', cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
    graded: { label: 'Graded', cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' },
    returned: { label: 'Returned', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
  };
  const s = map[status] || map.draft;
  return <Badge className={`${s.cls} border-0 capitalize`}>{s.label}</Badge>;
}