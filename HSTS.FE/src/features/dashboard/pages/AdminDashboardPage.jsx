import React from 'react';
import { Col, Row, Skeleton, Space, Typography } from 'antd';
import { useNavigate } from 'react-router-dom';
import ComparisonPanel from '@/features/dashboard/components/ComparisonPanel';
import ContentHealthPanel from '@/features/dashboard/components/ContentHealthPanel';
import QueuePreviewTable from '@/features/dashboard/components/QueuePreviewTable';
import RatioPanel from '@/features/dashboard/components/RatioPanel';
import SummaryCards from '@/features/dashboard/components/SummaryCards';
import TrendPanel from '@/features/dashboard/components/TrendPanel';
import { useAdminDashboard } from '@/features/dashboard/hooks/useAdminDashboard';
import { PATHS } from '@/routes/paths';

const { Text, Title } = Typography;

const AdminDashboardPage = () => {
  const navigate = useNavigate();
  const { summary, insights, trends, queues, loading } = useAdminDashboard();

  const submissionColumns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Submitted',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (value) => new Date(value).toLocaleDateString(),
    },
  ];

  const reviewColumns = [
    {
      title: 'Location',
      dataIndex: 'locationName',
      key: 'locationName',
    },
    {
      title: 'Reports',
      dataIndex: 'reportCount',
      key: 'reportCount',
    },
    {
      title: 'Status',
      dataIndex: 'reviewStatus',
      key: 'reviewStatus',
    },
  ];

  if (loading) {
    return (
      <div style={{ padding: 24 }}>
        <Skeleton active paragraph={{ rows: 10 }} />
      </div>
    );
  }

  return (
    <Space direction="vertical" size="large" style={{ width: '100%', padding: 24 }}>
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <Title level={2} style={{ marginBottom: 0 }}>Admin Dashboard</Title>
        <Text type="secondary">
          Monitor platform health, planning activity, moderation workload, and content coverage.
        </Text>
      </Space>

      <SummaryCards summary={summary} />

      <Title level={3} style={{ marginBottom: 0 }}>Planning & Content Trends</Title>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={8}>
          <TrendPanel title="Trip Growth" points={trends?.tripGrowth || []} />
        </Col>
        <Col xs={24} lg={8}>
          <TrendPanel title="Location Growth" points={trends?.locationGrowth || []} />
        </Col>
        <Col xs={24} lg={8}>
          <TrendPanel title="Review Growth" points={trends?.reviewGrowth || []} />
        </Col>
      </Row>

      <Title level={3} style={{ marginBottom: 0 }}>Operations This Month</Title>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={8}>
          <ComparisonPanel
            title="Trips Created vs Completed"
            leftLabel="Created"
            leftValue={insights?.tripsCreatedThisMonth}
            rightLabel="Completed"
            rightValue={insights?.tripsCompletedThisMonth}
          />
        </Col>
        <Col xs={24} lg={8}>
          <ComparisonPanel
            title="Approved vs Rejected Submissions"
            leftLabel="Approved"
            leftValue={insights?.approvedSubmissionsThisMonth}
            rightLabel="Rejected"
            rightValue={insights?.rejectedSubmissionsThisMonth}
          />
        </Col>
        <Col xs={24} lg={8}>
          <RatioPanel title="Moderation Resolution Rate" value={insights?.moderationResolutionRate} />
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <ContentHealthPanel insights={insights} />
        </Col>
      </Row>

      <Title level={3} style={{ marginBottom: 0 }}>Admin Work Queues</Title>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <QueuePreviewTable
            title="Pending Location Submissions"
            items={queues?.pendingSubmissions || []}
            columns={submissionColumns}
            emptyText="No pending submissions"
            onViewAll={() => navigate(PATHS.LOCATION_SUBMISSIONS_REVIEW)}
          />
        </Col>
        <Col xs={24} lg={12}>
          <QueuePreviewTable
            title="Pending Review Reports"
            items={queues?.pendingReviewReports || []}
            columns={reviewColumns}
            emptyText="No pending review reports"
            onViewAll={() => navigate(PATHS.REPORTED_REVIEWS)}
          />
        </Col>
      </Row>
    </Space>
  );
};

export default AdminDashboardPage;
