import React from 'react';
import { Avatar, Descriptions, Divider, Space, Typography, ConfigProvider } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import { formatDate } from '@/utils/date';
import { UserGovernanceStatus } from './UserGovernanceStatus';
import styles from '../styles/UserDetailCard.module.css';

const { Title, Text } = Typography;

export const UserDetailCard = ({ user }) => (
  <ConfigProvider
    theme={{
      token: {
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        colorText: '#1A535C',
        colorTextHeading: '#1A535C',
        colorSplit: 'rgba(78, 205, 196, 0.15)',
      },
      components: {
        Descriptions: {
          colorBgContainer: '#F7F9F9',
          borderRadiusLG: 16,
        },
      },
    }}
  >
    <div className={styles.mainWrapper}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <div className={`${styles.profileHeader} ${styles.fadeUp1}`}>
          <div className={styles.avatarWrapper}>
            <Avatar 
              size={clampSize(100)} 
              src={user.avatarUrl} 
              icon={<UserOutlined />} 
              className={styles.avatarImg}
            />
          </div>
          <div className={styles.profileInfo}>
            <Title level={3} className={styles.nameTitle}>{user.fullName}</Title>
            <Text className={styles.emailText}>{user.email}</Text>
            <div className={styles.statusBadge}>
              <UserGovernanceStatus user={user} showDescription />
            </div>
          </div>
        </div>

        <div className={`${styles.infoGrid} ${styles.fadeUp2}`}>
          <Descriptions 
            column={{ xxl: 2, xl: 2, lg: 2, md: 2, sm: 1, xs: 1 }} 
            size="middle"
            className={styles.customDescriptions}
            bordered={false}
          >
            <Descriptions.Item label="Phone">{user.phoneNumber || '—'}</Descriptions.Item>
            <Descriptions.Item label="Gender">{user.gender || '—'}</Descriptions.Item>
            <Descriptions.Item label="Date of birth">{user.dateOfBirth ? formatDate(user.dateOfBirth) : '—'}</Descriptions.Item>
            <Descriptions.Item label="Created at">{formatDate(user.createdAt)}</Descriptions.Item>
            <Descriptions.Item label="Has password">{user.hasPassword ? 'Yes' : 'No'}</Descriptions.Item>
            <Descriptions.Item label="Google linked">{user.hasGoogleLinked ? 'Yes' : 'No'}</Descriptions.Item>
            <Descriptions.Item label="Bio" span={2}>{user.bio || '—'}</Descriptions.Item>
          </Descriptions>
        </div>

        <Divider className={styles.customDivider} />

        <Space direction="vertical" size="small" className={`${styles.footerSection} ${styles.fadeUp3}`}>
          <Title level={5} className={styles.footerTitle}>Lifecycle semantics</Title>
          <Text type="secondary" className={styles.footerDesc}>Ban and unban are governance actions that control access.</Text>
        </Space>
      </Space>
    </div>
  </ConfigProvider>
);

const clampSize = (baseSize) => {
  if (typeof window === 'undefined') return baseSize;
  const width = window.innerWidth;
  if (width < 576) return baseSize * 0.8;
  return baseSize;
};