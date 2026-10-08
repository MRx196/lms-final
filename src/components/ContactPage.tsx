import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  Envelope, Phone, MapPin, Clock, ChatCircle, PaperPlaneTilt,
  CheckCircle, Lifebuoy, Globe, Wrench, HandHeart, CaretDown, ArrowRight, Sparkle,
} from '@phosphor-icons/react';
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from '@/components/ui/accordion';
import { BRAND_NAME, BRAND_EMAIL, ROUTES } from '@/constants/navigation';

const container = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.07 } },
};
const item = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { ease: 'easeOut' as const } },
};

const TOPICS = [
  'Course Inquiry',
  'Enterprise & Teams',
  'Technical Support',
  'Instructor Application',
  'Billing & Payments',
  'Something else',
];

const CHANNELS = [
  { icon: Envelope, title: 'Direct Email', value: BRAND_EMAIL, href: `mailto:${BRAND_EMAIL}`, tint: 'text-emerald-500 bg-emerald-500/10' },
  { icon: Phone, title: 'Phone', value: '+1 (555) 123-4567', href: 'tel:+15551234567', tint: 'text-green-600 bg-green-600/10' },
  { icon: MapPin, title: 'Office', value: '123 Learning Lane, San Francisco, CA 94102', href: null, tint: 'text-emerald-600 bg-emerald-600/10' },
  { icon: Clock, title: 'Support Hours', value: 'Mon–Fri, 8am–8pm PT', href: null, tint: 'text-green-500 bg-green-500/10' },
];

const FAQS = [
  { q: 'How do I enroll in a course?', a: 'Browse the catalog, open any course, and click “Get started”. Create a free account and you are enrolled instantly — your first lessons are always on us.' },
  { q: 'Do you offer certificates?', a: 'Yes. Every paid course includes a verifiable certificate of completion you can share on LinkedIn or add to your résumé once you finish all modules and assessments.' },
  { q: 'What is your refund policy?', a: 'We offer a 14-day, no-questions-asked money-back guarantee on all individual course purchases. Enterprise plans follow the terms in your service agreement.' },
  { q: 'Can I become an instructor?', a: 'Absolutely. Pick “Instructor Application” in the form and tell us your area of expertise. Our curriculum team reviews applications weekly and reaches out within two business days.' },
  { q: 'Is there a free plan?', a: 'Free accounts get full access to a rotating library of introductory lessons, community study groups, and progress tracking. Upgrade any time for the complete catalog.' },
];

type FormState = { name: string; email: string; topic: string; message: string };
const EMPTY: FormState = { name: '', email: '', topic: TOPICS[0], message: '' };

function ContactPage() {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [submitting, setSubmitting] = useState(false);

  const update = (key: keyof FormState, value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const validate = () => {
    const next: Partial<Record<keyof FormState, string>> = {};
    if (!form.name.trim()) next.name = 'Please enter your name.';
    if (!form.email.trim()) next.email = 'Please enter your email.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) next.email = 'That email address looks invalid.';
    if (form.message.trim().length < 10) next.message = 'Message should be at least 10 characters.';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      toast.error('Please fix the highlighted fields.');
      return;
    }
    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 900));
    setSubmitting(false);
    setForm(EMPTY);
    toast.success("Message sent!", { description: `Thanks ${form.name.split(' ')[0] || 'there'} — we reply within 24 hours.` });
  };

  const fieldBase = 'w-full rounded-xl border bg-white px-4 py-3 text-sm text-zinc-900 shadow-sm outline-none transition placeholder:text-zinc-400 focus:ring-2 focus:ring-emerald-500/40 dark:bg-zinc-900 dark:text-zinc-100';

  return (
    <div className="bg-white text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute -top-32 right-0 h-96 w-96 rounded-full bg-gradient-to-br from-emerald-500/20 to-green-600/20 blur-3xl" />
        <div className="mx-auto max-w-7xl px-4 lg:px-8 pt-20 pb-12 lg:pt-28">
          <motion.div variants={container} initial="hidden" animate="visible" className="mx-auto max-w-2xl text-center">
            <motion.div variants={item} className="flex justify-center">
              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-400">
                <ChatCircle size={14} weight="fill" /> Get in touch
              </span>
            </motion.div>
            <motion.h1 variants={item} className="mt-6 text-4xl font-black tracking-tight sm:text-5xl">
              We would love to{' '}
              <span className="text-emerald-600 dark:text-emerald-400">hear from you</span>
            </motion.h1>
            <motion.p variants={item} className="mt-5 text-lg text-zinc-500 dark:text-zinc-400">
              Questions about a course, a team rollout, or teaching with us? Send a note and a real human replies within 24 hours.
            </motion.p>
            <motion.div variants={item} className="mt-6 inline-flex items-center gap-2 rounded-full bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-600 dark:bg-zinc-900 dark:text-zinc-300">
              <CheckCircle size={16} weight="fill" className="text-emerald-500" /> Average response time: under 24 hours
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Channels + Form */}
      <section className="mx-auto max-w-7xl px-4 lg:px-8 pb-20">
        <div className="grid gap-8 lg:grid-cols-5">
          {/* Channels */}
          <motion.div variants={container} initial="hidden" whileInView="visible" viewport={{ once: true }} className="space-y-4 lg:col-span-2">
            {CHANNELS.map((c) => (
              <motion.div key={c.title} variants={item} className="flex items-start gap-4 rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
                <span className={`inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${c.tint}`}><c.icon size={22} weight="fill" /></span>
                <div className="min-w-0">
                  <h3 className="font-semibold">{c.title}</h3>
                  {c.href ? (
                    <a href={c.href} className="mt-0.5 block truncate text-sm text-zinc-500 transition hover:text-emerald-600 dark:text-zinc-400 dark:hover:text-emerald-400">{c.value}</a>
                  ) : (
                    <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">{c.value}</p>
                  )}
                </div>
              </motion.div>
            ))}

            {/* Live helpdesk */}
            <motion.div variants={item} className="rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 to-green-600/10 p-5">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500 text-white"><Lifebuoy size={22} weight="fill" /></span>
                <div>
                  <h3 className="font-semibold">Live Helpdesk</h3>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">Chat with support in real time</p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-medium text-zinc-600 shadow-sm dark:bg-zinc-950 dark:text-zinc-300"><Globe size={14} className="text-emerald-500" /> 40+ countries</span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-medium text-zinc-600 shadow-sm dark:bg-zinc-950 dark:text-zinc-300"><Wrench size={14} className="text-emerald-500" /> 24/7 status page</span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-medium text-zinc-600 shadow-sm dark:bg-zinc-950 dark:text-zinc-300"><HandHeart size={14} className="text-emerald-500" /> Community forum</span>
              </div>
            </motion.div>
          </motion.div>

          {/* Form */}
          <motion.div variants={item} initial="hidden" whileInView="visible" viewport={{ once: true }} className="lg:col-span-3">
            <form onSubmit={handleSubmit} noValidate className="rounded-3xl border border-zinc-200 bg-zinc-50/60 p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50 sm:p-8">
              <h2 className="text-xl font-bold">Send us a message</h2>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Fields marked with * are required.</p>

              <div className="mt-6 grid gap-5 sm:grid-cols-2">
                <div className="sm:col-span-1">
                  <label htmlFor="name" className="mb-1.5 block text-sm font-medium">Full name *</label>
                  <input id="name" value={form.name} onChange={(e) => update('name', e.target.value)} placeholder="Jane Doe"
                    className={`${fieldBase} ${errors.name ? 'border-red-400 focus:ring-red-400/40' : 'border-zinc-200 dark:border-zinc-700'}`} />
                  {errors.name && <p className="mt-1.5 text-xs text-red-500">{errors.name}</p>}
                </div>
                <div className="sm:col-span-1">
                  <label htmlFor="email" className="mb-1.5 block text-sm font-medium">Email *</label>
                  <input id="email" type="email" value={form.email} onChange={(e) => update('email', e.target.value)} placeholder="jane@example.com"
                    className={`${fieldBase} ${errors.email ? 'border-red-400 focus:ring-red-400/40' : 'border-zinc-200 dark:border-zinc-700'}`} />
                  {errors.email && <p className="mt-1.5 text-xs text-red-500">{errors.email}</p>}
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor="topic" className="mb-1.5 block text-sm font-medium">Topic</label>
                  <div className="relative">
                    <select id="topic" value={form.topic} onChange={(e) => update('topic', e.target.value)}
                      className={`${fieldBase} appearance-none border-zinc-200 pr-10 dark:border-zinc-700`}>
                      {TOPICS.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <CaretDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                  </div>
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor="message" className="mb-1.5 block text-sm font-medium">Message *</label>
                  <textarea id="message" rows={5} value={form.message} onChange={(e) => update('message', e.target.value)} placeholder="Tell us how we can help…"
                    className={`${fieldBase} resize-none ${errors.message ? 'border-red-400 focus:ring-red-400/40' : 'border-zinc-200 dark:border-zinc-700'}`} />
                  {errors.message && <p className="mt-1.5 text-xs text-red-500">{errors.message}</p>}
                </div>
              </div>

              <button type="submit" disabled={submitting}
                className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-600/25 transition hover:bg-emerald-700 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70">
                {submitting ? (
                  <><CheckCircle size={18} className="animate-spin" /> Sending…</>
                ) : (
                  <><PaperPlaneTilt size={18} weight="fill" /> Send message</>
                )}
              </button>
            </form>
          </motion.div>
        </div>
      </section>

      {/* Location card */}
      <section className="mx-auto max-w-7xl px-4 lg:px-8 pb-20">
        <div className="grid gap-6 overflow-hidden rounded-3xl border border-zinc-200 dark:border-zinc-800 md:grid-cols-2">
          <div className="bg-gradient-to-br from-emerald-600 via-green-700 to-emerald-800 p-8 text-white">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em]"><Sparkle size={14} weight="fill" /> Visit us</span>
            <h2 className="mt-5 text-2xl font-black sm:text-3xl">{BRAND_NAME} HQ</h2>
            <p className="mt-3 max-w-sm text-emerald-50">123 Learning Lane, San Francisco, CA 94102</p>
            <div className="mt-6 space-y-2 text-sm text-emerald-50">
              <p className="flex items-center gap-2"><Clock size={16} /> Mon–Fri · 8am–8pm PT</p>
              <p className="flex items-center gap-2"><Phone size={16} /> +1 (555) 123-4567</p>
              <p className="flex items-center gap-2"><Envelope size={16} /> {BRAND_EMAIL}</p>
            </div>
            <a href="https://maps.google.com/?q=San+Francisco+CA+94102" target="_blank" rel="noreferrer"
              className="mt-7 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50">
              Get directions <ArrowRight size={16} />
            </a>
          </div>
          <div aria-hidden className="relative min-h-[280px] bg-zinc-100 dark:bg-zinc-900">
            <div className="absolute inset-0 opacity-60" style={{ backgroundImage: 'linear-gradient(#00000010 1px, transparent 1px), linear-gradient(90deg, #00000010 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
              <span className="relative flex h-16 w-16 items-center justify-center">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-30" />
                <span className="relative inline-flex h-12 w-12 items-center justify-center rounded-full bg-emerald-600 text-white shadow-lg"><MapPin size={24} weight="fill" /></span>
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-t border-zinc-200 bg-zinc-50/60 dark:border-zinc-800 dark:bg-zinc-900/30">
        <div className="mx-auto max-w-3xl px-4 lg:px-8 py-20">
          <div className="text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-400">
              <ChatCircle size={14} weight="fill" /> FAQ
            </span>
            <h2 className="mt-5 text-3xl font-black tracking-tight sm:text-4xl">Frequently asked questions</h2>
            <p className="mt-3 text-zinc-500 dark:text-zinc-400">Instant answers before you reach out.</p>
          </div>
          <Accordion type="single" collapsible className="mt-10">
            {FAQS.map((f, i) => (
              <AccordionItem key={f.q} value={`item-${i}`}>
                <AccordionTrigger className="text-left text-base font-semibold">{f.q}</AccordionTrigger>
                <AccordionContent className="text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">{f.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
          <p className="mt-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
            Still stuck? <Link to={ROUTES.courses} className="font-semibold text-emerald-600 hover:underline dark:text-emerald-400">Explore the catalog</Link> or send us a message above.
          </p>
        </div>
      </section>
    </div>
  );
}

export { ContactPage };