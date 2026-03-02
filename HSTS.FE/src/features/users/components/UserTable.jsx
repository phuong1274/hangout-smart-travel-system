import React from 'react';
import DataTable from '@/components/UI/DataTable';
import { formatDate } from '@/utils/date';

export const UserTable = ({ data, loading, pagination, onTableChange }) => {
  const columns = [
    { title: 'Full Name', dataIndex: 'fullName', key: 'fullName' },
    { title: 'Email', dataIndex: 'email', key: 'email' },
    { 
      title: 'Created At', 
      dataIndex: 'createdAt', 
      key: 'createdAt',
      render: (date) => formatDate(date)
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={data}
      loading={loading}
      pagination={pagination}
      onTableChange={onTableChange}
    />
  );
};
