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
const DestinationsPage = lazy(() => import('@/features/destinations/pages/DestinationsPage'));
const TagsPage = lazy(() => import('@/features/tags/pages/TagsPage'));
const LocationTypesPage = lazy(() => import('@/features/locationTypes/pages/LocationTypesPage'));
const LocationsPage = lazy(() => import('@/features/locations/pages/LocationsPage'));
const AmenitiesPage = lazy(() => import('@/features/amenities/pages/AmenitiesPage'));
const SubmissionsPage = lazy(() => import('@/features/location-submissions/pages/SubmissionsPage'));
const LocationSubmissionsReviewPage = lazy(() => import('@/features/location-submissions/pages/LocationSubmissionsReviewPage'));

// Dashboard overview component
const DashboardOverview = () => (
  <div>
    <h2>Overview</h2>
    <p>Algorithm-based destination scheduling system.</p>
  </div>
);

// Schedule management component
const ScheduleManagement = () => (
  <div>
    <h2>Algorithm Scheduling Management</h2>
  </div>
);

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
  // Public Routes (Auth pages)
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

  // Public Routes (Feature pages - for testing/demo)
  {
    path: PATHS.DESTINATIONS.replace('/', ''),
    element: <SuspenseWrapper><DestinationsPage /></SuspenseWrapper>
  },
  {
    path: PATHS.TAGS.replace('/', ''),
    element: <SuspenseWrapper><TagsPage /></SuspenseWrapper>
  },
  {
    path: PATHS.LOCATION_TYPES.replace('/', ''),
    element: <SuspenseWrapper><LocationTypesPage /></SuspenseWrapper>
  },
  {
    path: PATHS.AMENITIES.replace('/', ''),
    element: <SuspenseWrapper><AmenitiesPage /></SuspenseWrapper>
  },

  // Protected Routes (Admin/Authenticated users)
  {
    element: <SuspenseWrapper><ProtectedRoute /></SuspenseWrapper>,
    children: [
      {
        element: <MainLayout />,
        children: [
          {
            path: PATHS.DASHBOARD,
            element: <div><h2>Overview</h2><p>Algorithm-based destination scheduling system.</p></div>
          },
          {
            path: PATHS.SCHEDULES,
            element: <div><h2>Algorithm Scheduling Management</h2></div>
          },
          {
            path: '/my-locations',
            element: <SubmissionsPage />
          },
          {
            path: PATHS.TAGS,
            element: <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.CONTENT_MODERATOR]} />,
            children: [
              { index: true, element: <TagsPage /> }
            ]
          },
          {
            path: PATHS.LOCATIONS,
            element: <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.CONTENT_MODERATOR]} />,
            children: [
              { index: true, element: <LocationsPage /> }
            ]
          },
          {
            path: '/admin/location-submissions',
            element: <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.CONTENT_MODERATOR]} />,
            children: [
              { index: true, element: <LocationSubmissionsReviewPage /> }
            ]
          },
          {
            path: PATHS.USERS,
            element: <ProtectedRoute allowedRoles={[ROLES.ADMIN]} />,
            children: [
              { index: true, element: <UsersPage /> }
            ]
          },
          {
            path: PATHS.PROFILE,
            element: <ProfilePage />,
          },
          {
            path: PATHS.UNAUTHORIZED,
            element: <Error403 />
          },
        ]
      }
    ]
  },

  // Error Routes
  {
    path: PATHS.UNAUTHORIZED,
    element: <SuspenseWrapper><Error403 /></SuspenseWrapper>
  },
  {
    path: PATHS.NOT_FOUND,
    element: <SuspenseWrapper><Error404 /></SuspenseWrapper>
  }
]);
