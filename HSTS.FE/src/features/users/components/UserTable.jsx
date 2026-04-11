import React from 'react';
import { Button } from 'antd';
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
      render: (_, row) => (
        <Button size="small" onClick={() => navigate(PATHS.USER_DETAIL(row.id))}>
          View detail
        </Button>
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