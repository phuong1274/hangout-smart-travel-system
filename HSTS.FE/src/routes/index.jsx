import React, { lazy } from 'react';
import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import PublicRoute from './PublicRoute';
import SuspenseWrapper from './RouteShell';
import RouteRoot from './RouteRoot';
import { PATHS } from './paths';
import { ROLES } from '@/config/constants';
import { useAuthStore } from '@/store/authStore';

const MainLayout = lazy(() => import('@/layouts/MainLayout'));
const AuthLayout = lazy(() => import('@/layouts/AuthLayout'));
const PublicDiscoveryLayout = lazy(() => import('@/layouts/PublicDiscoveryLayout'));
const LoginPage = lazy(() => import('@/features/auth/pages/LoginPage'));
const RegisterPage = lazy(() => import('@/features/auth/pages/RegisterPage'));
const VerifyEmailPage = lazy(() => import('@/features/auth/pages/VerifyEmailPage'));
const ForgotPasswordPage = lazy(() => import('@/features/auth/pages/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('@/features/auth/pages/ResetPasswordPage'));
const UsersPage = lazy(() => import('@/features/users/pages/UsersPage'));
const UserDetailPage = lazy(() => import('@/features/users/pages/UserDetailPage'));
const ProfilePage = lazy(() => import('@/features/users/pages/ProfilePage'));
const HomePage = lazy(() => import('@/features/home/pages/Home'));
const DashboardPage = lazy(() => import('@/features/dashboard/pages/DashboardPage'));

const Error404 = lazy(() => import('@/components/Errors/Error404'));
const Error403 = lazy(() => import('@/components/Errors/Error403'));
const DestinationsPage = lazy(() => import('@/features/destinations/pages/DestinationsPage'));
const TagsPage = lazy(() => import('@/features/tags/pages/TagsPage'));

const LocationsPage = lazy(() => import('@/features/locations/pages/LocationsPage'));
const PublicLocationsPage = lazy(() => import('@/features/locations/pages/PublicLocationsPage'));
const PublicLocationDetailPage = lazy(() => import('@/features/locations/pages/PublicLocationDetailPage'));
const AmenitiesPage = lazy(() => import('@/features/amenities/pages/AmenitiesPage'));
const SubmissionsPage = lazy(() => import('@/features/location-submissions/pages/SubmissionsPage'));
const LocationSubmissionsReviewPage = lazy(() => import('@/features/location-submissions/pages/LocationSubmissionsReviewPage'));
const PartnerLocationsPage = lazy(() => import('@/features/locations/pages/PartnerLocationsPage'));
const ReportedReviewsPage = lazy(() => import('@/features/reviews/pages/ReportedReviewsPage'));

const TransportManagementPage = lazy(() => import('@/features/transportation/pages/TransportManagementPage'));

const CreateTripPage = lazy(() => import('@/features/trip/pages/CreateTripPage'));
const ItineraryResultPage = lazy(() => import('@/features/trip/pages/ItineraryResultPage'));
const TripDetailPage = lazy(() => import('@/features/trip/pages/TripDetailPage'));
const TripsPage = lazy(() => import('@/features/trip/pages/TripsPage'));
const ManualTripSetupPage = lazy(() => import('@/features/trip/pages/ManualTripSetupPage'));
const ManualTripPage = lazy(() => import('@/features/trip/pages/ManualTripPage'));
const AcceptInvitationPage = lazy(() => import('@/features/trip/pages/AcceptInvitationPage'));

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

const HybridTripLayout = () => {
  const user = useAuthStore((state) => state.user);

  if (user) {
    return (
      <MainLayout>
        <Outlet />
      </MainLayout>
    );
  }

  return <Outlet />;
};

export const router = createBrowserRouter([
  {
    element: <RouteRoot />,
    children: [
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
    element: <SuspenseWrapper><PublicDiscoveryLayout /></SuspenseWrapper>,
    children: [
      {
        path: PATHS.PUBLIC_LOCATIONS.replace('/', ''),
        element: <PublicLocationsPage />
      },
      {
        path: PATHS.PUBLIC_LOCATION_DETAIL().replace('/', ''),
        element: <PublicLocationDetailPage />
      },
    ],
  },
  {
    path: PATHS.DESTINATIONS.replace('/', ''),
    element: <SuspenseWrapper><DestinationsPage /></SuspenseWrapper>
  },
  {
    path: PATHS.TAGS.replace('/', ''),
    element: <SuspenseWrapper><TagsPage /></SuspenseWrapper>
  },

  {
    path: PATHS.AMENITIES.replace('/', ''),
    element: <SuspenseWrapper><AmenitiesPage /></SuspenseWrapper>
  },
  {
    path: 'invitations/accept',
    element: <SuspenseWrapper><AcceptInvitationPage /></SuspenseWrapper>
  },
  {
    element: <SuspenseWrapper><HybridTripLayout /></SuspenseWrapper>,
    children: [
      {
        path: PATHS.CREATE_TRIP.replace('/', ''),
        element: <CreateTripPage />
      },
      {
        path: PATHS.ITINERARY.replace('/', ''),
        element: <ItineraryResultPage />
      },
      {
        path: PATHS.CREATE_TRIP_MANUAL_SETUP.replace('/', ''),
        element: <ManualTripSetupPage />
      },
      {
        path: PATHS.CREATE_TRIP_MANUAL_BUILDER.replace('/', ''),
        element: <ManualTripPage />
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
            children: [
              { index: true, element: <DashboardPage /> }
            ]
          },
          {
            path: PATHS.SCHEDULES,
            element: <ScheduleManagement />
          },
          {
            path: PATHS.TRIPS_LIST,
            element: <TripsPage />
          },
          {
            path: PATHS.TRIP_DETAIL,
            element: <TripDetailPage />
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
            path: PATHS.LOCATION_SUBMISSIONS_REVIEW,
            element: <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.CONTENT_MODERATOR]} />,
            children: [
              { index: true, element: <LocationSubmissionsReviewPage /> }
            ]
          },
          {
            path: PATHS.USERS,
            element: <ProtectedRoute allowedRoles={[ROLES.ADMIN]} />,
            children: [
              { index: true, element: <UsersPage /> },
              { path: ':id', element: <UserDetailPage /> },
            ]
          },
          {
            path: PATHS.REPORTED_REVIEWS,
            element: <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.CONTENT_MODERATOR]} />,
            children: [
              { index: true, element: <ReportedReviewsPage /> },
            ]
          },
          {
            path: PATHS.TRANSPORTATION,
            element: <ProtectedRoute allowedRoles={[ROLES.ADMIN]} />,
            children: [
              { index: true, element: <TransportManagementPage /> },
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
  ]
  }
]);
