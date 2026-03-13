import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { PATHS } from './paths';

const PublicRoute = () => {
  const { isAuthenticated } = useAuthStore();

  if (isAuthenticated) {
    return <Navigate to={PATHS.DASHBOARD} replace />;
  }

  return <Outlet />;
};

export default PublicRoute;
