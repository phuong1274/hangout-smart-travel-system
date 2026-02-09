import { useState } from 'react';
import { Layout, Menu, Avatar, Dropdown, theme } from 'antd';
import {
  CompassOutlined,
  DollarOutlined,
  UserOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth.store';
import { APP_NAME } from '@/config/constants';

const { Header, Sider, Content } = Layout;

const menuItems = [
  { key: '/trips', icon: <CompassOutlined />, label: 'My Trips' },
  { key: '/trips/plan', icon: <PlusOutlined />, label: 'Plan a Trip' },
  { key: '/expenses', icon: <DollarOutlined />, label: 'Expenses' },
  { key: '/profile', icon: <UserOutlined />, label: 'Profile' },
];

export const TravelerLayout = () => {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const { token } = theme.useToken();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider trigger={null} collapsible collapsed={collapsed}>
        <div
          style={{
            height: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontWeight: 700,
            fontSize: collapsed ? 14 : 16,
            cursor: 'pointer',
          }}
          onClick={() => navigate('/')}
        >
          {collapsed ? 'HSTS' : APP_NAME}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
        />
      </Sider>

      <Layout>
        <Header
          style={{
            padding: '0 24px',
            background: token.colorBgContainer,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          {collapsed ? (
            <MenuUnfoldOutlined onClick={() => setCollapsed(false)} style={{ fontSize: 18 }} />
          ) : (
            <MenuFoldOutlined onClick={() => setCollapsed(true)} style={{ fontSize: 18 }} />
          )}

          <Dropdown
            menu={{
              items: [
                {
                  key: 'profile',
                  icon: <UserOutlined />,
                  label: 'My Profile',
                  onClick: () => navigate('/profile'),
                },
                {
                  key: 'logout',
                  icon: <LogoutOutlined />,
                  label: 'Sign Out',
                  onClick: handleLogout,
                },
              ],
            }}
          >
            <Avatar icon={<UserOutlined />} style={{ cursor: 'pointer' }}>
              {user?.fullName?.charAt(0)}
            </Avatar>
          </Dropdown>
        </Header>

        <Content style={{ margin: 24, padding: 24, background: token.colorBgContainer }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};
