import React, { useState } from 'react';
import { Layout, Menu, Avatar, Dropdown } from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  DashboardOutlined,
  ScheduleOutlined,
  EnvironmentOutlined,
  CompassOutlined,
  TagsOutlined,
  AppstoreOutlined,
  GoldOutlined,
  ShopOutlined,
  UserOutlined,
  LogoutOutlined,
  RocketOutlined,
  SafetyCertificateOutlined,
  AuditOutlined,
  UnorderedListOutlined,
  CalendarOutlined,
  CarOutlined
} from '@ant-design/icons';
import { useAuthStore } from '@/store/authStore';
import { useLogout } from '@/features/auth/hooks/useAuth';
import { PATHS } from '@/routes/paths';
import { ROLES } from '@/config/constants';
import styles from './Sidebar.module.css';

const { Sider } = Layout;

const Sidebar = () => {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthStore();
  const { logout } = useLogout();

  const hasRole = (allowedRoles = []) => allowedRoles.some((allowedRole) => user?.roles?.includes(allowedRole));

  const sideMenuItems = [
    {
      key: PATHS.DASHBOARD,
      icon: <DashboardOutlined />,
      label: 'Dashboard',
      onClick: () => navigate(PATHS.DASHBOARD),
    },
    {
      key: PATHS.CREATE_TRIP,
      icon: <RocketOutlined />,
      label: 'Plan Trip',
      onClick: () => navigate(PATHS.CREATE_TRIP)
    },
    {
      key: PATHS.TRIPS_LIST,
      icon: <CalendarOutlined />,
      label: 'My Trips',
      onClick: () => navigate(PATHS.TRIPS_LIST)
    },
    {
      key: PATHS.DESTINATIONS,
      icon: <CompassOutlined />,
      label: 'Destinations',
      onClick: () => navigate(PATHS.DESTINATIONS),
      hidden: !hasRole([ROLES.ADMIN]),
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
      onClick: () => navigate(PATHS.PARTNER_LOCATIONS),
      hidden: !hasRole([ROLES.PARTNER]),
    },
    {
      key: PATHS.MY_LOCATIONS,
      icon: <ShopOutlined />,
      label: 'My Submissions',
      onClick: () => navigate(PATHS.MY_LOCATIONS),
      hidden: !hasRole([ROLES.TRAVELER]),
    },
    {
      key: PATHS.USERS,
      icon: <UserOutlined />,
      label: 'Users',
      onClick: () => navigate(PATHS.USERS),
      hidden: !hasRole([ROLES.ADMIN]),
    },
    {
      key: PATHS.REPORTED_REVIEWS,
      icon: <SafetyCertificateOutlined />,
      label: 'Reported Reviews',
      onClick: () => navigate(PATHS.REPORTED_REVIEWS),
      hidden: !hasRole([ROLES.ADMIN]),
    },
    {
      key: PATHS.LOCATION_SUBMISSIONS_REVIEW,
      icon: <AuditOutlined />,
      label: 'Submission Review',
      onClick: () => navigate(PATHS.LOCATION_SUBMISSIONS_REVIEW),
      hidden: !hasRole([ROLES.ADMIN, ROLES.CONTENT_MODERATOR]),
    },
    {
      key: PATHS.TRANSPORTATION,
      icon: <CarOutlined />,
      label: 'Transportation',
      onClick: () => navigate(PATHS.TRANSPORTATION),
      hidden: !hasRole([ROLES.ADMIN, ROLES.CONTENT_MODERATOR]),
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

  const initials = (user?.username || user?.fullName)?.charAt(0)?.toUpperCase() ?? '?';

  return (
    <Sider 
      collapsible 
      theme="light"
      collapsed={collapsed} 
      onCollapse={(value) => setCollapsed(value)}
      className={styles.sidebarWrapper}
      width={260}
    >
      <Dropdown menu={{ items: userDropdownItems }} placement="bottomRight" trigger={['click']}>
        <div className={styles.profileContainer}>
          <Avatar
            size={collapsed ? 40 : 72}
            src={user?.avatarUrl ?? null}
            style={{ 
              backgroundColor: '#FFE66D', 
              color: '#FF6B6B',
              flexShrink: 0, 
              transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontWeight: 700,
              fontSize: collapsed ? '16px' : '32px',
              boxShadow: '0 8px 24px rgba(255, 107, 107, 0.2)'
            }}
          >
            {!user?.avatarUrl && initials}
          </Avatar>
          
          {!collapsed && (
            <div className={styles.userInfo}>
              <div className={styles.username}>{user?.username || user?.fullName}</div>
              <div className={styles.email}>{user?.email}</div>
            </div>
          )}
        </div>
      </Dropdown>
      
      <Menu
        theme="light"
        mode="inline"
        selectedKeys={[location.pathname]}
        items={sideMenuItems}
      />
    </Sider>
  );
};

export default Sidebar;