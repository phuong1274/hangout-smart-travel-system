import { Col, Row, Skeleton, Space, Typography } from 'antd';
import { useNavigate } from 'react-router-dom';
import DashboardHero from '@/features/dashboard/components/DashboardHero';
import DashboardMetricCards from '@/features/dashboard/components/DashboardMetricCards';
import DashboardPreviewList from '@/features/dashboard/components/DashboardPreviewList';
import DashboardQuickActions from '@/features/dashboard/components/DashboardQuickActions';
import { useTravelerDashboard } from '@/features/dashboard/hooks/useTravelerDashboard';
import { PATHS } from '@/routes/paths';

const { Text } = Typography;

const TravelerDashboardPage = () => {
  const navigate = useNavigate();
  const { loading, summary, recentSubmissions } = useTravelerDashboard();

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
        title="Traveler Dashboard"
        description="Start planning your next trip and quickly jump into your travel setup."
        actionLabel="Plan a new trip"
        onAction={() => navigate(PATHS.CREATE_TRIP)}
      />

      <DashboardMetricCards
        items={[
          {
            key: 'my-submissions',
            label: 'My submissions',
            value: summary.submissionCount,
            tone: 'content',
            helper: 'Location submissions you have sent',
          },
        ]}
      />

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={12}>
          <DashboardPreviewList
            title="Recent submissions"
            items={recentSubmissions}
            emptyText="No submissions yet. Share your first location idea."
            onViewAll={() => navigate(PATHS.MY_LOCATIONS)}
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
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            <DashboardPreviewList
              title="Continue planning"
              items={[]}
              emptyText="No active trip plan found yet."
              onViewAll={() => navigate(PATHS.CREATE_TRIP)}
              viewAllLabel="Plan your first trip"
            />

            <DashboardQuickActions
              title="Personal shortcuts"
              description="Jump straight into the actions travelers use most often."
              actions={[
                {
                  key: 'create-trip',
                  label: 'Create trip',
                  type: 'primary',
                  onClick: () => navigate(PATHS.CREATE_TRIP),
                },
                {
                  key: 'profile',
                  label: 'My profile',
                  onClick: () => navigate(PATHS.PROFILE),
                },
                {
                  key: 'submissions',
                  label: 'My submissions',
                  onClick: () => navigate(PATHS.MY_LOCATIONS),
                },
              ]}
            />
          </Space>
        </Col>
      </Row>
    </Space>
  );
};

export default TravelerDashboardPage;
