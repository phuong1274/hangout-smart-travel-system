import React, { useState } from 'react';
import { Button, Popconfirm, Space, Typography, message } from 'antd';
import { usersApi } from '../api';
import { getUserLifecycleState } from './UserGovernanceStatus';

const { Text } = Typography;

export const UserGovernanceActions = ({ user, compact = false, onChanged }) => {
  const [submittingAction, setSubmittingAction] = useState('');
  const lifecycleState = getUserLifecycleState(user);
  const isBanned = lifecycleState === 'Banned';
  const isDeactivated = Boolean(user?.isDeleted) || lifecycleState === 'Deactivated';
  const buttonProps = compact ? { size: 'small', type: 'link' } : {};

  const runAction = async (action) => {
    setSubmittingAction(action);
    try {
      if (action === 'ban') await usersApi.banUser(user.id);
      if (action === 'unban') await usersApi.unbanUser(user.id);
      if (action === 'deactivate') await usersApi.deactivateUser(user.id);
      if (action === 'restore') await usersApi.restoreUser(user.id);
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
          <Button {...buttonProps} loading={submittingAction === 'unban'}>
            Unban
          </Button>
        </Popconfirm>
      ) : (
        <Popconfirm title="Ban user?" description="This updates GovernanceState to Banned and revokes tokens." onConfirm={() => runAction('ban')} disabled={isDeactivated}>
          <Button {...buttonProps} danger disabled={isDeactivated} loading={submittingAction === 'ban'}>
            Ban
          </Button>
        </Popconfirm>
      )}

      {isDeactivated ? (
        <Popconfirm title="Restore user?" description="This clears the soft-delete state only. If the account is banned, it remains banned after restore." onConfirm={() => runAction('restore')}>
          <Button {...buttonProps} loading={submittingAction === 'restore'}>
            Restore
          </Button>
        </Popconfirm>
      ) : (
        <Popconfirm title="Deactivate user?" description="This soft-deletes the user and account, but can be restored later." onConfirm={() => runAction('deactivate')}>
          <Button {...buttonProps} loading={submittingAction === 'deactivate'}>
            Deactivate
          </Button>
        </Popconfirm>
      )}

      {!compact ? (
        <Text type="secondary">Deactivated accounts show as GovernanceState = Deactivated and sign-in returns AccountInactive until restored.</Text>
      ) : null}
    </Space>
  );
};
