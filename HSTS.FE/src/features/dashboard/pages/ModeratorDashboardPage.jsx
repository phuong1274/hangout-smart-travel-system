import React from 'react';
import { Col, Row, Skeleton, Space, Typography } from 'antd';
import { useNavigate } from 'react-router-dom';
import DashboardHero from '@/features/dashboard/components/DashboardHero';
import DashboardMetricCards from '@/features/dashboard/components/DashboardMetricCards';
import DashboardPreviewList from '@/features/dashboard/components/DashboardPreviewList';
import DashboardQuickActions from '@/features/dashboard/components/DashboardQuickActions';
import { useModeratorDashboard } from '@/features/dashboard/hooks/useModeratorDashboard';
import { PATHS } from '@/routes/paths';

const { Text } = Typography;

const ModeratorDashboardPage = () => {
  const navigate = useNavigate();
  const { metrics, pendingSubmissions, pendingReports, loading } = useModeratorDashboard();

  if (loading) {
    return (
      <div style={{ padding: 24 }}>
        <Skeleton active paragraph={{ rows: 10 }} />
      </div>
    );
  }

  return (
    <Space direction="vertical" size="large" style={{ width: '100%', padding: 24 }}>
      <DashboardHero
        title="Moderator Dashboard"
        description="Review location submissions and community reports that need attention."
        actionLabel="Review submissions"
        onAction={() => navigate(PATHS.LOCATION_SUBMISSIONS_REVIEW)}
      />

      <DashboardMetricCards
        items={[
          { key: 'pending-submissions', label: 'Pending submissions', value: metrics.pendingSubmissions, tone: 'ops' },
          { key: 'pending-reports', label: 'Pending reports', value: metrics.pendingReports, tone: 'content' },
          { key: 'reviewed-items', label: 'Reviewed items', value: metrics.reviewedItems, tone: 'core' },
          { key: 'rejected-items', label: 'Rejected items', value: metrics.rejectedItems, tone: 'content' },
        ]}
      />

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={12}>
          <DashboardPreviewList
            title="Submission queue"
            items={pendingSubmissions}
            emptyText="No pending submissions"
            onViewAll={() => navigate(PATHS.LOCATION_SUBMISSIONS_REVIEW)}
            renderItem={(item) => (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Text strong>{item.name || `Submission #${item.id}`}</Text>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'Recently submitted'}
                </Text>
              </div>
            )}
          />
        </Col>

        <Col xs={24} xl={12}>
          <DashboardPreviewList
            title="Reported reviews"
            items={pendingReports}
            emptyText="No reported reviews"
            onViewAll={() => navigate(PATHS.REPORTED_REVIEWS)}
            renderItem={(item) => (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Text strong>{item.locationName || `Review #${item.reviewId}`}</Text>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {item.reportCount ? `${item.reportCount} reports` : 'Reported review'}
                </Text>
              </div>
            )}
          />
        </Col>
      </Row>

      <DashboardQuickActions
        actions={[
          {
            key: 'submissions',
            label: 'Review submissions',
            type: 'primary',
            onClick: () => navigate(PATHS.LOCATION_SUBMISSIONS_REVIEW),
          },
          {
            key: 'reports',
            label: 'Review reports',
            onClick: () => navigate(PATHS.REPORTED_REVIEWS),
          },
        ]}
      />
    </Space>
  );
};

export default ModeratorDashboardPage;
