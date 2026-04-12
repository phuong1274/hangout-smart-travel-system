import React, { useState } from 'react';
import { Button, Popconfirm, Space, Typography, message } from 'antd';
import { usersApi } from '../api';
import { getUserLifecycleState } from './UserGovernanceStatus';
import styles from '../styles/UserGovernanceActions.module.css';

const { Text } = Typography;

export const UserGovernanceActions = ({ user, compact = false, onChanged }) => {
  const [submittingAction, setSubmittingAction] = useState('');
  const lifecycleState = getUserLifecycleState(user);
  const isBanned = lifecycleState === 'Banned';
  const buttonProps = compact ? { size: 'small' } : {};

  const runAction = async (action) => {
    setSubmittingAction(action);
    try {
      if (action === 'ban') await usersApi.banUser(user.id);
      if (action === 'unban') await usersApi.unbanUser(user.id);
      message.success('User governance updated.');
      onChanged?.();
    } finally {
      setSubmittingAction('');
    }
  };

  return (
    <Space wrap>
      {isBanned ? (
        <Popconfirm title="Unban user?" onConfirm={() => runAction('unban')}>
          <Button {...buttonProps} className={styles.actionBtn} loading={submittingAction === 'unban'}>
            Unban
          </Button>
        </Popconfirm>
      ) : (
        <Popconfirm title="Ban user?" description="This updates GovernanceState to Banned and revokes tokens." onConfirm={() => runAction('ban')}>
          <Button {...buttonProps} className={styles.actionBtn} loading={submittingAction === 'ban'}>
            Ban
          </Button>
        </Popconfirm>
      )}

      {!compact ? <Text type="secondary">Banned users are blocked from access until unbanned.</Text> : null}
    </Space>
  );
};