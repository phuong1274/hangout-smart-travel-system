import React from 'react';
import { Avatar, Card, Descriptions, Space, Tag, Typography } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import { formatDate } from '@/utils/date';
import styles from '../styles/UserDetailCard.module.css';

const { Title } = Typography;

export const UserDetailCard = ({ user }) => (
  <Card className={styles.container}>
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <Space align="start" size="large">
        <Avatar size={96} src={user.avatarUrl} icon={<UserOutlined />} />
        <div>
          <Title level={3} style={{ marginBottom: 0 }}>{user.fullName}</Title>
          <div>{user.email}</div>
          <Space wrap style={{ marginTop: 8 }}>
            {user.roles?.map((role) => <Tag key={role}>{role}</Tag>)}
            <Tag color={user.accountStatus === 'Active' ? 'green' : 'orange'}>{user.accountStatus}</Tag>
          </Space>
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
    </Space>
  </Card>
);