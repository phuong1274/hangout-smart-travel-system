import { useEffect } from 'react';
import { Navigate, Outlet, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { PATHS } from './paths';

const PublicRoute = () => {
  const { isAuthenticated, logout } = useAuthStore();
  const [searchParams] = useSearchParams();

  // XSRF-TOKEN (non-httpOnly) is set alongside access_token on login.
  // If missing, the session cookies are expired — clear stale localStorage.
  const hasValidSession = isAuthenticated && document.cookie.includes('XSRF-TOKEN=');

  useEffect(() => {
    if (isAuthenticated && !document.cookie.includes('XSRF-TOKEN=')) {
      logout();
    }
  }, [isAuthenticated, logout]);

  if (hasValidSession) {
    const redirect = searchParams.get('redirect');
    return <Navigate to={redirect || PATHS.DASHBOARD} replace />;
  }

  return <Outlet />;
};

export default PublicRoute;
