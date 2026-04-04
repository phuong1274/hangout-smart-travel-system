import React, { lazy } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import PublicRoute from './PublicRoute';
import SuspenseWrapper from './RouteShell';
import { PATHS } from './paths';
import { ROLES } from '@/config/constants';

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
const ItineraryPage = lazy(() => import('@/features/schedules/pages/ItineraryPage'));

const Error404 = lazy(() => import('@/components/Errors/Error404'));
const Error403 = lazy(() => import('@/components/Errors/Error403'));
const DestinationsPage = lazy(() => import('@/features/destinations/pages/DestinationsPage'));
const TagsPage = lazy(() => import('@/features/tags/pages/TagsPage'));
const LocationTypesPage = lazy(() => import('@/features/locationTypes/pages/LocationTypesPage'));
const LocationsPage = lazy(() => import('@/features/locations/pages/LocationsPage'));
const AmenitiesPage = lazy(() => import('@/features/amenities/pages/AmenitiesPage'));
const SubmissionsPage = lazy(() => import('@/features/location-submissions/pages/SubmissionsPage'));
const LocationSubmissionsReviewPage = lazy(() => import('@/features/location-submissions/pages/LocationSubmissionsReviewPage'));

const PartnerLocationsPage = lazy(() => import('@/features/locations/pages/PartnerLocationsPage'));

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
        element: <MainLayout />,
        children: [
          {
            path: PATHS.DASHBOARD,
            element: <div><h2>Overview</h2><p>Algorithm-based destination scheduling system.</p></div>
          },
          {
            path: PATHS.DESTINATIONS,
            element: <ProtectedRoute allowedRoles={[ROLES.ADMIN]} />,
            children: [
              { index: true, element: <DestinationsPage /> }
            ]
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
            path: PATHS.PARTNER_LOCATIONS,
            element: <PartnerLocationsPage />
          },
          {
            path: PATHS.TAGS,
            element: <TagsPage />
          },
          {
            path: PATHS.LOCATION_TYPES,
            element: <LocationTypesPage />
          },
          {
            path: PATHS.AMENITIES,
            element: <AmenitiesPage />
          },
          {
            path: PATHS.LOCATIONS,
            element: <LocationsPage />
          },
          {
            path: '/admin/location-submissions',
            element: <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.CONTENT_MODERATOR]} />,
            children: [
              { index: true, element: <LocationSubmissionsReviewPage /> }
            ]
          },
          {
            path: PATHS.ITINERARY,
            element: <ItineraryPage />,
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
  {
    path: PATHS.UNAUTHORIZED,
    element: <SuspenseWrapper><Error403 /></SuspenseWrapper>
  },
  {
    path: PATHS.NOT_FOUND,
    element: <SuspenseWrapper><Error404 /></SuspenseWrapper>
  }
]);