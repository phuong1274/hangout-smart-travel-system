import React from 'react';
import AdminDashboardPage from '@/features/dashboard/pages/AdminDashboardPage';
import ModeratorDashboardPage from '@/features/dashboard/pages/ModeratorDashboardPage';
import PartnerDashboardPage from '@/features/dashboard/pages/PartnerDashboardPage';
import TravelerDashboardPage from '@/features/dashboard/pages/TravelerDashboardPage';
import { ROLES } from '@/config/constants';
import { useAuthStore } from '@/store/authStore';

const RoleDashboardPage = () => {
  const { user } = useAuthStore();
  const roles = user?.roles || [];

  if (roles.includes(ROLES.ADMIN)) return <AdminDashboardPage />;
  if (roles.includes(ROLES.CONTENT_MODERATOR)) return <ModeratorDashboardPage />;
  if (roles.includes(ROLES.PARTNER)) return <PartnerDashboardPage />;
  return <TravelerDashboardPage />;
};

export default RoleDashboardPage;
