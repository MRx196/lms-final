import { useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { House, Users, BookOpen, Wallet, ChartLine, GearSix, SignOut, Megaphone, List, GraduationCap, DotsThreeVertical, Scroll, ShieldCheck } from '@phosphor-icons/react';
import { ROUTES, adminNavItems } from '@/constants/navigation';
import { MobileDrawer } from '@/components/MobileDrawer';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { useAuth } from '@/contexts/AuthContext';

const IconMap: Record<string, React.ElementType> = {
  House, Users, BookOpen, Wallet, ChartLine, GearSix, Megaphone, Scroll, ShieldCheck
};

export function AdminLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuth();

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <div className="min-h-[100dvh] flex bg-zinc-50 dark:bg-zinc-950">
      <aside className={`hidden lg:flex flex-col border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 transition-all duration-300 ${sidebarCollapsed ? 'w-16' : 'w-64'}`}>
        <div className="flex items-center justify-between h-16 px-4 border-b border-zinc-200 dark:border-zinc-800">
          <Link to={ROUTES.adminDashboard} className={`flex items-center gap-2 font-bold text-emerald-600 ${sidebarCollapsed ? 'justify-center w-full' : ''}`}>
            <GraduationCap size={22} weight="fill" />
            {!sidebarCollapsed && <span className="text-sm">Admin</span>}
          </Link>
          <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)} className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400">
            <DotsThreeVertical size={16} />
          </button>
        </div>
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {adminNavItems.map((item) => {
            const Icon = IconMap[item.icon] || House;
            const isActive = location.pathname === item.path || location.pathname.startsWith(item.path.replace(/\/:\w+/g, ''));
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400'
                    : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800'
                } ${sidebarCollapsed ? 'justify-center px-2' : ''}`}
                title={sidebarCollapsed ? item.label : undefined}
              >
                <Icon size={18} />
                {!sidebarCollapsed && item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-zinc-200 dark:border-zinc-800">
          <button
            onClick={handleLogout}
            className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 transition-colors ${sidebarCollapsed ? 'justify-center px-2' : ''}`}
          >
            <SignOut size={18} />
            {!sidebarCollapsed && 'Sign Out'}
          </button>
        </div>
      </aside>

      <MobileDrawer
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        items={adminNavItems}
        user={user ? { name: profile?.full_name || user.email || 'Admin', email: user.email || '' } : null}
        role={profile?.role || 'admin'}
        onLogout={handleLogout}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-20 h-16 border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-lg flex items-center justify-between px-4 lg:px-6">
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileOpen(true)} className="lg:hidden p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800">
              <List size={20} />
            </button>
            <h1 className="text-sm font-semibold text-zinc-400 hidden sm:block">Admin Panel</h1>
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell href={ROUTES.adminAnnouncements} />
            <Link to={ROUTES.adminSettings} className="flex items-center gap-2 ml-2">
              <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 font-semibold text-sm">A</div>
            </Link>
          </div>
        </header>
        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}