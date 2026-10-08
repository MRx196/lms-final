import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Sparkle, Users, ChartLineUp, BookOpen, Target, Eye, ShieldCheck,
  Lightning, Rocket, Flag, GraduationCap, ArrowRight, Check,
  LinkedinLogo, TwitterLogo, GithubLogo, Barricade,
} from '@phosphor-icons/react';
import { BRAND_NAME, ROUTES } from '@/constants/navigation';

const container = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};
const item = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { ease: 'easeOut' as const } },
};

const METRICS = [
  { icon: Users, value: '20,000+', label: 'Learners enrolled', tint: 'text-emerald-500 bg-emerald-500/10' },
  { icon: ChartLineUp, value: '94%', label: 'Course completion rate', tint: 'text-green-600 bg-green-600/10' },
  { icon: GraduationCap, value: '180+', label: 'Expert mentors', tint: 'text-emerald-600 bg-emerald-600/10' },
  { icon: BookOpen, value: '320+', label: 'Active courses', tint: 'text-green-500 bg-green-500/10' },
];

const VALUES = [
  { icon: ShieldCheck, title: 'Quality First', body: 'Every course is peer-reviewed by senior practitioners before it reaches your dashboard.' },
  { icon: Lightning, title: 'Practical Learning', body: 'Hands-on projects and real-world scenarios beat passive video-watching, every time.' },
  { icon: Users, title: 'Community-Driven', body: 'Study groups, mentor office hours and peer feedback keep you accountable and moving.' },
  { icon: Rocket, title: 'Career Acceleration', body: 'Portfolio-ready outcomes, certificates and interview prep engineered around hiring data.' },
];

const TIMELINE = [
  { year: '2019', title: 'The spark', body: 'Founded by three engineers frustrated that great education stayed locked behind gatekeepers.' },
  { year: '2021', title: 'First 10k learners', body: 'Our project-based curriculum crossed ten thousand students across 40 countries.' },
  { year: '2023', title: 'Mentor network', body: 'Launched live office hours with industry mentors from top product teams.' },
  { year: '2025', title: 'AI-guided paths', body: 'Adaptive learning paths that reshape themselves around your goals and pace.' },
];

const INSTRUCTORS = [
  { name: 'Amara Okafor', role: 'Lead, Full-Stack Engineering', initials: 'AO', tint: 'from-emerald-500 to-green-600' },
  { name: 'Daniel Reyes', role: 'Head of Data & AI', initials: 'DR', tint: 'from-green-500 to-emerald-600' },
  { name: 'Priya Nair', role: 'Design Systems Lead', initials: 'PN', tint: 'from-emerald-600 to-green-700' },
];

function SectionEyebrow({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-400">
      {children}
    </span>
  );
}

function AboutPage() {
  return (
    <div className="bg-white text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute -top-32 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-gradient-to-br from-emerald-500/20 via-green-500/10 to-emerald-600/20 blur-3xl" />
        <div className="mx-auto max-w-7xl px-4 lg:px-8 pt-20 pb-16 lg:pt-28 lg:pb-24">
          <motion.div variants={container} initial="hidden" animate="visible" className="mx-auto max-w-3xl text-center">
            <motion.div variants={item} className="flex justify-center">
              <SectionEyebrow><Sparkle size={14} weight="fill" /> Our story</SectionEyebrow>
            </motion.div>
            <motion.h1 variants={item} className="mt-6 text-4xl font-black tracking-tight sm:text-5xl lg:text-6xl">
              Education that moves at the speed of{' '}
              <span className="text-emerald-600 dark:text-emerald-400">your ambition</span>
            </motion.h1>
            <motion.p variants={item} className="mx-auto mt-6 max-w-2xl text-lg text-zinc-500 dark:text-zinc-400">
              {BRAND_NAME} is a modern learning platform built for the digital age. We believe quality education should be accessible to everyone, regardless of location or background.
            </motion.p>
            <motion.div variants={item} className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link to={ROUTES.courses} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-600/25 transition hover:bg-emerald-700">
                Browse courses <ArrowRight size={16} />
              </Link>
              <Link to={ROUTES.contact} className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-6 py-3 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800">
                Talk to us
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Metrics */}
      <section className="mx-auto max-w-7xl px-4 lg:px-8 pb-16">
        <motion.div variants={container} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-80px' }} className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {METRICS.map((m) => (
            <motion.div key={m.label} variants={item} className="rounded-2xl border border-zinc-200 bg-zinc-50/60 p-6 dark:border-zinc-800 dark:bg-zinc-900/50">
              <span className={`inline-flex h-11 w-11 items-center justify-center rounded-xl ${m.tint}`}><m.icon size={22} weight="fill" /></span>
              <p className="mt-4 text-3xl font-black tracking-tight">{m.value}</p>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{m.label}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* Mission & Vision */}
      <section className="mx-auto max-w-7xl px-4 lg:px-8 pb-20">
        <div className="grid gap-6 md:grid-cols-2">
          <motion.div variants={container} initial="hidden" whileInView="visible" viewport={{ once: true }} className="rounded-3xl border border-zinc-200 bg-white p-8 dark:border-zinc-800 dark:bg-zinc-900">
            <motion.div variants={item} className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-500"><Target size={24} weight="fill" /></motion.div>
            <motion.h2 variants={item} className="mt-5 text-2xl font-bold">Our mission</motion.h2>
            <motion.p variants={item} className="mt-3 leading-relaxed text-zinc-500 dark:text-zinc-400">
              To democratize world-class skills training by pairing expert-crafted curricula with hands-on projects, live mentorship and adaptive learning paths that meet every student exactly where they are.
            </motion.p>
          </motion.div>
          <motion.div variants={container} initial="hidden" whileInView="visible" viewport={{ once: true }} className="rounded-3xl border border-zinc-200 bg-white p-8 dark:border-zinc-800 dark:bg-zinc-900">
            <motion.div variants={item} className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-500"><Eye size={24} weight="fill" /></motion.div>
            <motion.h2 variants={item} className="mt-5 text-2xl font-bold">Our vision</motion.h2>
            <motion.p variants={item} className="mt-3 leading-relaxed text-zinc-500 dark:text-zinc-400">
              A world where anyone, anywhere can reinvent their career in months — not years — through learning that is practical, affordable and relentlessly supportive.
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* Core Values */}
      <section className="border-y border-zinc-200 bg-zinc-50/60 dark:border-zinc-800 dark:bg-zinc-900/30">
        <div className="mx-auto max-w-7xl px-4 lg:px-8 py-20">
          <div className="mx-auto max-w-2xl text-center">
            <SectionEyebrow><ShieldCheck size={14} weight="fill" /> What we stand for</SectionEyebrow>
            <h2 className="mt-5 text-3xl font-black tracking-tight sm:text-4xl">Core values that shape every course</h2>
          </div>
          <motion.div variants={container} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-80px' }} className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {VALUES.map((v) => (
              <motion.div key={v.title} variants={item} className="group rounded-2xl border border-zinc-200 bg-white p-6 transition hover:-translate-y-1 hover:border-emerald-300 hover:shadow-lg dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-emerald-700">
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500 transition group-hover:bg-emerald-500 group-hover:text-white"><v.icon size={22} weight="fill" /></span>
                <h3 className="mt-4 text-lg font-bold">{v.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">{v.body}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Timeline */}
      <section className="mx-auto max-w-7xl px-4 lg:px-8 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <SectionEyebrow><Flag size={14} weight="fill" /> The journey</SectionEyebrow>
          <h2 className="mt-5 text-3xl font-black tracking-tight sm:text-4xl">How we got here</h2>
        </div>
        <motion.div variants={container} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-80px' }} className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {TIMELINE.map((t) => (
            <motion.div key={t.year} variants={item} className="relative rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
              <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{t.year}</span>
              <h3 className="mt-2 font-bold">{t.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">{t.body}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* Instructors */}
      <section className="border-y border-zinc-200 bg-zinc-50/60 dark:border-zinc-800 dark:bg-zinc-900/30">
        <div className="mx-auto max-w-7xl px-4 lg:px-8 py-20">
          <div className="mx-auto max-w-2xl text-center">
            <SectionEyebrow><Users size={14} weight="fill" /> The people</SectionEyebrow>
            <h2 className="mt-5 text-3xl font-black tracking-tight sm:text-4xl">Learn from operators, not theorists</h2>
            <p className="mt-4 text-zinc-500 dark:text-zinc-400">Our mentors ship real products at leading companies and teach what actually works.</p>
          </div>
          <motion.div variants={container} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-80px' }} className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {INSTRUCTORS.map((p) => (
              <motion.div key={p.name} variants={item} className="rounded-2xl border border-zinc-200 bg-white p-6 text-center dark:border-zinc-800 dark:bg-zinc-950">
                <div className={`mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br ${p.tint} text-2xl font-black text-white shadow-lg`}>{p.initials}</div>
                <h3 className="mt-4 text-lg font-bold">{p.name}</h3>
                <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{p.role}</p>
                <div className="mt-4 flex items-center justify-center gap-3 text-zinc-400">
                  <a href={ROUTES.about} aria-label={`${p.name} on LinkedIn`} className="transition hover:text-emerald-500"><LinkedinLogo size={18} /></a>
                  <a href={ROUTES.about} aria-label={`${p.name} on Twitter`} className="transition hover:text-emerald-500"><TwitterLogo size={18} /></a>
                  <a href={ROUTES.about} aria-label={`${p.name} on GitHub`} className="transition hover:text-emerald-500"><GithubLogo size={18} /></a>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-4 lg:px-8 py-20">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-600 via-green-700 to-emerald-800 px-8 py-14 text-center shadow-2xl shadow-emerald-600/20 sm:px-12">
          <div aria-hidden className="pointer-events-none absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 20% 20%, white 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
          <h2 className="relative text-3xl font-black tracking-tight text-white sm:text-4xl">Ready to transform your career?</h2>
          <p className="relative mx-auto mt-4 max-w-xl text-emerald-50">Join 20,000+ learners building real skills with {BRAND_NAME}. Your first lesson is on us.</p>
          <div className="relative mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link to={ROUTES.register} className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-semibold text-emerald-700 shadow-lg transition hover:bg-emerald-50">
              Get started free <ArrowRight size={16} />
            </Link>
            <Link to={ROUTES.courses} className="inline-flex items-center gap-2 rounded-xl border border-white/40 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10">
              <Check size={16} weight="bold" /> Explore catalog
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

function NotFoundPage() {
  return (
    <div className="relative flex min-h-[calc(100dvh-4rem)] flex-col items-center justify-center overflow-hidden px-4 text-center">
      <div aria-hidden className="pointer-events-none absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-gradient-to-br from-emerald-500/20 to-green-600/20 blur-3xl" />
      <Barricade size={72} weight="fill" className="mx-auto mb-4 text-zinc-300 dark:text-zinc-700" />
      <p className="mb-3 text-sm font-semibold uppercase tracking-[0.3em] text-emerald-500">Error 404</p>
      <h1 className="mb-4 bg-gradient-to-r from-emerald-500 to-green-600 bg-clip-text text-7xl font-black text-transparent">404</h1>
      <p className="mb-8 max-w-sm text-zinc-500 dark:text-zinc-400">The page you are looking for doesn&apos;t exist or has been moved.</p>
      <Link to={ROUTES.home} className="rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-600/25 transition hover:bg-emerald-700">Back to Home</Link>
    </div>
  );
}

export { AboutPage, NotFoundPage };