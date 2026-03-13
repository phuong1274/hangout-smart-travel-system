import React, { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { Spin } from 'antd';
import ProtectedRoute from './ProtectedRoute';
import PublicRoute from './PublicRoute';
import { PATHS } from './paths';
import { ROLES } from '@/config/constants';

// Lazy load layouts and pages
const MainLayout = lazy(() => import('@/layouts/MainLayout'));
const AuthLayout = lazy(() => import('@/layouts/AuthLayout'));
const LoginPage = lazy(() => import('@/features/auth/pages/LoginPage'));
const RegisterPage = lazy(() => import('@/features/auth/pages/RegisterPage'));
const VerifyEmailPage = lazy(() => import('@/features/auth/pages/VerifyEmailPage'));
const ForgotPasswordPage = lazy(() => import('@/features/auth/pages/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('@/features/auth/pages/ResetPasswordPage'));
const UsersPage = lazy(() => import('@/features/users/pages/UsersPage'));
const ProfilePage = lazy(() => import('@/features/users/pages/ProfilePage'));
const HomePage = lazy(() => import('@/features/home/pages/Home'));

// Global Pages
const Error404 = lazy(() => import('@/components/Errors/Error404'));
const Error403 = lazy(() => import('@/components/Errors/Error403'));

const LoadingFallback = () => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
    <Spin size="large" tip="Loading page..." />
  </div>
);

const SuspenseWrapper = ({ children }) => (
  <Suspense fallback={<LoadingFallback />}>
    {children}
  </Suspense>
);

export const router = createBrowserRouter([
  {
    path: '/',
    element: <SuspenseWrapper><HomePage /></SuspenseWrapper>,
  },
  {
    element: <SuspenseWrapper><PublicRoute /></SuspenseWrapper>,
    children: [
      {
        path: PATHS.AUTH.ROOT,
        element: <AuthLayout />,
        children: [
          { path: 'login', element: <LoginPage /> },
          { path: 'register', element: <RegisterPage /> },
          { path: 'verify-email', element: <VerifyEmailPage /> },
          { path: 'forgot-password', element: <ForgotPasswordPage /> },
          { path: 'reset-password', element: <ResetPasswordPage /> },
          { path: '', element: <Navigate to="login" replace /> }
        ]
      }
    ]
  },
  {
    element: <SuspenseWrapper><ProtectedRoute /></SuspenseWrapper>,
    children: [
      {
        path: PATHS.DASHBOARD,
        element: <MainLayout />,
        children: [
          { 
            index: true, 
            element: <div><h2>Overview</h2><p>Algorithm-based destination scheduling system.</p></div> 
          },
          { 
            path: PATHS.SCHEDULES.replace('/', ''), 
            element: <div><h2>Algorithm Scheduling Management</h2></div> 
          },
          {
            path: PATHS.USERS.replace('/', ''),
            element: <ProtectedRoute allowedRoles={[ROLES.ADMIN]} />,
            children: [
              { index: true, element: <UsersPage /> }
            ]
          },
          {
            path: PATHS.PROFILE.replace('/', ''),
            element: <ProfilePage />,
          },
          // Error 403 shown within Layout when user doesn't have permissions
          {
            path: PATHS.UNAUTHORIZED.replace('/', ''),
            element: <Error403 />
          },
          // Catch-all 404 for dashboard children
          {
            path: '*',
            element: <Error404 />
          }
        ]
      }
    ]
  },
  {
    path: PATHS.UNAUTHORIZED,
    element: <SuspenseWrapper><Error403 /></SuspenseWrapper>
  },
  {
    path: PATHS.NOT_FOUND,
    element: <SuspenseWrapper><Error404 /></SuspenseWrapper>
  }
]);
