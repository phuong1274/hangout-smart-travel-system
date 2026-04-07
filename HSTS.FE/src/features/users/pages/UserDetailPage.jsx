import React from 'react';
import { Card, Col, Row, Space, Spin, Typography } from 'antd';
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

  if (loading || rolesLoading) return <Spin />;
  if (!data) return <Card>User not found.</Card>;

  return (
    <div className={styles.container}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <div>
          <Title level={2}>User Detail</Title>
          <Text type="secondary">Inspect account data, understand lifecycle semantics, and run governance actions.</Text>
        </div>

        <Row gutter={[24, 24]}>
          <Col xs={24} lg={16}>
            <UserDetailCard user={data} />
          </Col>
          <Col xs={24} lg={8}>
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
              <Card title="Change role">
                <ChangeUserRoleForm user={data} roles={roles} onChanged={refresh} />
              </Card>
              <Card title="Lifecycle actions">
                <UserGovernanceActions user={data} onChanged={refresh} />
              </Card>
            </Space>
          </Col>
        </Row>
      </Space>
    </div>
  );
};

export default UserDetailPage;
