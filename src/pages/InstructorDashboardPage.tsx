import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BookOpen, Users, PencilSimpleLine, ArrowRight, CircleNotch } from '@phosphor-icons/react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ROUTES } from '@/constants/navigation';
import { getMyCourses, getMySubmissions, type InstructorCourse } from '@/services/instructorService';
import { useAuth } from '@/contexts/AuthContext';

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { ease: 'easeOut' as const } },
};

export function InstructorDashboardPage() {
  const { profile } = useAuth();
  const [courses, setCourses] = useState<InstructorCourse[]>([]);
  const [pendingGrading, setPendingGrading] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [c, subs] = await Promise.all([getMyCourses(), getMySubmissions()]);
      setCourses(c);
      setPendingGrading(subs.filter((s) => s.score == null).length);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const totalStudents = courses.reduce((sum, c) => sum + c.enrollment_count, 0);
  const published = courses.filter((c) => c.status === 'published').length;

  const stats = [
    { label: 'My Courses', value: courses.length, icon: BookOpen, href: ROUTES.instructorCourses },
    { label: 'Published', value: published, icon: BookOpen, href: ROUTES.instructorCourses },
    { label: 'Total Enrollments', value: totalStudents, icon: Users, href: ROUTES.instructorCourses },
    { label: 'Pending Grading', value: pendingGrading, icon: PencilSimpleLine, href: ROUTES.instructorGrading },
  ];

  return (
    <motion.div initial="hidden" animate="visible" variants={itemVariants} className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
          Welcome back{profile?.full_name ? `, ${profile.full_name.split(' ')[0]}` : ''}
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Manage your courses, curriculum and student submissions.
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

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s) => (
          <Link key={s.label} to={s.href}>
            <Card className="h-full border-zinc-200 dark:border-zinc-800 transition-colors hover:border-emerald-300 dark:hover:border-emerald-700">
              <CardContent className="flex items-center gap-3 p-4">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
                  <s.icon className="size-5" weight="duotone" />
                </div>
                <div className="min-w-0">
                  <p className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-white">{loading ? '—' : s.value}</p>
                  <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">{s.label}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <Card className="border-zinc-200 dark:border-zinc-800">
        <CardContent className="p-0">
          <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3 dark:border-zinc-800">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">Your courses</h2>
            <Link to={ROUTES.instructorCourses} className="flex items-center gap-1 text-xs font-medium text-emerald-600 hover:underline dark:text-emerald-400">
              View all <ArrowRight size={12} />
            </Link>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-12 text-zinc-400">
              <CircleNotch size={22} className="animate-spin" />
            </div>
          ) : courses.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <BookOpen size={32} className="mx-auto mb-3 text-zinc-300 dark:text-zinc-600" />
              <p className="text-sm font-medium text-zinc-900 dark:text-white">No courses assigned yet</p>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                An administrator will assign courses to you. Once assigned, you can build curriculum and grade submissions here.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
              {courses.slice(0, 5).map((c) => (
                <li key={c.id}>
                  <Link
                    to={ROUTES.instructorCourseBuilder.replace(':courseId', c.id)}
                    className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-900/50"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-zinc-900 dark:text-white">{c.title}</p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        {c.enrollment_count} enrolled · {c.pending_submissions} pending grading
                      </p>
                    </div>
                    <Badge variant="secondary" className="shrink-0">{c.status}</Badge>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
