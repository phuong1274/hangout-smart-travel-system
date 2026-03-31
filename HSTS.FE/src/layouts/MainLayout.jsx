import React, { Suspense } from 'react';
import { Avatar, Dropdown, Layout, Menu, Spin } from 'antd';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { DashboardOutlined, ScheduleOutlined, CompassOutlined, TagsOutlined, AppstoreOutlined, EnvironmentOutlined, UserOutlined, LogoutOutlined, GoldOutlined, ShopOutlined } from '@ant-design/icons';
import { useAuthStore } from '@/store/authStore';
import { useLogout } from '@/features/auth/hooks/useAuth';
import { PATHS } from '@/routes/paths';
import { ROLES } from '@/config/constants';
import { Layout, Spin } from 'antd';
import { Outlet } from 'react-router-dom';
import Sidebar from '@/components/Sidebar/Sidebar';

const { Content } = Layout;

const MainLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthStore();
  const { logout } = useLogout();

  const role = user?.roles?.[0];

  const sideMenuItems = [
    {
      key: PATHS.DASHBOARD,
      icon: <DashboardOutlined />,
      label: 'Dashboard',
      onClick: () => navigate(PATHS.DASHBOARD),
    },
    {
      key: PATHS.SCHEDULES,
      icon: <ScheduleOutlined />,
      label: 'Schedules',
      onClick: () => navigate(PATHS.SCHEDULES)
    },
    {
      key: PATHS.DESTINATIONS,
      icon: <CompassOutlined />,
      label: 'Destinations',
      onClick: () => navigate(PATHS.DESTINATIONS)
    },
    {
      key: PATHS.LOCATIONS,
      icon: <EnvironmentOutlined />,
      label: 'Locations',
      onClick: () => navigate(PATHS.LOCATIONS)
    },
    {
      key: PATHS.TAGS,
      icon: <TagsOutlined />,
      label: 'Tags',
      onClick: () => navigate(PATHS.TAGS)
    },
    {
      key: PATHS.LOCATION_TYPES,
      icon: <AppstoreOutlined />,
      label: 'Location Types',
      onClick: () => navigate(PATHS.LOCATION_TYPES)
    },
    {
      key: PATHS.AMENITIES,
      icon: <GoldOutlined />,
      label: 'Amenities',
      onClick: () => navigate(PATHS.AMENITIES)
    },
    {
      key: PATHS.PARTNER_LOCATIONS,
      icon: <ShopOutlined />,
      label: 'My Locations',
      onClick: () => navigate(PATHS.PARTNER_LOCATIONS)
    },
    {
      onClick: () => navigate(PATHS.SCHEDULES),
    },
    {
      key: PATHS.USERS,
      icon: <UserOutlined />,
      label: 'Users',
      onClick: () => navigate(PATHS.USERS),
      hidden: role !== ROLES.ADMIN,
    },
  ].filter((item) => !item.hidden);

  const userDropdownItems = [
    {
      key: 'profile',
      label: 'My Profile',
      onClick: () => navigate(PATHS.PROFILE),
    },
    { type: 'divider' },
    {
      key: 'logout',
      label: 'Logout',
      icon: <LogoutOutlined />,
      danger: true,
      onClick: logout,
    },
  ];

  const initials = user?.fullName?.charAt(0)?.toUpperCase() ?? '?';

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sidebar />
      <Layout>
        <Content style={{ margin: '16px' }}>
          <div style={{ padding: 24, minHeight: 360, background: '#fff', borderRadius: 8 }}>
            <Suspense fallback={<div style={{ textAlign: 'center', padding: '50px' }}><Spin tip="Loading content..." /></div>}>
              <Outlet />
            </Suspense>
          </div>
        </Content>
      </Layout>
    </Layout>
  );
};

export default MainLayout;