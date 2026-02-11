import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth.store';
import type { Role } from '@/config/constants';

interface ProtectedRouteProps {
  roles?: Role[];
}

export const ProtectedRoute = ({ roles }: ProtectedRouteProps) => {
  const { isAuthenticated, user } = useAuthStore();

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Check role requirements if specified
  if (roles && user && user.roles.length > 0 && !roles.some((r) => user.roles.includes(r))) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <Outlet />;
};
