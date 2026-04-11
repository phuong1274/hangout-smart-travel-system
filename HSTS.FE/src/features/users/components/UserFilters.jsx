import React, { useMemo } from 'react';
import { Select, Space, Typography } from 'antd';

const { Text } = Typography;

const STATUS_OPTIONS = [
  { value: 'Active', label: 'Active' },
  { value: 'PendingVerification', label: 'Pending verification' },
  { value: 'Banned', label: 'Banned' },
];

export const UserFilters = ({ roles = [], filterState, onRoleChange, onStatusChange }) => {
  const roleOptions = useMemo(
    () => roles.map((role) => ({ value: role.name, label: role.name })),
    [roles]
  );

  return (
    <Space wrap align="center">
      <Select
        allowClear
        placeholder="Filter by role"
        options={roleOptions}
        value={filterState?.roleFilter}
        onChange={onRoleChange}
        style={{ minWidth: 180 }}
      />
      <Select
        allowClear
        placeholder="Filter by status"
        options={STATUS_OPTIONS}
        value={filterState?.statusFilter}
        onChange={onStatusChange}
        style={{ minWidth: 220 }}
      />
      <Text type="secondary">Filter users by role or lifecycle state.</Text>
    </Space>
  );
};
