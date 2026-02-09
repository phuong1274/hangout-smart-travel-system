import { useState } from 'react';
import { Layout, Menu, Avatar, Dropdown, Space, theme } from 'antd';
import {
  DashboardOutlined,
  UserOutlined,
  EnvironmentOutlined,
  CarOutlined,
  CloudOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
} from '@ant-design/icons';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/stores/auth.store';
import { LanguageSwitcher } from '@/components/common/LanguageSwitcher';
import { CurrencySwitcher } from '@/components/common/CurrencySwitcher';

const { Header, Sider, Content } = Layout;

export const AdminLayout = () => {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const { token } = theme.useToken();
  const { t } = useTranslation();

  const menuItems = [
    { key: '/admin/dashboard', icon: <DashboardOutlined />, label: t('nav.dashboard') },
    { key: '/admin/users', icon: <UserOutlined />, label: t('nav.userManagement') },
    { key: '/admin/destinations', icon: <EnvironmentOutlined />, label: t('nav.destinations') },
    { key: '/admin/transportation', icon: <CarOutlined />, label: t('nav.transportation') },
    { key: '/admin/weather', icon: <CloudOutlined />, label: t('nav.weather') },
  ];

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
          }}
        >
          {collapsed ? 'HSTS' : t('appName')}
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

          <Space>
            <LanguageSwitcher />
            <CurrencySwitcher />
            <Dropdown
              menu={{
                items: [
                  {
                    key: 'logout',
                    icon: <LogoutOutlined />,
                    label: t('nav.signOut'),
                    onClick: handleLogout,
                  },
                ],
              }}
            >
              <Avatar icon={<UserOutlined />} style={{ cursor: 'pointer' }}>
                {user?.fullName?.charAt(0)}
              </Avatar>
            </Dropdown>
          </Space>
        </Header>

        <Content style={{ margin: 24, padding: 24, background: token.colorBgContainer }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};
