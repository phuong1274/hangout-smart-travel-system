import React from 'react';
import { Col, Row, Skeleton, Space, Typography } from 'antd';
import { useNavigate } from 'react-router-dom';
import DashboardHero from '@/features/dashboard/components/DashboardHero';
import DashboardMetricCards from '@/features/dashboard/components/DashboardMetricCards';
import DashboardPreviewList from '@/features/dashboard/components/DashboardPreviewList';
import DashboardQuickActions from '@/features/dashboard/components/DashboardQuickActions';
import { usePartnerDashboard } from '@/features/dashboard/hooks/usePartnerDashboard';
import { PATHS } from '@/routes/paths';

const { Text } = Typography;

const PartnerDashboardPage = () => {
  const navigate = useNavigate();
  const { loading, metrics, needsAttention, recentSubmissions } = usePartnerDashboard();

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
        title="Partner Dashboard"
        description="Track your managed locations, submissions, and items that need operational attention."
        actionLabel="Submit new location"
        onAction={() => navigate(PATHS.PARTNER_LOCATIONS)}
      />

      <DashboardMetricCards
        items={[
          { key: 'total-locations', label: 'Managed locations', value: metrics.totalLocations, tone: 'core' },
          { key: 'active-locations', label: 'Active locations', value: metrics.activeLocations, tone: 'content' },
          { key: 'closed-locations', label: 'Needs attention', value: metrics.closedLocations, tone: 'ops' },
          { key: 'pending-submissions', label: 'Pending submissions', value: metrics.pendingSubmissions, tone: 'ops' },
          { key: 'rejected-submissions', label: 'Rejected submissions', value: metrics.rejectedSubmissions, tone: 'content' },
        ]}
      />

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={12}>
          <DashboardPreviewList
            title="Needs attention"
            items={needsAttention}
            emptyText="No items currently need action"
            onViewAll={() => navigate(PATHS.PARTNER_LOCATIONS)}
            renderItem={(item) => (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Text strong>{item.title || 'Needs attention'}</Text>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {item.subtitle || 'Status needs review'}
                </Text>
              </div>
            )}
          />
        </Col>

        <Col xs={24} xl={12}>
          <DashboardPreviewList
            title="Recent submissions"
            items={recentSubmissions}
            emptyText="No recent submissions"
            onViewAll={() => navigate(PATHS.PARTNER_LOCATIONS)}
            renderItem={(item) => (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Text strong>{item.name || `Submission #${item.id}`}</Text>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'Recently updated'}
                </Text>
              </div>
            )}
          />
        </Col>
      </Row>

      <DashboardQuickActions
        title="Quick actions"
        actions={[
          {
            key: 'submit-new-location',
            label: 'Submit New Location',
            type: 'primary',
            onClick: () => navigate(PATHS.PARTNER_LOCATIONS),
          },
          {
            key: 'locations',
            label: 'My locations',
            onClick: () => navigate(PATHS.PARTNER_LOCATIONS),
          },
          {
            key: 'submissions',
            label: 'My submissions',
            onClick: () => navigate(PATHS.PARTNER_LOCATIONS),
          },
        ]}
      />
    </Space>
  );
};

export default PartnerDashboardPage;
