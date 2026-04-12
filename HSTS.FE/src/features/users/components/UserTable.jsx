import React from 'react';
import { Button, Tooltip } from 'antd';
import { EyeOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { PATHS } from '@/routes/paths';
import DataTable from '@/components/UI/DataTable';
import { formatDate } from '@/utils/date';
import { UserGovernanceActions } from './UserGovernanceActions';
import { UserGovernanceStatus } from './UserGovernanceStatus';
import styles from '../styles/UserTable.module.css';

export const UserTable = ({ data, loading, pagination, onTableChange, onChanged }) => {
  const navigate = useNavigate();

  const columns = [
    { title: 'Full Name', dataIndex: 'fullName', key: 'fullName' },
    { title: 'Email', dataIndex: 'email', key: 'email' },
    {
      title: 'Governance',
      key: 'governance',
      render: (_, row) => <UserGovernanceStatus user={row} />,
    },
    {
      title: 'Created At',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date) => formatDate(date),
    },
    {
      title: 'Lifecycle actions',
      key: 'lifecycleActions',
      render: (_, row) => <UserGovernanceActions user={row} compact onChanged={onChanged} />,
    },
    {
      title: 'Actions',
      key: 'actions',
      align: 'center',
      render: (_, row) => (
        <Tooltip title="View detail">
          <Button
            type="text"
            className={styles.actionIconBtn}
            icon={<EyeOutlined />}
            onClick={() => navigate(PATHS.USER_DETAIL(row.id))}
          />
        </Tooltip>
      ),
    },
  ];

  return (
    <div className={styles.tableContainer}>
      <DataTable
        columns={columns}
        data={data}
        loading={loading}
        pagination={pagination}
        onTableChange={onTableChange}
        scroll={{ x: 'max-content' }}
      />
    </div>
  );
};