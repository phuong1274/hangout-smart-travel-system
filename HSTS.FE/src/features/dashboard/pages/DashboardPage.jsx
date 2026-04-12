import React from 'react';
import { Col, Row, Skeleton, Space, Typography } from 'antd';
import SummaryCards from '@/features/dashboard/components/SummaryCards';
import TrendPanel from '@/features/dashboard/components/TrendPanel';
import { useAdminDashboard } from '@/features/dashboard/hooks/useAdminDashboard';

const { Title } = Typography;

const DashboardPage = () => {
  const { summary, trends, loading } = useAdminDashboard();

  if (loading) {
    return (
      <div style={{ padding: 24 }}>
        <Skeleton active paragraph={{ rows: 10 }} />
      </div>
    );
  }

  return (
    <Space direction="vertical" size="large" style={{ width: '100%', padding: 24 }}>
      <Title level={2} style={{ marginBottom: 0 }}>Admin Dashboard</Title>

      <SummaryCards summary={summary} />

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={8}>
          <TrendPanel title="Location Growth" points={trends?.locationGrowth || []} />
        </Col>
        <Col xs={24} lg={8}>
          <TrendPanel title="Review Growth" points={trends?.reviewGrowth || []} />
        </Col>
        <Col xs={24} lg={8}>
          <TrendPanel title="Itinerary Growth" points={trends?.itineraryGrowth || []} />
        </Col>
      </Row>
    </Space>
  );
};

export default DashboardPage;
