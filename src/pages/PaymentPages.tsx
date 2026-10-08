import { Link, useParams, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  CheckCircle, XCircle, ArrowLeft, ArrowRight, Clock, PlayCircle, Certificate, Trophy,
  CreditCard, Lock, Spinner, DeviceMobile, Buildings, User as UserIcon, EnvelopeSimple,
  Phone, Key, ShieldCheck, GraduationCap, BookOpenText, SignIn, Eye, EyeSlash,
} from '@phosphor-icons/react';
import { ROUTES } from '@/constants/navigation';
import { getPublishedCourses } from '@/services/courseService';
import { getGateway, processPostPaymentEnrollment } from '@/services/paymentService';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useState, useEffect } from 'react';

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { ease: 'easeOut' as const } },
};

type CourseRow = {
  id: string;
  title: string;
  subtitle: string | null;
  price: number;
  original_price: number | null;
  image: string | null;
  currency: string;
  instructor_id: string | null;
  duration_hours: number | null;
  total_lessons: number | null;
  slug: string;
  instructors?: { name: string }[];
};

const inputCls =
  'w-full h-10 pl-9 pr-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30';

export function CheckoutPage() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState<CourseRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<'card' | 'momo' | 'bank'>('card');
  const [userEmail, setUserEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        if (!courseId) return;
        const allCourses = await getPublishedCourses();
        const found = allCourses.find((c) => c.id === courseId);
        if (found) setCourse(found as unknown as CourseRow);

        const { data: { user } } = await supabase.auth.getUser();
        if (user?.email) {
          setUserEmail(user.email);
          setIsLoggedIn(true);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load course');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [courseId]);

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
  };

  const handlePayment = async () => {
    if (!course || !courseId) return;
    if (!userEmail.trim() || !fullName.trim()) {
      toast.error('Please provide your full name and email');
      return;
    }
    if (!isLoggedIn && password.length < 6) {
      toast.error('Create a password of at least 6 characters to access your course later');
      return;
    }
    setProcessing(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const email = user?.email || userEmail.trim();
      const name = fullName.trim();

      // Payment-record creation is delegated to the gateway: MockGateway
      // persists it for the idempotency pipeline, and Paystack persists it at
      // verification time. processPostPaymentEnrollment reconciles the record
      // idempotently on the success page.
      const gateway = getGateway();
      const result = await gateway.initializePayment({
        amount: Number(course.price),
        currency: course.currency || 'GHS',
        email,
        courseId,
        userId: user?.id || '',
        metadata: { guest_email: email, guest_name: name, guest_phone: phone || undefined },
      });

      // Store checkout context so the confirmation page can finish the job
      // without the buyer having to re-enter anything.
      sessionStorage.setItem(
        'nnh_checkout',
        JSON.stringify({
          courseId,
          email,
          fullName: name,
          phone: phone || '',
          password: isLoggedIn ? '' : password,
          paymentId: null,
          reference: result.reference,
          method: selectedMethod,
          amount: Number(course.price),
          currency: course.currency || 'GHS',
        }),
      );

      if (result.checkoutUrl) {
        window.location.href = result.checkoutUrl;
      } else {
        // Mock / inline flow — redirect to success after short delay
        setTimeout(() => {
          navigate(`${ROUTES.paymentSuccess}?ref=${result.reference}`);
        }, 1500);
      }
    } catch (err: any) {
      toast.error(err.message || 'Payment failed');
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 lg:px-8 py-12 lg:py-16">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-zinc-200 dark:bg-zinc-800 rounded w-1/4" />
          <div className="grid grid-cols-3 gap-6">
            <div className="h-64 bg-zinc-200 dark:bg-zinc-800 rounded-xl col-span-2" />
            <div className="h-64 bg-zinc-200 dark:bg-zinc-800 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="min-h-[calc(100dvh-4rem)] flex items-center justify-center px-4">
        <div className="text-center">
          <XCircle size={48} className="mx-auto text-zinc-300 mb-4" />
          <h2 className="text-xl font-semibold mb-2">Course not found</h2>
          <p className="text-zinc-500 mb-6">The course you're trying to enroll in is not available.</p>
          <Link to={ROUTES.courses}><Button className="gap-2"><ArrowLeft size={16} /> Back to Courses</Button></Link>
        </div>
      </div>
    );
  }

  const discount = course.original_price ? course.original_price - course.price : 0;

  return (
    <div className="max-w-4xl mx-auto px-4 lg:px-8 py-12 lg:py-16">
      <Link to={`/courses/${course.slug || ''}`} className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-emerald-600 mb-6 transition-colors">
        <ArrowLeft size={14} /> Back to Course
      </Link>

      <motion.div initial="hidden" animate="visible" className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* Left: Order + Checkout */}
        <div className="lg:col-span-3 space-y-6">
          <motion.div variants={itemVariants}>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-9 h-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <GraduationCap size={20} className="text-emerald-600" weight="fill" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">Checkout</h1>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">Complete your purchase to start learning</p>
              </div>
            </div>

            {/* Order Summary */}
            <Card className="border-zinc-200 dark:border-zinc-800 mb-6 mt-6">
              <CardContent className="p-5">
                <h3 className="font-semibold text-zinc-900 dark:text-white mb-4">Order Summary</h3>
                <div className="flex items-start gap-4">
                  <div className="w-20 h-14 rounded-lg bg-zinc-100 dark:bg-zinc-800 overflow-hidden shrink-0">
                    <img src={course.image || ''} alt={course.title} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-zinc-900 dark:text-white">{course.title}</p>
                    {course.instructors?.[0]?.name && (
                      <p className="text-xs text-zinc-500">{course.instructors[0].name}</p>
                    )}
                    <div className="flex items-center gap-3 text-xs text-zinc-400 mt-1">
                      <span className="flex items-center gap-1"><Clock size={12} />{course.duration_hours || 0}h</span>
                      <span className="flex items-center gap-1"><PlayCircle size={12} />{course.total_lessons || 0} lessons</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-emerald-600">{formatCurrency(Number(course.price), course.currency || 'GHS')}</p>
                    {course.original_price && (
                      <p className="text-xs text-zinc-400 line-through">{formatCurrency(Number(course.original_price), course.currency || 'GHS')}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Account details */}
            <Card className="border-zinc-200 dark:border-zinc-800 mb-6">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-4">
                  {isLoggedIn ? <ShieldCheck size={18} className="text-emerald-600" /> : <UserIcon size={18} className="text-emerald-600" />}
                  <h3 className="font-semibold text-zinc-900 dark:text-white">
                    {isLoggedIn ? 'Signed in' : 'Create your account'}
                  </h3>
                  {!isLoggedIn && (
                    <Link to={ROUTES.login} className="ml-auto inline-flex items-center gap-1 text-xs font-medium text-emerald-600 hover:text-emerald-700">
                      <SignIn size={14} /> Already have an account? Sign in
                    </Link>
                  )}
                </div>
                <p className="text-xs text-zinc-500 mb-4">
                  {isLoggedIn
                    ? 'Your course will be linked to your account automatically.'
                    : 'We will create your account so you can access your course after payment. No card details are stored by us.'}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Full Name</label>
                    <div className="relative">
                      <UserIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Jane Doe"
                        className={inputCls}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Email Address</label>
                    <div className="relative">
                      <EnvelopeSimple size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                      <input
                        type="email"
                        value={userEmail}
                        onChange={(e) => setUserEmail(e.target.value)}
                        placeholder="your@email.com"
                        className={inputCls}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                      Phone <span className="text-zinc-400 font-normal">(optional)</span>
                    </label>
                    <div className="relative">
                      <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+233 20 000 0000"
                        className={inputCls}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                      Password <span className="text-zinc-400 font-normal">(for new accounts)</span>
                    </label>
                    <div className="relative">
                      <Key size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder={isLoggedIn ? 'Account ready' : 'Min. 6 characters'}
                        disabled={isLoggedIn}
                        className={`${inputCls} pr-10`}
                      />
                      {!isLoggedIn && (
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                        >
                          {showPassword ? <EyeSlash size={16} /> : <Eye size={16} />}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Payment Method Selection */}
            <Card className="border-zinc-200 dark:border-zinc-800">
              <CardContent className="p-5">
                <h3 className="font-semibold text-zinc-900 dark:text-white mb-4">Payment Method</h3>
                <div className="grid grid-cols-3 gap-3 mb-5">
                  {[
                    { value: 'card' as const, label: 'Card', icon: CreditCard },
                    { value: 'momo' as const, label: 'Mobile Money', icon: DeviceMobile },
                    { value: 'bank' as const, label: 'Bank Transfer', icon: Buildings },
                  ].map((method) => {
                    const Icon = method.icon;
                    return (
                      <button
                        key={method.value}
                        type="button"
                        onClick={() => setSelectedMethod(method.value)}
                        className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                          selectedMethod === method.value
                            ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                            : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
                        }`}
                      >
                        <Icon size={24} className={selectedMethod === method.value ? 'text-emerald-600' : 'text-zinc-400'} />
                        <span className={`text-xs font-medium ${selectedMethod === method.value ? 'text-emerald-700 dark:text-emerald-300' : 'text-zinc-500'}`}>
                          {method.label}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* MoMo provider selection */}
                {selectedMethod === 'momo' && (
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Mobile Network</label>
                    <div className="flex gap-2">
                      {['MTN', 'Vodafone', 'AirtelTigo'].map((net) => (
                        <Badge key={net} variant="secondary" className="cursor-pointer hover:bg-emerald-50 hover:text-emerald-700">
                          {net}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2 text-xs text-zinc-500 mb-4">
                  <Lock size={14} className="text-emerald-500" />
                  <span>Secure checkout powered by Paystack</span>
                </div>

                <Button
                  onClick={handlePayment}
                  disabled={processing || !userEmail || !fullName}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white h-11 gap-2"
                >
                  {processing ? (
                    <>
                      <Spinner size={16} className="animate-spin" /> Processing...
                    </>
                  ) : (
                    <>
                      Pay {formatCurrency(Number(course.price), course.currency || 'GHS')} <ArrowRight size={16} />
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Right: Price Breakdown */}
        <div className="lg:col-span-2">
          <motion.div variants={itemVariants}>
            <Card className="border-zinc-200 dark:border-zinc-800 sticky top-24">
              <CardContent className="p-5">
                <h3 className="font-semibold text-zinc-900 dark:text-white mb-4">Price Breakdown</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
                    <span>Course Price</span>
                    <span>{formatCurrency(Number(course.price), course.currency || 'GHS')}</span>
                  </div>
                  {discount > 0 && (
                    <div className="flex justify-between text-emerald-600">
                      <span>Discount</span>
                      <span>-{formatCurrency(discount, course.currency || 'GHS')}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
                    <span>Tax</span>
                    <span>GHS 0.00</span>
                  </div>
                  <div className="border-t border-zinc-200 dark:border-zinc-800 pt-2 mt-2 flex justify-between font-semibold text-zinc-900 dark:text-white">
                    <span>Total</span>
                    <span className="text-emerald-600">{formatCurrency(Number(course.price), course.currency || 'GHS')}</span>
                  </div>
                </div>

                <div className="mt-6 space-y-3">
                  <div className="flex items-center gap-2 text-xs text-zinc-500">
                    <Lock size={14} className="text-emerald-500" />
                    <span>Secure checkout powered by Paystack</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-zinc-500">
                    <Trophy size={14} className="text-emerald-500" />
                    <span>30-day money-back guarantee</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-zinc-500">
                    <Certificate size={14} className="text-emerald-500" />
                    <span>Certificate of completion</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-zinc-500">
                    <BookOpenText size={14} className="text-emerald-500" />
                    <span>Lifetime access once enrolled</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}

export function PaymentSuccessPage() {
  const { search } = useLocation();
  const navigate = useNavigate();
  const [verifying, setVerifying] = useState(true);
  const [verified, setVerified] = useState(false);
  const [alreadyProcessed, setAlreadyProcessed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [course, setCourse] = useState<CourseRow | null>(null);
  const ref = new URLSearchParams(search).get('ref') || '';

  useEffect(() => {
    async function verify() {
      if (!ref) {
        setVerifying(false);
        return;
      }
      const ctx = sessionStorage.getItem('nnh_checkout');
      let checkout: Record<string, string> = {};
      if (ctx) {
        try { checkout = JSON.parse(ctx) as Record<string, string>; } catch { /* ignore */ }
      }
      const session = await supabase.auth.getSession();
      const email = session.data.session?.user?.email || checkout.email || '';
      const fullName = checkout.fullName || '';
      const password = checkout.password || '';

      try {
        const result = await processPostPaymentEnrollment({
          courseId: checkout.courseId || '',
          email,
          fullName,
          password: password || undefined,
          phone: checkout.phone || undefined,
          paymentId: checkout.paymentId || null,
          reference: ref,
          amount: checkout.amount ? Number(checkout.amount) : undefined,
          currency: checkout.currency,
        });
        if (result.success) {
          setVerified(true);
          setAlreadyProcessed(!!result.alreadyProcessed);
          if (checkout.courseId) {
            const allCourses = await getPublishedCourses();
            const found = allCourses.find((c) => c.id === checkout.courseId);
            if (found) setCourse(found as unknown as CourseRow);
          }
          sessionStorage.removeItem('nnh_checkout');
        }
      } catch (err: any) {
        setError(err.message || 'We could not confirm your enrollment. Please contact support.');
        setVerifying(false);
        return;
      } finally {
        setVerifying(false);
      }
    }
    verify();
  }, [ref]);

  const goToCourses = () => navigate(ROUTES.studentCourses);

  if (error) {
    return (
      <div className="min-h-[calc(100dvh-4rem)] flex items-center justify-center px-4">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center max-w-md">
          <div className="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mx-auto mb-6">
            <XCircle size={36} className="text-amber-500" weight="fill" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white mb-2">Almost there</h1>
          <p className="text-zinc-500 dark:text-zinc-400 mb-6">{error}</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to={ROUTES.login}>
              <Button className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
                <SignIn size={16} /> Sign in to continue <ArrowRight size={16} />
              </Button>
            </Link>
            <Link to={ROUTES.courses}>
              <Button variant="outline">Browse Courses</Button>
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100dvh-4rem)] flex items-center justify-center px-4 py-12">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center max-w-lg w-full"
      >
        <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-6">
          {verifying ? (
            <Spinner size={36} className="animate-spin text-emerald-600" />
          ) : (
            <CheckCircle size={36} className="text-emerald-600" weight="fill" />
          )}
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white mb-2">
          {verifying ? 'Verifying Payment...' : 'You are enrolled!'}
        </h1>
        <p className="text-zinc-500 dark:text-zinc-400 mb-8">
          {verifying
            ? 'We are confirming your payment and creating your account. Please wait...'
            : alreadyProcessed
            ? 'This purchase was already confirmed. Your course access is ready.'
            : 'Thank you for your purchase. Your account and enrollment are ready.'}
        </p>

        {!verifying && course && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, ease: 'easeOut' as const }}>
            <Card className="border-zinc-200 dark:border-zinc-800 text-left mb-8">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="w-16 h-12 rounded-lg bg-zinc-100 dark:bg-zinc-800 overflow-hidden shrink-0">
                  <img src={course.image || ''} alt={course.title} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-zinc-900 dark:text-white truncate">{course.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border-0 text-xs">Enrolled</Badge>
                    <span className="text-xs text-zinc-400">{course.total_lessons || 0} lessons</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {!verifying && (
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button onClick={goToCourses} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
              Go to My Courses <ArrowRight size={16} />
            </Button>
            <Link to={ROUTES.studentDashboard}>
              <Button variant="outline">Go to Dashboard</Button>
            </Link>
          </div>
        )}
      </motion.div>
    </div>
  );
}

export function PaymentFailedPage() {
  return (
    <div className="min-h-[calc(100dvh-4rem)] flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center max-w-md"
      >
        <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-6">
          <XCircle size={36} className="text-red-500" weight="fill" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white mb-2">Payment Failed</h1>
        <p className="text-zinc-500 dark:text-zinc-400 mb-8">
          Something went wrong with your payment. Please try again or use a different payment method.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link to={ROUTES.courses}>
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
              Browse Courses <ArrowRight size={16} />
            </Button>
          </Link>
          <Link to={ROUTES.studentDashboard}>
            <Button variant="outline">Go to Dashboard</Button>
          </Link>
        </div>
      </motion.div>
    </div>
  );
}

export function PaymentCancelledPage() {
  return (
    <div className="min-h-[calc(100dvh-4rem)] flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center max-w-md"
      >
        <div className="w-16 h-16 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mx-auto mb-6">
          <XCircle size={36} className="text-zinc-400" weight="fill" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white mb-2">Payment Cancelled</h1>
        <p className="text-zinc-500 dark:text-zinc-400 mb-8">
          Your payment was cancelled. No charges have been made. You can try again whenever you're ready.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link to={ROUTES.courses}>
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
              Browse Courses <ArrowRight size={16} />
            </Button>
          </Link>
          <Link to={ROUTES.home}>
            <Button variant="outline">Go Home</Button>
          </Link>
        </div>
      </motion.div>
    </div>
  );
}