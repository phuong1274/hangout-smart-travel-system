import React, { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { Spin } from 'antd';
import ProtectedRoute from './ProtectedRoute';
import PublicRoute from './PublicRoute';
import { PATHS } from './paths';
import { ROLES } from '@/config/constants';

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

// Lazy load layouts and pages
const MainLayout = lazy(() => import('@/layouts/MainLayout'));
const AuthLayout = lazy(() => import('@/layouts/AuthLayout'));
const LoginPage = lazy(() => import('@/features/auth/pages/LoginPage'));
const UsersPage = lazy(() => import('@/features/users/pages/UsersPage'));
const DestinationsPage = lazy(() => import('@/features/destinations/pages/DestinationsPage'));
const TagsPage = lazy(() => import('@/features/tags/pages/TagsPage'));
const LocationTypesPage = lazy(() => import('@/features/locationTypes/pages/LocationTypesPage'));
const LocationsPage = lazy(() => import('@/features/locations/pages/LocationsPage'));
const AmenitiesPage = lazy(() => import('@/features/amenities/pages/AmenitiesPage'));

// Global Pages
const Error404 = lazy(() => import('@/components/Errors/Error404'));
const Error403 = lazy(() => import('@/components/Errors/Error403'));

export const router = createBrowserRouter([
  {
    element: <SuspenseWrapper><PublicRoute /></SuspenseWrapper>,
    children: [
      {
        path: PATHS.AUTH.ROOT,
        element: <AuthLayout />,
        children: [
          { path: 'login', element: <LoginPage /> },
          { path: '', element: <Navigate to="login" replace /> }
        ]
      },
      // Public: Destinations (for testing)
      {
        path: PATHS.DESTINATIONS.replace('/', ''),
        element: <DestinationsPage />
      },
      // Public: Tags (for testing)
      {
        path: PATHS.TAGS.replace('/', ''),
        element: <TagsPage />
      },
      // Public: Location Types (for testing)
      {
        path: PATHS.LOCATION_TYPES.replace('/', ''),
        element: <LocationTypesPage />
      },
      // Public: Locations (for testing)
      {
        path: PATHS.LOCATIONS.replace('/', ''),
        element: <LocationsPage />
      },
      // Public: Amenities (for testing)
      {
        path: PATHS.AMENITIES.replace('/', ''),
        element: <AmenitiesPage />
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
