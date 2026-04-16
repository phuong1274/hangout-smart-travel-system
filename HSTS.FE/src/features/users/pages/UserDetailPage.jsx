import React from 'react';
import { Card, Col, Row, Space, Spin, Typography, ConfigProvider } from 'antd';
import { useParams } from 'react-router-dom';
import { useUserDetail } from '../hooks/useUserDetail';
import { useRoles } from '../hooks/useRoles';
import { UserDetailCard } from '../components/UserDetailCard';
import { ChangeUserRoleForm } from '../components/ChangeUserRoleForm';
import { UserGovernanceActions } from '../components/UserGovernanceActions';
import styles from '../styles/UserDetailPage.module.css';

const { Title, Text } = Typography;

const UserDetailPage = () => {
  const { id } = useParams();
  const { data, loading, refresh } = useUserDetail(id);
  const { roles, loading: rolesLoading } = useRoles();

  if (loading || rolesLoading) {
    return (
      <div className={styles.loadingContainer}>
        <Spin size="large" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className={styles.container}>
        <Card className={styles.cardWrapper}>User not found.</Card>
      </div>
    );
  }

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#FFE66D',
          borderRadius: 20,
          colorText: '#1A535C',
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          colorBgContainer: '#FFFFFF',
        },
      }}
    >
      <div className={styles.container}>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div className={styles.headerSection}>
            <Title level={2} className={styles.headingMain}>User Detail</Title>
            <Text className={styles.subHeading}>Inspect account data, understand lifecycle semantics, and run governance actions.</Text>
          </div>

          <Row gutter={[24, 24]}>
            <Col xs={24} lg={16} className={styles.fadeUp1}>
              <div className={styles.cardWrapper}>
                <UserDetailCard user={data} />
              </div>
            </Col>
            <Col xs={24} lg={8} className={styles.fadeUp2}>
              <Space direction="vertical" size="large" style={{ width: '100%' }}>
                <Card title="Change role" className={styles.cardWrapper}>
                  <ChangeUserRoleForm user={data} roles={roles} onChanged={refresh} />
                </Card>
                <Card title="Lifecycle actions" className={styles.cardWrapper}>
                  <UserGovernanceActions user={data} onChanged={refresh} />
                </Card>
              </Space>
            </Col>
          </Row>
        </Space>
      </div>
    </ConfigProvider>
  );
};

export default UserDetailPage;