import { useState, useEffect, useMemo } from 'react';
import { Link, useParams, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Star, Clock, PlayCircle, ArrowRight, BookOpen, User, CaretRight, CaretLeft,
  Check, ArrowLeft, Trophy, Certificate, MagnifyingGlass, Spinner
} from '@phosphor-icons/react';
import { ROUTES } from '@/constants/navigation';
import { getPublishedCoursesPaged, getCourseBySlug, getCourseModulesWithLessons, getCategories } from '@/services/courseService';
import type { CourseWithRelations, ModuleWithLessons } from '@/services/courseService';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } }
};
const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { ease: 'easeOut' as const } }
};

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} size={12} weight={i < Math.floor(rating) ? 'fill' : 'regular'} className={i < Math.floor(rating) ? 'text-amber-400' : 'text-zinc-300 dark:text-zinc-600'} />
      ))}
      <span className="text-xs text-zinc-500 ml-1">{rating}</span>
    </div>
  );
}

function CourseCard({ course, index }: { course: CourseWithRelations; index: number }) {
  return (
    <motion.div variants={itemVariants}>
      <Link to={`/courses/${course.slug}`} className="group block">
        <Card className="overflow-hidden border-zinc-200 dark:border-zinc-800 hover:border-emerald-300 dark:hover:border-emerald-700 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
          <div className="aspect-[16/9] relative overflow-hidden bg-zinc-100 dark:bg-zinc-800">
            <img src={course.image || ''} alt={course.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading={index < 3 ? 'eager' : 'lazy'} />
            <div className="absolute top-2 left-2 flex gap-1">
              {course.featured && <Badge className="bg-amber-400 text-amber-900 border-0 text-xs">Featured</Badge>}
              {course.original_price && (
                <Badge className="bg-emerald-500 text-white border-0 text-xs">
                  {Math.round((1 - course.price / course.original_price) * 100)}% OFF
                </Badge>
              )}
            </div>
          </div>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="secondary" className="text-xs font-normal">{course.category?.name || 'General'}</Badge>
              <span className="text-xs text-zinc-400 capitalize">{course.level}</span>
            </div>
            <h3 className="font-semibold text-base text-zinc-900 dark:text-zinc-100 line-clamp-2 mb-1 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
              {course.title}
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-3 line-clamp-1">{course.subtitle}</p>
            <div className="flex items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400 mb-3">
              <span className="flex items-center gap-1"><Clock size={12} />{course.duration_hours}h</span>
              <span className="flex items-center gap-1"><BookOpen size={12} />{course.total_lessons} lessons</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-xs font-bold text-emerald-600">
                  {course.instructor?.name?.charAt(0) || '?'}
                </div>
                <span className="text-xs text-zinc-600 dark:text-zinc-300">{course.instructor?.name || 'Instructor'}</span>
              </div>
              <div className="text-right">
                <span className="font-bold text-emerald-600">${course.price}</span>
                {course.original_price && (
                  <span className="text-xs text-zinc-400 line-through ml-1">${course.original_price}</span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </Link>
    </motion.div>
  );
}

export function CoursesPage() {
  const [courses, setCourses] = useState<CourseWithRelations[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pageSize = 9;
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const categoryParam = queryParams.get('category');

  // Phase 20: debounce the search box so typing doesn't fire a query per
  // keystroke — only one server request settles every 300ms.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    getCategories()
      .then((cats) => setCategories(cats.map((c) => ({ id: c.id, name: c.name }))))
      .catch(() => {});
  }, []);

  const activeCategory = categoryParam || selectedCategory;

  const categoryId = useMemo(
    () =>
      activeCategory === 'All'
        ? undefined
        : categories.find((c) => c.name === activeCategory)?.id,
    [activeCategory, categories],
  );

  // Any filter change resets to the first page.
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, activeCategory]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    async function load() {
      try {
        const res = await getPublishedCoursesPaged({
          page,
          pageSize,
          search: debouncedSearch,
          categoryId,
        });
        if (cancelled) return;
        setCourses(res.data);
        setTotalPages(res.totalPages);
        setTotalCount(res.count);
        setError(null);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load courses');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, debouncedSearch, categoryId]);

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-16 text-center">
        <BookOpen size={48} className="mx-auto text-zinc-300 dark:text-zinc-600 mb-4" />
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-white mb-1">Error loading courses</h2>
        <p className="text-sm text-zinc-500 mb-4">{error}</p>
        <Button onClick={() => window.location.reload()} variant="outline">Retry</Button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-8 py-12 lg:py-16">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tighter text-zinc-900 dark:text-white mb-2">Course Catalog</h1>
        <p className="text-zinc-500 dark:text-zinc-400">Discover courses that match your learning goals</p>
      </motion.div>

      <div className="flex flex-col sm:flex-row gap-4 mb-8">
        <div className="relative flex-1">
          <input type="text" placeholder="Search courses..." value={search} onChange={e => setSearch(e.target.value)} className="w-full h-10 pl-10 pr-4 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30" />
          <MagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
        </div>
      </div>

      <Tabs value={activeCategory} onValueChange={setSelectedCategory} className="mb-8">
        <TabsList className="flex-wrap h-auto gap-1 bg-transparent">
          {categories.map(cat => (
            <TabsTrigger key={cat.name} value={cat.name} className="data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-700 dark:data-[state=active]:bg-emerald-900/20 dark:data-[state=active]:text-emerald-400 rounded-lg px-4 py-1.5 text-sm">
              {cat.name}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="overflow-hidden border-zinc-200 dark:border-zinc-800">
              <div className="aspect-[16/9] bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
              <CardContent className="p-4 space-y-3">
                <div className="h-4 bg-zinc-100 dark:bg-zinc-800 rounded animate-pulse w-1/3" />
                <div className="h-5 bg-zinc-100 dark:bg-zinc-800 rounded animate-pulse w-2/3" />
                <div className="h-4 bg-zinc-100 dark:bg-zinc-800 rounded animate-pulse w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : courses.length > 0 ? (
        <>
          <motion.div variants={containerVariants} initial="hidden" animate="visible" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((course, i) => (
              <CourseCard key={course.id} course={course} index={i} />
            ))}
          </motion.div>
          <div className="mt-10 flex flex-col items-center justify-between gap-4 sm:flex-row">
            <p className="text-sm text-zinc-500">
              Showing {courses.length} of {totalCount} courses
            </p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                <CaretLeft size={14} /> Prev
              </Button>
              <span className="px-2 text-sm text-zinc-600 dark:text-zinc-300">Page {page} / {totalPages}</span>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
                Next <CaretRight size={14} />
              </Button>
            </div>
          </div>
        </>
      ) : (
        <div className="text-center py-16">
          <BookOpen size={48} className="mx-auto text-zinc-300 dark:text-zinc-600 mb-4" />
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-1">No courses found</h3>
          <p className="text-sm text-zinc-500">Try adjusting your search or filter criteria</p>
        </div>
      )}
    </div>
  );
}

export function CourseDetailPage() {
  const { slug } = useParams();
  const [course, setCourse] = useState<CourseWithRelations | null>(null);
  const [modules, setModules] = useState<ModuleWithLessons[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    async function load() {
      try {
        const c = await getCourseBySlug(slug);
        setCourse(c);
        const m = await getCourseModulesWithLessons(c.id);
        setModules(m);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load course');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [slug]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-12">
        <div className="animate-pulse space-y-6">
          <div className="h-6 bg-zinc-100 dark:bg-zinc-800 rounded w-1/4" />
          <div className="h-10 bg-zinc-100 dark:bg-zinc-800 rounded w-3/4" />
          <div className="h-4 bg-zinc-100 dark:bg-zinc-800 rounded w-1/2" />
          <div className="h-32 bg-zinc-100 dark:bg-zinc-800 rounded" />
        </div>
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-24 text-center">
        <BookOpen size={48} className="mx-auto text-zinc-300 dark:text-zinc-600 mb-4" />
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-white mb-2">Course not found</h2>
        <p className="text-zinc-500 mb-6">{error || 'The course you are looking for does not exist or has been removed.'}</p>
        <Link to={ROUTES.courses}><Button className="gap-2"><ArrowLeft size={16} /> Back to Courses</Button></Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-8 py-8 lg:py-12">
      <Link to={ROUTES.courses} className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-emerald-600 mb-6 transition-colors">
        <ArrowLeft size={14} /> Back to Courses
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">
        <div className="lg:col-span-2">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex items-center gap-2 mb-3">
              <Badge variant="secondary" className="text-xs">{course.category?.name || 'General'}</Badge>
              <span className="text-xs text-zinc-400 capitalize">{course.level}</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tighter text-zinc-900 dark:text-white mb-2">{course.title}</h1>
            <p className="text-lg text-zinc-500 dark:text-zinc-400 mb-4">{course.subtitle}</p>
            <div className="flex items-center gap-4 text-sm text-zinc-500 mb-6 flex-wrap">
              <StarRating rating={course.rating} />
              <span className="flex items-center gap-1"><User size={14} />{course.student_count?.toLocaleString() || '0'} students</span>
              <span className="flex items-center gap-1"><Clock size={14} />{course.duration_hours}h</span>
              <span className="flex items-center gap-1"><BookOpen size={14} />{course.total_lessons} lessons</span>
            </div>

            <div className="flex items-center gap-3 mb-8 p-4 bg-zinc-50 dark:bg-zinc-900 rounded-xl">
              <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-sm font-bold text-emerald-600 shrink-0">
                {course.instructor?.name?.charAt(0) || '?'}
              </div>
              <div>
                <p className="text-sm font-medium text-zinc-900 dark:text-white">{course.instructor?.name || 'Instructor'}</p>
                <p className="text-xs text-zinc-500">{course.instructor?.title || ''}</p>
              </div>
            </div>

            <p className="text-zinc-600 dark:text-zinc-300 leading-relaxed mb-8">{course.long_description}</p>

            <div className="mb-8">
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-2">Skills You Will Gain</h3>
              <div className="flex flex-wrap gap-2">
                {(course.skills as string[] || []).map(skill => (
                  <Badge key={skill} variant="secondary" className="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border-0">{skill}</Badge>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">Course Curriculum</h3>
              <div className="space-y-3">
                {modules.length > 0 ? modules.map((mod, i) => (
                  <details key={mod.id} className="group border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden" open={i === 0}>
                    <summary className="flex items-center justify-between p-4 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <span className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center text-xs font-bold text-emerald-600 shrink-0">{i + 1}</span>
                        <div>
                          <p className="text-sm font-medium text-zinc-900 dark:text-white">{mod.title}</p>
                          <p className="text-xs text-zinc-500">{mod.lessons?.length || 0} lessons</p>
                        </div>
                      </div>
                      <CaretRight size={16} className="text-zinc-400 group-open:rotate-90 transition-transform" />
                    </summary>
                    <div className="border-t border-zinc-200 dark:border-zinc-800 divide-y divide-zinc-100 dark:divide-zinc-800/50">
                      {mod.lessons?.map(lesson => (
                        <div key={lesson.id} className="flex items-center gap-3 px-4 py-3 text-sm">
                          <span className="w-5 h-5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-400 flex items-center justify-center">
                            <PlayCircle size={12} />
                          </span>
                          <span className="flex-1 text-zinc-700 dark:text-zinc-300">{lesson.title}</span>
                          <span className="text-xs text-zinc-400">{lesson.duration}</span>
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 capitalize">{lesson.type}</Badge>
                        </div>
                      ))}
                    </div>
                  </details>
                )) : (
                  <p className="text-sm text-zinc-500 py-4 text-center">Curriculum coming soon</p>
                )}
              </div>
            </div>
          </motion.div>
        </div>

        <div className="lg:col-span-1">
          <div className="sticky top-24">
            <Card className="border-zinc-200 dark:border-zinc-800 overflow-hidden">
              <div className="aspect-[16/9] bg-zinc-100 dark:bg-zinc-800">
                <img src={course.image || ''} alt={course.title} className="w-full h-full object-cover" />
              </div>
              <CardContent className="p-5">
                <div className="flex items-baseline gap-2 mb-4">
                  <span className="text-3xl font-bold text-emerald-600">${course.price}</span>
                  {course.original_price && (
                    <span className="text-sm text-zinc-400 line-through">${course.original_price}</span>
                  )}
                </div>
                <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white h-11 gap-2 mb-2">
                  Enroll Now <ArrowRight size={16} />
                </Button>
                <p className="text-xs text-center text-zinc-500">30-day money-back guarantee</p>

                <div className="mt-6 space-y-3">
                  <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                    <Clock size={16} className="text-emerald-500" />
                    <span>{course.duration_hours}h of content</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                    <PlayCircle size={16} className="text-emerald-500" />
                    <span>{course.total_lessons} on-demand lessons</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                    <Certificate size={16} className="text-emerald-500" />
                    <span>Certificate of completion</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                    <Trophy size={16} className="text-emerald-500" />
                    <span>Full lifetime access</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}