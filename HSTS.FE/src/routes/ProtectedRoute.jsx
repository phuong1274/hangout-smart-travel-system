import { useEffect, useMemo, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import apiClient from '@/lib/axios';
import { useAuthStore } from '@/store/authStore';
import { PATHS } from './paths';

const ProtectedRoute = ({ allowedRoles }) => {
  const { isAuthenticated, user, login, logout } = useAuthStore();
  const location = useLocation();
  const [hasTriedRefresh, setHasTriedRefresh] = useState(false);
  const [isRefreshingSession, setIsRefreshingSession] = useState(false);

  const hasRequiredRole = useMemo(() => {
    if (!allowedRoles) return true;
    return allowedRoles.some((role) => user?.roles?.includes(role));
  }, [allowedRoles, user?.roles]);

  useEffect(() => {
    setHasTriedRefresh(false);
  }, [location.pathname]);

  useEffect(() => {
    let isCancelled = false;

    const refreshSession = async () => {
      if (!isAuthenticated || !allowedRoles || hasRequiredRole || hasTriedRefresh || isRefreshingSession) {
        return;
      }

      setHasTriedRefresh(true);
      setIsRefreshingSession(true);

      try {
        const response = await apiClient.post('/api/auth/refresh-token');
        if (!isCancelled) {
          login(response.data);
        }
      } catch {
        if (!isCancelled) {
          logout();
        }
      } finally {
        if (!isCancelled) {
          setIsRefreshingSession(false);
        }
      }
    };

    refreshSession();

    return () => {
      isCancelled = true;
    };
  }, [allowedRoles, hasRequiredRole, hasTriedRefresh, isAuthenticated, isRefreshingSession, login, logout]);

  if (!isAuthenticated) {
    return <Navigate to={PATHS.AUTH.LOGIN} state={{ from: location }} replace />;
  }

  if (allowedRoles && !hasRequiredRole) {
    if (isRefreshingSession) {
      return null;
    }

    return <Navigate to={PATHS.UNAUTHORIZED} replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
