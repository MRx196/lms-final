import { type ComponentType, type ReactNode } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { ROUTES } from '@/constants/navigation';
import { CircleNotch } from '@phosphor-icons/react';

interface ProtectedRouteProps {
  requiredRole?: 'student' | 'admin';
  layout?: ComponentType<{ children: ReactNode }>;
}

export function ProtectedRoute({ requiredRole, layout: Layout }: ProtectedRouteProps) {
  const { user, profile, loading, initialized, signOut } = useAuth();
  const location = useLocation();

  if (!initialized || loading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <div className="flex flex-col items-center gap-3">
          <CircleNotch size={32} className="text-emerald-600 animate-spin" />
          <p className="text-sm text-zinc-500">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to={ROUTES.login} state={{ from: location }} replace />;
  }

  if (!profile || profile.status !== 'active') {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3 px-4 text-center">
        <p className="text-lg font-semibold text-zinc-900 dark:text-white">Account access unavailable</p>
        <p className="text-sm text-zinc-500">This account has no active profile or has been suspended.</p>
        <button type="button" onClick={() => void signOut()} className="text-sm font-medium text-emerald-600 hover:underline">
          Sign out
        </button>
      </div>
    );
  }

  const isAdmin = profile.role === 'admin' || profile.role === 'super_admin';
  if (requiredRole === 'admin' && !isAdmin) {
    if (profile.role === 'student') return <Navigate to={ROUTES.studentDashboard} replace />;
    return <Navigate to={ROUTES.home} replace />;
  }
  if (requiredRole === 'student' && profile.role !== 'student') {
    if (isAdmin) return <Navigate to={ROUTES.adminDashboard} replace />;
    return <Navigate to={ROUTES.home} replace />;
  }

  if (Layout) {
    return (
      <Layout>
        <Outlet />
      </Layout>
    );
  }

  return <Outlet />;
}