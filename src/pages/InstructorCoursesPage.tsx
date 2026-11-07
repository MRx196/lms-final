import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BookOpen, ArrowRight, CircleNotch, Users, PencilSimpleLine } from '@phosphor-icons/react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ROUTES } from '@/constants/navigation';
import { getMyCourses, type InstructorCourse } from '@/services/instructorService';

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { ease: 'easeOut' as const } },
};

const statusTone: Record<string, string> = {
  published: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400',
  draft: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400',
  archived: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400',
};

export function InstructorCoursesPage() {
  const [courses, setCourses] = useState<InstructorCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setCourses(await getMyCourses());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load courses');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  return (
    <motion.div initial="hidden" animate="visible" variants={itemVariants} className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">My Courses</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Courses assigned to you by an administrator. Open a course to manage its modules and lessons.
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

      {loading ? (
        <div className="flex items-center justify-center py-16 text-zinc-400">
          <CircleNotch size={24} className="animate-spin" />
        </div>
      ) : courses.length === 0 ? (
        <Card className="border-dashed border-zinc-300 dark:border-zinc-700">
          <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
            <BookOpen size={40} className="mb-3 text-zinc-300 dark:text-zinc-600" />
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">No courses assigned</h3>
            <p className="mt-1 max-w-sm text-sm text-zinc-500 dark:text-zinc-400">
              When an administrator assigns a course to you it will appear here.
            </p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {courses.map((c) => (
            <Card key={c.id} className="flex flex-col border-zinc-200 dark:border-zinc-800">
              <CardContent className="flex flex-1 flex-col p-5">
                <div className="mb-3 flex items-start justify-between gap-2">
                  <h3 className="text-base font-semibold text-zinc-900 dark:text-white">{c.title}</h3>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${statusTone[c.status] || statusTone.draft}`}>
                    {c.status}
                  </span>
                </div>
                <p className="mb-4 line-clamp-2 text-sm text-zinc-500 dark:text-zinc-400">
                  {c.total_modules ?? 0} modules · {c.total_lessons ?? 0} lessons
                </p>
                <div className="mb-4 flex items-center gap-4 text-xs text-zinc-500 dark:text-zinc-400">
                  <span className="flex items-center gap-1"><Users size={13} /> {c.enrollment_count} enrolled</span>
                  {c.pending_submissions > 0 && (
                    <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                      <PencilSimpleLine size={13} /> {c.pending_submissions} to grade
                    </span>
                  )}
                </div>
                <div className="mt-auto flex gap-2">
                  <Button asChild size="sm" className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white">
                    <Link to={ROUTES.instructorCourseBuilder.replace(':courseId', c.id)}>
                      Open builder <ArrowRight size={14} className="ml-1" />
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="sm">
                    <Link to={`/courses/${c.slug}`} target="_blank" rel="noreferrer">Preview</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </motion.div>
  );
}
