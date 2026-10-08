import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, User as UserIcon, Users, GraduationCap, ChartBar, Gear, SignOut, Bell, House, ShoppingCart, List, SquaresFour, NotePencil, Exam, Certificate, Wallet, CreditCard, Barricade, X, Plus } from '@phosphor-icons/react';
import { BRAND_NAME } from '@/constants/navigation';
import { useAuth } from '@/contexts/AuthContext';

type NavMode = 'public' | 'student' | 'admin';

const publicLinks = [
  { to: '/', label: 'Home', icon: House },
  { to: '/courses', label: 'Courses', icon: BookOpen },
  { to: '/about', label: 'About', icon: Users },
  { to: '/contact', label: 'Contact', icon: NotePencil },
];

const studentLinks = [
  { to: '/student/dashboard', label: 'Dashboard', icon: SquaresFour },
  { to: '/student/courses', label: 'My Courses', icon: BookOpen },
  { to: '/student/assignments', label: 'Assignments', icon: NotePencil },
  { to: '/student/quizzes', label: 'Quizzes', icon: Exam },
  { to: '/student/certificates', label: 'Certificates', icon: Certificate },
  { to: '/student/profile', label: 'Profile', icon: UserIcon },
];

const adminLinks = [
  { to: '/admin/dashboard', label: 'Dashboard', icon: ChartBar },
  { to: '/admin/students', label: 'Students', icon: Users },
  { to: '/admin/courses', label: 'Courses', icon: BookOpen },
  { to: '/admin/assignments', label: 'Assignments', icon: NotePencil },
  { to: '/admin/quizzes', label: 'Quizzes', icon: Exam },
  { to: '/admin/payments', label: 'Payments', icon: CreditCard },
  { to: '/admin/enrollments', label: 'Enrollments', icon: Wallet },
  { to: '/admin/instructors', label: 'Instructors', icon: GraduationCap },
  { to: '/admin/categories', label: 'Categories', icon: SquaresFour },
  { to: '/admin/certificates', label: 'Certificates', icon: Certificate },
  { to: '/admin/reports', label: 'Reports', icon: ChartBar },
  { to: '/admin/settings', label: 'Settings', icon: Gear },
];

function NavLink({ to, label, icon: Icon, onClick }: { to: string; label: string; icon: any; onClick?: () => void }) {
  const location = useLocation();
  const active = location.pathname === to || (to !== '/' && location.pathname.startsWith(to));
  return (
    <Link to={to} onClick={onClick} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${active ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-800'}`}>
      <Icon size={18} weight={active ? 'fill' : 'regular'} />
      {label}
    </Link>
  );
}

function PublicHeader() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuth();
  const isLoggedIn = !!user;
  const handleLogin = () => navigate('/login');
  const handleLogout = async () => { await signOut(); navigate('/'); };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/80 backdrop-blur-xl dark:border-slate-700 dark:bg-slate-950/80">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2 text-xl font-bold tracking-tight text-slate-900 dark:text-white">
          <GraduationCap size={28} weight="fill" className="text-emerald-600" />
          <span className="hidden sm:inline">{BRAND_NAME}</span>
        </Link>
        <nav className="hidden md:flex items-center gap-1">
          {publicLinks.map(l => <NavLink key={l.to} {...l} />)}
        </nav>
        <div className="flex items-center gap-2">
          {!isLoggedIn ? (
            <>
              <button onClick={handleLogin} className="hidden sm:inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700">Sign In</button>
              <Link to="/register" className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-emerald-600 px-4 text-sm font-medium text-white hover:bg-emerald-700 transition-colors">Get Started</Link>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <span className="hidden sm:inline text-sm text-slate-500 dark:text-slate-400">{profile?.full_name || user?.email}</span>
              <div className="flex gap-1">
                <Link to="/student/dashboard" className={`h-8 rounded-md px-2.5 text-xs font-medium ${profile?.role === 'student' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' : 'text-slate-500 hover:text-slate-700'}`}>Student</Link>
                <Link to="/admin/dashboard" className={`h-8 rounded-md px-2.5 text-xs font-medium ${profile?.role === 'admin' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' : 'text-slate-500 hover:text-slate-700'}`}>Admin</Link>
              </div>
              <button onClick={handleLogout} className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"><SignOut size={18} /></button>
            </div>
          )}
          <button onClick={() => setOpen(true)} className="md:hidden h-9 w-9 rounded-lg flex items-center justify-center text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"><List size={20} /></button>
        </div>
      </div>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, x: '100%' }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: '100%' }} transition={{ ease: 'easeInOut' }} className="fixed inset-0 z-50 md:hidden">
            <div className="absolute inset-0 bg-black/20" onClick={() => setOpen(false)} />
            <div className="absolute right-0 top-0 h-full w-72 bg-white p-6 shadow-xl dark:bg-slate-900">
              <div className="flex items-center justify-between mb-8">
                <span className="text-lg font-bold text-slate-900 dark:text-white">Menu</span>
                <button onClick={() => setOpen(false)} className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100"><X size={18} /></button>
              </div>
              <nav className="flex flex-col gap-1">
                {publicLinks.map(l => <NavLink key={l.to} {...l} onClick={() => setOpen(false)} />)}
              </nav>
              <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
                {!isLoggedIn ? (
                  <div className="flex flex-col gap-2">
                    <Link to="/login" onClick={() => setOpen(false)} className="block w-full rounded-lg border border-slate-300 px-4 py-2 text-center text-sm font-medium text-slate-700 hover:bg-slate-50">Sign In</Link>
                    <Link to="/register" onClick={() => setOpen(false)} className="block w-full rounded-lg bg-emerald-600 px-4 py-2 text-center text-sm font-medium text-white hover:bg-emerald-700">Get Started</Link>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    <p className="text-sm text-slate-500">{profile?.full_name || user?.email}</p>
                    <Link to="/student/dashboard" onClick={() => setOpen(false)} className="text-left text-sm font-medium text-slate-700 hover:text-emerald-600">Student Portal</Link>
                    <Link to="/admin/dashboard" onClick={() => setOpen(false)} className="text-left text-sm font-medium text-slate-700 hover:text-emerald-600">Admin Portal</Link>
                    <button onClick={() => { handleLogout(); setOpen(false); }} className="text-left text-sm font-medium text-red-500 hover:text-red-600">Sign Out</button>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

function StudentSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuth();
  const handleLogout = async () => { await signOut(); navigate('/'); };

  return (
    <>
      <aside className={`fixed left-0 top-0 z-40 h-full border-r border-slate-200 bg-white transition-all duration-300 dark:border-slate-700 dark:bg-slate-950 ${collapsed ? 'w-16' : 'w-64'} hidden lg:block`}>
        <div className="flex h-16 items-center justify-between px-4 border-b border-slate-200 dark:border-slate-700">
          <Link to="/student/dashboard" className={`flex items-center gap-2 ${collapsed ? 'justify-center w-full' : ''}`}>
            <GraduationCap size={24} weight="fill" className="text-emerald-600 shrink-0" />
            {!collapsed && <span className="text-base font-bold text-slate-900 dark:text-white">LMS</span>}
          </Link>
        </div>
        <nav className="flex flex-col gap-1 p-3">
          {studentLinks.map(l => <NavLink key={l.to} {...l} />)}
        </nav>
        <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2 p-2 rounded-lg mb-1">
            <div className="h-7 w-7 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 text-xs font-bold shrink-0">{(profile?.full_name || user?.email || 'S').charAt(0)}</div>
            {!collapsed && <div className="flex-1 min-w-0"><p className="text-xs font-medium text-slate-900 truncate dark:text-white">{profile?.full_name || user?.email || 'Student'}</p><p className="text-xs text-slate-400 truncate">Student</p></div>}
          </div>
          <button onClick={handleLogout} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"><SignOut size={18} /> {!collapsed && 'Sign Out'}</button>
        </div>
      </aside>
      <StudentMobileNav />
    </>
  );
}

function StudentMobileNav() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const handleLogout = async () => { await signOut(); navigate('/'); };
  return (
    <>
      <button onClick={() => setOpen(true)} className="lg:hidden fixed bottom-4 right-4 z-40 h-12 w-12 rounded-full bg-emerald-600 text-white shadow-lg flex items-center justify-center"><List size={20} /></button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="fixed inset-0 z-50 lg:hidden">
            <div className="absolute inset-0 bg-black/20" onClick={() => setOpen(false)} />
            <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl p-6 shadow-xl dark:bg-slate-900 max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4"><span className="text-lg font-bold">Menu</span><button onClick={() => setOpen(false)}><X size={18} /></button></div>
              <nav className="flex flex-col gap-1">{[...studentLinks, { to: '/student/settings', label: 'Settings', icon: Gear }].map(l => <NavLink key={l.to} {...l} onClick={() => setOpen(false)} />)}</nav>
              <button onClick={() => { handleLogout(); setOpen(false); }} className="mt-4 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-500"><SignOut size={18} /> Sign Out</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function AdminSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuth();
  const handleLogout = async () => { await signOut(); navigate('/'); };

  return (
    <>
      <aside className="fixed left-0 top-0 z-40 h-full w-64 border-r border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-950 hidden lg:block">
        <div className="flex h-16 items-center gap-2 px-4 border-b border-slate-200 dark:border-slate-700">
          <GraduationCap size={24} weight="fill" className="text-emerald-600 shrink-0" />
          <span className="text-base font-bold text-slate-900 dark:text-white">Admin Panel</span>
        </div>
        <nav className="flex flex-col gap-1 p-3">
          {adminLinks.map(l => <NavLink key={l.to} {...l} />)}
        </nav>
        <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2 p-2 rounded-lg mb-1">
            <div className="h-7 w-7 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 text-xs font-bold shrink-0">{(profile?.full_name || user?.email || 'A').charAt(0)}</div>
            <div className="flex-1 min-w-0"><p className="text-xs font-medium text-slate-900 truncate dark:text-white">{profile?.full_name || user?.email || 'Admin'}</p><p className="text-xs text-slate-400 truncate">Admin</p></div>
          </div>
          <button onClick={handleLogout} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"><SignOut size={18} /> Sign Out</button>
        </div>
      </aside>
      <AdminMobileNav />
    </>
  );
}

function AdminMobileNav() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const handleLogout = async () => { await signOut(); navigate('/'); };
  return (
    <>
      <button onClick={() => setOpen(true)} className="lg:hidden fixed bottom-4 right-4 z-40 h-12 w-12 rounded-full bg-emerald-600 text-white shadow-lg flex items-center justify-center"><List size={20} /></button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="fixed inset-0 z-50 lg:hidden">
            <div className="absolute inset-0 bg-black/20" onClick={() => setOpen(false)} />
            <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl p-6 shadow-xl dark:bg-slate-900 max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4"><span className="text-lg font-bold">Menu</span><button onClick={() => setOpen(false)}><X size={18} /></button></div>
              <nav className="flex flex-col gap-1">{adminLinks.map(l => <NavLink key={l.to} {...l} onClick={() => setOpen(false)} />)}</nav>
              <button onClick={() => { handleLogout(); setOpen(false); }} className="mt-4 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-500"><SignOut size={18} /> Sign Out</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export { PublicHeader, StudentSidebar, AdminSidebar };