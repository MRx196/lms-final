import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, EyeSlash, Envelope, Lock, User as UserIcon, ArrowRight, GraduationCap, CheckCircle, CircleNotch, ShieldCheck, Student, Copy, Check, PlayCircle, Lightning } from '@phosphor-icons/react';
import { ROUTES, BRAND_NAME } from '@/constants/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { ease: 'easeOut' as const } },
};

type DemoRole = 'admin' | 'student';

const DEMO_ACCOUNTS: Record<DemoRole, { email: string; password: string; label: string; path: string; Icon: typeof ShieldCheck }> = {
  admin: {
    email: 'admin@demo.com',
    password: 'admin123456',
    label: 'Admin Portal',
    path: '/admin/dashboard',
    Icon: ShieldCheck,
  },
  student: {
    email: 'student@demo.com',
    password: 'student123456',
    label: 'Student Portal',
    path: '/student/dashboard',
    Icon: Student,
  },
};

function CredentialRow({ label, value, copied, onCopy }: { label: string; value: string; copied: boolean; onCopy: () => void }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs text-zinc-500 w-16 shrink-0">{label}</span>
      <code className="flex-1 truncate text-xs font-mono text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 rounded px-2 py-1">{value}</code>
      <button
        type="button"
        onClick={onCopy}
        aria-label={`Copy ${label}`}
        className="shrink-0 inline-flex h-7 w-7 items-center justify-center rounded-md border border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:text-emerald-600 hover:border-emerald-300 dark:hover:border-emerald-700 transition-colors"
      >
        {copied ? <Check size={14} weight="bold" /> : <Copy size={14} />}
      </button>
    </div>
  );
}

function DemoCredentialsPanel({ onQuickLogin, busy }: { onQuickLogin: (role: DemoRole) => void; busy?: DemoRole | null }) {
  const [copied, setCopied] = useState<string | null>(null);

  const copy = async (key: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(key);
      toast.success('Copied to clipboard');
      setTimeout(() => setCopied(null), 1500);
    } catch {
      toast.error('Could not copy to clipboard');
    }
  };

  return (
    <motion.div variants={itemVariants} className="mt-6">
      <div className="rounded-xl border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/60 dark:bg-emerald-950/20 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Lightning size={16} weight="fill" className="text-emerald-600" />
          <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">Demo Credentials</h3>
          <span className="text-xs text-zinc-500">One-click access</span>
        </div>
        <div className="space-y-3">
          {(Object.keys(DEMO_ACCOUNTS) as DemoRole[]).map((role) => {
            const acc = DEMO_ACCOUNTS[role];
            const Icon = acc.Icon;
            return (
              <div key={role} className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300">
                      <Icon size={16} weight="fill" />
                    </span>
                    <span className="text-sm font-medium text-zinc-800 dark:text-zinc-100">{acc.label}</span>
                  </div>
                  <span className="text-[11px] font-mono text-zinc-400">{acc.path}</span>
                </div>
                <div className="space-y-1.5 mb-3">
                  <CredentialRow label="Email" value={acc.email} copied={copied === `${role}-email`} onCopy={() => copy(`${role}-email`, acc.email)} />
                  <CredentialRow label="Password" value={acc.password} copied={copied === `${role}-pass`} onCopy={() => copy(`${role}-pass`, acc.password)} />
                </div>
                <Button
                  type="button"
                  onClick={() => onQuickLogin(role)}
                  disabled={busy != null}
                  className="w-full h-9 bg-emerald-600 hover:bg-emerald-700 text-white text-sm gap-2 disabled:opacity-60"
                >
                  {busy === role ? <CircleNotch size={16} className="animate-spin" /> : <PlayCircle size={16} weight="fill" />}
                  {busy === role ? 'Signing in...' : `Fill & Log In as ${role === 'admin' ? 'Admin' : 'Student'}`}
                </Button>
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const { signIn, signInWithDemo, profile } = useAuth();
  const [busyRole, setBusyRole] = useState<DemoRole | null>(null);

  const handleQuickLogin = async (role: DemoRole) => {
    const acc = DEMO_ACCOUNTS[role];
    setError('');
    setEmail(acc.email);
    setPassword(acc.password);
    setBusyRole(role);
    try {
      await signInWithDemo(acc.email, acc.password, role);
      navigate(role === 'admin' ? ROUTES.adminDashboard : ROUTES.studentDashboard);
    } catch {
      setError('Demo sign-in failed. Please try the manual form.');
    } finally {
      setBusyRole(null);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await signIn(email, password);
      // Navigate based on profile role after auth state updates
      const redirectTo = profile?.role === 'admin' ? ROUTES.adminDashboard : ROUTES.studentDashboard;
      navigate(redirectTo);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Invalid email or password');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[calc(100dvh-4rem)] flex items-center justify-center px-4 py-12">
      <motion.div
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        className="w-full max-w-md"
      >
        <motion.div variants={itemVariants} className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 font-bold text-xl text-emerald-600 mb-4">
            <GraduationCap size={28} weight="fill" />
            {BRAND_NAME}
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
            Welcome back
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Sign in to continue your learning journey
          </p>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="border-zinc-200 dark:border-zinc-800 shadow-sm">
            <CardHeader className="pb-4">
              
              <CardTitle className="text-lg">Sign In</CardTitle>
              <CardDescription>Sign in to your account</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogin} className="space-y-4">
                {error && (
                  <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-sm text-red-600 dark:text-red-400">
                    {error}
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                    Email
                  </label>
                  <div className="relative">
                    <Envelope size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full h-10 pl-9 pr-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                      placeholder="you@example.com"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                    Password
                  </label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full h-10 pl-9 pr-10 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                      placeholder="Enter your password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                    >
                      {showPassword ? <EyeSlash size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-sm text-zinc-500">
                    <input type="checkbox" className="rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500" />
                    Remember me
                  </label>
                  <Link to={ROUTES.forgotPassword} className="text-sm text-emerald-600 hover:text-emerald-700 transition-colors">
                    Forgot password?
                  </Link>
                </div>
                <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white h-11 gap-2">
                  Sign In <ArrowRight size={16} />
                </Button>
              </form>
              <p className="text-center text-sm text-zinc-500 mt-4">
                Don't have an account?{' '}
                <Link to={ROUTES.register} className="text-emerald-600 hover:text-emerald-700 font-medium">
                  Create one
                </Link>
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <DemoCredentialsPanel onQuickLogin={handleQuickLogin} busy={busyRole} />
      </motion.div>
    </div>
  );
}

export function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const { signUp, signInWithDemo } = useAuth();
  const [busyRole, setBusyRole] = useState<DemoRole | null>(null);

  const handleQuickLogin = async (role: DemoRole) => {
    const acc = DEMO_ACCOUNTS[role];
    setError('');
    setBusyRole(role);
    try {
      await signInWithDemo(acc.email, acc.password, role);
      navigate(role === 'admin' ? ROUTES.adminDashboard : ROUTES.studentDashboard);
    } catch {
      setError('Demo sign-in failed. Please try registering.');
    } finally {
      setBusyRole(null);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setSubmitting(true);
    try {
      await signUp(email, password, name);
      setSuccess(true);
      setTimeout(() => {
        navigate(ROUTES.login);
      }, 2000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-[calc(100dvh-4rem)] flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <CheckCircle size={64} className="mx-auto text-emerald-500 mb-4" weight="fill" />
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-2">Account created!</h2>
          <p className="text-zinc-500">Redirecting to your dashboard...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100dvh-4rem)] flex items-center justify-center px-4 py-12">
      <motion.div
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        className="w-full max-w-md"
      >
        <motion.div variants={itemVariants} className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 font-bold text-xl text-emerald-600 mb-4">
            <GraduationCap size={28} weight="fill" />
            {BRAND_NAME}
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
            Create your account
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Start your learning journey today
          </p>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="border-zinc-200 dark:border-zinc-800 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Register</CardTitle>
              <CardDescription>Create your account</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleRegister} className="space-y-4">
                {error && (
                  <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-sm text-red-600 dark:text-red-400">
                    {error}
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Full Name</label>
                  <div className="relative">
                    <UserIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full h-10 pl-9 pr-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                      placeholder="John Doe"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Email</label>
                  <div className="relative">
                    <Envelope size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full h-10 pl-9 pr-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                      placeholder="you@example.com"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Password</label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full h-10 pl-9 pr-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                      placeholder="Min. 6 characters"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Confirm Password</label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full h-10 pl-9 pr-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                      placeholder="Repeat your password"
                      required
                    />
                  </div>
                </div>
                <Button type="submit" disabled={submitting} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white h-11 gap-2">
                  {submitting ? <CircleNotch size={16} className="animate-spin" /> : <ArrowRight size={16} />}
                  {submitting ? 'Creating account...' : 'Create Account'}
                </Button>
              </form>
              <p className="text-center text-sm text-zinc-500 mt-4">
                Already have an account?{' '}
                <Link to={ROUTES.login} className="text-emerald-600 hover:text-emerald-700 font-medium">
                  Sign in
                </Link>
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <DemoCredentialsPanel onQuickLogin={handleQuickLogin} busy={busyRole} />
      </motion.div>
    </div>
  );
}

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/login`,
      });
      if (resetError) throw resetError;
      setSent(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to send reset link');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[calc(100dvh-4rem)] flex items-center justify-center px-4 py-12">
      <motion.div
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        className="w-full max-w-md"
      >
        <motion.div variants={itemVariants} className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 font-bold text-xl text-emerald-600 mb-4">
            <GraduationCap size={28} weight="fill" />
            {BRAND_NAME}
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">Reset password</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Enter your email and we'll send you a reset link
          </p>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="border-zinc-200 dark:border-zinc-800 shadow-sm">
            <CardContent className="pt-6">
              {sent ? (
                <div className="text-center py-4">
                  <CheckCircle size={48} className="mx-auto text-emerald-500 mb-3" weight="fill" />
                  <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-1">Check your email</h3>
                  <p className="text-sm text-zinc-500">
                    If an account exists for {email}, you'll receive a password reset link shortly.
                  </p>
                  <Link to={ROUTES.login}>
                    <Button variant="outline" className="mt-6">Back to Sign In</Button>
                  </Link>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Email</label>
                    <div className="relative">
                      <Envelope size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full h-10 pl-9 pr-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                        placeholder="you@example.com"
                        required
                      />
                    </div>
                  </div>
                  <Button type="submit" disabled={submitting} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white h-11 gap-2">
                    {submitting ? <CircleNotch size={16} className="animate-spin" /> : <ArrowRight size={16} />}
                    {submitting ? 'Sending...' : 'Send Reset Link'}
                  </Button>
                  <p className="text-center text-sm text-zinc-500">
                    Remember your password?{' '}
                    <Link to={ROUTES.login} className="text-emerald-600 hover:text-emerald-700 font-medium">
                      Sign in
                    </Link>
                  </p>
                </form>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </div>
  );
}