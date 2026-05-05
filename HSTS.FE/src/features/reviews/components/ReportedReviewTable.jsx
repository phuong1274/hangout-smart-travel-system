import React from 'react';
import { Tag, Button, Space } from 'antd';
import DataTable from '@/components/UI/DataTable';
import { formatDate } from '@/utils/date';
import { getReviewStatusColor, getReviewStatusLabel } from '../constants';

export const ReportedReviewTable = ({ items, loading, pagination, onPageChange, onSelect }) => {
  const columns = [
    { title: 'Location', dataIndex: 'locationName', key: 'locationName' },
    { title: 'Author', dataIndex: 'authorEmail', key: 'authorEmail' },
    {
      title: 'Status',
      dataIndex: ['review', 'status'],
      key: 'status',
      render: (status) => (
        <Tag color={getReviewStatusColor(status)}>{getReviewStatusLabel(status)}</Tag>
      ),
    },
    {
      title: 'Reports',
      dataIndex: ['review', 'reportCount'],
      key: 'reportCount',
    },
    {
      title: 'Updated',
      dataIndex: ['review', 'updatedAt'],
      key: 'updatedAt',
      render: (value) => formatDate(value),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, row) => (
        <Space>
          <Button size="small" onClick={() => onSelect(row)}>Inspect</Button>
        </Space>
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={items}
      loading={loading}
      pagination={pagination}
      onTableChange={onPageChange}
      rowKey={(row) => row.review?.id}
    />
  );
};
