import React, { lazy } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import PublicRoute from './PublicRoute';
import SuspenseWrapper from './RouteShell';
import { PATHS } from './paths';
import { ROLES } from '@/config/constants';
import ItineraryResultPage from '@/features/trip/pages/ItineraryResultPage';

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

const Error404 = lazy(() => import('@/components/Errors/Error404'));
const Error403 = lazy(() => import('@/components/Errors/Error403'));
const DestinationsPage = lazy(() => import('@/features/destinations/pages/DestinationsPage'));
const TagsPage = lazy(() => import('@/features/tags/pages/TagsPage'));
const LocationTypesPage = lazy(() => import('@/features/locationTypes/pages/LocationTypesPage'));
const LocationsPage = lazy(() => import('@/features/locations/pages/LocationsPage'));
const AmenitiesPage = lazy(() => import('@/features/amenities/pages/AmenitiesPage'));
const SubmissionsPage = lazy(() => import('@/features/location-submissions/pages/SubmissionsPage'));
const LocationSubmissionsReviewPage = lazy(() => import('@/features/location-submissions/pages/LocationSubmissionsReviewPage'));
const CreateTripPage = lazy(() => import('@/features/trip/pages/CreateTripPage'));
const ItineraryResultPage = lazy(() => import('@/features/trip/pages/ItineraryResultPage'));
const TripDetailPage = lazy(() => import('@/features/trip/pages/TripDetailPage'));

const PartnerLocationsPage = lazy(() => import('@/features/locations/pages/PartnerLocationsPage'));

const CreateTripPage = lazy(() => import('@/features/trip/pages/CreateTripPage'));

const DashboardOverview = () => (
  <div>
    <h2>Overview</h2>
    <p>Algorithm-based destination scheduling system.</p>
  </div>
);

const ScheduleManagement = () => (
  <div>
    <h2>Algorithm Scheduling Management</h2>
  </div>
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
  {
    path: PATHS.CREATE_TRIP.replace('/', ''),
    element: <SuspenseWrapper><CreateTripPage /></SuspenseWrapper>
  },
  {
    path: PATHS.ITINERARY.replace('/', ''),
    element: <SuspenseWrapper><ItineraryResultPage /></SuspenseWrapper>
  },
  {
    path: 'trips/:id',
    element: <SuspenseWrapper><TripDetailPage /></SuspenseWrapper>
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
            element: <DashboardOverview />
          },
          {
            path: PATHS.SCHEDULES,
            element: <ScheduleManagement />
          },
          {
            path: PATHS.CREATE_TRIP,
            element: <CreateTripPage />
          },
          {
            path: PATHS.ITINERARY,
            element: <ItineraryResultPage />
          },
          {
            path: PATHS.TRIP_DETAIL,
            element: <ItineraryResultPage />
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
            path: PATHS.DESTINATIONS,
            element: <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.CONTENT_MODERATOR]} />,
            children: [
              { index: true, element: <DestinationsPage /> }
            ]
          },
          {
            path: PATHS.LOCATION_TYPES,
            element: <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.CONTENT_MODERATOR]} />,
            children: [
              { index: true, element: <LocationTypesPage /> }
            ]
          },
          {
            path: PATHS.AMENITIES,
            element: <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.CONTENT_MODERATOR]} />,
            children: [
              { index: true, element: <AmenitiesPage /> }
            ]
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
  {
    path: PATHS.UNAUTHORIZED,
    element: <SuspenseWrapper><Error403 /></SuspenseWrapper>
  },
  {
    path: PATHS.NOT_FOUND,
    element: <SuspenseWrapper><Error404 /></SuspenseWrapper>
  }
]);