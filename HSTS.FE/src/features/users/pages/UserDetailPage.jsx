import React from 'react';
import { Card, Col, Row, Space, Spin, Typography } from 'antd';
import { useParams } from 'react-router-dom';
import { useUserDetail } from '../hooks/useUserDetail';
import { useRoles } from '../hooks/useRoles';
import { UserDetailCard } from '../components/UserDetailCard';
import { ChangeUserRoleForm } from '../components/ChangeUserRoleForm';
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
          <Text type="secondary">Inspect account data and update the assigned role.</Text>
        </div>

        <Row gutter={[24, 24]}>
          <Col xs={24} lg={16}>
            <UserDetailCard user={data} />
          </Col>
          <Col xs={24} lg={8}>
            <Card title="Change role">
              <ChangeUserRoleForm user={data} roles={roles} onChanged={refresh} />
            </Card>
          </Col>
        </Row>
      </Space>
    </div>
  );
};

export default UserDetailPage;
