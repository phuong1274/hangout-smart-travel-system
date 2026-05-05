import React from 'react';
import { Outlet } from 'react-router-dom';
import AppHeader from '@/features/home/components/Header';

const PublicDiscoveryLayout = () => (
  <div style={{ minHeight: '100vh', background: '#F7F9F9' }}>
    <AppHeader homePath="/" homeLabel="Home" showDashboardLink />
    <main style={{ paddingTop: 92 }}>
      <Outlet />
    </main>
  </div>
);

export default PublicDiscoveryLayout;
