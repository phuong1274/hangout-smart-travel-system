import React, { Suspense, useState } from 'react';
import { Layout, Spin, Button, Grid } from 'antd';
import { Outlet } from 'react-router-dom';
import { MenuOutlined } from '@ant-design/icons';
import Sidebar from '@/components/Sidebar/Sidebar';

const { Content, Header } = Layout;
const { useBreakpoint } = Grid;

const MainLayout = () => {
  const screens = useBreakpoint();
  const isMobile = screens.lg === false;
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <Layout style={{ minHeight: '100vh' }} hasSider>
      <Sidebar mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen} />

      <Layout>
        {isMobile && (
          <Header style={{
            background: '#FFFFFF',
            padding: '0 16px',
            display: 'flex',
            alignItems: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
            position: 'sticky',
            top: 0,
            zIndex: 99,
            height: 64
          }}>
            <Button
              type="text"
              icon={<MenuOutlined style={{ fontSize: '20px', color: '#1A535C' }} />}
              onClick={() => setMobileMenuOpen(true)}
            />
            <div style={{
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontWeight: 700,
              fontSize: '18px',
              color: '#1A535C',
              marginLeft: 16
            }}>
              Hangout Travel
            </div>
          </Header>
        )}

        <Content style={{
          margin: isMobile ? '12px' : '16px',
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0
        }}>
          <div style={{
            padding: isMobile ? 16 : 24,
            flex: 1,
            background: '#fff',
            borderRadius: 8,
            boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
            overflowY: 'auto'
          }}>
            <Suspense fallback={
              <div style={{ textAlign: 'center', padding: '50px' }}>
                <Spin tip="Loading content..." />
              </div>
            }>
              <Outlet />
            </Suspense>
          </div>
        </Content>
      </Layout>
    </Layout>
  );
};

export default MainLayout;