import type { Course, User, Enrollment, PaymentTransaction, Quiz, Assignment, AssignmentSubmission, QuizResult, Certificate } from './types';

export const MOCK_USERS: User[] = [
  { id: 'student-1', email: 'student@demo.com', name: 'Alex Rivera', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alex', role: 'student', enrolledCourseIds: ['course-1', 'course-2', 'course-3'], joinedAt: '2025-01-15', phone: '+1 (415) 555-0132', location: 'San Francisco, USA', status: 'active' },
  { id: 'student-2', email: 'liam.zhang@example.com', name: 'Liam Zhang', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Liam', role: 'student', enrolledCourseIds: ['course-1', 'course-4'], joinedAt: '2025-02-08', phone: '+44 20 7946 0917', location: 'London, UK', status: 'active' },
  { id: 'student-3', email: 'elena.rostova@example.com', name: 'Elena Rostova', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Elena', role: 'student', enrolledCourseIds: ['course-2'], joinedAt: '2024-11-19', phone: '+49 30 901820', location: 'Berlin, Germany', status: 'active' },
  { id: 'student-4', email: 'marcus.vance@example.com', name: 'Marcus Vance', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=MarcusV', role: 'student', enrolledCourseIds: ['course-6'], joinedAt: '2025-04-02', phone: '+1 (512) 555-0188', location: 'Austin, USA', status: 'active' },
  { id: 'admin-1', email: 'admin@demo.com', name: 'Dr. Sarah Chen', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah', role: 'admin', enrolledCourseIds: [], joinedAt: '2024-09-01' },
];

const inst1 = { id: 'inst-1', name: 'Marcus Johnson', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Marcus', bio: 'Senior Frontend Engineer at TechCorp with 8+ years of React experience.', title: 'Senior Frontend Engineer' };
const inst2 = { id: 'inst-2', name: 'Dr. Emily Park', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Emily', bio: 'Data scientist with a PhD in Statistics.', title: 'Lead Data Scientist' };
const inst3 = { id: 'inst-3', name: 'Sophia Williams', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sophia', bio: 'Product designer at Airbnb.', title: 'Senior Product Designer' };
const inst4 = { id: 'inst-4', name: 'Raj Patel', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Raj', bio: 'AWS Hero and DevOps consultant.', title: 'Cloud Architect' };
const inst5 = { id: 'inst-5', name: 'Jessica Kim', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Jessica', bio: 'Marketing director at a Fortune 500 company.', title: 'Marketing Director' };
const inst6 = { id: 'inst-6', name: 'Dr. James Liu', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=James', bio: 'ML researcher at NeurIPS and ICML.', title: 'AI Research Scientist' };

const v = (id: string, title: string, desc: string, dur: string, type: 'video' | 'reading' | 'quiz' | 'assignment', vid?: string) =>
  ({ id, title, description: desc, duration: dur, type, videoUrl: vid || '#', completed: false });

const mod = (id: string, title: string, desc: string, dur: string, lessons: any[]) =>
  ({ id, title, description: desc, duration: dur, lessons });

export const SEED_COURSES: Course[] = [
  { id: 'course-1', slug: 'react-mastery-2025', title: 'React Mastery 2025', subtitle: 'Build production-ready React applications', description: 'Master React from fundamentals to advanced patterns.', longDescription: 'Learn component architecture, hooks, context API, React Query, testing, and deployment. Build multiple real-world projects.', category: 'Web Development', level: 'intermediate', price: 89.99, originalPrice: 149.99, image: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=800&q=80', instructor: inst1, duration: '24 hours', totalLessons: 48, totalModules: 6, rating: 4.8, studentCount: 3420, tags: ['React', 'TypeScript', 'Frontend'], skills: ['React Hooks', 'State Management', 'Testing', 'Deployment'],
    curriculum: [
      mod('mod-1-1', 'React Fundamentals', 'Core concepts and modern React patterns', '4 hours', [
        v('l1-1', 'JSX & Component Architecture', 'Understanding JSX and building reusable components', '45 min', 'video'),
        v('l1-2', 'Props & State Deep Dive', 'Managing component data flow', '50 min', 'video'),
        v('l1-3', 'React Hooks in Practice', 'useState, useEffect, useRef, and custom hooks', '60 min', 'video'),
        v('l1-4', 'Module 1 Quiz', 'Test your React fundamentals knowledge', '15 min', 'quiz'),
      ]),
      mod('mod-1-2', 'Advanced State Management', 'Context API, Reducers, and React Query', '5 hours', [
        v('l2-1', 'Context API & useReducer', 'Global state without external libraries', '55 min', 'video'),
        v('l2-2', 'React Query for Server State', 'Data fetching, caching, and mutations', '60 min', 'video'),
        v('l2-3', 'Zustand for Client State', 'Lightweight state management', '40 min', 'video'),
        v('l2-4', 'Module 2 Assignment', 'Build a state management solution', '90 min', 'assignment'),
      ]),
      mod('mod-1-3', 'Testing & Deployment', 'Vitest, CI/CD, and deployment strategies', '4 hours', [
        v('l3-1', 'Unit Testing with Vitest', 'Writing testable React components', '50 min', 'video'),
        v('l3-2', 'Integration Testing', 'Testing component interactions', '45 min', 'video'),
        v('l3-3', 'Module 3 Quiz', 'Testing concepts assessment', '15 min', 'quiz'),
      ]),
    ], featured: true, publishedAt: '2025-01-10' },
  { id: 'course-2', slug: 'python-data-science', title: 'Python for Data Science', subtitle: 'From zero to data-driven insights', description: 'Learn Python, pandas, NumPy, and data visualization.', longDescription: 'Covers Python basics to advanced data analysis with pandas, NumPy, Matplotlib, and Seaborn. Work with real datasets.', category: 'Data Science', level: 'beginner', price: 69.99, originalPrice: 129.99, image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&q=80', instructor: inst2, duration: '30 hours', totalLessons: 56, totalModules: 7, rating: 4.7, studentCount: 5210, tags: ['Python', 'Data Science', 'Analytics'], skills: ['Python', 'pandas', 'NumPy', 'Visualization'],
    curriculum: [
      mod('mod-2-1', 'Python Foundations', 'Getting started with Python programming', '5 hours', [
        v('l2-1-1', 'Python Basics & Setup', 'Installing Python and writing your first script', '45 min', 'video'),
        v('l2-1-2', 'Data Structures in Python', 'Lists, dicts, sets, and tuples', '55 min', 'video'),
        v('l2-1-3', 'Functions & Modules', 'Writing reusable code', '50 min', 'video'),
        v('l2-1-4', 'Python Fundamentals Quiz', 'Test your Python knowledge', '15 min', 'quiz'),
      ]),
      mod('mod-2-2', 'Data Analysis with pandas', 'Manipulating and analyzing data', '6 hours', [
        v('l2-2-1', 'Introduction to pandas', 'Series, DataFrames, and basic operations', '60 min', 'video'),
        v('l2-2-2', 'Data Cleaning Techniques', 'Handling missing data and outliers', '55 min', 'video'),
        v('l2-2-3', 'Grouping & Aggregation', 'Split-apply-combine patterns', '50 min', 'video'),
        v('l2-2-4', 'Data Analysis Assignment', 'Clean and analyze a real dataset', '90 min', 'assignment'),
      ]),
    ], featured: true, publishedAt: '2025-02-01' },
  { id: 'course-3', slug: 'ui-ux-design-fundamentals', title: 'UI/UX Design Fundamentals', subtitle: 'Design beautiful, user-centered products', description: 'Master design thinking, wireframing, prototyping, and user research.', longDescription: 'Learn the complete UI/UX design process from user research to high-fidelity prototypes using Figma.', category: 'Design', level: 'beginner', price: 59.99, originalPrice: 99.99, image: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=800&q=80', instructor: inst3, duration: '20 hours', totalLessons: 40, totalModules: 5, rating: 4.9, studentCount: 2890, tags: ['Design', 'Figma', 'UX Research'], skills: ['Figma', 'Wireframing', 'Prototyping', 'User Research'],
    curriculum: [
      mod('mod-3-1', 'Design Thinking Process', 'Empathize, define, ideate, prototype, test', '4 hours', [
        v('l3-1-1', 'What is Design Thinking?', 'Understanding the design thinking framework', '45 min', 'video'),
        v('l3-1-2', 'User Research Methods', 'Interviews, surveys, and usability testing', '55 min', 'video'),
        v('l3-1-3', 'Design Thinking Quiz', 'Test your understanding', '15 min', 'quiz'),
      ]),
    ], featured: true, publishedAt: '2025-01-20' },
  { id: 'course-4', slug: 'aws-cloud-architect', title: 'AWS Cloud Architect', subtitle: 'Design and deploy scalable cloud infrastructure', description: 'Prepare for AWS Solutions Architect certification.', longDescription: 'Covers EC2, S3, Lambda, RDS, VPC, IAM, and CloudFormation with hands-on labs.', category: 'Cloud & DevOps', level: 'advanced', price: 129.99, image: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&q=80', instructor: inst4, duration: '35 hours', totalLessons: 64, totalModules: 8, rating: 4.6, studentCount: 1870, tags: ['AWS', 'Cloud', 'DevOps'], skills: ['EC2', 'S3', 'Lambda', 'CloudFormation'],
    curriculum: [
      mod('mod-4-1', 'AWS Fundamentals', 'Core AWS services and global infrastructure', '5 hours', [
        v('l4-1-1', 'AWS Global Infrastructure', 'Regions, AZs, and edge locations', '45 min', 'video'),
        v('l4-1-2', 'IAM & Security', 'Users, roles, policies, and best practices', '60 min', 'video'),
        v('l4-1-3', 'AWS Fundamentals Quiz', 'Core AWS concepts', '15 min', 'quiz'),
      ]),
    ], publishedAt: '2025-03-01' },
  { id: 'course-5', slug: 'digital-marketing-strategy', title: 'Digital Marketing Strategy', subtitle: 'Grow your brand with data-driven marketing', description: 'SEO, content marketing, social media, and paid ads.', longDescription: 'Master SEO, content marketing, social media, email marketing, Google Ads, and analytics with real case studies.', category: 'Marketing', level: 'intermediate', price: 49.99, originalPrice: 89.99, image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80', instructor: inst5, duration: '18 hours', totalLessons: 36, totalModules: 5, rating: 4.5, studentCount: 4150, tags: ['Marketing', 'SEO', 'Social Media'], skills: ['SEO', 'Content Marketing', 'Google Ads', 'Analytics'],
    curriculum: [
      mod('mod-5-1', 'Marketing Foundations', 'Core marketing principles and strategy', '4 hours', [
        v('l5-1-1', 'Marketing in the Digital Age', 'Understanding the modern marketing landscape', '45 min', 'video'),
        v('l5-1-2', 'Building a Marketing Strategy', 'Goal setting, audience, and channels', '55 min', 'video'),
        v('l5-1-3', 'Marketing Strategy Quiz', 'Test your strategy knowledge', '15 min', 'quiz'),
      ]),
    ], featured: true, publishedAt: '2025-02-15' },
  { id: 'course-6', slug: 'machine-learning-bootcamp', title: 'Machine Learning Bootcamp', subtitle: 'Build ML models from scratch with Python', description: 'Supervised/unsupervised learning, neural networks, deployment.', longDescription: 'Covers regression, classification, trees, clustering, neural networks with TensorFlow, and model deployment with FastAPI.', category: 'AI & Machine Learning', level: 'intermediate', price: 99.99, originalPrice: 179.99, image: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800&q=80', instructor: inst6, duration: '40 hours', totalLessons: 72, totalModules: 9, rating: 4.9, studentCount: 2380, tags: ['Machine Learning', 'Python', 'AI'], skills: ['Scikit-learn', 'TensorFlow', 'Model Deployment', 'Statistics'],
    curriculum: [
      mod('mod-6-1', 'ML Fundamentals', 'Core concepts in machine learning', '5 hours', [
        v('l6-1-1', 'What is Machine Learning?', 'Types of ML and the ML workflow', '45 min', 'video'),
        v('l6-1-2', 'Data Preprocessing', 'Cleaning, scaling, and splitting data', '55 min', 'video'),
        v('l6-1-3', 'ML Fundamentals Quiz', 'Core ML concepts', '15 min', 'quiz'),
      ]),
    ], featured: true, publishedAt: '2025-03-10' },
];

export const MOCK_ENROLLMENTS: Enrollment[] = [
  { id: 'enroll-1', userId: 'student-1', courseId: 'course-1', enrolledAt: '2025-02-01', progress: 45, completedLessons: ['l1-1', 'l1-2', 'l1-3'], completedAt: undefined, certificateUrl: undefined },
  { id: 'enroll-2', userId: 'student-1', courseId: 'course-2', enrolledAt: '2025-01-15', progress: 72, completedLessons: ['l2-1-1', 'l2-1-2', 'l2-1-3', 'l2-1-4', 'l2-2-1'], completedAt: undefined, certificateUrl: undefined },
  { id: 'enroll-3', userId: 'student-1', courseId: 'course-3', enrolledAt: '2025-03-01', progress: 100, completedLessons: ['l3-1-1', 'l3-1-2', 'l3-1-3'], completedAt: '2025-03-20', certificateUrl: '#' },
  { id: 'enroll-4', userId: 'student-2', courseId: 'course-1', enrolledAt: '2025-02-20', progress: 100, completedLessons: ['l1-1', 'l1-2', 'l1-3', 'l1-4', 'l2-1', 'l2-2', 'l2-3', 'l2-4', 'l3-1', 'l3-2', 'l3-3'], completedAt: '2025-05-04', certificateUrl: '#' },
  { id: 'enroll-5', userId: 'student-2', courseId: 'course-4', enrolledAt: '2025-05-10', progress: 18, completedLessons: ['l4-1-1'], completedAt: undefined, certificateUrl: undefined },
  { id: 'enroll-6', userId: 'student-3', courseId: 'course-2', enrolledAt: '2024-12-01', progress: 64, completedLessons: ['l2-1-1', 'l2-1-2', 'l2-1-3', 'l2-1-4'], completedAt: undefined, certificateUrl: undefined },
  { id: 'enroll-7', userId: 'student-4', courseId: 'course-6', enrolledAt: '2025-04-05', progress: 12, completedLessons: ['l6-1-1'], completedAt: undefined, certificateUrl: undefined },
];

export const MOCK_QUIZZES: Quiz[] = [
  { id: 'quiz-1', courseId: 'course-1', moduleId: 'mod-1-1', title: 'React Fundamentals Quiz', description: 'Test your knowledge of React core concepts', timeLimit: 15, passingScore: 70, questions: [
    { id: 'q1', text: 'What is JSX?', options: ['A JavaScript extension for XML', 'A templating language', 'A CSS framework', 'A database query language'], correctIndex: 0, explanation: 'JSX is a syntax extension for JavaScript that looks like XML/HTML.' },
    { id: 'q2', text: 'Which hook is used for side effects?', options: ['useState', 'useEffect', 'useContext', 'useReducer'], correctIndex: 1, explanation: 'useEffect is used for side effects like data fetching and subscriptions.' },
    { id: 'q3', text: 'What does the key prop do in lists?', options: ['Adds styling', 'Helps React identify changed items', 'Sets the list order', 'Defines the list type'], correctIndex: 1, explanation: 'Keys help React identify which items have changed.' },
  ]},
  { id: 'quiz-2', courseId: 'course-2', moduleId: 'mod-2-1', title: 'Python Fundamentals Quiz', description: 'Test your Python basics', timeLimit: 15, passingScore: 70, questions: [
    { id: 'q2-1', text: 'Which data type is immutable?', options: ['List', 'Dict', 'Tuple', 'Set'], correctIndex: 2, explanation: 'Tuples are immutable sequences in Python.' },
    { id: 'q2-2', text: 'What does len() return?', options: ['The length of an object', 'The last element', 'The largest element', 'The type'], correctIndex: 0, explanation: 'len() returns the number of items in an object.' },
  ]},
];

export const MOCK_QUIZ_RESULTS: QuizResult[] = [
  { id: 'qr-1', userId: 'student-1', quizId: 'quiz-1', score: 2, total: 3, answers: [0, 1, 1], completedAt: '2025-02-10T14:30:00Z', passed: true },
  { id: 'qr-2', userId: 'student-1', quizId: 'quiz-2', score: 2, total: 2, answers: [2, 0], completedAt: '2025-02-14T11:00:00Z', passed: true },
  { id: 'qr-3', userId: 'student-2', quizId: 'quiz-1', score: 3, total: 3, answers: [0, 1, 1], completedAt: '2025-03-22T09:15:00Z', passed: true },
  { id: 'qr-4', userId: 'student-3', quizId: 'quiz-2', score: 1, total: 2, answers: [1, 0], completedAt: '2025-01-05T16:45:00Z', passed: false },
];

export const MOCK_ASSIGNMENTS: Assignment[] = [
  { id: 'assign-1', courseId: 'course-1', moduleId: 'mod-1-2', title: 'State Management Solution', description: 'Build a global state management system using Context API and useReducer for a shopping cart.', dueDate: '2025-03-15', maxScore: 100 },
  { id: 'assign-2', courseId: 'course-2', moduleId: 'mod-2-2', title: 'Data Analysis Report', description: 'Clean and analyze a dataset. Produce a report with visualizations.', dueDate: '2025-04-01', maxScore: 100 },
];

export const MOCK_SUBMISSIONS: AssignmentSubmission[] = [
  { id: 'sub-1', studentId: 'student-1', assignmentId: 'assign-1', content: 'Built a shopping cart with Context API and useReducer...', submittedAt: '2025-03-14T10:00:00Z', score: 92, feedback: 'Excellent work! Clean architecture.', status: 'graded' },
  { id: 'sub-2', studentId: 'student-2', assignmentId: 'assign-1', content: 'Designed a task tracker using Context + useReducer with localStorage persistence...', submittedAt: '2025-03-10T08:30:00Z', score: 98, feedback: 'Outstanding — production-grade code.', status: 'graded' },
  { id: 'sub-3', studentId: 'student-3', assignmentId: 'assign-2', content: 'Analyzed the housing dataset with pandas; included correlation heatmaps...', submittedAt: '2025-03-30T22:10:00Z', feedback: 'Solid analysis, add axis labels.', status: 'late' },
];

export const MOCK_PAYMENTS: PaymentTransaction[] = [
  { id: 'pay-1', userId: 'student-1', courseId: 'course-1', amount: 89.99, currency: 'USD', status: 'completed', method: 'credit_card', createdAt: '2025-02-01T10:00:00Z' },
  { id: 'pay-2', userId: 'student-1', courseId: 'course-2', amount: 69.99, currency: 'USD', status: 'completed', method: 'credit_card', createdAt: '2025-01-15T09:30:00Z' },
  { id: 'pay-3', userId: 'student-1', courseId: 'course-3', amount: 59.99, currency: 'USD', status: 'completed', method: 'paypal', createdAt: '2025-03-01T14:00:00Z' },
  { id: 'pay-4', userId: 'student-2', courseId: 'course-1', amount: 89.99, currency: 'USD', status: 'completed', method: 'credit_card', createdAt: '2025-02-20T12:40:00Z' },
  { id: 'pay-5', userId: 'student-2', courseId: 'course-4', amount: 129.99, currency: 'USD', status: 'pending', method: 'bank_transfer', createdAt: '2025-05-10T08:05:00Z' },
  { id: 'pay-6', userId: 'student-3', courseId: 'course-2', amount: 69.99, currency: 'USD', status: 'completed', method: 'credit_card', createdAt: '2024-12-01T15:20:00Z' },
  { id: 'pay-7', userId: 'student-4', courseId: 'course-6', amount: 99.99, currency: 'USD', status: 'refunded', method: 'paypal', createdAt: '2025-04-05T18:50:00Z' },
];

export const MOCK_CERTIFICATES: Certificate[] = [
  { id: 'cert-1', userId: 'student-1', courseId: 'course-3', issuedAt: '2025-03-20', certificateId: 'CERT-2025-001', studentName: 'Alex Rivera', courseName: 'UI/UX Design Fundamentals' },
  { id: 'cert-2', userId: 'student-2', courseId: 'course-1', issuedAt: '2025-05-04', certificateId: 'CERT-2025-014', studentName: 'Liam Zhang', courseName: 'React Mastery 2025' },
];