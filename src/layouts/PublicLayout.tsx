import { useState, useEffect } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { List, User, SignOut, GraduationCap } from '@phosphor-icons/react';
import { ROUTES, BRAND_NAME, publicNavItems } from '@/constants/navigation';
import { MobileDrawer } from '@/components/MobileDrawer';
import { useAuth } from '@/contexts/AuthContext';

export function PublicLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, profile, loading, signOut } = useAuth();
  const isLoggedIn = !loading && !!user;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <div className="min-h-[100dvh] flex flex-col bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
      <header className={`fixed top-0 left-0 right-0 z-30 transition-all duration-300 ${
        scrolled ? 'bg-white/80 dark:bg-zinc-950/80 backdrop-blur-lg border-b border-zinc-200/50 dark:border-zinc-800/50' : 'bg-transparent'
      }`}>
        <div className="max-w-7xl mx-auto flex items-center justify-between h-16 px-4 lg:px-8">
          <Link to="/" className="flex items-center gap-2 font-bold text-lg text-emerald-600">
            <GraduationCap size={24} weight="fill" />
            <span className="hidden sm:inline">{BRAND_NAME}</span>
          </Link>
          <nav className="hidden md:flex items-center gap-1">
            {publicNavItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  location.pathname === item.path
                    ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 dark:text-emerald-400'
                    : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-800'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            {isLoggedIn ? (
              <>
                <Link
                  to={user?.role === 'admin' ? ROUTES.adminDashboard : ROUTES.studentDashboard}
                  className="hidden sm:inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
                >
                  <User size={16} />
                  Dashboard
                </Link>
                <button onClick={handleLogout} className="hidden sm:inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800 transition-colors">
                  <SignOut size={16} />
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <Link to={ROUTES.login} className="hidden sm:inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800 transition-colors">Sign In</Link>
                <Link to={ROUTES.register} className="px-4 py-2 rounded-lg text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700 transition-colors">Get Started</Link>
              </>
            )}
            <button onClick={() => setMobileOpen(true)} className="md:hidden p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800">
              <List size={20} />
            </button>
          </div>
        </div>
      </header>

      <MobileDrawer
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        items={publicNavItems}
        user={user ? { name: profile?.full_name || user.email || 'User', email: user.email || '' } : null}
        role={profile?.role || 'guest'}
        onLogout={handleLogout}
      />

      <main className="flex-1 pt-16">
        <Outlet />
      </main>

      <footer className="border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="col-span-1 md:col-span-2">
              <Link to="/" className="flex items-center gap-2 font-bold text-lg text-emerald-600 mb-3">
                <GraduationCap size={22} weight="fill" />
                {BRAND_NAME}
              </Link>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-sm">Empowering learners worldwide with industry-led courses. Start your journey today.</p>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-3">Quick Links</h4>
              <div className="space-y-2">
                {publicNavItems.map((item) => (
                  <Link key={item.path} to={item.path} className="block text-sm text-zinc-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">{item.label}</Link>
                ))}
              </div>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-3">Support</h4>
              <div className="space-y-2 text-sm text-zinc-500">
                <a href="mailto:hello@lms.com" className="block hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">hello@lms.com</a>
                <p>Help Center</p>
                <p>Terms of Service</p>
                <p>Privacy Policy</p>
              </div>
            </div>
          </div>
          <div className="mt-8 pt-6 border-t border-zinc-200 dark:border-zinc-800 text-center text-sm text-zinc-400">
            &copy; {new Date().getFullYear()} {BRAND_NAME}. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}