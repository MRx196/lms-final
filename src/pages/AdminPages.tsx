import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Users, BookOpen, Wallet, Trophy,
  ArrowRight, Trash, Clock,
  Check, X, CreditCard, GraduationCap, ChartLine, Download
} from '@phosphor-icons/react';
import { ROUTES } from '@/constants/navigation';
import { SEED_COURSES, MOCK_USERS, MOCK_ENROLLMENTS, MOCK_PAYMENTS } from '@/data';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { AdminCourseList } from './AdminCourseList';
import { AdminCourseForm } from './AdminCourseForm';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { ease: 'easeOut' as const } },
};

function StatCard({ icon: Icon, label, value, sub, color }: { icon: React.ElementType; label: string; value: string | number; sub?: string; color: string }) {
  return (
    <Card className="border-zinc-200 dark:border-zinc-800">
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${color}`}>
          <Icon size={20} />
        </div>
        <div>
          <p className="text-xl font-bold text-zinc-900 dark:text-white">{value}</p>
          <p className="text-xs text-zinc-500">{label}</p>
          {sub && <p className="text-[10px] text-zinc-400">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

export function AdminDashboard() {
  const totalStudents = MOCK_USERS.filter(u => u.role === 'student').length;
  const totalCourses = SEED_COURSES.length;
  const totalRevenue = MOCK_PAYMENTS.filter(p => p.status === 'completed').reduce((s, p) => s + p.amount, 0);
  const totalEnrollments = MOCK_ENROLLMENTS.length;
  const recentPayments = MOCK_PAYMENTS.slice(0, 4);

  return (
    <motion.div initial="hidden" animate="visible" variants={containerVariants}>
      <motion.div variants={itemVariants} className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">Admin Dashboard</h1>
        <p className="text-zinc-500 dark:text-zinc-400 mt-1">Overview of your learning platform</p>
      </motion.div>
      <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={Users} label="Total Students" value={totalStudents} color="text-blue-600 bg-blue-50 dark:bg-blue-900/20" />
        <StatCard icon={BookOpen} label="Courses" value={totalCourses} color="text-amber-600 bg-amber-50 dark:bg-amber-900/20" />
        <StatCard icon={Wallet} label="Revenue" value={`$${totalRevenue.toLocaleString()}`} color="text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20" />
        <StatCard icon={Trophy} label="Enrollments" value={totalEnrollments} color="text-purple-600 bg-purple-50 dark:bg-purple-900/20" />
      </motion.div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <motion.div variants={itemVariants}>
            <Card className="border-zinc-200 dark:border-zinc-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Recent Payments</CardTitle>
                <CardDescription className="text-xs">Latest transactions on the platform</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {recentPayments.map((payment) => {
                    const course = SEED_COURSES.find(c => c.id === payment.courseId);
                    const user = MOCK_USERS.find(u => u.id === payment.userId);
                    return (
                      <div key={payment.id} className="flex items-center justify-between px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-xs font-bold text-emerald-600">
                            {user?.name?.charAt(0) || '?'}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-zinc-900 dark:text-white">{user?.name || 'Unknown'}</p>
                            <p className="text-xs text-zinc-500">{course?.title || 'Course'}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-emerald-600">${payment.amount}</p>
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5">{payment.status}</Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
        <div className="space-y-6">
          <motion.div variants={itemVariants}>
            <Card className="border-zinc-200 dark:border-zinc-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <GraduationCap size={16} className="text-emerald-600" />
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Link to={ROUTES.adminCourses} className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-zinc-600 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:bg-zinc-800 transition-colors">
                  <BookOpen size={16} /> Manage Courses <span className="flex-1" /><ArrowRight size={14} />
                </Link>
                <Link to={ROUTES.adminStudents} className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-zinc-600 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:bg-zinc-800 transition-colors">
                  <Users size={16} /> View Students <span className="flex-1" /><ArrowRight size={14} />
                </Link>
                <Link to={ROUTES.adminReports} className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-zinc-600 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:bg-zinc-800 transition-colors">
                  <ChartLine size={16} /> View Reports <span className="flex-1" /><ArrowRight size={14} />
                </Link>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}

export { AdminStudentsPage } from './AdminStudentsPage';
export { AdminPaymentsPage } from './AdminPaymentsPage';
export { AdminEnrollmentsPage } from './AdminEnrollmentsPage';
export { AdminAnalyticsPage } from './AdminAnalyticsPage';

export function AdminCoursesPage() {
  return <AdminCourseList />;
}

export { AdminCourseForm };