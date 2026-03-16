import React from 'react';
import { Table, Tag, Space, Button, Popconfirm, message } from 'antd';
import { EditOutlined, EyeOutlined, DeleteOutlined } from '@ant-design/icons';
import { SubmissionStatus } from '../types';

const statusColors = {
  [SubmissionStatus.Pending]: 'warning',
  [SubmissionStatus.Approved]: 'success',
  [SubmissionStatus.Rejected]: 'error',
  [SubmissionStatus.Published]: 'blue'
};

const statusLabels = {
  [SubmissionStatus.Pending]: 'Pending',
  [SubmissionStatus.Approved]: 'Approved',
  [SubmissionStatus.Rejected]: 'Rejected',
  [SubmissionStatus.Published]: 'Published'
};

const SubmissionTable = ({ data, loading, pagination, onTableChange, onEdit, onView, onDelete }) => {
  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      sorter: (a, b) => a.name.localeCompare(b.name)
    },
    {
      title: 'Address',
      dataIndex: 'address',
      key: 'address',
      ellipsis: true
    },
    {
      title: 'Location Type',
      dataIndex: 'locationTypeName',
      key: 'locationTypeName'
    },
    {
      title: 'Destination',
      dataIndex: 'destinationName',
      key: 'destinationName'
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag color={statusColors[status]}>
          {statusLabels[status]}
        </Tag>
      )
    },
    {
      title: 'Submitted At',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date) => new Date(date).toLocaleDateString(),
      sorter: (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={() => onView(record)}
          >
            View
          </Button>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => onEdit(record)}
            disabled={record.status === SubmissionStatus.Approved || record.status === SubmissionStatus.Published}
          >
            Edit
          </Button>
          {record.status === SubmissionStatus.Pending && (
            <Popconfirm
              title="Delete Submission"
              description="Are you sure you want to delete this submission?"
              onConfirm={() => onDelete(record)}
              okText="Yes"
              cancelText="No"
            >
              <Button type="link" danger icon={<DeleteOutlined />}>
                Delete
              </Button>
            </Popconfirm>
          )}
        </Space>
      )
    }
  ];

  return (
    <Table
      columns={columns}
      dataSource={data}
      loading={loading}
      pagination={pagination}
      onChange={onTableChange}
      rowKey="id"
    />
  );
};

export default SubmissionTable;
