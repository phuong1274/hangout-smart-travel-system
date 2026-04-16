import React from 'react';
import { Navigate, Outlet, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { PATHS } from './paths';

const PublicRoute = () => {
  const { isAuthenticated } = useAuthStore();
  const [searchParams] = useSearchParams();

  if (isAuthenticated) {
    const redirect = searchParams.get('redirect');
    return <Navigate to={redirect || PATHS.DASHBOARD} replace />;
  }

  return <Outlet />;
};

export default PublicRoute;
