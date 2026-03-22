import React, { Suspense } from 'react';
import { Layout, Spin } from 'antd';
import { Outlet } from 'react-router-dom';
import Sidebar from '@/components/Sidebar/Sidebar';

const { Content } = Layout;

const MainLayout = () => {
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