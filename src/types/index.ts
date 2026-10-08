export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role: 'student' | 'admin';
  enrolledCourseIds: string[];
  joinedAt: string;
  /** Phone number shown only to admins — never in student-facing UI */
  phone?: string;
  /** Student location (city, country) */
  location?: string;
  /** Account state — used by admins to suspend/restore access */
  status?: 'active' | 'suspended';
}

export interface Course {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  longDescription: string;
  category: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  price: number;
  originalPrice?: number;
  image: string;
  instructor: Instructor;
  duration: string;
  totalLessons: number;
  totalModules: number;
  rating: number;
  studentCount: number;
  tags: string[];
  skills: string[];
  curriculum: Module[];
  featured?: boolean;
  publishedAt: string;
}

export interface Instructor {
  id: string;
  name: string;
  avatar: string;
  bio: string;
  title: string;
}

export interface Module {
  id: string;
  title: string;
  description: string;
  lessons: Lesson[];
  duration: string;
}

export interface Lesson {
  id: string;
  title: string;
  description: string;
  duration: string;
  videoUrl?: string;
  type: 'video' | 'reading' | 'quiz' | 'assignment';
  content?: string;
  completed?: boolean;
}

export interface Quiz {
  id: string;
  courseId: string;
  moduleId: string;
  title: string;
  description: string;
  timeLimit: number;
  passingScore: number;
  questions: Question[];
}

export interface Question {
  id: string;
  text: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface Assignment {
  id: string;
  courseId: string;
  moduleId: string;
  title: string;
  description: string;
  dueDate: string;
  maxScore: number;
  submissions?: AssignmentSubmission[];
}

export interface AssignmentSubmission {
  id: string;
  studentId: string;
  assignmentId: string;
  content: string;
  submittedAt: string;
  score?: number;
  feedback?: string;
  status: 'submitted' | 'graded' | 'late';
}

export interface Enrollment {
  id: string;
  userId: string;
  courseId: string;
  enrolledAt: string;
  progress: number;
  completedLessons: string[];
  completedAt?: string;
  certificateUrl?: string;
  /** Standardized enrollment status: active | completed | suspended | cancelled | refunded */
  status?: 'active' | 'completed' | 'suspended' | 'cancelled' | 'refunded';
  paymentId?: string;
}

export interface PaymentTransaction {
  id: string;
  userId: string;
  courseId: string;
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  method: string;
  createdAt: string;
}

export interface Certificate {
  id: string;
  userId: string;
  courseId: string;
  issuedAt: string;
  certificateId: string;
  studentName: string;
  courseName: string;
}

export interface QuizResult {
  id: string;
  userId: string;
  quizId: string;
  score: number;
  total: number;
  answers: number[];
  completedAt: string;
  passed: boolean;
}

export type AuthMode = 'guest' | 'student' | 'admin';

export interface NavItem {
  label: string;
  path: string;
  icon: string;
  badge?: number;
}

export type RouteGroup = 'public' | 'student' | 'admin' | 'payment';