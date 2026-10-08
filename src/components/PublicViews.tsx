import { useState, useMemo } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowRight, Star, Clock, PlayCircle, CheckCircle, Trophy, Users,
  BookOpen, GraduationCap, MagnifyingGlass, CaretDown, Funnel,
  Barricade, ArrowLeft, Info
} from '@phosphor-icons/react';
import { BRAND_NAME, ROUTES } from '../constants';
import { useAuth } from '../contexts/AuthContext';
import { SEED_COURSES } from '../data';
import type { Course } from '../types';

const fadeUp = { hidden: { opacity: 0, y: 24 }, visible: { opacity: 1, y: 0, transition: { ease: 'easeOut' as const, duration: 0.5 } } };
const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.08 } } };

function StarRating({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star key={s} size={size} weight={s <= Math.round(rating) ? 'fill' : 'regular'}
          className={s <= Math.round(rating) ? 'text-amber-400' : 'text-slate-200 dark:text-slate-600'} />
      ))}
      <span className="ml-1 text-xs font-medium text-slate-500">{rating.toFixed(1)}</span>
    </div>
  );
}

export function CourseCard({ course, index = 0 }: { course: Course; index?: number }) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05, ease: 'easeOut' }}>
      <Link to={`/courses/${course.slug}`} className="group block rounded-2xl border border-slate-200 bg-white p-4 transition-all hover:shadow-lg hover:-translate-y-1 dark:border-slate-700 dark:bg-slate-800">
        <div className="relative mb-4 overflow-hidden rounded-xl">
          <img src={course.image} alt={course.title} className="h-44 w-full object-cover transition-transform duration-500 group-hover:scale-105" />
          {course.originalPrice && (
            <span className="absolute left-2 top-2 rounded-lg bg-emerald-500 px-2 py-0.5 text-xs font-bold text-white">
              Save {Math.round((1 - course.price / course.originalPrice) * 100)}%
            </span>
          )}
        </div>
        <div className="space-y-2">
          <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">{course.category}</span>
          <h3 className="font-semibold text-slate-900 dark:text-white line-clamp-1">{course.title}</h3>
          <p className="text-xs text-slate-500 line-clamp-2">{course.description}</p>
          <div className="flex items-center gap-3 text-xs text-slate-400">
            <span className="flex items-center gap-1"><Clock size={12} />{course.duration}</span>
            <span className="flex items-center gap-1"><BookOpen size={12} />{course.totalLessons} lessons</span>
          </div>
          <div className="flex items-center justify-between pt-2">
            <StarRating rating={course.rating} />
            <div className="flex items-center gap-1">
              <span className="text-lg font-bold text-slate-900 dark:text-white">${course.price}</span>
              {course.originalPrice && <span className="text-xs text-slate-400 line-through">${course.originalPrice}</span>}
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

// --- Landing Page ---
export function LandingPage() {
  const featured = SEED_COURSES.filter(c => c.featured).slice(0, 3);
  const benefits = [
    { icon: PlayCircle, title: 'Expert-Led Video Courses', desc: 'Learn from industry professionals with hands-on projects and real-world scenarios.' },
    { icon: Trophy, title: 'Certificates of Completion', desc: 'Earn verified certificates to showcase your skills on LinkedIn and your resume.' },
    { icon: Users, title: 'Community & Mentorship', desc: 'Join a vibrant community of learners and get direct mentorship from instructors.' },
    { icon: Clock, title: 'Learn at Your Own Pace', desc: 'Self-paced learning with lifetime access to all course materials and updates.' },
  ];

  return (
    <div>
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 via-white to-sky-50 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900" />
        <div className="relative mx-auto max-w-7xl px-4 pb-20 pt-24 sm:px-6 lg:pt-28">
          <motion.div initial="hidden" animate="visible" variants={stagger} className="mx-auto max-w-3xl text-center">
            <motion.div variants={fadeUp} className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">
              <GraduationCap size={14} weight="fill" /> Launching 2025
            </motion.div>
            <motion.h1 variants={fadeUp} className="text-4xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-5xl lg:text-6xl">
              Learn the Skills That{' '}
              <span className="bg-gradient-to-r from-emerald-500 to-sky-500 bg-clip-text text-transparent">Matter Most</span>
            </motion.h1>
            <motion.p variants={fadeUp} className="mx-auto mt-6 max-w-2xl text-lg text-slate-500 dark:text-slate-400">
              Industry-led courses in tech, design, and business. Learn at your own pace and advance your career.
            </motion.p>
            <motion.div variants={fadeUp} className="mt-8 flex items-center justify-center gap-4">
              <Link to={ROUTES.courses} className="inline-flex h-12 items-center gap-2 rounded-xl bg-emerald-600 px-6 text-sm font-semibold text-white hover:bg-emerald-700 active:scale-[0.98] transition-all">
                Explore Courses <ArrowRight size={18} />
              </Link>
              <Link to={ROUTES.about} className="inline-flex h-12 items-center gap-2 rounded-xl border border-slate-300 px-6 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800 transition-all">
                Learn More
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <motion.div initial="hidden" whileInView="visible" variants={stagger} viewport={{ once: true, margin: '-100px' }}>
          <motion.div variants={fadeUp} className="mb-10 text-center">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Featured Courses</h2>
            <p className="mt-3 text-slate-500">Start learning from our most popular courses</p>
          </motion.div>
          <motion.div variants={fadeUp} className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((c, i) => <CourseCard key={c.id} course={c} index={i} />)}
          </motion.div>
          <motion.div variants={fadeUp} className="mt-10 text-center">
            <Link to={ROUTES.courses} className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-300 px-5 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800">
              View All Courses <ArrowRight size={16} />
            </Link>
          </motion.div>
        </motion.div>
      </section>

      <section className="bg-slate-50 dark:bg-slate-900/50">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
          <motion.div initial="hidden" whileInView="visible" variants={stagger} viewport={{ once: true, margin: '-100px' }}>
            <motion.div variants={fadeUp} className="mb-12 text-center">
              <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Why {BRAND_NAME}?</h2>
              <p className="mt-3 text-slate-500">Everything you need to succeed in your learning journey</p>
            </motion.div>
            <motion.div variants={fadeUp} className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {benefits.map((b, i) => (
                <div key={i} className="rounded-2xl border border-slate-200 bg-white p-6 transition-all hover:shadow-md dark:border-slate-700 dark:bg-slate-800">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30">
                    <b.icon size={24} />
                  </div>
                  <h3 className="mb-2 font-semibold text-slate-900 dark:text-white">{b.title}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">{b.desc}</p>
                </div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          {[
            { label: 'Courses', value: '50+' },
            { label: 'Students', value: '20K+' },
            { label: 'Instructors', value: '100+' },
            { label: 'Hours of Content', value: '500+' },
          ].map((s, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} viewport={{ once: true }} className="text-center">
              <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{s.value}</p>
              <p className="mt-1 text-sm text-slate-500">{s.label}</p>
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  );
}

// --- Course Marketplace ---
export function CoursesPage() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [showFilters, setShowFilters] = useState(false);

  const filtered = useMemo(() => {
    let result = SEED_COURSES;
    if (search) result = result.filter(c => c.title.toLowerCase().includes(search.toLowerCase()) || c.description.toLowerCase().includes(search.toLowerCase()));
    if (category !== 'All') result = result.filter(c => c.category === category);
    return result;
  }, [search, category]);

  const categories = useMemo(() => ['All', ...new Set(SEED_COURSES.map(c => c.category))], []);

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Explore Courses</h1>
          <p className="mt-2 text-slate-500">Discover courses that match your learning goals</p>
        </div>
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-md">
            <MagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search courses..."
              className="h-10 w-full rounded-xl border border-slate-300 bg-white pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 dark:border-slate-600 dark:bg-slate-800 dark:text-white" />
          </div>
          <button onClick={() => setShowFilters(!showFilters)}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-300 px-4 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800 sm:hidden">
            <Funnel size={16} /> Filters <CaretDown size={12} />
          </button>
        </div>
        <div className={`flex-wrap gap-2 mb-8 ${showFilters ? 'flex' : 'hidden sm:flex'}`}>
          {categories.map(c => (
            <button key={c} onClick={() => setCategory(c)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${category === c ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'}`}>
              {c}
            </button>
          ))}
        </div>
        {filtered.length === 0 ? (
          <div className="py-20 text-center">
            <BookOpen size={48} className="mx-auto text-slate-300 mb-4" />
            <p className="text-lg font-medium text-slate-500">No courses found</p>
            <p className="text-sm text-slate-400">Try adjusting your search or filters</p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((c, i) => <CourseCard key={c.id} course={c} index={i} />)}
          </div>
        )}
      </motion.div>
    </div>
  );
}

// --- Course Detail Page ---
export function CourseDetailPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const course = SEED_COURSES.find(c => c.slug === slug);

  if (!course) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center px-4">
        <div className="text-center">
          <Barricade size={56} className="mx-auto text-slate-300 mb-4" />
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Course Not Found</h2>
          <p className="mt-2 text-slate-500">The course you are looking for does not exist.</p>
          <Link to={ROUTES.courses} className="mt-6 inline-flex h-10 items-center gap-1.5 rounded-xl bg-emerald-600 px-5 text-sm font-semibold text-white hover:bg-emerald-700">Browse Courses</Link>
        </div>
      </div>
    );
  }

  const handleEnroll = () => {
    if (!user) { navigate(ROUTES.login); return; }
    navigate(`/checkout/${course.id}`);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <button onClick={() => navigate(-1)} className="mb-6 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700"><ArrowLeft size={16} /> Back</button>
        <div className="grid gap-10 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-8">
            <div>
              <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">{course.category}</span>
              <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900 dark:text-white">{course.title}</h1>
              <p className="mt-2 text-lg text-slate-500">{course.subtitle}</p>
              <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-slate-500">
                <StarRating rating={course.rating} />
                <span className="flex items-center gap-1"><Users size={14} />{course.studentCount.toLocaleString()} students</span>
                <span className="flex items-center gap-1"><Clock size={14} />{course.duration}</span>
              </div>
            </div>
            <div>
              <img src={course.image} alt={course.title} className="w-full rounded-2xl object-cover h-64 sm:h-80" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">About This Course</h2>
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed">{course.longDescription}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {course.skills.map(s => <span key={s} className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">{s}</span>)}
              </div>
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Curriculum</h2>
              <div className="space-y-3">
                {course.curriculum.map((mod, mi) => (
                  <details key={mod.id} className="group rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <summary className="flex cursor-pointer items-center justify-between bg-slate-50 px-4 py-3 text-sm font-medium text-slate-900 dark:bg-slate-800 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-700">
                      <span>Module {mi + 1}: {mod.title}</span>
                      <span className="text-xs text-slate-400">{mod.lessons.length} lessons &middot; {mod.duration}</span>
                    </summary>
                    <div className="divide-y divide-slate-100 dark:divide-slate-700">
                      {mod.lessons.map(l => (
                        <div key={l.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                          {l.type === 'video' ? <PlayCircle size={16} className="text-emerald-500 shrink-0" /> :
                           l.type === 'quiz' ? <CheckCircle size={16} className="text-amber-500 shrink-0" /> :
                           <BookOpen size={16} className="text-blue-500 shrink-0" />}
                          <span className="flex-1 text-slate-700 dark:text-slate-300">{l.title}</span>
                          <span className="text-xs text-slate-400">{l.duration}</span>
                        </div>
                      ))}
                    </div>
                  </details>
                ))}
              </div>
            </div>
          </div>
          <div className="lg:col-span-1">
            <div className="sticky top-24 rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
              <div className="mb-4">
                <span className="text-3xl font-bold text-slate-900 dark:text-white">${course.price}</span>
                {course.originalPrice && <span className="ml-2 text-sm text-slate-400 line-through">${course.originalPrice}</span>}
              </div>
              <button onClick={handleEnroll} className="w-full h-11 rounded-xl bg-emerald-600 text-sm font-semibold text-white hover:bg-emerald-700 active:scale-[0.98] transition-all">Enroll Now</button>
              <p className="mt-3 text-center text-xs text-slate-400">30-day money-back guarantee</p>
              <hr className="my-6 border-slate-200 dark:border-slate-700" />
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <img src={course.instructor.avatar} alt={course.instructor.name} className="h-12 w-12 rounded-full" />
                  <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-white">{course.instructor.name}</p>
                    <p className="text-xs text-slate-400">{course.instructor.title}</p>
                  </div>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">{course.instructor.bio}</p>
              </div>
              <hr className="my-6 border-slate-200 dark:border-slate-700" />
              <div className="space-y-2 text-sm text-slate-500">
                <div className="flex items-center gap-2"><PlayCircle size={16} className="text-emerald-500" />{course.totalLessons} lessons</div>
                <div className="flex items-center gap-2"><Clock size={16} className="text-emerald-500" />{course.duration} of content</div>
                <div className="flex items-center gap-2"><CheckCircle size={16} className="text-emerald-500" />Full lifetime access</div>
                <div className="flex items-center gap-2"><Trophy size={16} className="text-emerald-500" />Certificate of completion</div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}