import React from 'react';
import { Typography, Space, Tabs } from 'antd';
import TransitHubsPage from './TransitHubsPage';
import TransportModesPage from './TransportModesPage';
import LocalTransportMetricsPage from './LocalTransportMetricsPage';
import styles from '../styles/TransportManagementPage.module.css';

const { Title } = Typography;

const TransportManagementPage = () => {
  const tabItems = [
    {
      key: '1',
      label: 'Transit Hubs',
      children: <TransitHubsPage />,
    },
    {
      key: '2',
      label: 'Transport Modes',
      children: <TransportModesPage />,
    },
    {
      key: '3',
      label: 'Local Metrics',
      children: <LocalTransportMetricsPage />,
    },
  ];

  return (
    <div className={styles.appWrapper}>
      <div className={styles.content}>
        <div className={styles.floatingCircle1}></div>
        <div className={styles.floatingCircle2}></div>

        <Space direction="vertical" size="large" className={styles.mainContainer} style={{ width: '100%' }}>
          <div className={styles.pageHeader}>
            <Title level={2} className={styles.mainHeading}>Transport Management</Title>
          </div>

          <Tabs 
            defaultActiveKey="1" 
            items={tabItems} 
            destroyInactiveTabPane={true}
          />
        </Space>
      </div>
    </div>
  );
};

export default TransportManagementPage;