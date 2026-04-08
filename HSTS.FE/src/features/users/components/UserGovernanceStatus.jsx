import React from 'react';
import { Space, Tag, Typography } from 'antd';

const { Text } = Typography;

const STATUS_COLORS = {
  Active: 'green',
  PendingVerification: 'gold',
  Banned: 'volcano',
};

export const getUserLifecycleState = (user) => user?.governanceState || user?.accountStatus || user?.status || 'Unknown';

export const UserGovernanceStatus = ({ user, showDescription = false }) => {
  const lifecycleState = getUserLifecycleState(user);
  const primaryRole = user?.primaryRole || user?.roles?.[0];

  return (
    <Space wrap>
      {primaryRole ? <Tag>{primaryRole}</Tag> : null}
      <Tag color={STATUS_COLORS[lifecycleState] || 'blue'}>{lifecycleState}</Tag>
      {showDescription ? (
        <Text type="secondary">
          {lifecycleState === 'Banned' && 'Banned users are blocked from access until unbanned.'}
          {lifecycleState === 'PendingVerification' && 'Pending verification users still need to complete onboarding.'}
          {lifecycleState === 'Active' && 'Active users can sign in normally.'}
        </Text>
      ) : null}
    </Space>
  );
};
