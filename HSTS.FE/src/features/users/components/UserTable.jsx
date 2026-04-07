import React from 'react';
import { Button, Tag } from 'antd';
import { useNavigate } from 'react-router-dom';
import DataTable from '@/components/UI/DataTable';
import { formatDate } from '@/utils/date';
import styles from '../styles/UserTable.module.css';

export const UserTable = ({ data, loading, pagination, onTableChange }) => {
  const navigate = useNavigate();

  const columns = [
    { title: 'Full Name', dataIndex: 'fullName', key: 'fullName' },
    { title: 'Email', dataIndex: 'email', key: 'email' },
    {
      title: 'Role',
      dataIndex: 'primaryRole',
      key: 'primaryRole',
      render: (value) => <Tag>{value}</Tag>,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (value) => <Tag color={value === 'Active' ? 'green' : 'orange'}>{value}</Tag>,
    },
    {
      title: 'Created At',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date) => formatDate(date),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, row) => (
        <Button size="small" onClick={() => navigate(`/users/${row.id}`)}>
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