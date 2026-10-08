import { lazy, Suspense, useEffect, Component, type ErrorInfo, type ReactNode } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Spinner } from '@phosphor-icons/react';
import { AuthProvider } from '@/contexts/AuthContext';
import { PublicLayout } from '@/layouts/PublicLayout';
import { StudentLayout } from '@/layouts/StudentLayout';
import { AdminLayout } from '@/layouts/AdminLayout';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { ROUTES } from '@/constants/navigation';

// ── Phase 20: Route-level code splitting ───────────────────────────────
// Each page module becomes its own chunk, loaded on demand. This keeps the
// initial bundle small and dramatically improves homepage / dashboard TTI.
const HomePage = lazy(() => import('@/pages/HomePage').then((m) => ({ default: m.HomePage })));
const CoursesPage = lazy(() => import('@/pages/CoursesPages').then((m) => ({ default: m.CoursesPage })));
const CourseDetailPage = lazy(() => import('@/pages/CoursesPages').then((m) => ({ default: m.CourseDetailPage })));
const LoginPage = lazy(() => import('@/pages/AuthPages').then((m) => ({ default: m.LoginPage })));
const RegisterPage = lazy(() => import('@/pages/AuthPages').then((m) => ({ default: m.RegisterPage })));
const ForgotPasswordPage = lazy(() => import('@/pages/AuthPages').then((m) => ({ default: m.ForgotPasswordPage })));
const CheckoutPage = lazy(() => import('@/pages/PaymentPages').then((m) => ({ default: m.CheckoutPage })));
const PaymentSuccessPage = lazy(() => import('@/pages/PaymentPages').then((m) => ({ default: m.PaymentSuccessPage })));
const PaymentFailedPage = lazy(() => import('@/pages/PaymentPages').then((m) => ({ default: m.PaymentFailedPage })));
const PaymentCancelledPage = lazy(() => import('@/pages/PaymentPages').then((m) => ({ default: m.PaymentCancelledPage })));
const StudentDashboard = lazy(() => import('@/pages/StudentDashboardPage').then((m) => ({ default: m.StudentDashboard })));
const StudentCoursesPage = lazy(() => import('@/pages/StudentDashboardPage').then((m) => ({ default: m.StudentCoursesPage })));
const StudentLessonPage = lazy(() => import('@/pages/StudentLessonPage').then((m) => ({ default: m.StudentLessonPage })));
const StudentAssignmentsPage = lazy(() => import('@/pages/StudentPages').then((m) => ({ default: m.StudentAssignmentsPage })));
const StudentQuizzesPage = lazy(() => import('@/pages/StudentPages').then((m) => ({ default: m.StudentQuizzesPage })));
const StudentResultsPage = lazy(() => import('@/pages/StudentPages').then((m) => ({ default: m.StudentResultsPage })));
const StudentCertificatesPage = lazy(() => import('@/pages/StudentPages').then((m) => ({ default: m.StudentCertificatesPage })));
const StudentNotificationsPage = lazy(() => import('@/pages/StudentPages').then((m) => ({ default: m.StudentNotificationsPage })));
const StudentProfilePage = lazy(() => import('@/pages/StudentProfilePage'));
const StudentSettingsPage = lazy(() => import('@/pages/StudentPages').then((m) => ({ default: m.StudentSettingsPage })));
const AdminDashboard = lazy(() => import('@/pages/AdminPages').then((m) => ({ default: m.AdminDashboard })));
const AdminStudentsPage = lazy(() => import('@/pages/AdminPages').then((m) => ({ default: m.AdminStudentsPage })));
const AdminCoursesPage = lazy(() => import('@/pages/AdminPages').then((m) => ({ default: m.AdminCoursesPage })));
const AdminCourseForm = lazy(() => import('@/pages/AdminPages').then((m) => ({ default: m.AdminCourseForm })));
const AdminPaymentsPage = lazy(() => import('@/pages/AdminPages').then((m) => ({ default: m.AdminPaymentsPage })));
const AdminEnrollmentsPage = lazy(() => import('@/pages/AdminPages').then((m) => ({ default: m.AdminEnrollmentsPage })));
const AdminCategoriesPage = lazy(() => import('@/pages/AdminCategoriesPage').then((m) => ({ default: m.AdminCategoriesPage })));
const AdminInstructorsPage = lazy(() => import('@/pages/AdminInstructorsPage').then((m) => ({ default: m.AdminInstructorsPage })));
const AdminAnalyticsPage = lazy(() => import('@/pages/AdminPages').then((m) => ({ default: m.AdminAnalyticsPage })));
const CourseBuilderPage = lazy(() => import('@/pages/CourseBuilderPage').then((m) => ({ default: m.CourseBuilderPage })));
const AdminAnnouncementsPage = lazy(() => import('@/pages/AdminAnnouncementsPage').then((m) => ({ default: m.AdminAnnouncementsPage })));
const AdminAssignmentsPage = lazy(() => import('@/pages/AdminAssessmentPages').then((m) => ({ default: m.AdminAssignmentsPage })));
const AdminQuizzesPage = lazy(() => import('@/pages/AdminAssessmentPages').then((m) => ({ default: m.AdminQuizzesPage })));
const StudentQuizRunner = lazy(() => import('@/pages/StudentAssessmentPages').then((m) => ({ default: m.StudentQuizRunner })));
const CertificateVerifyPage = lazy(() => import('@/pages/CertificatePages').then((m) => ({ default: m.CertificateVerifyPage })));
const AdminCertificatesPage = lazy(() => import('@/pages/CertificatePages').then((m) => ({ default: m.AdminCertificatesPage })));
const AdminAuditPage = lazy(() => import('@/pages/AdminAuditPage').then((m) => ({ default: m.AdminAuditPage })));
const AdminSecurityPage = lazy(() => import('@/pages/AdminSecurityPage').then((m) => ({ default: m.AdminSecurityPage })));
const AboutPage = lazy(() => import('@/components/StaticPages').then((m) => ({ default: m.AboutPage })));
const ContactPage = lazy(() => import('@/components/ContactPage').then((m) => ({ default: m.ContactPage })));

export function NotFoundPage() {
  return (
    <div className="relative flex min-h-[calc(100dvh-4rem)] flex-col items-center justify-center overflow-hidden px-4 text-center">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-gradient-to-br from-emerald-500/20 to-green-600/20 blur-3xl"
      />
      <p className="mb-3 text-sm font-semibold uppercase tracking-[0.3em] text-emerald-500">Error 404</p>
      <h1 className="mb-4 bg-gradient-to-r from-emerald-500 to-green-600 bg-clip-text text-7xl font-black text-transparent">
        404
      </h1>
      <p className="mb-8 max-w-sm text-zinc-500 dark:text-zinc-400">
        The page you are looking for doesn&apos;t exist or has been moved.
      </p>
      <a
        href={ROUTES.home}
        className="rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-600/25 transition hover:bg-emerald-700"
      >
        Back to Home
      </a>
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="flex min-h-[calc(100dvh-4rem)] flex-col items-center justify-center gap-3">
      <Spinner size={32} className="animate-spin text-emerald-500" />
      <p className="text-sm font-medium text-zinc-400">Loading…</p>
    </div>
  );
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route element={<PublicLayout />}>
        <Route path={ROUTES.home} element={<HomePage />} />
        <Route path={ROUTES.courses} element={<CoursesPage />} />
        <Route path={ROUTES.courseDetail} element={<CourseDetailPage />} />
        <Route path={ROUTES.about} element={<AboutPage />} />
        <Route path={ROUTES.contact} element={<ContactPage />} />
        <Route path={ROUTES.login} element={<LoginPage />} />
        <Route path={ROUTES.register} element={<RegisterPage />} />
        <Route path={ROUTES.forgotPassword} element={<ForgotPasswordPage />} />
        <Route path={ROUTES.checkout} element={<CheckoutPage />} />
        <Route path={ROUTES.paymentSuccess} element={<PaymentSuccessPage />} />
        <Route path={ROUTES.paymentFailed} element={<PaymentFailedPage />} />
        <Route path={ROUTES.paymentCancelled} element={<PaymentCancelledPage />} />
        <Route path="verify-certificate/:code" element={<CertificateVerifyPage />} />
      </Route>

      {/* Student */}
      <Route
        path="/student"
        element={
          <ProtectedRoute requiredRole="student" layout={StudentLayout} />
        }
      >
        <Route index element={<Navigate to={ROUTES.studentDashboard} replace />} />
        <Route path="dashboard" element={<StudentDashboard />} />
        <Route path="courses" element={<StudentCoursesPage />} />
        <Route path="courses/:courseId/lessons" element={<StudentLessonPage />} />
        <Route path="assignments" element={<StudentAssignmentsPage />} />
        <Route path="assignments/:assignmentId" element={<StudentAssignmentsPage />} />
        <Route path="quizzes" element={<StudentQuizzesPage />} />
        <Route path="quizzes/:quizId/take" element={<StudentQuizRunner />} />
        <Route path="quizzes/:quizId/result" element={<StudentResultsPage />} />
        <Route path="results" element={<StudentResultsPage />} />
        <Route path="certificates" element={<StudentCertificatesPage />} />
        <Route path="notifications" element={<StudentNotificationsPage />} />
        <Route path="profile" element={<StudentProfilePage />} />
        <Route path="settings" element={<StudentSettingsPage />} />
      </Route>

      {/* Admin */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute requiredRole="admin" layout={AdminLayout} />
        }
      >
        <Route index element={<Navigate to={ROUTES.adminDashboard} replace />} />
        <Route path="dashboard" element={<AdminDashboard />} />
        <Route path="students" element={<AdminStudentsPage />} />
        <Route path="courses" element={<AdminCoursesPage />} />
        <Route path="courses/new" element={<AdminCourseForm />} />
        <Route path="courses/:courseId" element={<AdminCourseForm />} />
        <Route path="courses/:courseId/builder" element={<CourseBuilderPage />} />
        <Route path="assignments" element={<AdminAssignmentsPage />} />
        <Route path="assignments/new" element={<AdminAssignmentsPage />} />
        <Route path="assignments/:assignmentId" element={<AdminAssignmentsPage />} />
        <Route path="quizzes" element={<AdminQuizzesPage />} />
        <Route path="quizzes/new" element={<AdminQuizzesPage />} />
        <Route path="quizzes/:quizId" element={<AdminQuizzesPage />} />
        <Route path="grading" element={<AdminAssignmentsPage />} />
        <Route path="announcements" element={<AdminAnnouncementsPage />} />
        <Route path="certificates" element={<AdminCertificatesPage />} />
        <Route path="payments" element={<AdminPaymentsPage />} />
        <Route path="audit" element={<AdminAuditPage />} />
        <Route path="security" element={<AdminSecurityPage />} />
        <Route path="enrollments" element={<AdminEnrollmentsPage />} />
        <Route path="categories" element={<AdminCategoriesPage />} />
        <Route path="instructors" element={<AdminInstructorsPage />} />
        <Route path="reports" element={<AdminAnalyticsPage />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; message: string }> {
  state = { hasError: false, message: '' };
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, message: error.message };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('App render error:', error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 px-4 text-center">
          <p className="text-lg font-semibold text-zinc-900 dark:text-white">Something went wrong</p>
          <p className="text-sm text-zinc-500">{this.state.message || 'An unexpected error occurred.'}</p>
          <button
            onClick={() => { this.setState({ hasError: false, message: '' }); window.location.reload(); }}
            className="mt-2 rounded-md bg-emerald-600 px-5 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ScrollToTop />
        <ErrorBoundary>
          <Suspense fallback={<LoadingFallback />}>
            <AppRoutes />
          </Suspense>
        </ErrorBoundary>
      </AuthProvider>
    </BrowserRouter>
  );
}