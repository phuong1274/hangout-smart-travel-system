import { Layout, Button, Space } from 'antd';
import { Outlet, useNavigate } from 'react-router-dom';
import { APP_NAME } from '@/config/constants';
import { useAuthStore } from '@/stores/auth.store';

const { Header, Content, Footer } = Layout;

export const PublicLayout = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#fff',
          padding: '0 24px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        }}
      >
        <div
          style={{ fontSize: 20, fontWeight: 700, cursor: 'pointer' }}
          onClick={() => navigate('/')}
        >
          {APP_NAME}
        </div>
        <Space>
          {isAuthenticated ? (
            <Button type="primary" onClick={() => navigate('/trips')}>
              My Trips
            </Button>
          ) : (
            <>
              <Button onClick={() => navigate('/login')}>Sign In</Button>
              <Button type="primary" onClick={() => navigate('/register')}>
                Sign Up
              </Button>
            </>
          )}
        </Space>
      </Header>

      <Content style={{ padding: '24px 48px' }}>
        <Outlet />
      </Content>

      <Footer style={{ textAlign: 'center' }}>
        {APP_NAME} &copy; {new Date().getFullYear()} - SEP490-G36
      </Footer>
    </Layout>
  );
};
