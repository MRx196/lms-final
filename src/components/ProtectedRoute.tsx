import { ComponentType, ReactNode } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { ROUTES } from '@/constants/navigation';
import { CircleNotch } from '@phosphor-icons/react';

interface ProtectedRouteProps {
  requiredRole?: 'student' | 'admin';
  layout?: ComponentType<{ children: ReactNode }>;
}

export function ProtectedRoute({ requiredRole, layout: Layout }: ProtectedRouteProps) {
  const { user, profile, loading, initialized } = useAuth();
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

  if (requiredRole && profile && profile.role !== requiredRole) {
    const redirectTo = profile.role === 'admin' ? ROUTES.adminDashboard : ROUTES.studentDashboard;
    return <Navigate to={redirectTo} replace />;
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