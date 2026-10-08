import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Star, Clock, ArrowRight, BookOpen, User, GraduationCap,
  Sparkle, Users, ChartLine, Certificate, Trophy, ShieldCheck, Lightning
} from '@phosphor-icons/react';
import { ROUTES } from '@/constants/navigation';
import { getFeaturedCourses, getCategories, getTestimonials } from '@/services/courseService';
import type { CourseWithRelations } from '@/services/courseService';
import { MOCK_COURSES, MOCK_CATEGORIES, MOCK_TESTIMONIALS } from '@/constants/mockData';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

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

function CourseSkeleton() {
  return (
    <div className="animate-pulse">
      <Card className="overflow-hidden border-zinc-200 dark:border-zinc-800">
        <div className="aspect-[16/9] bg-zinc-200 dark:bg-zinc-800" />
        <CardContent className="p-4 space-y-3">
          <div className="h-3 w-20 bg-zinc-200 dark:bg-zinc-800 rounded" />
          <div className="h-4 w-full bg-zinc-200 dark:bg-zinc-800 rounded" />
          <div className="h-3 w-2/3 bg-zinc-200 dark:bg-zinc-800 rounded" />
          <div className="h-3 w-1/2 bg-zinc-200 dark:bg-zinc-800 rounded" />
        </CardContent>
      </Card>
    </div>
  );
}

export function HomePage() {
  const [featured, setFeatured] = useState<CourseWithRelations[]>([]);
  const [categories, setCategories] = useState<{ name: string; count: number }[]>([]);
  const [testimonials, setTestimonials] = useState<{ name: string; role: string; quote: string; rating: number; avatar: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      // Never leave the page blank: on error or empty DB results we fall back
      // to curated mock content so Hero, Featured, Categories and Testimonials
      // always render rich learning content.
      try {
        const [courses, cats, tests] = await Promise.all([
          getFeaturedCourses().catch(() => []),
          getCategories().catch(() => []),
          Promise.resolve(getTestimonials ? getTestimonials() : []).catch(() => [])
        ]);

        const useCourses = courses && courses.length > 0 ? courses : (MOCK_COURSES as unknown as CourseWithRelations[]);
        setFeatured(useCourses.slice(0, 6));

        const useCats = cats && cats.length > 0 ? cats : MOCK_CATEGORIES;
        setCategories(useCats.map(c => ({
          name: c.name,
          count: useCourses.filter(co => co.category_id === c.id).length || 4
        })));

        setTestimonials(tests && tests.length > 0 ? tests : MOCK_TESTIMONIALS);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load');
        setFeatured(MOCK_COURSES as unknown as CourseWithRelations[]);
        setCategories(MOCK_CATEGORIES.map(c => ({ name: c.name, count: 4 })));
        setTestimonials(MOCK_TESTIMONIALS);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const stats = [
    { icon: Users, label: 'Active Students', value: '12,000+' },
    { icon: BookOpen, label: 'Courses Available', value: '200+' },
    { icon: ChartLine, label: 'Average Rating', value: '4.8/5' },
    { icon: Certificate, label: 'Certificates Issued', value: '5,000+' },
  ];

  const valueProps = [
    { icon: ShieldCheck, title: 'Industry-Led Curriculum', text: 'Every course is designed with practitioners from leading teams, kept fresh and practical.' },
    { icon: Lightning, title: 'Learn at Your Pace', text: 'Lifetime access, bite-sized lessons and downloadable resources fit into any schedule.' },
    { icon: GraduationCap, title: 'Verified Certificates', text: 'Share recognized certificates that prove real, job-ready skills to employers.' },
    { icon: Users, title: 'Mentor Support', text: 'Get unstuck fast with active mentors and a community of learners worldwide.' },
  ];

  return (
    <div>
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 via-white to-zinc-50 dark:from-emerald-950/20 dark:via-zinc-950 dark:to-zinc-950" />
        <div className="absolute top-20 right-10 w-96 h-96 bg-emerald-200/30 dark:bg-emerald-800/10 rounded-full blur-3xl" />
        <div className="absolute bottom-10 left-10 w-72 h-72 bg-emerald-300/20 dark:bg-emerald-700/10 rounded-full blur-3xl" />
        <div className="relative max-w-7xl mx-auto px-4 lg:px-8 pt-24 pb-20 lg:pt-32 lg:pb-28">
          <motion.div initial="hidden" animate="visible" variants={containerVariants} className="max-w-3xl">
            <motion.div variants={itemVariants} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 text-sm font-medium mb-6">
              <Sparkle size={14} weight="fill" />
              The Future of Learning is Here
            </motion.div>
            <motion.h1 variants={itemVariants} className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tighter leading-none text-zinc-900 dark:text-white mb-6">
              Learn the skills<br />
              <span className="text-emerald-600">that matter most</span>
            </motion.h1>
            <motion.p variants={itemVariants} className="text-lg md:text-xl text-zinc-600 dark:text-zinc-400 max-w-2xl mb-8 leading-relaxed">
              Master in-demand skills with industry-led courses. Start your journey today and transform your career.
            </motion.p>
            <motion.div variants={itemVariants} className="flex flex-wrap gap-3">
              <Link to={ROUTES.courses}>
                <Button className="bg-emerald-600 hover:bg-emerald-700 text-white h-11 px-6 text-base gap-2">
                  Explore Courses <ArrowRight size={18} />
                </Button>
              </Link>
              <Link to={ROUTES.register}>
                <Button variant="outline" className="h-11 px-6 text-base border-zinc-300 dark:border-zinc-700">
                  Get Started Free
                </Button>
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      <section className="border-y border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map((stat, i) => (
              <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }} className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center shrink-0">
                  <stat.icon size={20} className="text-emerald-600" />
                </div>
                <div>
                  <p className="text-xl font-bold text-zinc-900 dark:text-white">{stat.value}</p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">{stat.label}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 lg:px-8">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="flex items-end justify-between mb-10">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tighter text-zinc-900 dark:text-white mb-2">Featured Courses</h2>
              <p className="text-zinc-500 dark:text-zinc-400">Hand-picked courses to accelerate your learning</p>
            </div>
            <Link to={ROUTES.courses} className="hidden sm:flex items-center gap-1 text-sm font-medium text-emerald-600 hover:text-emerald-700 transition-colors">
              View All <ArrowRight size={14} />
            </Link>
          </motion.div>
          <motion.div variants={containerVariants} initial="hidden" whileInView="visible" viewport={{ once: true }} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {loading
              ? Array.from({ length: 6 }).map((_, i) => <CourseSkeleton key={i} />)
              : featured.map((course, i) => (
                  <CourseCard key={course.id} course={course} index={i} />
                ))}
          </motion.div>
          <div className="mt-8 text-center sm:hidden">
            <Link to={ROUTES.courses}>
              <Button variant="outline" className="gap-2">View All Courses <ArrowRight size={16} /></Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="py-20 bg-zinc-50 dark:bg-zinc-900/50">
        <div className="max-w-7xl mx-auto px-4 lg:px-8">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tighter text-zinc-900 dark:text-white mb-2">Explore by Category</h2>
            <p className="text-zinc-500 dark:text-zinc-400">Find the perfect course for your goals</p>
          </motion.div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {(loading ? MOCK_CATEGORIES.map(c => ({ name: c.name, count: 4 })) : categories).map((cat, i) => {
              const icons = [BookOpen, Users, Sparkle, ChartLine, Certificate, GraduationCap, Star, Trophy];
              const Icon = icons[i % icons.length];
              return (
                <motion.div key={cat.name} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }}>
                  <Link to={`${ROUTES.courses}?category=${encodeURIComponent(cat.name)}`} className="group block">
                    <Card className="border-zinc-200 dark:border-zinc-800 hover:border-emerald-300 dark:hover:border-emerald-700 transition-all duration-300 hover:shadow-md hover:-translate-y-1">
                      <CardContent className="p-6 text-center">
                        <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center mx-auto mb-3 group-hover:bg-emerald-100 dark:group-hover:bg-emerald-900/30 transition-colors">
                          <Icon size={24} className="text-emerald-600" />
                        </div>
                        <h3 className="font-semibold text-sm text-zinc-900 dark:text-white">{cat.name}</h3>
                        <p className="text-xs text-zinc-500 mt-1">{cat.count} courses</p>
                      </CardContent>
                    </Card>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 lg:px-8">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tighter text-zinc-900 dark:text-white mb-2">Why Learners Choose Us</h2>
            <p className="text-zinc-500 dark:text-zinc-400">A learning experience built around outcomes</p>
          </motion.div>
          <motion.div variants={containerVariants} initial="hidden" whileInView="visible" viewport={{ once: true }} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {valueProps.map((v) => (
              <motion.div key={v.title} variants={itemVariants}>
                <Card className="h-full border-zinc-200 dark:border-zinc-800 hover:border-emerald-300 dark:hover:border-emerald-700 transition-all duration-300">
                  <CardContent className="p-6">
                    <div className="w-11 h-11 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center mb-4">
                      <v.icon size={22} className="text-emerald-600" />
                    </div>
                    <h3 className="font-semibold text-zinc-900 dark:text-white mb-2">{v.title}</h3>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">{v.text}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      <section className="py-20 bg-zinc-50 dark:bg-zinc-900/50">
        <div className="max-w-7xl mx-auto px-4 lg:px-8">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tighter text-zinc-900 dark:text-white mb-2">What Our Students Say</h2>
            <p className="text-zinc-500 dark:text-zinc-400">Real outcomes from real learners</p>
          </motion.div>
          <motion.div variants={containerVariants} initial="hidden" whileInView="visible" viewport={{ once: true }} className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((t) => (
              <motion.div key={t.name} variants={itemVariants}>
                <Card className="h-full border-zinc-200 dark:border-zinc-800">
                  <CardContent className="p-6 flex flex-col gap-4">
                    <StarRating rating={t.rating} />
                    <p className="text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed">"{t.quote}"</p>
                    <div className="flex items-center gap-3 mt-auto">
                      <img src={t.avatar} alt={t.name} className="w-10 h-10 rounded-full object-cover" />
                      <div>
                        <p className="text-sm font-semibold text-zinc-900 dark:text-white">{t.name}</p>
                        <p className="text-xs text-zinc-500">{t.role}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 lg:px-8">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600 to-emerald-800 px-8 py-16 text-center">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-emerald-400/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
            <div className="relative">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Ready to Start Learning?</h2>
              <p className="text-emerald-100/80 max-w-xl mx-auto mb-8">Join thousands of students already learning on LMS. Get started today with a free account.</p>
              <div className="flex flex-wrap justify-center gap-3">
                <Link to={ROUTES.register}>
                  <Button className="bg-white text-emerald-700 hover:bg-emerald-50 h-11 px-6 text-base gap-2">
                    Get Started Free <ArrowRight size={18} />
                  </Button>
                </Link>
                <Link to={ROUTES.courses}>
                  <Button variant="outline" className="border-white/30 text-white hover:bg-white/10 h-11 px-6 text-base">
                    Browse Courses
                  </Button>
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}