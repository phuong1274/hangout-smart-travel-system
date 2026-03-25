import React, { useState } from 'react';
import { Layout, Menu, Avatar, Dropdown } from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';
import { DashboardOutlined, ScheduleOutlined, UserOutlined, LogoutOutlined, EnvironmentOutlined } from '@ant-design/icons';
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
      onClick: () => navigate(PATHS.SCHEDULES),
    },
    {
      key: PATHS.ITINERARY,
      icon: <EnvironmentOutlined />,
      label: 'Itinerary',
      onClick: () => navigate(PATHS.ITINERARY),
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

  const initials = user?.username?.charAt(0)?.toUpperCase() ?? '?';

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
            size={collapsed ? 40 : 64}
            src={user?.avatarUrl ?? null}
            style={{ 
              backgroundColor: '#1A1A1A', 
              color: '#B89D71',
              flexShrink: 0, 
              transition: 'all 0.4s ease',
              fontFamily: "'Lora', serif",
              fontSize: collapsed ? '18px' : '28px'
            }}
          >
            {!user?.avatarUrl && initials}
          </Avatar>
          
          {!collapsed && (
            <div className={styles.userInfo}>
              <div className={styles.username}>{user?.username}</div>
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