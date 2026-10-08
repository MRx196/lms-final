import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  ClipboardText, Plus, Pencil, Trash, Eye, Download,
  CheckCircle, XCircle, Clock, WarningCircle, ArrowRight,
  MagnifyingGlass, FunnelSimple, GraduationCap, BookOpen,
  NotePencil, Spinner, UploadSimple, PaperPlaneTilt, ProhibitInset
} from '@phosphor-icons/react';
import { ROUTES } from '@/constants/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import * as AssessmentService from '@/services/assessmentService';
import type { AssignmentRow, SubmissionRow, QuizRow, QuizQuestionRow, QuizOptionRow, CourseRow } from '@/services/assessmentService';

const itemVariants = { hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { ease: 'easeOut' as const } } };

/* ─── Status helpers ─── */
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

export function AdminAssignmentsPage() {
  const [assignments, setAssignments] = useState<any[]>([]);
  const [courses, setCourses] = useState<CourseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCourse, setFilterCourse] = useState('all');
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [gradingOpen, setGradingOpen] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState<any>(null);
  const [gradeScore, setGradeScore] = useState('');
  const [gradeFeedback, setGradeFeedback] = useState('');
  const [saving, setSaving] = useState(false);

  // Form state
  const [formTitle, setFormTitle] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formInstructions, setFormInstructions] = useState('');
  const [formCourseId, setFormCourseId] = useState('');
  const [formModuleId, setFormModuleId] = useState('');
  const [formDueDate, setFormDueDate] = useState('');
  const [formMaxScore, setFormMaxScore] = useState('100');
  const [formFileTypes, setFormFileTypes] = useState('pdf,doc,docx,zip');
  const [formMaxSize, setFormMaxSize] = useState('10');
  const [formRequirements, setFormRequirements] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data: profile } = await supabase.from('profiles').select('role').eq('user_id', user.id).single();
        if (profile?.role !== 'admin' && profile?.role !== 'instructor') {
          toast.error('Access denied');
          return;
        }
        const [assignData, courseData] = await Promise.all([
          AssessmentService.getAllAssignments(),
          supabase.from('courses').select('*').order('title'),
        ]);
        setAssignments(assignData || []);
        setCourses((courseData.data || []) as CourseRow[]);
      } catch (err: any) { toast.error(err.message || 'Failed to load'); }
      finally { setLoading(false); }
    }
    load();
  }, []);

  const filtered = assignments.filter(a => {
    const matchCourse = filterCourse === 'all' || a.course_id === filterCourse;
    const matchSearch = !search || a.title.toLowerCase().includes(search.toLowerCase());
    return matchCourse && matchSearch;
  });

  const resetForm = () => {
    setFormTitle(''); setFormDesc(''); setFormInstructions('');
    setFormCourseId(''); setFormModuleId(''); setFormDueDate('');
    setFormMaxScore('100'); setFormFileTypes('pdf,doc,docx,zip');
    setFormMaxSize('10'); setFormRequirements('');
  };

  const handleCreate = async () => {
    if (!formTitle || !formCourseId) { toast.error('Title and course required'); return; }
    setSaving(true);
    try {
      await AssessmentService.createAssignment({
        title: formTitle, description: formDesc || null, instructions: formInstructions || null,
        course_id: formCourseId, module_id: formModuleId || null,
        due_date: formDueDate || null, max_score: Number(formMaxScore),
        allowed_file_types: formFileTypes.split(',').map(s => s.trim()),
        max_file_size_mb: Number(formMaxSize), submission_requirements: formRequirements || null,
      });
      toast.success('Assignment created');
      setCreateOpen(false);
      resetForm();
      window.location.reload();
    } catch (err: any) { toast.error(err.message || 'Failed to create'); }
    finally { setSaving(false); }
  };

  const openGrader = async (sub: any) => {
    setSelectedSubmission(sub);
    setGradeScore(String(sub.score ?? ''));
    setGradeFeedback(sub.feedback || '');
    setGradingOpen(true);
  };

  const handleGrade = async () => {
    if (!selectedSubmission) return;
    setSaving(true);
    try {
      await AssessmentService.gradeSubmission(selectedSubmission.id, Number(gradeScore), gradeFeedback);
      toast.success('Submission graded');
      setGradingOpen(false);
      window.location.reload();
    } catch (err: any) { toast.error(err.message || 'Failed to grade'); }
    finally { setSaving(false); }
  };

  const handleReturn = async () => {
    if (!selectedSubmission) return;
    setSaving(true);
    try {
      await AssessmentService.returnSubmission(selectedSubmission.id);
      toast.success('Submission returned to student');
      setGradingOpen(false);
      window.location.reload();
    } catch (err: any) { toast.error(err.message || 'Failed to return'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this assignment? All submissions will be lost.')) return;
    try {
      await AssessmentService.deleteAssignment(id);
      toast.success('Assignment deleted');
      window.location.reload();
    } catch (err: any) { toast.error(err.message || 'Failed to delete'); }
  };

  if (loading) return <div className="space-y-4">{[0,1,2,3].map(i => <div key={i} className="h-20 bg-zinc-100 dark:bg-zinc-800 rounded-xl animate-pulse" />)}</div>;

  return (
    <motion.div initial="hidden" animate="visible" className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Assignments</h1>
          <p className="text-sm text-zinc-500 mt-1">{assignments.length} total assignments</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"><Plus size={16} /> New Assignment</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Create Assignment</DialogTitle></DialogHeader>
            <div className="space-y-4 py-2">
              <div>
                <Label>Title *</Label>
                <Input value={formTitle} onChange={e => setFormTitle(e.target.value)} placeholder="Assignment title" />
              </div>
              <div>
                <Label>Course *</Label>
                <Select value={formCourseId} onValueChange={setFormCourseId}>
                  <SelectTrigger><SelectValue placeholder="Select course" /></SelectTrigger>
                  <SelectContent>
                    {courses.map(c => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Module (optional)</Label>
                <Input value={formModuleId} onChange={e => setFormModuleId(e.target.value)} placeholder="Module ID" />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea value={formDesc} onChange={e => setFormDesc(e.target.value)} placeholder="Brief description" rows={2} />
              </div>
              <div>
                <Label>Instructions</Label>
                <Textarea value={formInstructions} onChange={e => setFormInstructions(e.target.value)} placeholder="Detailed instructions for students" rows={4} />
              </div>
              <div>
                <Label>Due Date</Label>
                <Input type="datetime-local" value={formDueDate} onChange={e => setFormDueDate(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Max Score</Label>
                  <Input type="number" value={formMaxScore} onChange={e => setFormMaxScore(e.target.value)} />
                </div>
                <div>
                  <Label>Max File Size (MB)</Label>
                  <Input type="number" value={formMaxSize} onChange={e => setFormMaxSize(e.target.value)} />
                </div>
              </div>
              <div>
                <Label>Allowed File Types</Label>
                <Input value={formFileTypes} onChange={e => setFormFileTypes(e.target.value)} placeholder="pdf,doc,docx,zip" />
              </div>
              <div>
                <Label>Submission Requirements</Label>
                <Textarea value={formRequirements} onChange={e => setFormRequirements(e.target.value)} placeholder="What students must include" rows={2} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button onClick={handleCreate} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 text-white">Create</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <MagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search assignments..." className="pl-9" />
        </div>
        <Select value={filterCourse} onValueChange={setFilterCourse}>
          <SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="All courses" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All courses</SelectItem>
            {courses.map(c => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Assignment List */}
      {filtered.length === 0 ? (
        <Card className="border-dashed border-zinc-300 dark:border-zinc-700"><CardContent className="p-10 text-center">
          <ClipboardText size={48} className="mx-auto text-zinc-300 mb-4" />
          <h3 className="font-semibold text-zinc-900 dark:text-white mb-1">No assignments found</h3>
          <p className="text-sm text-zinc-500">Create your first assignment to get started.</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(a => (
            <Card key={a.id} className="border-zinc-200 dark:border-zinc-800">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 flex items-center justify-center shrink-0">
                  <ClipboardText size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-sm text-zinc-900 dark:text-white truncate">{a.title}</h3>
                  <p className="text-xs text-zinc-500">{a.course?.title || 'Unknown course'}</p>
                </div>
                <div className="text-right shrink-0 space-x-2">
                  {a.due_date && <span className="text-xs text-zinc-400 mr-2">{new Date(a.due_date).toLocaleDateString()}</span>}
                  <span className="text-xs text-zinc-400 mr-2">/{a.max_score ?? '?'} pts</span>
                  <button onClick={() => handleDelete(a.id)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-zinc-400 hover:text-red-600 transition-colors">
                    <Trash size={16} />
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Grading Modal */}
      <Dialog open={gradingOpen} onOpenChange={setGradingOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Grade Submission</DialogTitle></DialogHeader>
          {selectedSubmission && (
            <div className="space-y-4 py-2">
              <div className="flex items-center gap-3 p-3 bg-zinc-50 dark:bg-zinc-900 rounded-lg">
                <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 font-bold">
                  {(selectedSubmission.user?.full_name || selectedSubmission.user_id)[0]?.toUpperCase() || '?'}
                </div>
                <div>
                  <p className="font-medium text-sm text-zinc-900 dark:text-white">{selectedSubmission.user?.full_name || 'Student'}</p>
                  <p className="text-xs text-zinc-500">{selectedSubmission.assignment?.title}</p>
                </div>
                <div className="ml-auto">{statusBadge(selectedSubmission.status)}</div>
              </div>

              {selectedSubmission.content && (
                <div>
                  <Label>Student Response</Label>
                  <div className="mt-1 p-3 bg-zinc-50 dark:bg-zinc-900 rounded-lg text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap max-h-40 overflow-y-auto">
                    {selectedSubmission.content}
                  </div>
                </div>
              )}

              {selectedSubmission.file_urls && selectedSubmission.file_urls.length > 0 && (
                <div>
                  <Label>Attachments ({selectedSubmission.file_urls.length})</Label>
                  <div className="mt-1 space-y-2">
                    {selectedSubmission.file_urls.map((url: string, i: number) => (
                      <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-2 p-2 bg-zinc-50 dark:bg-zinc-900 rounded-lg text-sm text-emerald-600 hover:underline">
                        <Download size={16} />
                        {selectedSubmission.file_names?.[i] || 'Download file'}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <Label>Score (out of {selectedSubmission.assignment?.max_score ?? '?'})</Label>
                <Input type="number" value={gradeScore} onChange={e => setGradeScore(e.target.value)}
                  placeholder={`0-${selectedSubmission.assignment?.max_score}`} min={0} max={selectedSubmission.assignment?.max_score} />
              </div>
              <div>
                <Label>Feedback</Label>
                <Textarea value={gradeFeedback} onChange={e => setGradeFeedback(e.target.value)} placeholder="Provide feedback to the student..." rows={4} />
              </div>

              <div className="flex gap-3 pt-2">
                <Button onClick={handleGrade} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 text-white flex-1 gap-2">
                  <CheckCircle size={16} /> Save Grade
                </Button>
                <Button variant="outline" onClick={handleReturn} disabled={saving} className="text-amber-600 border-amber-200 hover:bg-amber-50 dark:hover:bg-amber-900/20 gap-2">
                  <ProhibitInset size={16} /> Return
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}

export function AdminQuizzesPage() {
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [courses, setCourses] = useState<CourseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [builderOpen, setBuilderOpen] = useState(false);
  const [selectedQuiz, setSelectedQuiz] = useState<QuizRow | null>(null);
  const [questions, setQuestions] = useState<QuizQuestionRow[]>([]);
  const [quizTitle, setQuizTitle] = useState('');
  const [quizCourseId, setQuizCourseId] = useState('');
  const [quizTimeLimit, setQuizTimeLimit] = useState('30');
  const [quizPassing, setQuizPassing] = useState('70');
  const [quizMaxAttempts, setQuizMaxAttempts] = useState('3');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [qData, cData] = await Promise.all([
          AssessmentService.getAllQuizzes(),
          supabase.from('courses').select('*').order('title'),
        ]);
        setQuizzes(qData || []);
        setCourses((cData.data || []) as CourseRow[]);
      } catch (err: any) { toast.error(err.message || 'Failed to load'); }
      finally { setLoading(false); }
    }
    load();
  }, []);

  const handleCreate = async () => {
    if (!quizTitle || !quizCourseId) { toast.error('Title and course required'); return; }
    setSaving(true);
    try {
      const quiz = await AssessmentService.createQuiz({
        title: quizTitle, course_id: quizCourseId,
        time_limit: Number(quizTimeLimit), passing_score: Number(quizPassing),
        max_attempts: Number(quizMaxAttempts),
      });
      toast.success('Quiz created');
      setCreateOpen(false);
      setSelectedQuiz(quiz);
      setBuilderOpen(true);
      setQuizTitle(''); setQuizCourseId('');
    } catch (err: any) { toast.error(err.message || 'Failed to create'); }
    finally { setSaving(false); }
  };

  const openBuilder = async (quiz: QuizRow) => {
    setSelectedQuiz(quiz);
    try {
      const qs = await AssessmentService.getQuizQuestions(quiz.id);
      setQuestions(qs);
    } catch { /* ignore */ }
    setBuilderOpen(true);
  };

  if (loading) return <div className="space-y-4">{[0,1,2,3].map(i => <div key={i} className="h-20 bg-zinc-100 dark:bg-zinc-800 rounded-xl animate-pulse" />)}</div>;

  return (
    <motion.div initial="hidden" animate="visible" className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Quizzes</h1>
          <p className="text-sm text-zinc-500 mt-1">{quizzes.length} total quizzes</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"><Plus size={16} /> New Quiz</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create Quiz</DialogTitle></DialogHeader>
            <div className="space-y-4 py-2">
              <div><Label>Title *</Label><Input value={quizTitle} onChange={e => setQuizTitle(e.target.value)} placeholder="Quiz title" /></div>
              <div><Label>Course *</Label>
                <Select value={quizCourseId} onValueChange={setQuizCourseId}>
                  <SelectTrigger><SelectValue placeholder="Select course" /></SelectTrigger>
                  <SelectContent>{courses.map(c => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div><Label>Time Limit (min)</Label><Input type="number" value={quizTimeLimit} onChange={e => setQuizTimeLimit(e.target.value)} /></div>
                <div><Label>Pass %</Label><Input type="number" value={quizPassing} onChange={e => setQuizPassing(e.target.value)} /></div>
                <div><Label>Max Attempts</Label><Input type="number" value={quizMaxAttempts} onChange={e => setQuizMaxAttempts(e.target.value)} /></div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button onClick={handleCreate} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 text-white">Create & Build</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {quizzes.length === 0 ? (
        <Card className="border-dashed border-zinc-300 dark:border-zinc-700"><CardContent className="p-10 text-center">
          <ExamIcon size={48} className="mx-auto text-zinc-300 mb-4" />
          <h3 className="font-semibold text-zinc-900 dark:text-white mb-1">No quizzes yet</h3>
          <p className="text-sm text-zinc-500">Create a quiz to test student knowledge.</p>
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
                      <p className="text-xs text-zinc-500">{q.course?.title || 'Unknown'}</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs text-zinc-400 mb-4">
                  {q.time_limit && <span className="flex items-center gap-1"><Clock size={12} />{q.time_limit}m</span>}
                  <span>Pass: {q.passing_score ?? 70}%</span>
                  <span>Attempts: {q.max_attempts ?? 3}</span>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => openBuilder(q as QuizRow)} className="gap-1 text-blue-600">
                    <NotePencil size={14} /> Edit Questions
                  </Button>
                  <Button size="sm" variant="ghost" onClick={async () => {
                    try { await AssessmentService.deleteQuiz(q.id); toast.success('Deleted'); window.location.reload(); }
                    catch (err: any) { toast.error(err.message); }
                  }} className="text-red-600 hover:text-red-700">
                    <Trash size={14} />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Quiz Builder Modal */}
      <Dialog open={builderOpen} onOpenChange={setBuilderOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Quiz Builder: {selectedQuiz?.title}</DialogTitle>
            <DialogDescription>Add questions to this quiz</DialogDescription>
          </DialogHeader>
          <QuizBuilder quiz={selectedQuiz} questions={questions} setQuestions={setQuestions} onClose={() => setBuilderOpen(false)} />
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}

function QuizBuilder({ quiz, questions, setQuestions, onClose }: {
  quiz: QuizRow | null;
  questions: QuizQuestionRow[];
  setQuestions: React.Dispatch<React.SetStateAction<QuizQuestionRow[]>>;
  onClose: () => void;
}) {
  const [qText, setQText] = useState('');
  const [qType, setQType] = useState<'multiple_choice' | 'true_false'>('multiple_choice');
  const [qPoints, setQPoints] = useState('1');
  const [options, setOptions] = useState<Array<{ text: string; correct: boolean }>>([
    { text: '', correct: false }, { text: '', correct: false },
    { text: '', correct: false }, { text: '', correct: false },
  ]);
  const [saving, setSaving] = useState(false);

  const addQuestion = async () => {
    if (!qText || !quiz) return;
    setSaving(true);
    try {
      const q = await AssessmentService.createQuizQuestion({
        quiz_id: quiz.id, text: qText, type: qType, points: Number(qPoints),
      });
      // Add options
      for (const opt of options) {
        if (opt.text) {
          await AssessmentService.createQuizOption({
            question_id: q.id, text: opt.text, is_correct: opt.correct,
          });
        }
      }
      setQuestions(prev => [...prev, { ...q, options: [] }]);
      setQText(''); setQPoints('1');
      setOptions([{ text: '', correct: false }, { text: '', correct: false }, { text: '', correct: false }, { text: '', correct: false }]);
      toast.success('Question added');
    } catch (err: any) { toast.error(err.message || 'Failed'); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-6 py-2">
      {/* Question form */}
      <div className="p-4 border border-zinc-200 dark:border-zinc-700 rounded-lg space-y-3">
        <div><Label>Question Text</Label>
          <Textarea value={qText} onChange={e => setQText(e.target.value)} placeholder="Enter question..." rows={2} />
        </div>
        <div className="flex gap-4">
          <div className="flex-1">
            <Label>Type</Label>
            <Select value={qType} onValueChange={(v: any) => setQType(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
                <SelectItem value="true_false">True / False</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label>Points</Label><Input type="number" value={qPoints} onChange={e => setQPoints(e.target.value)} className="w-20" /></div>
        </div>
        {qType === 'multiple_choice' && (
          <div className="space-y-2">
            <Label>Options (mark correct answer)</Label>
            {options.map((opt, i) => (
              <div key={i} className="flex items-center gap-2">
                <input type="radio" name={`correct-${i}`} checked={opt.correct}
                  onChange={() => setOptions(options.map((o, j) => j === i ? { ...o, correct: true } : { ...o, correct: false }))}
                  className="accent-emerald-600" />
                <Input value={opt.text} onChange={e => setOptions(options.map((o, j) => j === i ? { ...o, text: e.target.value } : o))}
                  placeholder={`Option ${i + 1}`} className="flex-1" />
              </div>
            ))}
          </div>
        )}
        {qType === 'true_false' && (
          <div className="flex gap-4">
            <label className="flex items-center gap-2"><input type="radio" name="tf" checked={options[0].correct}
              onChange={() => setOptions([{ text: 'True', correct: true }, { text: 'False', correct: false }])} className="accent-emerald-600" /> True</label>
            <label className="flex items-center gap-2"><input type="radio" name="tf" checked={options[1].correct}
              onChange={() => setOptions([{ text: 'True', correct: false }, { text: 'False', correct: true }])} className="accent-emerald-600" /> False</label>
          </div>
        )}
        <Button onClick={addQuestion} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 text-white w-full gap-2">
          <Plus size={16} /> Add Question
        </Button>
      </div>

      {/* Questions list */}
      <div className="space-y-3">
        <h3 className="font-medium text-sm text-zinc-900 dark:text-white">Questions ({questions.length})</h3>
        {questions.map((q, i) => (
          <div key={q.id} className="p-3 bg-zinc-50 dark:bg-zinc-900 rounded-lg">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs text-zinc-400 font-mono">Q{i + 1}</span>
                <p className="text-sm text-zinc-900 dark:text-white mt-0.5">{q.text}</p>
                <div className="flex gap-2 mt-1">
                  <Badge variant="secondary" className="text-[10px]">{q.type}</Badge>
                  <Badge variant="secondary" className="text-[10px]">{q.points} pts</Badge>
                </div>
                {q.options && q.options.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {q.options.map(o => (
                      <p key={o.id} className={`text-xs ${o.is_correct ? 'text-emerald-600 font-medium' : 'text-zinc-500'}`}>
                        {o.is_correct ? '✓ ' : ''}{o.text}
                      </p>
                    ))}
                  </div>
                )}
              </div>
              <button onClick={async () => {
                try { await AssessmentService.deleteQuizQuestion(q.id); setQuestions(questions.filter(x => x.id !== q.id)); }
                catch { toast.error('Failed to delete'); }
              }} className="text-zinc-400 hover:text-red-600"><Trash size={14} /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ExamIcon({ size, weight, className }: { size?: number; weight?: string; className?: string }) {
  return <ClipboardText size={size} weight={weight as 'regular'} className={className} />;
}