import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Clock, ArrowRight, PlayCircle, BookOpen, Certificate, Trophy, Check,
  GraduationCap, Spinner, FolderSimple, ArrowClockwise, TrendUp, Bell,
  ClipboardText, Exam, UserCircle, XCircle,
} from '@phosphor-icons/react';
import { ROUTES } from '@/constants/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useEffect, useState } from 'react';

type EnrollmentRow = { id: string; course_id: string; status: string; progress: number | null; enrolled_at: string | null; completed_at: string | null };
type CourseRow = { id: string; title: string; slug: string; image: string | null; duration_hours: number | null; total_lessons: number | null; total_modules: number | null };
type DashboardCourse = { enrollment: EnrollmentRow; course: CourseRow | null; progressPct: number; lessonCount: number };
type AssignmentItem = { id: string; title: string; due_date: string | null; status: string; lesson_title: string };
type QuizResultItem = { id: string; score: number | null; total_questions: number | null; passed: boolean | null; created_at: string | null; lesson_title: string };

const itemVariants = { hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { ease: 'easeOut' as const } } };

export function StudentDashboard() {
  const [courses, setCourses] = useState<DashboardCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ enrolled: 0, inProgress: 0, completed: 0, hours: 0 });
  const [assignments, setAssignments] = useState<AssignmentItem[]>([]);
  const [quizResults, setQuizResults] = useState<QuizResultItem[]>([]);
  const [lastVisitedCourse, setLastVisitedCourse] = useState<DashboardCourse | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setLoading(false); return; }

        const { data: enrollData, error: enrollError } = await supabase
          .from('enrollments').select('*').eq('user_id', user.id).order('enrolled_at', { ascending: false });
        if (enrollError) throw enrollError;
        const enrollments = (enrollData || []) as EnrollmentRow[];

        const enriched = await Promise.all(
          enrollments.map(async (enrollment) => {
            const { data: courseData } = await supabase.from('courses').select('*').eq('id', enrollment.course_id).single();
            const course = (courseData as CourseRow | undefined) || null;
            const progressPct = Math.round(Number(enrollment.progress || 0));
            return { enrollment, course, progressPct, lessonCount: course?.total_lessons || 0 };
          }),
        );
        setCourses(enriched);

        const activeCourses = enriched.filter((c) => c.enrollment.status === 'active');
        const sortedByProgress = [...activeCourses].sort((a, b) => b.progressPct - a.progressPct);
        if (sortedByProgress.length > 0) setLastVisitedCourse(sortedByProgress[0]);

        const completedEnrollments = enriched.filter((c) => c.enrollment.status === 'completed');
        const inProgress = activeCourses.filter((c) => c.progressPct > 0 && c.progressPct < 100);
        const totalHours = activeCourses.reduce((sum, c) => sum + (c.course?.duration_hours || 0), 0);
        setStats({ enrolled: activeCourses.length, inProgress: inProgress.length, completed: completedEnrollments.length, hours: totalHours });

        const courseIds = enriched.map((c) => c.enrollment.course_id);
        const [{ data: assignData }, { data: quizData }] = await Promise.all([
          supabase.from('assignments').select(`*, lessons:lesson_id(title)`).in('course_id', courseIds).order('due_date', { ascending: true }).limit(5),
          supabase.from('quiz_results').select(`*, lessons:lesson_id(title)`).in('course_id', courseIds).order('created_at', { ascending: false }).limit(5),
        ]);
        if (assignData) setAssignments((assignData as any[]).map((a) => ({ id: a.id, title: a.title, due_date: a.due_date, status: a.status || 'pending', lesson_title: a.lessons?.title || '' })));
        if (quizData) setQuizResults((quizData as any[]).map((q) => ({ id: q.id, score: q.score, total_questions: q.total_questions, passed: q.passed, created_at: q.created_at, lesson_title: q.lessons?.title || '' })));
      } catch (err: any) { toast.error(err.message || 'Failed to load dashboard'); }
      finally { setLoading(false); }
    }
    load();
  }, []);

  const activeCourses = courses.filter((c) => c.enrollment.status === 'active');
  const completedCourses = courses.filter((c) => c.enrollment.status === 'completed');

  const quickStats = [
    { label: 'Enrolled Courses', value: stats.enrolled, icon: GraduationCap, tint: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20' },
    { label: 'In Progress', value: stats.inProgress, icon: ArrowClockwise, tint: 'text-amber-600 bg-amber-50 dark:bg-amber-900/20' },
    { label: 'Completed', value: stats.completed, icon: Trophy, tint: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20' },
    { label: 'Learning Hours', value: stats.hours, icon: Clock, tint: 'text-violet-600 bg-violet-50 dark:bg-violet-900/20' },
  ];

  const getGreeting = () => { const h = new Date().getHours(); if (h < 12) return 'Good morning'; if (h < 17) return 'Good afternoon'; return 'Good evening'; };

  if (loading) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
        <div className="h-8 w-56 bg-zinc-100 dark:bg-zinc-800 rounded animate-pulse" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{[0, 1, 2, 3].map((i) => (<div key={i} className="h-24 bg-zinc-100 dark:bg-zinc-800 rounded-xl animate-pulse" />))}</div>
        <div className="h-64 bg-zinc-100 dark:bg-zinc-800 rounded-xl animate-pulse" />
      </motion.div>
    );
  }

  return (
    <motion.div initial="hidden" animate="visible" className="space-y-8">
      {/* Welcome Header */}
      <motion.div variants={itemVariants}>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">{getGreeting()}!</h1>
        <p className="text-zinc-500 dark:text-zinc-400 mt-1">Track your learning and jump back into your courses.</p>
      </motion.div>

      {/* Quick Stats */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {quickStats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className="border-zinc-200 dark:border-zinc-800">
              <CardContent className="p-5 flex items-center gap-4">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${stat.tint}`}><Icon size={20} /></div>
                <div className="min-w-0"><p className="text-2xl font-bold text-zinc-900 dark:text-white">{stat.value}</p><p className="text-xs text-zinc-500 truncate">{stat.label}</p></div>
              </CardContent>
            </Card>
          );
        })}
      </motion.div>

      {/* Continue Learning Hero */}
      {lastVisitedCourse && lastVisitedCourse.course && (
        <motion.div variants={itemVariants}>
          <div className="flex items-center gap-2 mb-4"><ArrowClockwise size={18} className="text-emerald-600" /><h2 className="text-lg font-semibold text-zinc-900 dark:text-white">Continue Learning</h2></div>
          <Link to={`/student/courses/${lastVisitedCourse.course.id}/lessons`}>
            <Card className="border-zinc-200 dark:border-zinc-800 overflow-hidden hover:shadow-lg hover:shadow-emerald-900/5 transition-shadow cursor-pointer">
              <CardContent className="p-6 flex items-center gap-6">
                <div className="w-20 h-20 rounded-xl bg-zinc-100 dark:bg-zinc-800 overflow-hidden shrink-0">
                  {lastVisitedCourse.course.image ? <img src={lastVisitedCourse.course.image} alt={lastVisitedCourse.course.title} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><PlayCircle size={28} className="text-zinc-300" /></div>}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-base text-zinc-900 dark:text-white mb-1 truncate">{lastVisitedCourse.course.title}</h3>
                  <p className="text-sm text-zinc-500 mb-3">Resume where you left off</p>
                  <div className="flex items-center gap-3">
                    <Progress value={lastVisitedCourse.progressPct} className="h-2 flex-1" />
                    <span className="text-sm font-medium text-zinc-600 dark:text-zinc-300 shrink-0">{lastVisitedCourse.progressPct}%</span>
                  </div>
                </div>
                <ArrowRight size={20} className="text-zinc-400 shrink-0" />
              </CardContent>
            </Card>
          </Link>
        </motion.div>
      )}

      {/* Active Courses */}
      <motion.div variants={itemVariants}>
        <div className="flex items-center justify-between mb-4"><h2 className="text-lg font-semibold text-zinc-900 dark:text-white">My Courses</h2><Link to={ROUTES.studentCourses} className="inline-flex items-center gap-1 text-sm font-medium text-emerald-600 hover:text-emerald-700">View all <ArrowRight size={14} /></Link></div>
        {activeCourses.length === 0 ? (
          <Card className="border-dashed border-zinc-300 dark:border-zinc-700"><CardContent className="p-10 text-center">
            <div className="w-14 h-14 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mx-auto mb-4"><BookOpen size={24} className="text-zinc-400" /></div>
            <h3 className="font-semibold text-zinc-900 dark:text-white mb-1">No enrolled courses yet</h3>
            <p className="text-sm text-zinc-500 mb-6">Browse the catalog and start your first course today.</p>
            <Link to={ROUTES.courses}><Button className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2">Browse Courses <ArrowRight size={16} /></Button></Link>
          </CardContent></Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeCourses.map((item) => {
              const { course, enrollment, progressPct } = item;
              if (!course) return null;
              return (
                <motion.div key={enrollment.id} variants={itemVariants}>
                  <Link to={`/student/courses/${course.id}/lessons`}>
                    <Card className="border-zinc-200 dark:border-zinc-800 h-full overflow-hidden hover:shadow-lg hover:shadow-emerald-900/5 transition-shadow">
                      <div className="flex">
                        <div className="w-28 h-28 shrink-0 bg-zinc-100 dark:bg-zinc-800 relative">
                          {course.image ? <img src={course.image} alt={course.title} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><PlayCircle size={28} className="text-zinc-300" /></div>}
                        </div>
                        <CardContent className="p-4 flex-1 min-w-0">
                          <h3 className="font-semibold text-sm text-zinc-900 dark:text-white line-clamp-2 mb-1">{course.title}</h3>
                          <div className="flex items-center gap-3 text-xs text-zinc-400 mb-4"><span className="flex items-center gap-1"><PlayCircle size={12} />{course.total_lessons || 0} lessons</span><span className="flex items-center gap-1"><Clock size={12} />{course.duration_hours || 0}h</span></div>
                          {progressPct > 0 ? <div className="flex items-center gap-2"><Progress value={progressPct} className="h-1.5" /><span className="text-xs font-medium text-zinc-500 shrink-0">{progressPct}%</span></div> : <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border-0 text-xs">Start Learning</Badge>}
                        </CardContent>
                      </div>
                    </Card>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.div>

      {/* Assignments & Quiz Results */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-zinc-200 dark:border-zinc-800">
          <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><ClipboardText size={16} className="text-amber-600" />Upcoming Assignments</CardTitle></CardHeader>
          <CardContent>
            {assignments.length === 0 ? <p className="text-sm text-zinc-500 text-center py-4">No upcoming assignments.</p> : (
              <div className="space-y-3">{assignments.slice(0, 4).map((a) => (
                <div key={a.id} className="flex items-center gap-3 p-3 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800">
                  <div className={`w-2 h-2 rounded-full shrink-0 ${a.status === 'submitted' ? 'bg-emerald-500' : a.status === 'graded' ? 'bg-blue-500' : 'bg-amber-500'}`} />
                  <div className="flex-1 min-w-0"><p className="text-sm font-medium text-zinc-900 dark:text-white truncate">{a.title}</p><p className="text-xs text-zinc-500">{a.lesson_title}</p></div>
                  <span className="text-xs text-zinc-400 shrink-0">{a.due_date ? new Date(a.due_date).toLocaleDateString() : 'No deadline'}</span>
                </div>
              ))}</div>
            )}
          </CardContent>
        </Card>
        <Card className="border-zinc-200 dark:border-zinc-800">
          <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><Exam size={16} className="text-blue-600" />Recent Quiz Results</CardTitle></CardHeader>
          <CardContent>
            {quizResults.length === 0 ? <p className="text-sm text-zinc-500 text-center py-4">No quiz results yet.</p> : (
              <div className="space-y-3">{quizResults.slice(0, 4).map((q) => (
                <div key={q.id} className="flex items-center gap-3 p-3 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${q.passed ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30' : 'bg-red-100 text-red-600 dark:bg-red-900/30'}`}>{q.passed ? <Check size={14} weight="bold" /> : <XCircle size={14} weight="bold" />}</div>
                  <div className="flex-1 min-w-0"><p className="text-sm font-medium text-zinc-900 dark:text-white truncate">{q.lesson_title}</p><p className="text-xs text-zinc-500">{q.score !== null && q.total_questions !== null ? `${Math.round((q.score / q.total_questions) * 100)}% (${q.score}/${q.total_questions})` : 'No score yet'}</p></div>
                  <span className="text-xs text-zinc-400 shrink-0">{q.created_at ? new Date(q.created_at).toLocaleDateString() : ''}</span>
                </div>
              ))}</div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Completed Courses */}
      {completedCourses.length > 0 && (
        <motion.div variants={itemVariants}>
          <div className="flex items-center gap-2 mb-4"><Trophy size={18} className="text-emerald-600" /><h2 className="text-lg font-semibold text-zinc-900 dark:text-white">Completed</h2></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {completedCourses.map((item) => {
              const { course, enrollment } = item;
              if (!course) return null;
              return (
                <Card key={enrollment.id} className="border-zinc-200 dark:border-zinc-800">
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="w-14 h-14 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center shrink-0"><Certificate size={24} className="text-emerald-600" /></div>
                    <div className="flex-1 min-w-0"><p className="font-medium text-sm text-zinc-900 dark:text-white truncate">{course.title}</p><p className="text-xs flex items-center gap-1 text-emerald-600 mt-1"><Check size={12} weight="bold" />Completed {enrollment.completed_at ? new Date(enrollment.completed_at).toLocaleDateString() : ''}</p></div>
                    <Button size="sm" variant="ghost" className="text-emerald-600">View</Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}

export { StudentCoursesPage } from './StudentPages';