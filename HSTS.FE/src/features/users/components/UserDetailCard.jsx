import React from 'react';
import { Avatar, Card, Descriptions, Divider, Space, Typography } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import { formatDate } from '@/utils/date';
import { UserGovernanceStatus } from './UserGovernanceStatus';
import styles from '../styles/UserDetailCard.module.css';

const { Title, Text } = Typography;

export const UserDetailCard = ({ user }) => (
  <Card className={styles.container}>
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <Space align="start" size="large">
        <Avatar size={96} src={user.avatarUrl} icon={<UserOutlined />} />
        <div>
          <Title level={3} style={{ marginBottom: 0 }}>{user.fullName}</Title>
          <div>{user.email}</div>
          <div style={{ marginTop: 8 }}>
            <UserGovernanceStatus user={user} showDescription />
          </div>
        </div>
      </Space>

      <Descriptions column={2} size="small">
        <Descriptions.Item label="Phone">{user.phoneNumber || '—'}</Descriptions.Item>
        <Descriptions.Item label="Gender">{user.gender || '—'}</Descriptions.Item>
        <Descriptions.Item label="Date of birth">{user.dateOfBirth ? formatDate(user.dateOfBirth) : '—'}</Descriptions.Item>
        <Descriptions.Item label="Created at">{formatDate(user.createdAt)}</Descriptions.Item>
        <Descriptions.Item label="Has password">{user.hasPassword ? 'Yes' : 'No'}</Descriptions.Item>
        <Descriptions.Item label="Google linked">{user.hasGoogleLinked ? 'Yes' : 'No'}</Descriptions.Item>
        <Descriptions.Item label="Bio" span={2}>{user.bio || '—'}</Descriptions.Item>
      </Descriptions>

      <Divider style={{ margin: 0 }} />

      <Space direction="vertical" size="small">
        <Title level={5} style={{ margin: 0 }}>Lifecycle semantics</Title>
        <Text type="secondary">Ban and unban are status actions that control access. Deactivate and restore are soft-delete lifecycle actions and are shown separately.</Text>
      </Space>
    </Space>
  </Card>
);