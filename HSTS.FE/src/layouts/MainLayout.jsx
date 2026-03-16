import React, { Suspense } from 'react';
import { Avatar, Dropdown, Layout, Menu, Spin } from 'antd';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { DashboardOutlined, ScheduleOutlined, CompassOutlined, TagsOutlined, AppstoreOutlined, EnvironmentOutlined, UserOutlined, LogoutOutlined, GoldOutlined } from '@ant-design/icons';
import { useAuthStore } from '@/store/authStore';
import { useLogout } from '@/features/auth/hooks/useAuth';
import { PATHS } from '@/routes/paths';
import { ROLES } from '@/config/constants';

const { Header, Sider, Content } = Layout;

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
      <Sider collapsible>
        <div style={{
          height: 32, margin: 16,
          background: 'rgba(255, 255, 255, 0.2)',
          borderRadius: 6,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontWeight: 'bold',
        }}>
          HANGOUT ADMIN
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={sideMenuItems}
        />
      </Sider>
      <Layout>
        <Header style={{
          padding: '0 16px', background: '#fff',
          display: 'flex', justifyContent: 'flex-end', alignItems: 'center',
        }}>
          <Dropdown menu={{ items: userDropdownItems }} placement="bottomRight" arrow>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: '0 4px' }}>
              <Avatar
                size={28}
                src={user?.avatarUrl ?? null}
                style={{ backgroundColor: '#1677ff', fontSize: 12 }}
              >
                {!user?.avatarUrl && initials}
              </Avatar>
              <span style={{ fontSize: 13, color: '#000000d9' }}>{user?.fullName}</span>
            </div>
          </Dropdown>
        </Header>
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
