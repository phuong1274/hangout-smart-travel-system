import React from 'react';
import { Card, Typography, Space, Tabs, ConfigProvider } from 'antd';
import { CarOutlined, NodeIndexOutlined, DashboardOutlined as SpeedOutlined } from '@ant-design/icons';
import TransportModesPage from '@/features/transport-modes/pages/TransportModesPage';
import TransitHubsPage from '@/features/transit-hubs/pages/TransitHubsPage';
import LocalTransportMetricsPage from '@/features/local-transport-metrics/pages/LocalTransportMetricsPage';

const { Title } = Typography;

const TransportationManagementPage = () => {
  const tabItems = [
    {
      key: 'transport-modes',
      label: (
        <span><CarOutlined style={{ marginRight: 4 }} />Transport Modes</span>
      ),
      children: <TransportModesPage />,
    },
    {
      key: 'transit-hubs',
      label: (
        <span><NodeIndexOutlined style={{ marginRight: 4 }} />Transit Hubs</span>
      ),
      children: <TransitHubsPage />,
    },
    {
      key: 'transport-metrics',
      label: (
        <span><SpeedOutlined style={{ marginRight: 4 }} />Transport Metrics</span>
      ),
      children: <LocalTransportMetricsPage />,
    },
  ];

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#FF6B6B',
          borderRadius: 16,
          colorText: '#1A535C',
          fontFamily: "'Plus Jakarta Sans', sans-serif",
        },
      }}
    >
      <Card>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <Title level={3} style={{ margin: 0 }}>Transportation Management</Title>
          <Tabs items={tabItems} defaultActiveKey="transport-modes" destroyInactiveTabPane={false} />
        </Space>
      </Card>
    </ConfigProvider>
  );
};

export default TransportationManagementPage;
