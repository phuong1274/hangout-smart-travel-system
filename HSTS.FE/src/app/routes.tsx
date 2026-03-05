import { createBrowserRouter } from 'react-router-dom';
import {
  PublicLayout,
  AdminLayout,
  TravelerLayout,
  PartnerLayout,
  ModeratorLayout,
} from '@/components/layouts';
import { ProtectedRoute, NotFoundPage, UnauthorizedPage } from '@/components/common';
import { ROLES } from '@/config/constants';

// Public pages
import { HomePage } from '@/pages/public/HomePage';
import { LoginPage } from '@/pages/public/LoginPage';
import { RegisterPage } from '@/pages/public/RegisterPage';
import { VerifyEmailPage } from '@/pages/public/VerifyEmailPage';
import { ForgotPasswordPage } from '@/pages/public/ForgotPasswordPage';
import { ResetPasswordPage } from '@/pages/public/ResetPasswordPage';

// Admin pages
import { DashboardPage as AdminDashboardPage } from '@/pages/admin/DashboardPage';
import { UserManagementPage } from '@/pages/admin/UserManagementPage';

// Traveler pages
import { TripsPage } from '@/pages/traveler/TripsPage';
import { ProfilePage } from '@/pages/traveler/ProfilePage';

export const router = createBrowserRouter([
  // ─── Public routes ───
  {
    element: <PublicLayout />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/login', element: <LoginPage /> },
      { path: '/register', element: <RegisterPage /> },
      { path: '/verify-email', element: <VerifyEmailPage /> },
      { path: '/forgot-password', element: <ForgotPasswordPage /> },
      { path: '/reset-password', element: <ResetPasswordPage /> },
      { path: '/unauthorized', element: <UnauthorizedPage /> },
    ],
  },

  // ─── Traveler routes ───
  {
    element: <ProtectedRoute roles={[ROLES.TRAVELER]} />,
    children: [
      {
        element: <TravelerLayout />,
        children: [
          { path: '/trips', element: <TripsPage /> },
          { path: '/profile', element: <ProfilePage /> },
        ],
      },
    ],
  },

  // ─── Admin routes ───
  {
    element: <ProtectedRoute roles={[ROLES.ADMIN]} />,
    children: [
      {
        element: <AdminLayout />,
        children: [
          { path: '/admin/dashboard', element: <AdminDashboardPage /> },
          { path: '/admin/users', element: <UserManagementPage /> },
        ],
      },
    ],
  },

  // ─── Partner routes ───
  {
    element: <ProtectedRoute roles={[ROLES.PARTNER]} />,
    children: [
      {
        element: <PartnerLayout />,
        children: [
          // Add partner pages here
        ],
      },
    ],
  },

  // ─── Moderator routes ───
  {
    element: <ProtectedRoute roles={[ROLES.CONTENT_MODERATOR]} />,
    children: [
      {
        element: <ModeratorLayout />,
        children: [
          // Add moderator pages here
        ],
      },
    ],
  },

  // ─── 404 ───
  { path: '*', element: <NotFoundPage /> },
]);
