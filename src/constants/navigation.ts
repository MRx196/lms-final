import type { NavItem, User } from '@/types';

export const BRAND_NAME = 'LMS';
export const BRAND_TAGLINE = 'Learn. Grow. Succeed.';
export const BRAND_EMAIL = 'hello@lms.com';

export const ROUTES = {
  home: '/',
  courses: '/courses',
  courseDetail: '/courses/:slug',
  about: '/about',
  contact: '/contact',
  login: '/login',
  register: '/register',
  forgotPassword: '/forgot-password',
  checkout: '/checkout/:courseId',
  paymentSuccess: '/payment/success',
  paymentFailed: '/payment/failed',
  paymentCancelled: '/payment/cancelled',
  studentDashboard: '/student/dashboard',
  studentCourses: '/student/courses',
  studentLesson: '/student/courses/:courseId/lessons',
  studentAssignments: '/student/assignments',
  studentAssignmentDetail: '/student/assignments/:assignmentId',
  studentQuizzes: '/student/quizzes',
  studentQuizTaking: '/student/quizzes/:quizId/take',
  studentQuizResult: '/student/quizzes/:quizId/result',
  studentResults: '/student/results',
  studentCertificates: '/student/certificates',
  studentNotifications: '/student/notifications',
  studentProfile: '/student/profile',
  studentSettings: '/student/settings',
  adminDashboard: '/admin/dashboard',
  adminStudents: '/admin/students',
  adminCourses: '/admin/courses',
  adminCourseNew: '/admin/courses/new',
  adminCourseEditor: '/admin/courses/:courseId',
  adminCourseBuilder: '/admin/courses/:courseId/builder',
  adminAssignments: '/admin/assignments',
  adminAssignmentNew: '/admin/assignments/new',
  adminAssignmentEdit: '/admin/assignments/:assignmentId',
  adminQuizzes: '/admin/quizzes',
  adminQuizNew: '/admin/quizzes/new',
  adminQuizEdit: '/admin/quizzes/:quizId',
  adminGrading: '/admin/grading',
  adminCertificates: '/admin/certificates',
  adminEnrollments: '/admin/enrollments',
  adminPayments: '/admin/payments',
  adminAudit: '/admin/audit',
  adminSecurity: '/admin/security',
  adminReports: '/admin/reports',
  adminAnnouncements: '/admin/announcements',
  adminSettings: '/admin/settings',
  notFound: '/404',
} as const;

export const publicNavItems: NavItem[] = [
  { label: 'Home', path: ROUTES.home, icon: 'House' },
  { label: 'Courses', path: ROUTES.courses, icon: 'BookOpen' },
  { label: 'About', path: ROUTES.about, icon: 'Info' },
  { label: 'Contact', path: ROUTES.contact, icon: 'Envelope' },
];

export const studentNavItems: NavItem[] = [
  { label: 'Dashboard', path: ROUTES.studentDashboard, icon: 'House' },
  { label: 'My Courses', path: ROUTES.studentCourses, icon: 'BookOpen' },
  { label: 'Assignments', path: ROUTES.studentAssignments, icon: 'ClipboardText' },
  { label: 'Quizzes', path: ROUTES.studentQuizzes, icon: 'Exam' },
  { label: 'Results', path: ROUTES.studentResults, icon: 'ChartBar' },
  { label: 'Certificates', path: ROUTES.studentCertificates, icon: 'Certificate' },
  { label: 'Notifications', path: ROUTES.studentNotifications, icon: 'Bell' },
  { label: 'Profile', path: ROUTES.studentProfile, icon: 'User' },
  { label: 'Settings', path: ROUTES.studentSettings, icon: 'GearSix' },
];

export const adminNavItems: NavItem[] = [
  { label: 'Dashboard', path: ROUTES.adminDashboard, icon: 'House' },
  { label: 'Students', path: ROUTES.adminStudents, icon: 'Users' },
  { label: 'Courses', path: ROUTES.adminCourses, icon: 'BookOpen' },
  { label: 'Assignments', path: ROUTES.adminAssignments, icon: 'ClipboardText' },
  { label: 'Quizzes', path: ROUTES.adminQuizzes, icon: 'Exam' },
  { label: 'Grading', path: ROUTES.adminGrading, icon: 'PencilSimpleLine' },
  { label: 'Certificates', path: ROUTES.adminCertificates, icon: 'Certificate' },
  { label: 'Announcements', path: ROUTES.adminAnnouncements, icon: 'Megaphone' },
  { label: 'Enrollments', path: ROUTES.adminEnrollments, icon: 'GraduationCap' },
  { label: 'Payments', path: ROUTES.adminPayments, icon: 'Wallet' },
  { label: 'Audit Trail', path: ROUTES.adminAudit, icon: 'Scroll' },
  { label: 'Security', path: ROUTES.adminSecurity, icon: 'ShieldCheck' },
  { label: 'Reports', path: ROUTES.adminReports, icon: 'ChartLine' },
  { label: 'Settings', path: ROUTES.adminSettings, icon: 'GearSix' },
];

export const CATEGORIES = [
  'Web Development',
  'Data Science',
  'Design',
  'Business',
  'Marketing',
  'Cloud & DevOps',
  'Mobile Development',
  'AI & Machine Learning',
] as const;

// Re-export User type for convenience
export type { User } from '@/types';